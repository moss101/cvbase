import { z } from 'npm:zod@3.24.1';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { fail, HttpError, ok } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { checkAndMeter } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { sanitizeDeep, sanitizeText } from '../_shared/sanitize.ts';
import { routedModel } from './model_router.ts';
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
//   {type:'error', error}         — stable error code (stream already 200)
// Raw CV/JD text lives only on the run row (wiped at finalize/prune) and in
// prompts; telemetry (prism_agent_logs) never contains it.

const text = (min: number, max: number) => z.string().min(min).max(max);
const AnalyzeBody = z.object({
  phase: z.literal('analyze'),
  jdText: text(80, 30000),
  cvText: text(80, 40000),
  templateId: z.string().max(40).default('classic'),
});
const GenerateBody = z.object({
  phase: z.literal('generate'),
  runId: z.string().uuid(),
  answers: z.array(AnswerSchema).max(8),
});
const FinalizeBody = z.object({
  phase: z.literal('finalize'),
  runId: z.string().uuid(),
  resumeId: z.string().uuid(),
});
const Body = z.discriminatedUnion('phase', [AnalyzeBody, GenerateBody, FinalizeBody]);

const MAX_RUNS_PER_HOUR = 6;
const ACTIVE_RUN_WINDOW_MS = 3 * 60_000;

