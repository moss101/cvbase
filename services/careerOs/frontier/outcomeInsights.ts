/**
 * Outcome learning (REQ-09, COS-035): descriptive evidence over observed
 * application outcomes, with sample sizes, observation windows and missing
 * outcomes always attached. Nothing here infers causation, downgrades a skill
 * or ranks people by protected traits; a statement is only produced when the
 * underlying rows support it, and every statement cites the rows it used.
 *
 * Pure functions — recomputing after a correction or a revoked source is just
 * calling them again with the corrected inputs.
 */
import type {
  ApplicationRecord, CareerInsight, EvidenceRef, OpportunityAnalysis, OutcomeObservation, Opportunity,
} from '../types';

export const OUTCOME_POLICY_VERSION = 'outcome-policy-1.0.0';

/** Applications observed for fewer days than this have an unknown response. */
export const DEFAULT_OBSERVATION_DAYS = 21;
/** Below this many observations a statement is labelled as too small to generalise. */
export const SMALL_SAMPLE = 5;

export interface InsightInputs {
  now: Date;
  applications: ApplicationRecord[];
  outcomes: OutcomeObservation[];
  analyses: OpportunityAnalysis[];
  opportunities: Opportunity[];
  observationDays?: number;
}

export type InsightDraft = Omit<CareerInsight, 'id' | 'createdAt'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Effective outcome rows: a `correction` replaces the row it supersedes. */
export function effectiveOutcomes(outcomes: OutcomeObservation[]): OutcomeObservation[] {
  const superseded = new Set(outcomes.filter((o) => o.supersedesId).map((o) => o.supersedesId as string));
  return outcomes.filter((o) => !superseded.has(o.id) && o.kind !== 'correction');
}

const isResponse = (o: OutcomeObservation): boolean =>
  ['response', 'interview_scheduled', 'interview_completed', 'offer', 'rejected', 'accepted'].includes(o.kind);
const isInterview = (o: OutcomeObservation): boolean =>
  o.kind === 'interview_scheduled' || o.kind === 'interview_completed';

function supportedRatio(a: OpportunityAnalysis | undefined): number | null {
  if (!a) return null;
  const q = a.qualification;
  const total = q.supported.length + q.partial.length + q.missing.length + q.unknown.length;
  if (total === 0) return null;
  return q.supported.length / total;
}

function latestAnalysisFor(analyses: OpportunityAnalysis[], opportunityId: string | null): OpportunityAnalysis | undefined {
  if (!opportunityId) return undefined;
  return analyses
    .filter((a) => a.opportunityId === opportunityId)
    .sort((a, b) => b.computedAt.localeCompare(a.computedAt))[0];
}

function window(from: string | null, to: Date): { from: string | null; to: string | null } {
  return { from, to: to.toISOString() };
}

/**
 * Builds descriptive insights. Each insight records sample size, denominator,
 * missing outcomes, the observation window and the rows used. Statements are
 * phrased as observations ("3 of 5 …"), never as causes.
 */
