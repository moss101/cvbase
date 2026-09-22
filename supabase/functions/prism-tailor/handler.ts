import { z } from 'npm:zod@3.24.1';
import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { fail, HttpError, ok } from '../_shared/respond.ts';
import { getUser as defaultGetUser, serviceClient as defaultServiceClient } from '../_shared/auth.ts';
import {
  checkAndMeter as defaultCheckAndMeter,
  releaseUsage as defaultReleaseUsage,
  type UsageKind,
} from '../_shared/entitlement.ts';
import { shouldRefund } from '../_shared/handler.ts';
import { type AiLogMeta, logAi as defaultLogAi } from '../_shared/aiLog.ts';
import { sanitizeDeep, sanitizeText } from '../_shared/sanitize.ts';
import { routedModel } from './model_router.ts';
import type { ModelFn } from './model.ts';
import {
  buildAnalyzeGraph,
  buildGenerateGraph,
  type GenerateCheckpoint,
  type GraphHooks,
} from './graph.ts';
import { AnswerSchema, GapAnalysisSchema } from './schemas.ts';
import { PROMPT_VERSION, SCHEMA_VERSION } from './prompts.ts';

// prism-tailor: the PRISM agent pipeline (LangGraph), streamed as NDJSON.
// Production shape: every tailoring is a `prism_runs` row (the trace id).
// The row checkpoints after each agent stage, so crashed/abandoned runs
// resume from the last completed stage; users read/delete their own rows via
// RLS while all writes happen here with the service role. Events:
//   {type:'stage', stage, label}  — fixed human-readable status line per agent
//   {type:'done', result}         — final payload (questions | resume)
//   {type:'error', error, extra?} — stable error code (stream already 200)
// Raw CV/JD text lives only on the run row (wiped at finalize/prune) and in
// prompts; telemetry (prism_agent_logs) never contains it.
//
// Career OS binding (COS-013): a run may belong to an application
// (`application_id`) and record the source resume + revision it tailored
// from. `idempotency_key` makes analyze replayable: the same key returns the
// same run without a second charge. Charging rule: one metered aiAction per
// logical tailoring, reserved at analyze; generate/finalize on that run are
// unmetered; a failed run resumes without a new charge, unless our-side
// failure already refunded the charge (recorded on the run), in which case the
// resume re-reserves it — every tailoring is metered exactly once.
//
// This module is the whole request pipeline with its network dependencies
// injectable (`PrismDeps`) so tests drive it with a scripted model and an
// in-memory service client; index.ts just serves it.

const text = (min: number, max: number) => z.string().min(min).max(max);
const AnalyzeBody = z.object({
  phase: z.literal('analyze'),
  jdText: text(80, 30000),
  cvText: text(80, 40000),
  templateId: z.string().max(40).default('classic'),
  // Application binding (all optional: the standalone wizard sends none).
  applicationId: z.string().uuid().optional(),
  sourceResumeId: z.string().uuid().optional(),
  sourceResumeRevision: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().min(1).max(128).optional(),
});
const GenerateBody = z.object({
  phase: z.literal('generate'),
  runId: z.string().uuid(),
  answers: z.array(AnswerSchema).max(8),
  // The user reviewed the "your source CV changed" prompt and chose to go on.
  acknowledgeStale: z.boolean().optional(),
});
const FinalizeBody = z.object({
  phase: z.literal('finalize'),
  runId: z.string().uuid(),
  resumeId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
});
const Body = z.discriminatedUnion('phase', [AnalyzeBody, GenerateBody, FinalizeBody]);
type AnalyzeInput = z.infer<typeof AnalyzeBody>;
type GenerateInput = z.infer<typeof GenerateBody>;
type FinalizeInput = z.infer<typeof FinalizeBody>;

export const MAX_RUNS_PER_HOUR = 6;
export const ACTIVE_RUN_WINDOW_MS = 3 * 60_000;
/** Emitted once per stream when a checkpoint write failed twice in a row, so
 *  the client can tell the user the truth about what a reconnect will redo. */
