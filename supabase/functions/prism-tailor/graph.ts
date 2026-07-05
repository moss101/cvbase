import { Annotation, END, START, StateGraph } from 'npm:@langchain/langgraph@0.2.44';
import type { ResumeData } from '../../../types.ts';
import { HttpError } from '../_shared/respond.ts';
import { LlmAllProvidersFailedError, ProviderError } from '../_shared/llm/errors.ts';
import { runAgent, type ModelFn } from './model.ts';
import {
  AggregatedContextSchema,
  type AggregatedContext,
  type Answer,
  CritiqueSchema,
  type Critique,
  GapAnalysisSchema,
  type GapAnalysis,
  ResumeDraftSchema,
  type ResumeDraft,
  WizardQuestionsSchema,
  type WizardQuestions,
} from './schemas.ts';
import { alignDraftToContext, draftToResumeData } from './mapping.ts';
import { checkGrounding } from './grounding.ts';
import { computeTotalYearsExperience } from './experience.ts';
import { scrubEcho, suspiciousBigrams } from './antiEcho.ts';
import * as prompts from './prompts.ts';
import { AGENT_MODELS, STAGE_LABELS, TOKEN_BUDGET, type PrismStage } from './prompts.ts';

// =========================================================================
// PRISM LangGraph wiring. Two graphs split at the questionnaire pause:
//   analyze:  gap_analyst → (wizard_creator | END on zero gaps)
//   generate: aggregator → writer ⇄ critic (hard cap + token budget) → parser
// The model is injected (ModelFn); stage announcements use fixed labels; each
// node checkpoints its output through hooks.onCheckpoint so a crashed run
// resumes from the last completed stage (nodes skip when their output is
// already in state); hooks.onAgent receives per-agent telemetry (no CV/JD
// content — the run id is the trace id).
// =========================================================================

export interface AgentTelemetry {
  agent: string;
  model: string;
  status: 'ok' | 'error';
  latencyMs: number;
  tokens: number;
  iteration: number;
  provider?: string;
  keySlot?: number;
  usedFallback?: boolean;
  fallbackReason?: string;
}

export interface GraphHooks {
  onStage?: (stage: PrismStage, label: string) => void;
  onAgent?: (t: AgentTelemetry) => void | Promise<void>;
  /** Persist a checkpoint fragment; awaited so a crash never loses a stage. */
  onCheckpoint?: (partial: Record<string, unknown>) => Promise<void> | void;
}

const emit = (hooks: GraphHooks, stage: PrismStage) => hooks.onStage?.(stage, STAGE_LABELS[stage]);

/** Writer runs at most twice: initial draft + one critique-driven revision. */
export const MAX_WRITER_PASSES = 2;

const last = <T>(_prev: T, next: T) => next;
const val = <T>(init: T) => Annotation<T>({ reducer: last, default: () => init });

/** Run one agent with telemetry + budget accounting. */
async function meteredAgent<T>(
  model: ModelFn,
  hooks: GraphHooks,
  agent: string,
  prompt: string,
  // deno-lint-ignore no-explicit-any
  schema: any,
  opts: { system?: string; iteration?: number; tokensUsed: number },
): Promise<{ data: T; tokens: number }> {
  if (opts.tokensUsed >= TOKEN_BUDGET) {
    throw new HttpError(402, 'cost_cap_exceeded', { agent, budget: TOKEN_BUDGET });
  }
  const modelId = AGENT_MODELS[agent] ?? 'full';
  const started = Date.now();
  try {
    const out = await runAgent<T>(model, agent, prompt, schema, { system: opts.system, model: modelId });
    await hooks.onAgent?.({
      agent, model: modelId, status: 'ok',
      latencyMs: Date.now() - started, tokens: out.tokens, iteration: opts.iteration ?? 0,
      provider: out.provider, keySlot: out.keySlot, usedFallback: out.usedFallback, fallbackReason: out.fallbackReason,
    });
    return out;
  } catch (err) {
    const provider = err instanceof ProviderError ? err.provider : undefined;
    const fallbackReason = err instanceof LlmAllProvidersFailedError
      ? `${err.primary.provider}:${err.primary.kind}`
      : undefined;
    await hooks.onAgent?.({
      agent, model: modelId, status: 'error',
      latencyMs: Date.now() - started, tokens: 0, iteration: opts.iteration ?? 0,
      provider, usedFallback: err instanceof LlmAllProvidersFailedError, fallbackReason,
    });
    throw err;
  }
}