/** FNV-1a hash → stable 0-99 bucket per user for percentage rollout. */
function rolloutBucket(userId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

// deno-lint-ignore no-explicit-any
type Svc = ReturnType<typeof serviceClient> | any;

async function requirePrismEnabled(svc: Svc, userId: string): Promise<void> {
  const { data } = await svc.from('feature_flags').select('enabled,rollout_pct').eq('flag', 'prism').maybeSingle();
  // Fail closed: no flag row means the feature is off.
  const inRollout = !!data?.enabled && rolloutBucket(userId) < (data?.rollout_pct ?? 0);
  if (!inRollout) throw new HttpError(403, 'feature_disabled', { feature: 'prism' });
}

async function enforceRateLimits(svc: Svc, userId: string): Promise<void> {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await svc.from('prism_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('created_at', hourAgo);
  if ((count ?? 0) >= MAX_RUNS_PER_HOUR) {
    throw new HttpError(429, 'rate_limited', { limit: MAX_RUNS_PER_HOUR, window: '1h' });
  }
  const activeSince = new Date(Date.now() - ACTIVE_RUN_WINDOW_MS).toISOString();
  const { data: active } = await svc.from('prism_runs')
    .select('id')
    .eq('user_id', userId).in('status', ['analyzing', 'generating'])
    .gte('updated_at', activeSince).limit(1);
  if (active?.length) throw new HttpError(409, 'run_in_progress', { runId: active[0].id });
}

/** Ownership is enforced here at the data-access layer: every load filters on
 *  user_id with the service client (RLS additionally covers direct reads). */
async function loadOwnRun(svc: Svc, userId: string, runId: string) {
  const { data, error } = await svc.from('prism_runs')
    .select('*').eq('id', runId).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'run_load_failed');
  if (!data) throw new HttpError(404, 'run_not_found');
  return data as Record<string, unknown>;
}

function runHooks(
  svc: Svc,
  runId: string,
  send: (e: Record<string, unknown>) => void,
): GraphHooks {
  return {
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
      const { error } = await svc.from('prism_runs').update(patch).eq('id', runId);
      if (error) console.error('prism_runs checkpoint failed (non-fatal):', error);
    },
  };
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const raw = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, 'invalid_request');
    const body = parsed.data;
    const svc = serviceClient();

    await requirePrismEnabled(svc, user.id);

    // ---- finalize: plain JSON, no stream --------------------------------
    if (body.phase === 'finalize') {
      const run = await loadOwnRun(svc, user.id, body.runId);
      if (run.status !== 'review') throw new HttpError(409, 'run_not_reviewable', { status: run.status });
      // Data minimization: the approved resume row is now the source of
      // truth — wipe personal text and intermediates, keep telemetry+versions.
      const { error } = await svc.from('prism_runs').update({
        status: 'completed', resume_id: body.resumeId,
        jd_text: null, cv_text: null, checkpoint: {},
        gap_analysis: null, questions: null, answers: null, result: null,
      }).eq('id', body.runId);
      if (error) throw new HttpError(500, 'finalize_failed');
      return ok({ runId: body.runId, status: 'completed' });
    }

    // ---- analyze / generate: NDJSON stream -------------------------------
    let runId: string;
    if (body.phase === 'analyze') {
      await enforceRateLimits(svc, user.id);
      // One tailoring = one metered AI action, charged here. Generate/resume
      // phases on the same run are unmetered (they require this paid row).
      await checkAndMeter(user.id, 'aiActions');
      const { data, error } = await svc.from('prism_runs').insert({
        user_id: user.id, status: 'analyzing', template_id: body.templateId,
        jd_text: sanitizeText(body.jdText), cv_text: sanitizeText(body.cvText),
        schema_version: SCHEMA_VERSION, prompt_version: PROMPT_VERSION,
      }).select('id').single();
      if (error || !data) throw new HttpError(500, 'run_create_failed');
      runId = data.id as string;
    } else {
      const run = await loadOwnRun(svc, user.id, body.runId);
      if (!['awaiting_answers', 'generating', 'failed'].includes(String(run.status))) {
        throw new HttpError(409, 'run_not_resumable', { status: run.status });
      }
      if (!run.jd_text || !run.cv_text || !run.gap_analysis) {
        // Pruned or never finished analyze — too old to resume.
        throw new HttpError(410, 'run_expired');
      }
      runId = body.runId;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        const hooks = runHooks(svc, runId, send);

        (async () => {
          try {
            if (body.phase === 'analyze') {
              const graph = buildAnalyzeGraph(routedModel, hooks);
              const out = await graph.invoke({ cvText: body.cvText, jdText: body.jdText });
              await svc.from('prism_runs').update({
                status: 'awaiting_answers',
                questions: out.questions, tokens_used: out.tokensUsed,
              }).eq('id', runId);
              send({
                type: 'done',
                result: sanitizeDeep({ runId, questions: out.questions }),
              });
            } else {
              const run = await loadOwnRun(svc, user.id, runId);
              await svc.from('prism_runs').update({
                status: 'generating', answers: body.answers, error_code: null,
              }).eq('id', runId);
              const cp = (run.checkpoint ?? {}) as GenerateCheckpoint;
              const gap = GapAnalysisSchema.safeParse(run.gap_analysis);
              if (!gap.success) throw new HttpError(500, 'run_corrupt');
              const graph = buildGenerateGraph(routedModel, hooks);
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
              await svc.from('prism_runs').update({
                status: 'review', result, tokens_used: out.tokensUsed,
              }).eq('id', runId);
              send({ type: 'done', result });
            }
            await logAi(user.id, {
              function: `prism-tailor:${body.phase}`, model: 'prism-routed',
              promptVersion: PROMPT_VERSION, status: 'ok',
            });
          } catch (err) {
            // Stream is already 200: report the stable code in-band, details
            // to logs only. The run row records the failure for resume/ops.
            console.error('prism-tailor pipeline error:', err);
            const code = err instanceof HttpError ? err.code : 'internal_error';
            await svc.from('prism_runs').update({
              status: 'failed', error_code: code,
            }).eq('id', runId).then(() => {});
            send({ type: 'error', error: code });
            await logAi(user.id, {
              function: `prism-tailor:${body.phase}`, model: 'prism-routed', status: 'error',
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' },
    });
  } catch (err) {
    if (userId) {
      await logAi(userId, { function: 'prism-tailor', model: 'prism-routed', status: 'error' });
    }
    return fail(err);
  }
});
