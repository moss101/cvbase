import { z } from 'npm:zod@3.24.1';
import { createClient, type User } from 'jsr:@supabase/supabase-js@2';
import { handleOptions } from '../_shared/cors.ts';
import { fail, HttpError, ok } from '../_shared/respond.ts';
import { getUser as defaultGetUser, serviceClient as defaultServiceClient } from '../_shared/auth.ts';
import { checkAndMeter as defaultCheckAndMeter, releaseUsage as defaultReleaseUsage, type UsageKind } from '../_shared/entitlement.ts';
import { enforceRateLimit as defaultEnforceRateLimit, type RateLimitClient, type RateLimitOpts } from '../_shared/rateLimit.ts';
import { requireCareerOs as defaultRequireCareerOs } from '../_shared/careerFlag.ts';
import { readJsonBody } from '../_shared/body.ts';
import { resolveRequestId, shouldRefund } from '../_shared/handler.ts';
import { llmJsonMetered } from '../_shared/llm.ts';
import type { Db } from './context.ts';
import { type AnyTool, CANCEL_RUN, CancelRunInput, confirmationFor, getTool, type LlmJsonFn, prepare, type ToolContext } from './tools.ts';
import { contentHash, newConfirmation, type Revisions, verifyConfirmation } from './policy.ts';
import {
  type ActionRunRow,
  createOrReuseRun,
  emitActionExecuted,
  isActive,
  isInterrupted,
  loadRun,
  markCancelled,
  markCompleted,
  markFailed,
  markInterrupted,
  markRetry,
  markRunning,
  markWaiting,
  reconcileTailoring,
  type RunUsage,
  updateRun,
} from './receipts.ts';

// =========================================================================
// career-gateway — the typed Coach action gateway (COS-026).
//
// One request = one registered tool call bound to a durable receipt
// (`action_runs`, keyed by user + idempotencyKey). The pipeline mirrors
// withAiHandler's shape but is written out here because only tools that
// declare `charging: 'aiAction'` are metered, and the receipt — not the
// HTTP response — is the source of truth for what happened:
//
//   OPTIONS/CORS → POST → request id → auth → capped JSON body → zod →
//   career_os flag → rate limit → dispatch (receipt reuse/retry →
//   prerequisites + stale-context → confirmation → charge → handler with
//   timeout → receipt completed/failed → domain event) → JSON
//
// Every dep is injectable so the tests run the real pipeline against an
// in-memory database and a scripted model.
// =========================================================================

export interface GatewayDeps {
  getUser: (req: Request) => Promise<User>;
  serviceClient: () => Db;
  /** RLS-scoped client on the caller's JWT (auth.uid() inside RPCs). */
  userClient: (req: Request) => Db;
  checkAndMeter: (userId: string, kind: UsageKind) => Promise<void>;
  releaseUsage: (userId: string, kind: UsageKind) => Promise<void>;
  enforceRateLimit: (svc: RateLimitClient, userId: string, bucket: string, opts: RateLimitOpts) => Promise<unknown>;
  requireCareerOs: (svc: Db, userId: string) => Promise<void>;
  llm: LlmJsonFn;
  now: () => number;
}

const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT: RateLimitOpts = { perHour: 600, perMinute: 60 };
export const GATEWAY_BUCKET = 'career-gateway';

export const GatewayBody = z.object({
  tool: z.string().min(1).max(64),
  input: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().min(8).max(128),
  actionId: z.string().uuid().optional(),
  confirmation: z.object({ token: z.string().min(16).max(128), contentHash: z.string().length(64) }).optional(),
  contextRevisions: z.record(z.string().max(80), z.union([z.number(), z.string().max(80)])).optional(),
  requestId: z.string().max(64).optional(),
});
export type GatewayRequest = z.infer<typeof GatewayBody>;

function defaultUserClient(req: Request): Db {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  }) as unknown as Db;
}

const defaultLlm: LlmJsonFn = async (prompt, opts) => {
  const r = await llmJsonMetered<unknown>(prompt, opts);
  return { data: r.data, tokens: r.tokens };
};

function resolveDeps(over: Partial<GatewayDeps>): GatewayDeps {
  return {
    getUser: defaultGetUser,
    serviceClient: () => defaultServiceClient() as unknown as Db,
    userClient: defaultUserClient,
    checkAndMeter: defaultCheckAndMeter,
    releaseUsage: defaultReleaseUsage,
    enforceRateLimit: defaultEnforceRateLimit,
    requireCareerOs: defaultRequireCareerOs,
    llm: defaultLlm,
    now: Date.now,
    ...over,
  };
}

type LogFn = (level: 'info' | 'warn' | 'error', fields?: Record<string, unknown>) => void;

/** The receipt as the client sees it: the confirmation token travels only in
 *  `confirmationRequired`, never inside the run object. */