// Phase 1 — analyze ---------------------------------------------------------

const AnalyzeState = Annotation.Root({
  cvText: val(''),
  jdText: val(''),
  gapAnalysis: val<GapAnalysis | null>(null),
  questions: val<WizardQuestions['questions']>([]),
  tokensUsed: val(0),
});

export function buildAnalyzeGraph(model: ModelFn, hooks: GraphHooks = {}) {
  return new StateGraph(AnalyzeState)
    .addNode('gap_analyst', async (s: typeof AnalyzeState.State) => {
      if (s.gapAnalysis) return {}; // checkpointed — already done
      emit(hooks, 'gap_analyst');
      const out = await meteredAgent<GapAnalysis>(
        model, hooks, 'gap_analyst',
        prompts.gapAnalystPrompt(s.cvText, s.jdText), GapAnalysisSchema,
        { tokensUsed: s.tokensUsed },
      );
      // Deterministic anti-echo: the INJECTION_RULE prompt clause is
      // stochastic model behavior; this guarantees attack-specific phrasing
      // from the raw documents never reaches stored/user-facing fields.
      const gapAnalysis = scrubEcho(out.data, suspiciousBigrams([s.cvText, s.jdText]));
      await hooks.onCheckpoint?.({ gap_analysis: gapAnalysis });
      return { gapAnalysis, tokensUsed: s.tokensUsed + out.tokens };
    })
    .addNode('wizard_creator', async (s: typeof AnalyzeState.State) => {
      emit(hooks, 'wizard_creator');
      const out = await meteredAgent<WizardQuestions>(
        model, hooks, 'wizard_creator',
        prompts.wizardCreatorPrompt(s.gapAnalysis!), WizardQuestionsSchema,
        { tokensUsed: s.tokensUsed },
      );
      const questions = scrubEcho(out.data.questions, suspiciousBigrams([s.cvText, s.jdText]));
      return { questions, tokensUsed: s.tokensUsed + out.tokens };
    })
    .addEdge(START, 'gap_analyst')
    // Zero-gap: nothing to ask — skip the wizard instead of inventing filler.
    .addConditionalEdges('gap_analyst', (s: typeof AnalyzeState.State) =>
      s.gapAnalysis!.gaps.length === 0 ? END : 'wizard_creator')
    .addEdge('wizard_creator', END)
    .compile();
}

// Phase 2 — generate ----------------------------------------------------------

/** Best draft seen so far, with the critique that scored it — when the loop
 *  caps out we ship this one and surface ITS unresolved issues. */
type BestDraft = { draft: ResumeDraft; critique: Critique };

const GenerateState = Annotation.Root({
  cvText: val(''),
  jdText: val(''),
  gapAnalysis: val<GapAnalysis | null>(null),
  answers: val<Answer[]>([]),
  context: val<AggregatedContext | null>(null),
  draft: val<ResumeDraft | null>(null),
  critique: val<Critique | null>(null),
  iteration: val(0),
  best: val<BestDraft | null>(null),
  resume: val<ResumeData | null>(null),
  atsScore: val(0),
  unresolvedIssues: val<string[]>([]),
  tokensUsed: val(0),
});

/** Checkpointed fields a resumed generate run is seeded from. */
export type GenerateCheckpoint = Partial<
  Pick<typeof GenerateState.State, 'context' | 'draft' | 'critique' | 'iteration' | 'best' | 'tokensUsed'>
>;

