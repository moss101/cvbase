import { z } from 'npm:zod@3.24.1';
import { type HandlerDeps, shouldRefund, withAiHandler } from '../_shared/handler.ts';
import { HttpError } from '../_shared/respond.ts';
import { llmJsonMetered, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { checkAndMeter as defaultCheckAndMeter, releaseUsage as defaultReleaseUsage } from '../_shared/entitlement.ts';
import { requireCareerOs as defaultRequireCareerOs } from '../_shared/careerFlag.ts';
import { sanitizeText } from '../_shared/sanitize.ts';
import { type Db, type FactRow, loadActiveFacts, loadApplication, loadOwned, type OpportunityRow, requireOwned, type Row } from '../career-gateway/context.ts';
import type { LlmJsonFn } from '../career-gateway/tools.ts';
import { sha256Hex } from '../career-gateway/policy.ts';
import {
  buildFeedbackPrompt,
  buildQuestionsPrompt,
  FEEDBACK_SCHEMA,
  INTERVIEW_PROMPT_VERSION,
  INTERVIEW_SYSTEM,
  MAX_QUESTIONS,
  QUESTIONS_SCHEMA,
  type Theme,
} from './prompts.ts';

// =========================================================================
// ai-interview — the bounded AI operation for evidence-based interview
// preparation (COS-024). Two modes on an owned interview_sessions row:
//
//   questions — generate ≤ 8 practice questions tagged with a theme and the
//               fact ids they draw on; appended idempotently by question hash.
//   feedback  — for one answered practice item, strengths/gaps/citations
//               (fact ids ⊆ provided). Abstains — without metering — when
//               the answer is shorter than 20 characters or no facts exist.
//
// Metering is manual (`meter: null` on the pipeline): one AI action is
// charged only when a model is actually called, and released when the call
// fails on our side. No emotion/personality/voice scoring exists here.
// =========================================================================

export const InterviewBody = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(['questions', 'feedback']),
  practiceItemId: z.string().min(1).max(80).optional(),
});

export interface InterviewDeps {
  llm: LlmJsonFn;
  requireCareerOs: (svc: Db, userId: string) => Promise<void>;
  now: () => number;
}

export const MIN_ANSWER_CHARS = 20;
const FACT_LIMIT = 20;

const defaultLlm: LlmJsonFn = async (prompt, opts) => {
  const r = await llmJsonMetered<unknown>(prompt, opts);
  return { data: r.data, tokens: r.tokens };
};

interface PracticeItem {
  id: string;
  question: string;
  themeId: string;
  factIds: string[];
  answer: string;
  feedback: { strengths: string[]; gaps: string[]; citations: string[]; abstained: boolean; reason?: string } | null;
  answeredAt: string | null;
  feedbackAt?: string | null;
}

function practiceOf(session: Row): PracticeItem[] {
  return Array.isArray(session.practice) ? session.practice as PracticeItem[] : [];
}

function themesOf(session: Row): Theme[] {
  return Array.isArray(session.themes) ? session.themes as Theme[] : [];
}

/** Checklist readiness: covered themes = themes with at least one practice
 *  item that received non-abstained feedback. Never a percentage score. */
export function computeReadiness(themes: Theme[], practice: PracticeItem[], at: string) {
  const covered = new Set(practice.filter((p) => p.feedback && !p.feedback.abstained).map((p) => p.themeId));
  return {
    themesTotal: themes.length,
    themesCovered: themes.filter((t) => covered.has(t.id)).length,
    remainingThemes: themes.filter((t) => !covered.has(t.id)).map((t) => t.id),
    practiceTotal: practice.length,
    practiceAnswered: practice.filter((p) => p.answer.trim().length > 0).length,
    practiceWithFeedback: practice.filter((p) => p.feedback && !p.feedback.abstained).length,
    computedAt: at,
  };
}

async function loadSessionFacts(svc: Db, userId: string, session: Row): Promise<FactRow[]> {
  const storyIds = Array.isArray(session.story_fact_ids) ? (session.story_fact_ids as string[]).slice(0, FACT_LIMIT) : [];
  const facts: FactRow[] = [];
  const seen = new Set<string>();
  if (storyIds.length) {
    // Story candidates first; a withdrawn/deleted one is simply skipped.
    const { data } = await svc.from('career_facts').select('*').eq('user_id', userId).in('id', storyIds).eq('status', 'active');
    for (const f of (data ?? []) as FactRow[]) { if (!seen.has(f.id)) { seen.add(f.id); facts.push(f); } }
  }
  if (facts.length < FACT_LIMIT) {
    for (const f of await loadActiveFacts(svc, userId, { limit: FACT_LIMIT })) {
      if (facts.length >= FACT_LIMIT) break;
      if (!seen.has(f.id)) { seen.add(f.id); facts.push(f); }
    }
  }
  return facts;
}