export function publicRun(run: ActionRunRow): Record<string, unknown> {
  const { confirmation, ...rest } = run;
  return {
    ...rest,
    confirmation: confirmation ? { contentHash: confirmation.contentHash, destination: confirmation.destination, expiresAt: confirmation.expiresAt, confirmedAt: confirmation.confirmedAt } : null,
  };
}

/** Attach the receipt to an error so the client always sees what was
 *  recorded. Unexpected throws are masked to 500 `internal_error` here (the
 *  detail already went to the structured log) so the receipt still rides
 *  along instead of being dropped by the generic masking in respond.ts. */
function withRun(err: unknown, run: ActionRunRow | null): HttpError {
  const e = err instanceof HttpError ? err : new HttpError(500, 'internal_error');
  if (run) e.extra = { ...(e.extra ?? {}), run: publicRun(run) };
  return e;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(504, 'timeout', { ms })), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

interface Dispatch {
  deps: GatewayDeps;
  svc: Db;
  userDb: Db;
  userId: string;
  requestId: string;
  body: GatewayRequest;
  log: LogFn;
}

async function cancelRun(d: Dispatch): Promise<Record<string, unknown>> {
  const parsed = CancelRunInput.safeParse(d.body.input);
  if (!parsed.success) throw new HttpError(400, 'invalid_request', { issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })) });
  let run = await loadRun(d.svc, d.userId, parsed.data.runId);
  if (!run) throw new HttpError(404, 'not_found', { entity: 'run' });
  // Cancelling halts further steps; side effects already committed stay
  // visible through the receipt's result_ref and the owned rows.
  if (isActive(run.status)) run = await markCancelled(d.svc, run, d.deps.now());
  d.log('info', { code: 'cancelled', runId: run.id, status: run.status });
  return { run: publicRun(run) };
}

async function replay(tool: AnyTool, ctx: ToolContext, run: ActionRunRow, input: unknown): Promise<unknown> {
  if (tool.rehydrate && run.result_ref) return await tool.rehydrate(ctx, run.result_ref);
  // Read tools carry no persisted result; re-project current data.
  const pre = await prepare(tool, ctx, input, undefined);
  return await tool.handler(ctx, input, pre);
}