export function buildGenerateGraph(model: ModelFn, hooks: GraphHooks = {}) {
  return new StateGraph(GenerateState)
    .addNode('aggregator', async (s: typeof GenerateState.State) => {
      if (s.context) return {}; // checkpointed — already done
      emit(hooks, 'aggregator');
      const out = await meteredAgent<AggregatedContext>(
        model, hooks, 'aggregator',
        prompts.aggregatorPrompt(s.cvText, s.jdText, s.gapAnalysis!, s.answers),
        AggregatedContextSchema, { tokensUsed: s.tokensUsed },
      );
      // Anti-echo scrub first (the context is the writer's entire world —
      // attack phrasing surviving into it would resurface in the resume),
      // then never trust the model's own guess for totalYearsExperience —
      // overwrite with the deterministic date-math value so it's both
      // authoritative for the writer and traceable by the grounding checker
      // (which only recognizes numbers actually present in context).
      const scrubbed = scrubEcho(out.data, suspiciousBigrams([s.cvText, s.jdText]));
      const context: AggregatedContext = {
        ...scrubbed,
        totalYearsExperience: computeTotalYearsExperience(scrubbed.workHistory),
      };
      await hooks.onCheckpoint?.({ context, tokensUsed: s.tokensUsed + out.tokens });
      return { context, tokensUsed: s.tokensUsed + out.tokens };
    })
    // From here on, nodes only ever read s.context — never cvText/jdText.
    .addNode('writer', async (s: typeof GenerateState.State) => {
      // Skip on resume when a draft exists that is (a) awaiting its critique,
      // (b) already passing, or (c) at the revision cap — a fresh pass in any
      // of those states would exceed the loop's guarantees.
      if (s.draft && (!s.critique || s.critique.pass || s.iteration >= MAX_WRITER_PASSES)) return {};
      emit(hooks, s.iteration === 0 ? 'writer' : 'writer_revision');
      const out = await meteredAgent<ResumeDraft>(
        model, hooks, 'writer',
        prompts.writerPrompt(s.context!, s.critique ?? undefined, s.draft ?? undefined),
        ResumeDraftSchema,
        { system: prompts.WRITER_SYSTEM, iteration: s.iteration, tokensUsed: s.tokensUsed },
      );
      // Deterministic fact injection: company/title/location/dates are copied
      // from CONTEXT.workHistory, never trusted from the model's transcription.
      const draft = alignDraftToContext(out.data, s.context!);
      const tokensUsed = s.tokensUsed + out.tokens;
      await hooks.onCheckpoint?.({
        draft, critique: null, iteration: s.iteration + 1, tokensUsed,
      });
      // critique reset so the critic re-scores this fresh draft on resume.
      return { draft, critique: null, iteration: s.iteration + 1, tokensUsed };
    })
    .addNode('critic', async (s: typeof GenerateState.State) => {
      // The critique in state always belongs to the current draft (the writer
      // nulls it when producing a new one) — if present, this draft is scored.
      if (s.critique) return {};
      emit(hooks, 'critic');
      const out = await meteredAgent<Critique>(
        model, hooks, 'critic',
        prompts.criticPrompt(s.draft!, s.context!), CritiqueSchema,
        { iteration: s.iteration, tokensUsed: s.tokensUsed },
      );
      let critique = out.data;
      // Deterministic hallucination guard on top of the LLM review: numeric/
      // entity claims not traceable to the context force a failing critique
      // regardless of what the model thought.
      const grounding = checkGrounding(s.draft!, s.context!);
      if (!grounding.ok) {
        critique = {
          ...critique,
          pass: false,
          issues: [
            ...critique.issues,
            ...grounding.violations.map((v) => ({
              kind: 'unsupported_claim' as const,
              detail: `Ungrounded ${v.kind} "${v.claim}" (${v.where}) — not traceable to your CV or answers`,
              fix: v.suggestedFix ??
                'Remove the claim or rewrite the line using only facts from the CV and questionnaire answers',
            })),
          ],
        };
      }
      // A passing draft always beats a failing one, whatever the scores —
      // shipping a high-scoring draft that failed on unsupported claims would
      // defeat the grounding loop. Score only breaks ties within pass status.
      const beatsBest = !s.best ||
        (critique.pass && !s.best.critique.pass) ||
        (critique.pass === s.best.critique.pass && critique.score >= s.best.critique.score);
      const best = beatsBest ? { draft: s.draft!, critique } : s.best;
      const tokensUsed = s.tokensUsed + out.tokens;
      await hooks.onCheckpoint?.({ critique, best, tokensUsed });
      return { critique, best, tokensUsed };
    })
    .addNode('parser', (s: typeof GenerateState.State) => {
      emit(hooks, 'parser');
      const { draft, critique } = s.best!;
      return {
        resume: draftToResumeData(draft, s.context!),
        atsScore: critique.score,
        unresolvedIssues: critique.pass
          ? []
          : critique.issues.map((i) => `${i.detail} (suggested fix: ${i.fix})`),
      };
    })
    .addEdge(START, 'aggregator')
    .addEdge('aggregator', 'writer')
    .addEdge('writer', 'critic')
    // Another loop needs: a failing critique, headroom under the hard pass
    // cap, AND budget left. Otherwise ship the best draft we have.
    .addConditionalEdges('critic', (s: typeof GenerateState.State) =>
      s.critique!.pass || s.iteration >= MAX_WRITER_PASSES || s.tokensUsed >= TOKEN_BUDGET
        ? 'parser'
        : 'writer')
    .addEdge('parser', END)
    .compile();
}