export const CHECKPOINT_DEGRADED_LABEL = 'Progress could not be saved; if this stops, you will restart this step';

/** Everything the pipeline touches, injectable for tests. Production uses the
 *  real modules (see index.ts). */
export interface PrismDeps {
  getUser: (req: Request) => Promise<User>;
  serviceClient: () => SupabaseClient;
  checkAndMeter: (userId: string, kind: UsageKind) => Promise<void>;
  releaseUsage: (userId: string, kind: UsageKind) => Promise<void>;
  model: ModelFn;
  logAi: (userId: string | null, meta: AiLogMeta) => Promise<void>;
  now: () => number;
}

const defaultDeps: PrismDeps = {
  getUser: defaultGetUser,
  serviceClient: defaultServiceClient,
  checkAndMeter: defaultCheckAndMeter,
  releaseUsage: defaultReleaseUsage,
  model: routedModel,
  logAi: defaultLogAi,
  now: () => Date.now(),
};

/** FNV-1a hash → stable 0-99 bucket per user for percentage rollout. */
export function rolloutBucket(userId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

// deno-lint-ignore no-explicit-any
type Svc = SupabaseClient | any;
type RunRow = Record<string, unknown>;

async function requirePrismEnabled(svc: Svc, userId: string): Promise<void> {
  const { data } = await svc.from('feature_flags').select('enabled,rollout_pct').eq('flag', 'prism').maybeSingle();
  // Fail closed: no flag row means the feature is off.
  const inRollout = !!data?.enabled && rolloutBucket(userId) < (data?.rollout_pct ?? 0);
  if (!inRollout) throw new HttpError(403, 'feature_disabled', { feature: 'prism' });
}

async function enforceHourlyLimit(svc: Svc, userId: string, now: number): Promise<void> {
  const hourAgo = new Date(now - 3_600_000).toISOString();
  const { count } = await svc.from('prism_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('created_at', hourAgo);
  if ((count ?? 0) >= MAX_RUNS_PER_HOUR) {
    throw new HttpError(429, 'rate_limited', { limit: MAX_RUNS_PER_HOUR, window: '1h' });
  }
}

async function enforceSingleActiveRun(svc: Svc, userId: string, now: number): Promise<void> {
  const activeSince = new Date(now - ACTIVE_RUN_WINDOW_MS).toISOString();
  const { data: active } = await svc.from('prism_runs')
    .select('id')
    .eq('user_id', userId).in('status', ['analyzing', 'generating'])
    .gte('updated_at', activeSince).limit(1);
  if (active?.length) throw new HttpError(409, 'run_in_progress', { runId: active[0].id });
}

/** Ownership is enforced here at the data-access layer: every load filters on
 *  user_id with the service client (RLS additionally covers direct reads). A
 *  foreign id answers exactly like a missing one — never "exists but not
 *  yours". */
async function loadOwnRun(svc: Svc, userId: string, runId: string): Promise<RunRow> {
  const { data, error } = await svc.from('prism_runs')
    .select('*').eq('id', runId).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'run_load_failed');
  if (!data) throw new HttpError(404, 'run_not_found');
  return data as RunRow;
}

async function loadOwnApplication(svc: Svc, userId: string, applicationId: string): Promise<RunRow> {
  const { data, error } = await svc.from('job_applications')
    .select('id,current_resume_id,prism_run_id').eq('id', applicationId).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'application_load_failed');
  if (!data) throw new HttpError(404, 'application_not_found');
  return data as RunRow;
}

async function loadOwnResume(svc: Svc, userId: string, resumeId: string): Promise<RunRow> {
  const { data, error } = await svc.from('resumes')
    .select('id,revision,application_id').eq('id', resumeId).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'resume_load_failed');
  if (!data) throw new HttpError(404, 'resume_not_found');
  return data as RunRow;
}