const strings = (v: unknown, max: number, each: number): string[] =>
  (Array.isArray(v) ? v : []).map((s) => sanitizeText(s).slice(0, each)).filter(Boolean).slice(0, max);

export function buildInterviewHandler(over: Partial<HandlerDeps & InterviewDeps> = {}) {
  const deps: InterviewDeps = {
    llm: over.llm ?? defaultLlm,
    requireCareerOs: over.requireCareerOs ?? defaultRequireCareerOs,
    now: over.now ?? Date.now,
  };
  const checkAndMeter = over.checkAndMeter ?? defaultCheckAndMeter;
  const releaseUsage = over.releaseUsage ?? defaultReleaseUsage;

  /** One metered AI action around `fn` (model call + validation + persist):
   *  charge first, refund when the failure is ours (outage, bad output, 5xx)
   *  so the user is never charged for nothing. */
  const charged = async <T>(userId: string, fn: () => Promise<T>): Promise<T> => {
    await checkAndMeter(userId, 'aiActions');
    try {
      return await fn();
    } catch (err) {
      if (shouldRefund(err)) await releaseUsage(userId, 'aiActions');
      throw err;
    }
  };
  const callModel = (prompt: string, schema: unknown) => deps.llm(prompt, { schema, system: INTERVIEW_SYSTEM, timeoutMs: 60_000 });

  return withAiHandler('ai-interview', {
    schema: InterviewBody,
    meter: null,
    rateLimit: { perHour: 60, perMinute: 10 },
    model: ROUTED_MODEL_LABEL,
    promptVersion: INTERVIEW_PROMPT_VERSION,
    deps: over,
  }, async (ctx) => {
    const svc = ctx.svc as unknown as Db;
    await deps.requireCareerOs(svc, ctx.userId);
    ctx.setLogFunction(`ai-interview:${ctx.body.mode}`);
    const nowIso = new Date(deps.now()).toISOString();

    const session = await requireOwned(svc, 'interview_sessions', ctx.userId, ctx.body.sessionId, 'interview');
    const application = await loadApplication(svc, ctx.userId, session.application_id as string);
    const opportunity = application.opportunity_id ? await loadOwned<OpportunityRow>(svc, 'opportunities', ctx.userId, application.opportunity_id) : null;
    const facts = await loadSessionFacts(svc, ctx.userId, session);
    const themes = themesOf(session);
    const practice = practiceOf(session);
    const allowedFacts = new Set(facts.map((f) => f.id));
    const themeIds = new Set(themes.map((t) => t.id));

    const persist = async (patch: Row): Promise<Row> => {
      const { data, error } = await svc.from('interview_sessions').update(patch).eq('id', session.id).eq('user_id', ctx.userId).select('*').single();
      if (error || !data) throw new HttpError(500, 'internal_error', { detail: `interview update: ${error?.message}` });
      return data as Row;
    };

    // ---- questions --------------------------------------------------------
    if (ctx.body.mode === 'questions') {
      const prompt = buildQuestionsPrompt(opportunity, {
        title: opportunity?.title ?? application.role, company: opportunity?.company ?? application.company, interviewType: String(session.interview_type ?? 'unknown'),
      }, themes, facts);
      const { updated, added } = await charged(ctx.userId, async () => {
        const r = await callModel(prompt, QUESTIONS_SCHEMA);
        ctx.addTokens(r.tokens);
        const rawQuestions = (r.data as { questions?: unknown } | null)?.questions;
        if (!Array.isArray(rawQuestions)) throw new HttpError(502, 'bad_ai_output', { field: 'questions' });
        const existing = new Set(practice.map((p) => p.id));
        const added: PracticeItem[] = [];
        for (const q of rawQuestions) {
          if (added.length >= MAX_QUESTIONS) break;
          const question = sanitizeText((q as { question?: unknown })?.question).slice(0, 400);
          if (!question) continue;
          const id = `q:${(await sha256Hex(question.toLowerCase().replace(/\s+/g, ' '))).slice(0, 12)}`;
          if (existing.has(id)) continue; // idempotent by question text
          existing.add(id);
          const themeId = typeof (q as { themeId?: unknown }).themeId === 'string' && themeIds.has((q as { themeId: string }).themeId) ? (q as { themeId: string }).themeId : '';
          const factIds = Array.from(new Set(strings((q as { factIds?: unknown }).factIds, 10, 80).filter((f) => allowedFacts.has(f))));
          added.push({ id, question, themeId, factIds, answer: '', feedback: null, answeredAt: null });
        }
        const next = [...practice, ...added];
        const updated = await persist({
          practice: next,
          readiness: computeReadiness(themes, next, nowIso),
          ...(session.status === 'planned' ? { status: 'prepared' } : {}),
        });
        return { updated, added };
      });
      const next = practiceOf(updated);
      if (added.length && session.status === 'planned') {
        await svc.from('career_events').insert({
          user_id: ctx.userId, event_name: 'interview_preparation_started', schema_version: 1,
          subject_refs: { interview: session.id, application: application.id }, correlation_id: ctx.requestId, source: 'server',
          payload: { questions: added.length, themes: themes.length }, dedupe_key: `interview_preparation_started:${session.id}`,
        });
      }
      ctx.log('info', { code: 'questions', sessionId: session.id, added: added.length, total: next.length });
      return { session: updated, added: added.length, charged: true };
    }

    // ---- feedback ---------------------------------------------------------
    if (!ctx.body.practiceItemId) throw new HttpError(400, 'invalid_request', { reason: 'practiceItemId required for feedback' });
    const index = practice.findIndex((p) => p.id === ctx.body.practiceItemId);
    if (index < 0) throw new HttpError(404, 'not_found', { entity: 'practice_item' });
    const item = practice[index];
    const answer = sanitizeText(item.answer);
    if (!answer) throw new HttpError(400, 'invalid_request', { reason: 'answer_required' });

    const abstainReason = answer.length < MIN_ANSWER_CHARS ? 'answer_too_short' : facts.length === 0 ? 'no_facts' : null;
    let feedback: PracticeItem['feedback'];
    let wasCharged = false;
    if (abstainReason) {
      // Preconditions fail before any metering: nothing to charge, nothing to release.
      feedback = { strengths: [], gaps: [], citations: [], abstained: true, reason: abstainReason };
    } else {
      const theme = themes.find((t) => t.id === item.themeId)?.theme ?? null;
      feedback = await charged(ctx.userId, async () => {
        const r = await callModel(buildFeedbackPrompt({ question: item.question, theme }, answer, facts), FEEDBACK_SCHEMA);
        ctx.addTokens(r.tokens);
        const out = (r.data ?? {}) as { strengths?: unknown; gaps?: unknown; citations?: unknown };
        if (!Array.isArray(out.strengths) || !Array.isArray(out.gaps)) throw new HttpError(502, 'bad_ai_output', { field: 'strengths' });
        return {
          strengths: strings(out.strengths, 4, 300),
          gaps: strings(out.gaps, 4, 300),
          citations: Array.from(new Set(strings(out.citations, 20, 80).filter((id) => allowedFacts.has(id)))),
          abstained: false,
        };
      });
      wasCharged = true;
    }
    const next = practice.map((p, i) => (i === index ? { ...p, feedback, feedbackAt: nowIso } : p));
    const updated = await persist({ practice: next, readiness: computeReadiness(themes, next, nowIso) });
    if (!feedback.abstained) {
      await svc.from('career_events').insert({
        user_id: ctx.userId, event_name: 'interview_practice_completed', schema_version: 1,
        subject_refs: { interview: session.id, application: application.id }, correlation_id: ctx.requestId, source: 'server',
        payload: { practiceItem: item.id, citations: feedback.citations.length }, dedupe_key: `interview_practice_completed:${session.id}:${item.id}:${nowIso}`,
      });
    }
    ctx.log('info', { code: 'feedback', sessionId: session.id, abstained: feedback.abstained, reason: feedback.reason ?? null, charged: wasCharged });
    return { session: updated, practiceItemId: item.id, feedback, charged: wasCharged };
  });
}

if (import.meta.main) Deno.serve(buildInterviewHandler());
