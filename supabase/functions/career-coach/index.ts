import { z } from 'npm:zod@3.24.1';
import { type HandlerDeps, withAiHandler } from '../_shared/handler.ts';
import { HttpError } from '../_shared/respond.ts';
import { llmJsonMetered, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { LlmAllProvidersFailedError } from '../_shared/llm/errors.ts';
import { releaseUsage as defaultReleaseUsage } from '../_shared/entitlement.ts';
import { requireCareerOs as defaultRequireCareerOs } from '../_shared/careerFlag.ts';
import { sanitizeText } from '../_shared/sanitize.ts';
import { buildContextBundle, type BundleRefs, type Db, listOwned, type Row } from '../career-gateway/context.ts';
import { type LlmJsonFn, listToolSpecs } from '../career-gateway/tools.ts';
import { notFound } from '../career-gateway/policy.ts';
import {
  buildSummaryPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  COACH_PROMPT_VERSION,
  COACH_SCHEMA,
  type HistoryMessage,
  MODEL_UNAVAILABLE_REPLY,
  SUMMARY_PROMPT_VERSION,
  SUMMARY_SCHEMA,
} from './prompts.ts';
import { groundReply } from './grounding.ts';

// =========================================================================
// career-coach — one persistent, contextual Coach conversation (COS-027,
// server half). Each call: resolve/create the owned conversation → store the
// user message → build a bounded owned context bundle → ask the router for
// a JSON answer → ground it (citations ⊆ bundle, proposals ⊆ registry,
// numeric caveat) → store the assistant message with citations/proposals →
// every 10 messages, refresh the derived summary with its source ids.
//
// Proposals are never executed here; the client sends them to
// career-gateway where ownership, confirmation and receipts apply. When no
// provider answers, the reply is a stored abstention and the metered action
// is released, so an outage never charges the user.
// =========================================================================

const uuid = z.string().uuid();
export const CoachBody = z.object({
  conversationId: uuid.optional(),
  message: z.string().trim().min(1).max(4000),
  contextRefs: z.object({
    goal: uuid.optional(),
    campaign: uuid.optional(),
    opportunity: uuid.optional(),
    application: uuid.optional(),
  }).optional(),
  locale: z.enum(['en', 'es', 'fr', 'de']).default('en'),
});

export interface CoachDeps {
  llm: LlmJsonFn;
  requireCareerOs: (svc: Db, userId: string) => Promise<void>;
  now: () => number;
}

const HISTORY_LIMIT = 12;
const SUMMARY_EVERY = 10;
const CONVERSATION_TITLE_CHARS = 60;

const defaultLlm: LlmJsonFn = async (prompt, opts) => {
  const r = await llmJsonMetered<unknown>(prompt, opts);
  return { data: r.data, tokens: r.tokens };
};

type RefMap = Partial<Record<'goal' | 'campaign' | 'opportunity' | 'application', { id: string; revision: number }>>;

function refIds(refs: RefMap | null | undefined): BundleRefs {
  const out: BundleRefs = {};
  for (const k of ['goal', 'campaign', 'opportunity', 'application'] as const) {
    const id = refs?.[k]?.id;
    if (typeof id === 'string') out[k] = id;
  }
  return out;
}

async function insertMessage(svc: Db, row: Row): Promise<Row> {
  const { data, error } = await svc.from('coach_messages').insert(row).select('*').single();
  if (error || !data) throw new HttpError(500, 'internal_error', { detail: `message insert: ${error?.message}` });
  return data as Row;
}

export function buildCoachHandler(over: Partial<HandlerDeps & CoachDeps> = {}) {
  const coach: CoachDeps = {
    llm: over.llm ?? defaultLlm,
    requireCareerOs: over.requireCareerOs ?? defaultRequireCareerOs,
    now: over.now ?? Date.now,
  };
  const releaseUsage = over.releaseUsage ?? defaultReleaseUsage;

  return withAiHandler('career-coach', {
    schema: CoachBody,
    meter: 'aiActions',
    rateLimit: { perHour: 120, perMinute: 20 },
    model: ROUTED_MODEL_LABEL,
    promptVersion: COACH_PROMPT_VERSION,
    deps: over,
  }, async (ctx) => {
    const svc = ctx.svc as unknown as Db;
    await coach.requireCareerOs(svc, ctx.userId);
    const nowIso = new Date(coach.now()).toISOString();

    // ---- conversation ---------------------------------------------------
    let conversation: Row | null = null;
    if (ctx.body.conversationId) {
      const { data } = await svc.from('coach_conversations').select('*').eq('id', ctx.body.conversationId).eq('user_id', ctx.userId).maybeSingle();
      if (!data) throw notFound('conversation');
      conversation = data as Row;
    }
    // The request's refs override the stored selection (the user can change
    // the Coach's context); ownership is validated while building the bundle.
    const requested: BundleRefs = ctx.body.contextRefs ?? {};
    const effective: BundleRefs = { ...refIds(conversation?.context_refs as RefMap | undefined), ...requested };
    const bundle = await buildContextBundle(svc, ctx.userId, effective);
    const contextRefs: RefMap = {};
    for (const k of ['goal', 'campaign', 'opportunity', 'application'] as const) {
      const id = bundle.refs[k];
      if (id) contextRefs[k] = { id, revision: bundle.revisions[k] ?? 0 };
    }

    let created = false;
    if (!conversation) {
      const { data, error } = await svc.from('coach_conversations').insert({
        user_id: ctx.userId,
        title: sanitizeText(ctx.body.message).slice(0, CONVERSATION_TITLE_CHARS),
        context_refs: contextRefs,
        summary: '',
        summary_source_ids: [],
        status: 'active',
        last_message_at: nowIso,
      }).select('*').single();
      if (error || !data) throw new HttpError(500, 'internal_error', { detail: `conversation insert: ${error?.message}` });
      conversation = data as Row;
      created = true;
      await svc.from('career_events').insert({
        user_id: ctx.userId, event_name: 'coach_conversation_started', schema_version: 1,
        subject_refs: { conversation: conversation.id }, correlation_id: ctx.requestId, source: 'server',
        payload: { hasApplication: !!contextRefs.application, hasOpportunity: !!contextRefs.opportunity, hasGoal: !!contextRefs.goal },
        dedupe_key: `coach_conversation_started:${conversation.id}`,
      });
    }

    const userMessage = await insertMessage(svc, {
      user_id: ctx.userId, conversation_id: conversation.id, role: 'user',
      content: sanitizeText(ctx.body.message), citations: [], proposals: [], abstained: false, created_at: nowIso,
    });

    const historyRows = await listOwned(svc, 'coach_messages', ctx.userId, {
      filters: { conversation_id: conversation.id }, order: ['created_at', false], limit: HISTORY_LIMIT + 1,
      cols: 'id,user_id,conversation_id,role,content,abstained,created_at',
    });
    const history: HistoryMessage[] = historyRows
      .filter((m) => m.id !== userMessage.id)
      .reverse()
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ id: m.id as string, role: m.role as string, content: m.content as string, abstained: m.abstained as boolean }));

    // ---- model ----------------------------------------------------------
    const system = buildSystemPrompt(listToolSpecs(), ctx.body.locale);
    const prompt = buildUserPrompt(bundle, history, (conversation.summary as string) ?? '', ctx.body.message);
    let raw: Record<string, unknown> | null = null;
    try {
      const r = await coach.llm(prompt, { schema: COACH_SCHEMA, system, timeoutMs: 60_000 });
      ctx.addTokens(r.tokens);
      raw = (r.data ?? {}) as Record<string, unknown>;
    } catch (err) {
      if (!(err instanceof LlmAllProvidersFailedError)) throw err;
      // Outage: keep the user's message and context, store an abstention,
      // refund the metered action ourselves (the pipeline only refunds on
      // a thrown error and we are answering 200).
      await releaseUsage(ctx.userId, 'aiActions');
      const stored = await insertMessage(svc, {
        user_id: ctx.userId, conversation_id: conversation.id, role: 'assistant',
        content: MODEL_UNAVAILABLE_REPLY, citations: [], proposals: [], abstained: true, created_at: new Date(coach.now()).toISOString(),
      });
      await svc.from('coach_conversations').update({ last_message_at: stored.created_at }).eq('id', conversation.id).eq('user_id', ctx.userId);
      ctx.log('warn', { code: 'llm_unavailable', conversationId: conversation.id, released: true });
      return {
        conversationId: conversation.id, created, message: stored, abstained: true, released: true,
        contextUsed: { ids: bundle.items.map((i) => i.cid), refs: bundle.refs, revisions: bundle.revisions },
      };
    }

    const grounded = groundReply(raw, bundle);
    const stored = await insertMessage(svc, {
      user_id: ctx.userId, conversation_id: conversation.id, role: 'assistant',
      content: grounded.reply || MODEL_UNAVAILABLE_REPLY,
      citations: grounded.citations,
      proposals: grounded.proposals,
      abstained: grounded.abstained,
      created_at: new Date(coach.now()).toISOString(),
    });
    ctx.log('info', {
      code: 'grounded', conversationId: conversation.id, citations: grounded.citations.length, proposals: grounded.proposals.length,
      droppedCitations: grounded.dropped.citations, droppedProposals: grounded.dropped.proposals, caveat: grounded.caveat, abstained: grounded.abstained,
    });

    // ---- conversation bookkeeping + periodic summary --------------------
    const patch: Row = { last_message_at: stored.created_at, context_refs: contextRefs };
    const { count } = await svc.from('coach_messages').select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId).eq('conversation_id', conversation.id);
    const total = count ?? history.length + 2;
    let summarised = false;
    if (total > 0 && total % SUMMARY_EVERY === 0) {
      const sourceRows = await listOwned(svc, 'coach_messages', ctx.userId, {
        filters: { conversation_id: conversation.id }, order: ['created_at', false], limit: SUMMARY_EVERY,
        cols: 'id,user_id,conversation_id,role,content,created_at',
      });
      const source = sourceRows.reverse().map((m) => ({ id: m.id as string, role: m.role as string, content: m.content as string }));
      try {
        const r = await coach.llm(buildSummaryPrompt((conversation.summary as string) ?? '', source), { schema: SUMMARY_SCHEMA, model: 'lite', timeoutMs: 30_000 });
        ctx.addTokens(r.tokens);
        const summary = sanitizeText((r.data as { summary?: unknown } | null)?.summary).slice(0, 2000);
        if (summary) {
          patch.summary = summary;
          patch.summary_source_ids = source.map((m) => m.id);
          summarised = true;
        }
        await ctx.logSubCall(`career-coach:summary:${SUMMARY_PROMPT_VERSION}`, 'ok', r.tokens);
      } catch (err) {
        // Derived memory is optional; the answer already stands on its own.
        await ctx.logSubCall(`career-coach:summary:${SUMMARY_PROMPT_VERSION}`, 'error');
        ctx.log('warn', { code: 'summary_failed', detail: err instanceof Error ? err.message : String(err) });
      }
    }
    const { data: updated } = await svc.from('coach_conversations').update(patch).eq('id', conversation.id).eq('user_id', ctx.userId).select('*').single();

    return {
      conversationId: conversation.id,
      created,
      message: stored,
      abstained: grounded.abstained,
      abstainReason: grounded.abstainReason,
      caveat: grounded.caveat,
      dropped: grounded.dropped,
      summarised,
      conversation: updated ?? conversation,
      contextUsed: { ids: bundle.items.map((i) => i.cid), refs: bundle.refs, revisions: bundle.revisions },
    };
  });
}

if (import.meta.main) Deno.serve(buildCoachHandler());