function isActive(run: RunRow, now: number): boolean {
  if (!['analyzing', 'generating'].includes(String(run.status))) return false;
  const updated = Date.parse(String(run.updated_at ?? ''));
  return Number.isFinite(updated) && now - updated < ACTIVE_RUN_WINDOW_MS;
}

/** Usage receipt kept under the run's checkpoint jsonb: whether this run's
 *  one charge is currently held or was refunded after an our-side failure. */
type UsageReceipt = { kind: UsageKind; charged: boolean; released: boolean };
function usageOf(run: RunRow): UsageReceipt | null {
  const cp = (run.checkpoint ?? {}) as Record<string, unknown>;
  const u = cp.usage as Partial<UsageReceipt> | undefined;
  return u && typeof u === 'object' ? { kind: 'aiActions', charged: !!u.charged, released: !!u.released } : null;
}

/** Merges a fragment into the run's checkpoint jsonb; throws on a failed write. */
async function patchCheckpoint(svc: Svc, runId: string, fragment: Record<string, unknown>): Promise<void> {
  const { data } = await svc.from('prism_runs').select('checkpoint').eq('id', runId).single();
  const { error } = await svc.from('prism_runs')
    .update({ checkpoint: { ...(data?.checkpoint ?? {}), ...fragment } }).eq('id', runId);
  if (error) throw new HttpError(500, 'run_update_failed');
}

/** A resumed run whose charge was refunded re-reserves it (so the tailoring
 *  is still metered exactly once); a run whose charge is still held is free.
 *  A reservation that cannot be recorded on the run is given straight back. */
async function rechargeIfReleased(deps: PrismDeps, svc: Svc, userId: string, run: RunRow): Promise<void> {
  const usage = usageOf(run);
  if (!usage?.released) return;
  await deps.checkAndMeter(userId, 'aiActions');
  try {
    await patchCheckpoint(svc, String(run.id), { usage: { kind: 'aiActions', charged: true, released: false } });
  } catch (err) {
    await deps.releaseUsage(userId, 'aiActions');
    throw err instanceof HttpError ? err : new HttpError(500, 'run_update_failed');
  }
}

function ndjson(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' },
  });
}

/** A one-event stream: used to replay an idempotent analyze without running
 *  anything (the client consumes the same NDJSON contract either way). */
function singleEventStream(event: Record<string, unknown>): Response {
  const encoder = new TextEncoder();
  return ndjson(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      controller.close();
    },
  }));
}

/** Replays the outcome of an existing run for an idempotent analyze call.
 *  Returns null when the run should instead be (re)run in place. */
function replayFor(run: RunRow): Record<string, unknown> | null {
  const runId = String(run.id);
  switch (run.status) {
    case 'awaiting_answers':
      return { type: 'done', result: sanitizeDeep({ runId, questions: run.questions ?? [] }) };
    case 'review':
      return { type: 'done', result: run.result ?? sanitizeDeep({ runId }) };
    case 'completed':
      return { type: 'done', result: { runId, resumeId: run.resume_id ?? null } };
    default:
      // failed, or a crashed analyzing/generating row outside the active
      // window: analyze finished if questions exist → hand them back so the
      // client proceeds to generate (which resumes from the checkpoint);
      // otherwise re-run analyze on this same row below.
      return Array.isArray(run.questions)
        ? { type: 'done', result: sanitizeDeep({ runId, questions: run.questions }) }
        : null;
  }
}

interface StreamCtx {
  deps: PrismDeps;
  svc: Svc;
  user: User;
  runId: string;
  phase: 'analyze' | 'generate';
}

/** Checkpoint hooks with observable durability: a failed write is retried
 *  once; a second failure emits `checkpoint_degraded` in-band exactly once
 *  and is remembered so a later failure of this run records it. */
