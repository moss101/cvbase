import { z } from 'npm:zod@3.24.1';
import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2';
import { handleOptions } from './cors.ts';
import { fail, HttpError, ok } from './respond.ts';
import { getUser as defaultGetUser, serviceClient as defaultServiceClient } from './auth.ts';
import {
  checkAndMeter as defaultCheckAndMeter,
  type Feature,
  releaseUsage as defaultReleaseUsage,
  requireFeature as defaultRequireFeature,
  type UsageKind,
} from './entitlement.ts';
import { enforceRateLimit as defaultEnforceRateLimit, type RateLimitClient, type RateLimitOpts } from './rateLimit.ts';
import { type AiLogMeta, logAi as defaultLogAi } from './aiLog.ts';
import { DEFAULT_MAX_BODY_BYTES, readJsonBody } from './body.ts';
import { LlmAllProvidersFailedError } from './llm/errors.ts';

// =========================================================================
// withAiHandler — the one request pipeline every AI Edge Function shares:
//
//   OPTIONS/CORS → POST check → request id → auth → capped JSON body →
//   zod validation → feature gate → per-user rate limit → metering →
//   handler → ai_logs + structured log → JSON response
//
// Errors anywhere collapse to `{ error: code, ...extra, requestId }` with the
// matching status (respond.ts). If the handler fails on OUR side after
// metering (all LLM providers down, a 5xx, malformed model output) the
// metered action is refunded via releaseUsage so an outage never eats quota.
// Every response carries `x-request-id`; every structured log line carries
// {level, fn, requestId, userId, ms, code} so client reports and server logs
// join on one id.
// =========================================================================

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

/** Everything the pipeline touches, injectable for tests (fakes instead of
 *  Supabase/LLM network calls). Production uses the real modules. */
export interface HandlerDeps {
  getUser: (req: Request) => Promise<User>;
  serviceClient: () => SupabaseClient;
  checkAndMeter: (userId: string, kind: UsageKind) => Promise<void>;
  releaseUsage: (userId: string, kind: UsageKind) => Promise<void>;
  requireFeature: (userId: string, feature: Feature) => Promise<void>;
  enforceRateLimit: (svc: RateLimitClient, userId: string, bucket: string, opts: RateLimitOpts) => Promise<unknown>;
  logAi: (userId: string | null, meta: AiLogMeta) => Promise<void>;
}

export interface AiHandlerOpts<S extends z.ZodTypeAny> {
  /** Request body schema. Failures are 400 `invalid_request` with compact `issues`. */
  schema: S;
  /** Raw request-body cap in bytes (413 `payload_too_large`). Default 1 MiB. */
  maxBodyBytes?: number;
  /** Boolean plan gate checked before anything is metered (403 `feature_locked`). */
  feature?: Feature;
  /** Monthly quota to consume. Default `'aiActions'`; `null` = unmetered. */
  meter?: UsageKind | null;
  /** Per-user burst limit for this function's bucket; `false` disables. */
  rateLimit?: RateLimitOpts | false;
  /** ai_logs model label. Default 'llm-routed'. */
  model?: string;
  promptVersion?: string;
  deps?: Partial<HandlerDeps>;
}

export interface AiContext<T> {
  req: Request;
  user: User;
  userId: string;
  body: T;
  requestId: string;
  svc: SupabaseClient;
  startedAt: number;
  /** Structured JSON log line stamped with fn/requestId/userId/ms. */
  log: (level: LogLevel, fields?: LogFields) => void;
  /** Accumulate provider-reported (or estimated) tokens for ai_logs.token_estimate. */
  addTokens: (n: number) => void;
  /** Override the ai_logs `function` label, e.g. 'ai-suggest:analyze'. */
  setLogFunction: (label: string) => void;
  /** Log one model call inside a multi-call action (ai-suggest 'analyze'
   *  fans out to 3 prompts under ONE metered action). Stamped with this
   *  request's id and elapsed time; never throws. */
  logSubCall: (label: string, status: 'ok' | 'error', tokens?: number) => Promise<void>;
}

export type AiHandlerFn<T, R> = (ctx: AiContext<T>) => Promise<R>;

/** Refund policy: the user got nothing AND it was not their fault. */
export function shouldRefund(err: unknown): boolean {
  if (err instanceof LlmAllProvidersFailedError) return true;
  const status = err instanceof HttpError ? err.status : 500;
  return status >= 500;
}

function compactIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message }));
}

const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

/** Use the caller's `x-request-id` when it is a sane opaque token (lets a
 *  client/proxy correlate its own trace), otherwise mint a UUID. */
export function resolveRequestId(req: Request): string {
  const given = req.headers.get('x-request-id')?.trim() ?? '';
  return REQUEST_ID_RE.test(given) ? given : crypto.randomUUID();
}

/** Rough token estimate for calls whose provider does not report usage. */
export function estimateTokens(...texts: Array<string | undefined | null>): number {
  return Math.ceil(texts.reduce((n, t) => n + (t?.length ?? 0), 0) / 4);
}

export function withAiHandler<S extends z.ZodTypeAny, R = unknown>(
  name: string,
  opts: AiHandlerOpts<S>,
  fn: AiHandlerFn<z.infer<S>, R>,
): (req: Request) => Promise<Response> {
  const deps: HandlerDeps = {
    getUser: defaultGetUser,
    serviceClient: defaultServiceClient,
    checkAndMeter: defaultCheckAndMeter,
    releaseUsage: defaultReleaseUsage,
    requireFeature: defaultRequireFeature,
    enforceRateLimit: defaultEnforceRateLimit,
    logAi: defaultLogAi,
    ...(opts.deps ?? {}),
  };
  const meterKind: UsageKind | null = opts.meter === undefined ? 'aiActions' : opts.meter;
  const model = opts.model ?? 'llm-routed';

  return async (req: Request): Promise<Response> => {
    const pre = handleOptions(req);
    if (pre) return pre;

    const requestId = resolveRequestId(req);
    const startedAt = Date.now();
    let userId: string | null = null;
    let metered = false;
    let tokens = 0;
    let fnLabel = name;

    const log = (level: LogLevel, fields: LogFields = {}) => {
      const line = { level, fn: fnLabel, requestId, userId, ms: Date.now() - startedAt, ...fields };
      (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(JSON.stringify(line));
    };

    try {
      if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

      const user = await deps.getUser(req);
      userId = user.id;

      const raw = await readJsonBody(req, opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES);
      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) throw new HttpError(400, 'invalid_request', { issues: compactIssues(parsed.error) });

      const svc = deps.serviceClient();
      if (opts.feature) await deps.requireFeature(user.id, opts.feature);
      if (opts.rateLimit) await deps.enforceRateLimit(svc, user.id, name, opts.rateLimit);
      if (meterKind) {
        await deps.checkAndMeter(user.id, meterKind);
        metered = true;
      }

      const result = await fn({
        req, user, userId: user.id, body: parsed.data, requestId, svc, startedAt, log,
        addTokens: (n) => { if (Number.isFinite(n) && n > 0) tokens += n; },
        setLogFunction: (label) => { fnLabel = label; },
        logSubCall: (label, status, subTokens) =>
          deps.logAi(user.id, {
            function: label, model, promptVersion: opts.promptVersion, status,
            tokenEstimate: subTokens && subTokens > 0 ? subTokens : undefined,
            requestId, latencyMs: Date.now() - startedAt,
          }).catch(() => {}),
      });

      await deps.logAi(user.id, {
        function: fnLabel, model, promptVersion: opts.promptVersion, status: 'ok',
        tokenEstimate: tokens > 0 ? tokens : undefined, requestId, latencyMs: Date.now() - startedAt,
      });
      log('info', { code: 'ok', status: 200, tokens });
      return ok(result, { requestId });
    } catch (err) {
      const isHttp = err instanceof HttpError;
      const status = isHttp ? err.status : 500;
      const code = isHttp ? err.code : 'internal_error';

      let refunded = false;
      if (metered && meterKind && userId && shouldRefund(err)) {
        await deps.releaseUsage(userId, meterKind);
        refunded = true;
      }
      if (userId) {
        await deps.logAi(userId, {
          function: fnLabel, model, promptVersion: opts.promptVersion, status: 'error',
          tokenEstimate: tokens > 0 ? tokens : undefined, requestId, latencyMs: Date.now() - startedAt,
        });
      }
      log(status >= 500 ? 'error' : 'warn', {
        code, status, refunded,
        ...(status >= 500 ? { detail: err instanceof Error ? err.message : String(err) } : {}),
      });
      return fail(err, { requestId });
    }
  };
}