export function computeInsights(input: InsightInputs): InsightDraft[] {
  const days = input.observationDays ?? DEFAULT_OBSERVATION_DAYS;
  const now = input.now;
  const outcomes = effectiveOutcomes(input.outcomes);
  const byApp = new Map<string, OutcomeObservation[]>();
  for (const o of outcomes) byApp.set(o.applicationId, [...(byApp.get(o.applicationId) ?? []), o]);

  const submitted = input.applications.filter((a) => !!a.submittedAt);
  if (submitted.length === 0) return [];

  const insights: InsightDraft[] = [];
  const computedAt = now.toISOString();
  const earliest = submitted.map((a) => a.submittedAt as string).sort()[0] ?? null;

  // 1. Response rate over applications whose observation window has elapsed.
  const observed = submitted.filter((a) => now.getTime() - new Date(a.submittedAt as string).getTime() >= days * DAY_MS);
  const pending = submitted.length - observed.length;
  const responded = observed.filter((a) => (byApp.get(a.id) ?? []).some(isResponse));
  const noOutcomeRecorded = observed.filter((a) => (byApp.get(a.id) ?? []).length === 0);
  if (observed.length > 0) {
    insights.push({
      kind: 'response_rate',
      statement: `${responded.length} of ${observed.length} submitted applications had a recorded response within ${days} days` +
        (noOutcomeRecorded.length ? `; ${noOutcomeRecorded.length} have no outcome recorded yet (unknown, not counted as rejections)` : '') +
        (pending ? `; ${pending} more are still inside the observation window` : '') +
        (observed.length < SMALL_SAMPLE ? '. Too few applications to generalise.' : '.'),
      cohort: { submitted: true, observationDays: days },
      sampleSize: responded.length,
      denominator: observed.length,
      missingOutcomes: noOutcomeRecorded.length,
      observationWindow: window(earliest, now),
      sourceRefs: observed.map<EvidenceRef>((a) => ({ kind: 'application', id: a.id, label: `${a.jobTitle} — ${a.company}` })),
      policyVersion: OUTCOME_POLICY_VERSION,
      status: 'active',
      computedAt,
    });
  }

  // 2. Interviews versus qualification-fit coverage (descriptive only).
  const withAnalysis = submitted
    .map((a) => ({ app: a, ratio: supportedRatio(latestAnalysisFor(input.analyses, a.opportunityId)) }))
    .filter((x): x is { app: ApplicationRecord; ratio: number } => x.ratio !== null);
  const interviewed = withAnalysis.filter((x) => (byApp.get(x.app.id) ?? []).some(isInterview));
  if (withAnalysis.length >= 2 && interviewed.length > 0) {
    const highFit = interviewed.filter((x) => x.ratio >= 0.6).length;
    insights.push({
      kind: 'interviews_by_fit',
      statement: `${highFit} of ${interviewed.length} recorded interviews were for roles where at least 60% of requirements had supporting evidence` +
        ` (${withAnalysis.length} submitted applications had a fit analysis)` +
        (interviewed.length < SMALL_SAMPLE ? '. Too few interviews to generalise; this is an observation, not a cause.' : '. This is an observation, not a cause.'),
      cohort: { submitted: true, hasAnalysis: true },
      sampleSize: interviewed.length,
      denominator: withAnalysis.length,
      missingOutcomes: withAnalysis.filter((x) => (byApp.get(x.app.id) ?? []).length === 0).length,
      observationWindow: window(earliest, now),
      sourceRefs: interviewed.map<EvidenceRef>((x) => ({ kind: 'application', id: x.app.id, label: `${x.app.jobTitle} — ${x.app.company}` })),
      policyVersion: OUTCOME_POLICY_VERSION,
      status: 'active',
      computedAt,
    });
  }

  // 3. Missing outcomes worth recording (surfaces "unknown stays unknown").
  if (noOutcomeRecorded.length > 0) {
    insights.push({
      kind: 'unknown_outcomes',
      statement: `${noOutcomeRecorded.length} of ${observed.length} applications older than ${days} days have no recorded outcome. Recording them keeps these observations honest.`,
      cohort: { submitted: true, observationDays: days },
      sampleSize: noOutcomeRecorded.length,
      denominator: observed.length,
      missingOutcomes: noOutcomeRecorded.length,
      observationWindow: window(earliest, now),
      sourceRefs: noOutcomeRecorded.map<EvidenceRef>((a) => ({ kind: 'application', id: a.id, label: `${a.jobTitle} — ${a.company}` })),
      policyVersion: OUTCOME_POLICY_VERSION,
      status: 'active',
      computedAt,
    });
  }

  return insights;
}

/**
 * Recommendation policy derived from insights. It never changes career facts
 * and only nudges ordering between otherwise-equal candidates; the
 * deterministic baseline stays available for rollback and comparison.
 */
export interface OutcomePolicy {
  version: string;
  /** Prefer opportunities whose supported-requirement ratio is at least this. */
  preferSupportedRatioAtLeast: number | null;
  /** Human-readable basis, with sample sizes. */
  basis: string[];
  sampleSize: number;
}

export function derivePolicy(insights: InsightDraft[]): OutcomePolicy {
  const fit = insights.find((i) => i.kind === 'interviews_by_fit');
  if (!fit || fit.sampleSize < SMALL_SAMPLE) {
    return {
      version: OUTCOME_POLICY_VERSION,
      preferSupportedRatioAtLeast: null,
      basis: [fit ? `Only ${fit.sampleSize} interviews observed; baseline ordering kept.` : 'No interview observations yet; baseline ordering kept.'],
      sampleSize: fit?.sampleSize ?? 0,
    };
  }
  return {
    version: OUTCOME_POLICY_VERSION,
    preferSupportedRatioAtLeast: 0.6,
    basis: [fit.statement],
    sampleSize: fit.sampleSize,
  };
}

/**
 * Offline comparison of two orderings (baseline vs policy) for evaluation
 * before rollout: which items moved and how far. Pure and deterministic.
 */
export function compareOrderings(baseline: string[], candidate: string[]): { moved: Array<{ id: string; from: number; to: number }>; unchanged: boolean } {
  const moved: Array<{ id: string; from: number; to: number }> = [];
  baseline.forEach((id, from) => {
    const to = candidate.indexOf(id);
    if (to !== -1 && to !== from) moved.push({ id, from, to });
  });
  return { moved, unchanged: moved.length === 0 && baseline.length === candidate.length };
}

/** A rejection never lowers a skill: this guard exists to make the rule testable. */
export function skillAdjustmentForOutcome(_kind: OutcomeObservation['kind']): null {
  return null;
}