function runHooks(ctx: StreamCtx, send: (e: Record<string, unknown>) => void) {
  const { svc, runId } = ctx;
  const state = { checkpointFailures: 0, degradedSent: false };
  const hooks: GraphHooks = {
    onStage: (stage, label) => send({ type: 'stage', stage, label }),
    onAgent: async (t) => {
      await svc.from('prism_agent_logs').insert({
        run_id: runId, agent: t.agent, model: t.model, status: t.status,
        latency_ms: t.latencyMs, tokens: t.tokens, iteration: t.iteration,
        provider: t.provider ?? null, key_slot: t.keySlot ?? null,
        used_fallback: t.usedFallback ?? false, fallback_reason: t.fallbackReason ?? null,
      }).then(({ error }: { error: unknown }) => {
        if (error) console.error('prism_agent_logs insert failed (non-fatal):', error);
      });
    },
    onCheckpoint: async (partial) => {
      const patch: Record<string, unknown> = {};
      // Analyze-phase fragments map to columns; generate-phase fragments live
      // under the checkpoint jsonb (merged server-side below).
      if ('gap_analysis' in partial) patch.gap_analysis = partial.gap_analysis;
      const cpKeys = ['context', 'draft', 'critique', 'iteration', 'best', 'tokensUsed'];
      const cp = Object.fromEntries(Object.entries(partial).filter(([k]) => cpKeys.includes(k)));
      if (Object.keys(cp).length) {
        const { data } = await svc.from('prism_runs').select('checkpoint,tokens_used').eq('id', runId).single();
        patch.checkpoint = { ...(data?.checkpoint ?? {}), ...cp };
        if (typeof cp.tokensUsed === 'number') patch.tokens_used = cp.tokensUsed;
      }
      const write = async () => {
        try {
          const { error } = await svc.from('prism_runs').update(patch).eq('id', runId);
          return error ?? null;
        } catch (err) {
          return err;
        }
      };
      let error = await write();
      if (error) error = await write();
      if (!error) return;
      state.checkpointFailures += 1;
      console.error('prism_runs checkpoint failed twice (degraded):', error);
      if (!state.degradedSent) {
        state.degradedSent = true;
        send({ type: 'stage', stage: 'checkpoint_degraded', label: CHECKPOINT_DEGRADED_LABEL });
      }
    },
  };
  return { hooks, state };
}

function pipelineStream(ctx: StreamCtx, work: (hooks: GraphHooks, send: (e: Record<string, unknown>) => void) => Promise<void>): Response {
  const { deps, svc, user, runId, phase } = ctx;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      const { hooks, state } = runHooks(ctx, send);

      (async () => {
        try {
          await work(hooks, send);
          await deps.logAi(user.id, {
            function: `prism-tailor:${phase}`, model: 'prism-routed',
            promptVersion: PROMPT_VERSION, status: 'ok',
          });
        } catch (err) {
          // Stream is already 200: report the stable code in-band, details
          // to logs only. The run row records the failure for resume/ops; a
          // run whose checkpoints could not be saved records that instead so
          // ops and the resume path know progress is behind.
          console.error('prism-tailor pipeline error:', err);
          const code = err instanceof HttpError ? err.code : 'internal_error';
          // Our-side failure refunds the run's charge (existing shouldRefund
          // policy) and says so on the run, so a resume re-reserves it. The
          // receipt write is best-effort and separate from the status write:
          // a database that is dropping checkpoint writes must still be able
          // to record the failure itself.
          if (shouldRefund(err)) {
            await deps.releaseUsage(user.id, 'aiActions');
            await patchCheckpoint(svc, runId, { usage: { kind: 'aiActions', charged: true, released: true } })
              .catch((e) => console.error('prism_runs usage receipt failed (non-fatal):', e));
          }
          try {
            await svc.from('prism_runs').update({
              status: 'failed', error_code: state.checkpointFailures > 0 ? 'checkpoint_degraded' : code,
            }).eq('id', runId);
          } catch (e) {
            console.error('prism_runs failure status write failed:', e);
          }
          send({ type: 'error', error: code, ...(state.checkpointFailures > 0 ? { extra: { checkpointDegraded: true } } : {}) });
          await deps.logAi(user.id, {
            function: `prism-tailor:${phase}`, model: 'prism-routed', status: 'error',
          });
        } finally {
          controller.close();
        }
      })();
    },
  });
  return ndjson(stream);
}