async function dispatch(d: Dispatch): Promise<Record<string, unknown>> {
  if (d.body.tool === CANCEL_RUN) return await cancelRun(d);

  const tool = getTool(d.body.tool);
  if (!tool) throw new HttpError(400, 'unknown_tool', { tool: d.body.tool });
  const parsed = tool.input.safeParse(d.body.input);
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_request', { tool: tool.name, issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  const input = parsed.data;
  const now = d.deps.now();

  // ---- receipt: create, reuse, reconcile or retry --------------------------
  let { run, created } = await createOrReuseRun(d.svc, {
    userId: d.userId, tool: tool.name, idempotencyKey: d.body.idempotencyKey, requestId: d.requestId,
    actionId: d.body.actionId, contextRevisions: d.body.contextRevisions as Revisions | undefined,
    inputSummary: tool.summarizeInput(input),
  });
  let tokens = 0;
  const ctx: ToolContext = {
    db: d.svc, userDb: d.userDb, userId: d.userId, requestId: d.requestId, run, llm: d.deps.llm, now: d.deps.now,
    addTokens: (n) => { if (Number.isFinite(n) && n > 0) tokens += n; },
  };

  if (!created) {
    if (run.tool !== tool.name) throw new HttpError(400, 'invalid_request', { reason: 'idempotency_key_reused', run: publicRun(run) });
    run = await reconcileTailoring(d.svc, run, now);
    if (isInterrupted(run, now)) run = await markInterrupted(d.svc, run, now);
    ctx.run = run;
    switch (run.status) {
      case 'completed':
        d.log('info', { code: 'replay', runId: run.id });
        return { run: publicRun(run), result: await replay(tool, ctx, run, input) };
      case 'cancelled':
        return { run: publicRun(run) };
      case 'running':
        if (!tool.completes && tool.rehydrate && run.result_ref) return { run: publicRun(run), result: await tool.rehydrate(ctx, run.result_ref) };
        throw new HttpError(409, 'run_in_progress', { run: publicRun(run) });
      case 'failed':
        run = await markRetry(d.svc, run, d.requestId, d.body.contextRevisions as Revisions | undefined);
        ctx.run = run;
        break;
      case 'pending':
      case 'waiting_confirmation':
        break;
    }
  }

  // ---- prerequisites: ownership + revisions ------------------------------
  let pre;
  try {
    pre = await prepare(tool, ctx, input, d.body.contextRevisions as Revisions | undefined);
  } catch (err) {
    run = await markFailed(d.svc, run, err, run.usage ?? {}, now);
    throw withRun(err, run);
  }

  // ---- confirmation bound to the exact content ---------------------------
  const policy = confirmationFor(tool, pre, input);
  if (policy !== 'none') {
    const proposal = await tool.summarize(ctx, input, pre);
    const hash = await contentHash({ tool: tool.name, policy, content: proposal.hashInput, destination: proposal.destination ?? null });
    if (!d.body.confirmation) {
      const pending = run.status === 'waiting_confirmation' ? run.confirmation : null;
      const reusable = pending && !pending.confirmedAt && pending.contentHash === hash && new Date(pending.expiresAt).getTime() > now;
      const conf = reusable ? pending : newConfirmation(hash, proposal.destination, now);
      run = await markWaiting(d.svc, run, conf);
      d.log('info', { code: 'confirmation_required', runId: run.id, policy });
      return {
        run: publicRun(run),
        confirmationRequired: {
          token: conf.token, contentHash: conf.contentHash, summary: proposal.summary,
          ...(proposal.destination ? { destination: proposal.destination } : {}), expiresAt: conf.expiresAt, policy,
        },
      };
    }
    try {
      verifyConfirmation(run.confirmation, d.body.confirmation, hash, now);
    } catch (err) {
      // Any mismatch or expiry burns the token: the next call re-proposes.
      run = await updateRun(d.svc, run, { status: 'pending', confirmation: null });
      throw withRun(err, run);
    }
    run = await markRunning(d.svc, run, { confirmation: { ...run.confirmation!, confirmedAt: new Date(now).toISOString() } }, now);
  } else {
    run = await markRunning(d.svc, run, {}, now);
  }
  ctx.run = run;

  // ---- charge (only tools that call a model) -----------------------------
  const usage: RunUsage = {};
  if (tool.charging === 'aiAction') {
    usage.kind = 'aiActions';
    try {
      await d.deps.checkAndMeter(d.userId, 'aiActions');
      usage.charged = true;
    } catch (err) {
      usage.charged = false;
      run = await markFailed(d.svc, run, err, usage, now);
      throw withRun(err, run);
    }
  }

  // ---- execute -----------------------------------------------------------
  const startedAt = Date.now();
  let result: unknown;
  try {
    result = await withTimeout(tool.handler(ctx, input, pre), tool.timeoutMs);
  } catch (err) {
    if (usage.charged && shouldRefund(err)) {
      await d.deps.releaseUsage(d.userId, 'aiActions');
      usage.released = true;
    }
    run = await markFailed(d.svc, run, err, usage, d.deps.now());
    d.log(err instanceof HttpError && err.status < 500 ? 'warn' : 'error', {
      code: err instanceof HttpError ? err.code : 'internal_error', runId: run.id, tool: tool.name, released: !!usage.released,
      ...(err instanceof HttpError && err.status < 500 ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    });
    throw withRun(err, run);
  }

  const ref = tool.resultRef(result);
  if (tool.completes) {
    run = await markCompleted(d.svc, run, ref, usage, d.deps.now());
    await emitActionExecuted(d.svc, run, Date.now() - startedAt, !!usage.charged);
  } else {
    run = await updateRun(d.svc, run, { result_ref: ref, usage });
  }
  d.log('info', { code: 'ok', runId: run.id, tool: tool.name, status: run.status, tokens, charged: !!usage.charged });
  return { run: publicRun(run), result };
}

export async function handleGatewayRequest(req: Request, over: Partial<GatewayDeps> = {}): Promise<Response> {
  const pre = handleOptions(req);
  if (pre) return pre;
  const deps = resolveDeps(over);
  const requestId = resolveRequestId(req);
  const startedAt = Date.now();
  let userId: string | null = null;
  const log: LogFn = (level, fields = {}) => {
    const line = { level, fn: 'career-gateway', requestId, userId, ms: Date.now() - startedAt, ...fields };
    (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(JSON.stringify(line));
  };

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
    const user = await deps.getUser(req);
    userId = user.id;
    const raw = await readJsonBody(req, MAX_BODY_BYTES);
    const parsed = GatewayBody.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_request', { issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })) });
    }
    const svc = deps.serviceClient();
    await deps.requireCareerOs(svc, user.id);
    await deps.enforceRateLimit(svc as unknown as RateLimitClient, user.id, GATEWAY_BUCKET, RATE_LIMIT);
    const payload = await dispatch({
      deps, svc, userDb: deps.userClient(req), userId: user.id, requestId, body: parsed.data, log,
    });
    return ok(payload, { requestId });
  } catch (err) {
    const isHttp = err instanceof HttpError;
    const status = isHttp ? err.status : 500;
    log(status >= 500 ? 'error' : 'warn', {
      code: isHttp ? err.code : 'internal_error', status,
      ...(status >= 500 ? { detail: err instanceof Error ? err.message : String(err) } : {}),
    });
    return fail(err, { requestId });
  }
}

if (import.meta.main) Deno.serve((req) => handleGatewayRequest(req));