// ---- analyze ----------------------------------------------------------------

async function handleAnalyze(deps: PrismDeps, svc: Svc, user: User, body: AnalyzeInput): Promise<Response> {
  const now = deps.now();
  // Binding ownership first: a foreign application/resume id is a 404 before
  // anything is metered or created.
  if (body.applicationId) await loadOwnApplication(svc, user.id, body.applicationId);
  if (body.sourceResumeId) await loadOwnResume(svc, user.id, body.sourceResumeId);

  let run: RunRow | null = null;
  let seededGap: unknown = null;
  if (body.idempotencyKey) {
    const { data, error } = await svc.from('prism_runs')
      .select('*').eq('user_id', user.id).eq('idempotency_key', body.idempotencyKey).maybeSingle();
    if (error) throw new HttpError(500, 'run_load_failed');
    if (data) {
      const existing = data as RunRow;
      if (isActive(existing, now)) throw new HttpError(409, 'run_in_progress', { runId: existing.id });
      const replay = replayFor(existing);
      if (replay) return singleEventStream(replay);
      // Resume analyze on this same row: no new row, no new charge (unless
      // our-side failure already refunded it — then it is re-reserved).
      await enforceSingleActiveRun(svc, user.id, now);
      await rechargeIfReleased(deps, svc, user.id, existing);
      seededGap = existing.gap_analysis ?? null;
      const { error: updateError } = await svc.from('prism_runs').update({
        status: 'analyzing', error_code: null, template_id: body.templateId,
        jd_text: sanitizeText(body.jdText), cv_text: sanitizeText(body.cvText),
        ...(body.applicationId ? { application_id: body.applicationId } : {}),
        ...(body.sourceResumeId ? { source_resume_id: body.sourceResumeId } : {}),
        ...(body.sourceResumeRevision !== undefined ? { source_resume_revision: body.sourceResumeRevision } : {}),
      }).eq('id', existing.id).eq('user_id', user.id);
      if (updateError) throw new HttpError(500, 'run_update_failed');
      run = existing;
    }
  }

  if (!run) {
    await enforceHourlyLimit(svc, user.id, now);
    await enforceSingleActiveRun(svc, user.id, now);
    // One tailoring = one metered AI action, charged here. Generate/resume
    // phases on the same run are unmetered (they require this paid row).
    await deps.checkAndMeter(user.id, 'aiActions');
    const { data, error } = await svc.from('prism_runs').insert({
      user_id: user.id, status: 'analyzing', template_id: body.templateId,
      jd_text: sanitizeText(body.jdText), cv_text: sanitizeText(body.cvText),
      schema_version: SCHEMA_VERSION, prompt_version: PROMPT_VERSION,
      application_id: body.applicationId ?? null,
      source_resume_id: body.sourceResumeId ?? null,
      source_resume_revision: body.sourceResumeRevision ?? null,
      idempotency_key: body.idempotencyKey ?? null,
      checkpoint: { usage: { kind: 'aiActions', charged: true, released: false } },
    }).select('id').single();
    if (error || !data) {
      // The user got nothing: give the reservation back. A duplicate key
      // means a concurrent call with the same key already owns the run.
      await deps.releaseUsage(user.id, 'aiActions');
      if (error?.code === '23505' && body.idempotencyKey) {
        const { data: dup } = await svc.from('prism_runs').select('id')
          .eq('user_id', user.id).eq('idempotency_key', body.idempotencyKey).maybeSingle();
        throw new HttpError(409, 'run_in_progress', { runId: dup?.id ?? null });
      }
      throw new HttpError(500, 'run_create_failed');
    }
    run = { id: data.id };
  }
  const runId = String(run.id);

  if (body.applicationId) {
    // The application points at its latest run (prism_runs.application_id is
    // the authoritative edge; finalize re-asserts this pointer).
    const { error } = await svc.from('job_applications').update({ prism_run_id: runId })
      .eq('id', body.applicationId).eq('user_id', user.id);
    if (error) console.error('job_applications.prism_run_id update failed (non-fatal):', error);
  }

  const ctx: StreamCtx = { deps, svc, user, runId, phase: 'analyze' };
  return pipelineStream(ctx, async (hooks, send) => {
    const graph = buildAnalyzeGraph(deps.model, hooks);
    const gap = seededGap ? GapAnalysisSchema.safeParse(seededGap) : null;
    const out = await graph.invoke({
      cvText: body.cvText, jdText: body.jdText,
      ...(gap?.success ? { gapAnalysis: gap.data } : {}),
    });
    const { error } = await svc.from('prism_runs').update({
      status: 'awaiting_answers',
      questions: out.questions, tokens_used: out.tokensUsed,
    }).eq('id', runId);
    if (error) throw new HttpError(500, 'run_update_failed');
    send({ type: 'done', result: sanitizeDeep({ runId, questions: out.questions }) });
  });
}

// ---- generate ---------------------------------------------------------------

async function handleGenerate(deps: PrismDeps, svc: Svc, user: User, body: GenerateInput): Promise<Response> {
  const run = await loadOwnRun(svc, user.id, body.runId);
  if (!['awaiting_answers', 'generating', 'failed'].includes(String(run.status))) {
    throw new HttpError(409, 'run_not_resumable', { status: run.status });
  }
  if (!run.jd_text || !run.cv_text || !run.gap_analysis) {
    // Pruned or never finished analyze — too old to resume.
    throw new HttpError(410, 'run_expired');
  }
  // A bound run must still have its application (and it must be the caller's).
  if (run.application_id) await loadOwnApplication(svc, user.id, String(run.application_id));
  // Source drift check: the resume this run tailored from may have moved on.
  let staleRevision: number | null | undefined;
  if (run.source_resume_id && run.source_resume_revision !== null && run.source_resume_revision !== undefined) {
    const { data, error } = await svc.from('resumes').select('id,revision')
      .eq('id', String(run.source_resume_id)).eq('user_id', user.id).maybeSingle();
    if (error) throw new HttpError(500, 'resume_load_failed');
    const current = data ? Number(data.revision ?? 1) : null;
    if (current !== Number(run.source_resume_revision)) staleRevision = current;
  }
  if (staleRevision !== undefined && !body.acknowledgeStale) {
    // Not a failure: the run stays where it is; the client shows a review
    // prompt and re-sends with acknowledgeStale once the user decides.
    return singleEventStream({ type: 'error', error: 'source_stale', extra: { currentRevision: staleRevision } });
  }
  await rechargeIfReleased(deps, svc, user.id, run);
  const runId = body.runId;

  const ctx: StreamCtx = { deps, svc, user, runId, phase: 'generate' };
  return pipelineStream(ctx, async (hooks, send) => {
    const { error: startError } = await svc.from('prism_runs').update({
      status: 'generating', answers: body.answers, error_code: null,
    }).eq('id', runId);
    if (startError) throw new HttpError(500, 'run_update_failed');
    const cp = (run.checkpoint ?? {}) as GenerateCheckpoint;
    const gap = GapAnalysisSchema.safeParse(run.gap_analysis);
    if (!gap.success) throw new HttpError(500, 'run_corrupt');
    const graph = buildGenerateGraph(deps.model, hooks);
    const out = await graph.invoke({
      cvText: String(run.cv_text ?? ''),
      jdText: String(run.jd_text ?? ''),
      gapAnalysis: gap.data,
      answers: body.answers,
      context: cp.context ?? null,
      draft: cp.draft ?? null,
      critique: cp.critique ?? null,
      iteration: cp.iteration ?? 0,
      best: cp.best ?? null,
      tokensUsed: cp.tokensUsed ?? (run.tokens_used as number ?? 0),
    });
    const result = sanitizeDeep({
      runId,
      resume: out.resume,
      atsScore: out.atsScore,
      unresolvedIssues: out.unresolvedIssues,
    });
    const { error } = await svc.from('prism_runs').update({
      status: 'review', result, tokens_used: out.tokensUsed,
    }).eq('id', runId);
    if (error) throw new HttpError(500, 'run_update_failed');
    send({ type: 'done', result });
  });
}

// ---- finalize ---------------------------------------------------------------

async function handleFinalize(svc: Svc, user: User, body: FinalizeInput): Promise<Response> {
  const run = await loadOwnRun(svc, user.id, body.runId);
  const boundApplication = run.application_id ? String(run.application_id) : null;
  if (body.applicationId && boundApplication && body.applicationId !== boundApplication) {
    throw new HttpError(409, 'application_mismatch', { applicationId: boundApplication });
  }
  const applicationId = body.applicationId ?? boundApplication;
  // Idempotent: a repeated finalize for the same resume is a success, not a
  // conflict (the client retries on transient failures).
  if (run.status === 'completed') {
    if (String(run.resume_id ?? '') !== body.resumeId) {
      throw new HttpError(409, 'run_not_reviewable', { status: run.status });
    }
    return ok({ runId: body.runId, status: 'completed', applicationId, resumeId: body.resumeId });
  }
  if (run.status !== 'review') throw new HttpError(409, 'run_not_reviewable', { status: run.status });
  await loadOwnResume(svc, user.id, body.resumeId);

  if (applicationId) {
    await loadOwnApplication(svc, user.id, applicationId);
    // Link FIRST, complete SECOND: if linking fails the run stays in
    // `review` and the client can retry the whole finalize; if completion
    // fails after linking, the retry redoes the same idempotent updates.
    const origin = {
      kind: 'prism', runId: body.runId,
      sourceResumeId: run.source_resume_id ?? null,
      sourceRevision: run.source_resume_revision ?? null,
    };
    const [appRes, resumeRes] = await Promise.all([
      svc.from('job_applications').update({ current_resume_id: body.resumeId, prism_run_id: body.runId })
        .eq('id', applicationId).eq('user_id', user.id),
      svc.from('resumes').update({ application_id: applicationId, origin })
        .eq('id', body.resumeId).eq('user_id', user.id),
    ]);
    if (appRes.error || resumeRes.error) {
      console.error('finalize link failed:', appRes.error ?? resumeRes.error);
      throw new HttpError(500, 'finalize_link_failed', { retryable: true });
    }
  }

  // Data minimization: the approved resume row is now the source of truth —
  // wipe personal text and intermediates, keep telemetry+versions.
  const { error } = await svc.from('prism_runs').update({
    status: 'completed', resume_id: body.resumeId,
    jd_text: null, cv_text: null, checkpoint: {},
    gap_analysis: null, questions: null, answers: null, result: null,
  }).eq('id', body.runId).eq('user_id', user.id);
  if (error) throw new HttpError(500, 'finalize_failed', { retryable: true });
  return ok({ runId: body.runId, status: 'completed', applicationId, resumeId: body.resumeId });
}

// ---- request entry ------------------------------------------------------------

export async function handlePrismRequest(req: Request, overrides: Partial<PrismDeps> = {}): Promise<Response> {
  const deps: PrismDeps = { ...defaultDeps, ...overrides };
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await deps.getUser(req);
    userId = user.id;
    const raw = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, 'invalid_request');
    const body = parsed.data;
    const svc = deps.serviceClient();

    await requirePrismEnabled(svc, user.id);

    if (body.phase === 'finalize') return await handleFinalize(svc, user, body);
    if (body.phase === 'analyze') return await handleAnalyze(deps, svc, user, body);
    return await handleGenerate(deps, svc, user, body);
  } catch (err) {
    if (userId) {
      await deps.logAi(userId, { function: 'prism-tailor', model: 'prism-routed', status: 'error' });
    }
    return fail(err);
  }
}
