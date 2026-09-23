/**
 * Shared action rules (COS-014). Deterministic, versioned rules over durable
 * state produce candidate actions with a reason, evidence, the revisions they
 * read and a stable dedupe key. Ranking is a fixed comparator — never a random
 * or decorative score — and missing dates never become deadlines.
 */
import { DAY_MS, fnv1a64Hex, isoDate, msBetween } from './util';
import type {
  ActionDestination, ActionRun, ActionStatus, ActionType, ApplicationArtifact, ApplicationRecord, CareerAction, CareerFact,
  CareerGoal, CareerPreferences, CompletionSource, EvidenceRef, InterviewSession, Opportunity, OpportunityAnalysis,
  OutcomeObservation, PriorityBand,
} from './types';

export const RULES_VERSION = 'rules-1.0.0';
export const EFFORT_SOURCE = 'rule_estimate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrismRunRef {
  id: string;
  status: string;
  applicationId: string | null;
  updatedAt: string;
}

export interface RulesInput {
  now: Date;
  goal: CareerGoal | null;
  facts: CareerFact[];
  opportunities: Opportunity[];
  applications: ApplicationRecord[];
  interviews: InterviewSession[];
  analyses: OpportunityAnalysis[];
  prismRuns: PrismRunRef[];
  artifacts: ApplicationArtifact[];
  outcomes?: OutcomeObservation[];
  preferences?: CareerPreferences | null;
}

export interface ActionRanking {
  /** Confirmed deadline from a recorded date only; null when none is recorded. */
  deadlineAt: string | null;
  /** Completing this unblocks other work (import review, conflicts, goal). */
  unblocks: boolean;
  /** Tied to the primary goal directly or through its application/analysis. */
  goalRelevant: boolean;
  /** Rule estimate in minutes, used for effort fit (lower first). */
  effortMinutes: number;
}

type PersistedOnly = 'id' | 'revision' | 'createdAt' | 'updatedAt' | 'status' | 'snoozedUntil' | 'dismissedAt'
  | 'completedAt' | 'completionSource' | 'resultRef' | 'lastError' | 'resurfacedReason';

export interface ActionCandidate extends Omit<CareerAction, PersistedOnly> {
  /** The subject the action is about (application, opportunity, interview, group, 'career'). */
  subjectId: string;
  /** The trigger inputs whose change makes this a materially different action. */
  materialInputs: Record<string, string | number>;
  ranking: ActionRanking;
}

// ---------------------------------------------------------------------------
// Keys and hashing
// ---------------------------------------------------------------------------

/** Order-independent hash over a map of inputs. */
export function hashInputs(inputs: Record<string, string | number>): string {
  const entries = Object.keys(inputs).sort().map((k) => `${k}=${String(inputs[k])}`);
  return fnv1a64Hex(entries.join('\n'));
}

export function dedupeKeyFor(type: ActionType, subjectId: string, materialInputs: Record<string, string | number>): string {
  return `${type}:${subjectId}:${hashInputs(materialInputs)}`;
}

/** `type:subject:` prefix shared by every material revision of the same logical action. */
export function subjectPrefix(dedupeKey: string): string {
  const last = dedupeKey.lastIndexOf(':');
  return last > 0 ? dedupeKey.slice(0, last + 1) : dedupeKey;
}

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

const EFFORT: Record<ActionType, number> = {
  REVIEW_IMPORT: 10, RESOLVE_CONFLICT: 5, SET_GOAL: 5, REVIEW_PROFILE: 5, PREPARE_INTERVIEW: 45, REVIEW_TAILORING: 15,
  FOLLOW_UP_APPLICATION: 5, TAILOR_CV: 30, REVIEW_OPPORTUNITY: 10, START_APPLICATION: 5, IMPROVE_ACHIEVEMENT: 15,
  CAPTURE_ACHIEVEMENT: 10, RECORD_OUTCOME: 2, UPDATE_SKILL: 10, START_CAMPAIGN: 10, COMPARE_ROLES: 15,
};

const UNBLOCKING: ReadonlySet<ActionType> = new Set(['REVIEW_IMPORT', 'RESOLVE_CONFLICT', 'SET_GOAL']);

interface Draft {
  actionType: ActionType;
  subjectId: string;
  title: string;
  reason: string;
  priorityBand: PriorityBand;
  destination: ActionDestination;
  evidenceRefs?: EvidenceRef[];
  contextRefs?: CareerAction['contextRefs'];
  inputRevisions?: Record<string, number | string>;
  materialInputs: Record<string, string | number>;
  deadlineAt?: string | null;
  goalRelevant?: boolean;
  expiresAt?: string | null;
}

function candidate(d: Draft): ActionCandidate {
  const effortMinutes = EFFORT[d.actionType];
  return {
    actionType: d.actionType,
    subjectId: d.subjectId,
    title: d.title,
    reason: d.reason,
    evidenceRefs: d.evidenceRefs ?? [],
    priorityBand: d.priorityBand,
    contextRefs: d.contextRefs ?? {},
    inputRevisions: { ...(d.inputRevisions ?? {}), ...d.materialInputs },
    source: 'rule',
    ruleVersion: RULES_VERSION,
    dedupeKey: dedupeKeyFor(d.actionType, d.subjectId, d.materialInputs),
    destination: d.destination,
    estimatedEffort: `~${effortMinutes} min`,
    effortSource: EFFORT_SOURCE,
    confidence: null,
    expiresAt: d.expiresAt ?? null,
    materialInputs: d.materialInputs,
    ranking: {
      deadlineAt: d.deadlineAt ?? null,
      unblocks: UNBLOCKING.has(d.actionType),
      goalRelevant: d.goalRelevant === true,
      effortMinutes,
    },
  };
}

const ref = (kind: EvidenceRef['kind'], id: string, label: string): EvidenceRef => ({ kind, id, label });
/** A recorded instant rendered in the interview's own time zone (never inferred). */
function formatWhen(iso: string, timeZone: string | null): string {
  try {
    // Same style the interface uses for dates ("Thu, Sep 24, 10:00 AM"), in the recorded zone.
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(timeZone ? { timeZone } : {}) };
    return `${new Intl.DateTimeFormat('en', opts).format(new Date(iso))}${timeZone ? ` (${timeZone})` : ''}`;
  } catch {
    return `${iso}${timeZone ? ` (${timeZone})` : ''}`;
  }
}
const appLabel = (a: ApplicationRecord): string => [a.jobTitle, a.company].filter(Boolean).join(' at ') || `application ${a.id.slice(0, 8)}`;
const oppLabel = (o: Opportunity): string => [o.title, o.company].filter(Boolean).join(' at ') || `opportunity ${o.id.slice(0, 8)}`;
const isActiveApp = (a: ApplicationRecord): boolean => a.stage !== 'closed';

function latestAnalysisFor(analyses: OpportunityAnalysis[], opportunityId: string, applicationId?: string | null): OpportunityAnalysis | null {
  const forOpp = analyses.filter((a) => a.opportunityId === opportunityId);
  if (forOpp.length === 0) return null;
  const sorted = [...forOpp].sort((a, b) => (a.computedAt < b.computedAt ? 1 : a.computedAt > b.computedAt ? -1 : a.id < b.id ? 1 : -1));
  if (applicationId) {
    const bound = sorted.find((a) => a.applicationId === applicationId);
    if (bound) return bound;
  }
  return sorted[0];
}

/** Supported share of the requirements that could be judged (unknown excluded). */
export function supportedShare(analysis: OpportunityAnalysis): { supported: number; considered: number; share: number | null } {
  const q = analysis.qualification;
  const supported = q.supported.length;
  const considered = supported + q.partial.length + q.missing.length;
  return { supported, considered, share: considered === 0 ? null : supported / considered };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export function computeCandidateActions(input: RulesInput): ActionCandidate[] {
  const { now, goal } = input;
  const facts = input.facts.filter((f) => f.status === 'active');
  const opportunities = input.opportunities.filter((o) => !o.mergedIntoId);
  const applications = input.applications;
  const outcomes = input.outcomes ?? [];
  const out: ActionCandidate[] = [];
  const goalRefs = goal ? { goal: { id: goal.id, revision: goal.revision } } : {};
  const goalRev = goal ? { [`goal:${goal.id}`]: goal.revision } : {};

  // --- Nothing yet: at most a profile review, never an invented goal or campaign.
  const hasNothing = !goal && opportunities.length === 0 && applications.length === 0 && facts.length === 0;
  if (hasNothing) {
    out.push(candidate({
      actionType: 'REVIEW_PROFILE', subjectId: 'career', priorityBand: 'later',
      title: 'Add your profile basics',
      reason: 'No career facts, goals, opportunities or applications are recorded yet.',
      destination: { space: 'career', section: 'profile' },
      materialInputs: { trigger: 'no_profile_facts' },
    }));
    return out;
  }

  // --- REVIEW_IMPORT: unreviewed candidate facts.
  const candidates = facts.filter((f) => f.reviewState === 'candidate');
  if (candidates.length > 0) {
    const sources = Array.from(new Set(candidates.map((f) => f.sourceRef.resumeId ?? f.sourceKind))).sort();
    out.push(candidate({
      actionType: 'REVIEW_IMPORT', subjectId: sources[0] ?? 'import', priorityBand: 'now',
      title: `Review ${candidates.length} imported fact${candidates.length === 1 ? '' : 's'}`,
      reason: `${candidates.length} imported fact${candidates.length === 1 ? ' is' : 's are'} waiting for your confirmation; imported claims stay unconfirmed until you review them.`,
      destination: { space: 'career', section: 'evidence', sub: 'review' },
      evidenceRefs: candidates.slice(0, 5).map((f) => ref('fact', f.id, f.title || f.kind)),
      inputRevisions: Object.fromEntries(candidates.map((f) => [`fact:${f.id}`, f.revision])),
      materialInputs: { sources: sources.join(','), count: candidates.length },
    }));
  }

  // --- RESOLVE_CONFLICT: one per conflict group.
  const groups = new Map<string, CareerFact[]>();
  for (const f of facts) {
    if (f.reviewState === 'conflict' && f.conflictGroup) groups.set(f.conflictGroup, [...(groups.get(f.conflictGroup) ?? []), f]);
  }
  for (const [groupId, members] of Array.from(groups.entries()).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const ids = members.map((m) => m.id).sort();
    out.push(candidate({
      actionType: 'RESOLVE_CONFLICT', subjectId: groupId, priorityBand: 'now',
      title: `Resolve conflicting facts: ${members[0].title || members[0].kind}`,
      reason: `${members.length} versions of the same fact disagree; nothing is merged until you choose.`,
      destination: { space: 'career', section: 'evidence', sub: groupId },
      evidenceRefs: members.map((m) => ref('fact', m.id, m.title || m.kind)),
      contextRefs: { fact: { id: members[0].id, revision: members[0].revision } },
      inputRevisions: Object.fromEntries(members.map((m) => [`fact:${m.id}`, m.revision])),
      materialInputs: { members: ids.join(',') },
    }));
  }

  // --- SET_GOAL: only when there is something to aim it at.
  if (!goal && (opportunities.length > 0 || applications.length > 0)) {
    out.push(candidate({
      actionType: 'SET_GOAL', subjectId: 'career', priorityBand: 'now',
      title: 'Set a career goal',
      reason: `You have ${opportunities.length} opportunit${opportunities.length === 1 ? 'y' : 'ies'} and ${applications.length} application${applications.length === 1 ? '' : 's'} but no active goal to judge them against.`,
      destination: { space: 'career', section: 'goals' },
      materialInputs: { trigger: 'no_active_goal' },
    }));
  }

  // --- PREPARE_INTERVIEW: dated sessions within 7 days; undated interview stage flagged honestly.
  const datedByApp = new Set<string>();
  for (const s of input.interviews) {
    if (s.status === 'cancelled') continue;
    if (s.scheduledAt && !Number.isNaN(Date.parse(s.scheduledAt))) datedByApp.add(s.applicationId);
  }
  const appById = new Map(applications.map((a) => [a.id, a]));
  for (const s of [...input.interviews].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (s.status === 'completed' || s.status === 'cancelled' || !s.scheduledAt) continue;
    const delta = msBetween(now, s.scheduledAt);
    if (delta === null || delta < 0 || delta > 7 * DAY_MS) continue;
    const app = appById.get(s.applicationId);
    if (app && !isActiveApp(app)) continue;
    out.push(candidate({
      actionType: 'PREPARE_INTERVIEW', subjectId: s.id, priorityBand: 'now',
      title: app ? `Prepare for your ${appLabel(app)} interview` : 'Prepare for your interview',
      reason: `Interview recorded for ${formatWhen(s.scheduledAt, s.timeZone)}; ${s.themes.filter((t) => t.covered).length} of ${s.themes.length} themes covered.`,
      destination: { space: 'applications', id: s.applicationId, section: 'interview', sub: s.id },
      evidenceRefs: [ref('interview', s.id, formatWhen(s.scheduledAt, s.timeZone))],
      contextRefs: { interview: { id: s.id, revision: s.revision }, application: app ? { id: app.id, revision: app.revision } : undefined, ...goalRefs },
      inputRevisions: { [`interview:${s.id}`]: s.revision, ...(app ? { [`application:${app.id}`]: app.revision } : {}), ...goalRev },
      materialInputs: { [`interview:${s.id}.scheduledAt`]: s.scheduledAt },
      deadlineAt: s.scheduledAt,
      expiresAt: s.scheduledAt,
      goalRelevant: Boolean(goal && app && app.goalId === goal.id),
    }));
  }
  for (const app of applications) {
    if (app.stage !== 'interview' || datedByApp.has(app.id)) continue;
    out.push(candidate({
      actionType: 'PREPARE_INTERVIEW', subjectId: app.id, priorityBand: 'soon',
      title: `Prepare for your ${appLabel(app)} interview`,
      reason: 'Interview stage recorded; no date recorded. Add the interview time to plan around it.',
      destination: { space: 'applications', id: app.id, section: 'interview' },
      evidenceRefs: [ref('application', app.id, appLabel(app))],
      contextRefs: { application: { id: app.id, revision: app.revision }, ...goalRefs },
      inputRevisions: { [`application:${app.id}`]: app.revision, ...goalRev },
      materialInputs: { [`application:${app.id}.stage`]: 'interview', [`application:${app.id}.interviewDate`]: 'none' },
      deadlineAt: null,
      goalRelevant: Boolean(goal && app.goalId === goal.id),
    }));
  }

  // --- REVIEW_TAILORING: a PRISM run is waiting for review.
  const liveRunApps = new Set<string>();
  for (const run of [...input.prismRuns].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!run.applicationId) continue;
    if (['analyzing', 'awaiting_answers', 'generating', 'review'].includes(run.status)) liveRunApps.add(run.applicationId);
    if (run.status !== 'review') continue;
    const app = appById.get(run.applicationId);
    if (app && !isActiveApp(app)) continue;
    out.push(candidate({
      actionType: 'REVIEW_TAILORING', subjectId: run.id, priorityBand: 'now',
      title: app ? `Review the tailored CV for ${appLabel(app)}` : 'Review your tailored CV',
      reason: 'A tailoring run finished and is waiting for your review; nothing is saved to the application until you accept it.',
      destination: { space: 'applications', id: run.applicationId, section: 'cv', sub: run.id },
      evidenceRefs: [ref('run', run.id, 'PRISM run in review')],
      contextRefs: { application: app ? { id: app.id, revision: app.revision } : undefined, ...goalRefs },
      inputRevisions: { [`run:${run.id}`]: run.updatedAt, ...(app ? { [`application:${app.id}`]: app.revision } : {}), ...goalRev },
      materialInputs: { [`run:${run.id}.status`]: 'review' },
      goalRelevant: Boolean(goal && app && app.goalId === goal.id),
    }));
  }

  const followUpLimit = isoDate(new Date(now.getTime() + 2 * DAY_MS));
  for (const app of [...applications].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const goalRelevant = Boolean(goal && app.goalId === goal.id);
    const appCtx = { application: { id: app.id, revision: app.revision }, ...goalRefs };
    const appRev = { [`application:${app.id}`]: app.revision, ...goalRev };

    // --- FOLLOW_UP_APPLICATION: a user-set follow-up date is due.
    if (app.followUpAt && (app.stage === 'submitted' || app.stage === 'response') && app.followUpAt.slice(0, 10) <= followUpLimit) {
      out.push(candidate({
        actionType: 'FOLLOW_UP_APPLICATION', subjectId: app.id, priorityBand: 'now',
        title: `Follow up on ${appLabel(app)}`,
        reason: `You set a follow-up date of ${app.followUpAt.slice(0, 10)} for this application.`,
        destination: { space: 'applications', id: app.id, section: 'activity' },
        evidenceRefs: [ref('application', app.id, appLabel(app))],
        contextRefs: appCtx, inputRevisions: appRev,
        materialInputs: { [`application:${app.id}.followUpAt`]: app.followUpAt.slice(0, 10), [`application:${app.id}.stage`]: app.stage },
        deadlineAt: app.followUpAt,
        expiresAt: new Date(Date.parse(app.followUpAt) + 14 * DAY_MS).toISOString(),
        goalRelevant,
      }));
    }

    // --- TAILOR_CV: preparing with no application CV and no tailoring in flight.
    if (app.stage === 'preparing' && !app.currentResumeId && !liveRunApps.has(app.id)) {
      out.push(candidate({
        actionType: 'TAILOR_CV', subjectId: app.id, priorityBand: 'soon',
        title: `Create the CV for ${appLabel(app)}`,
        reason: 'This application is in preparation but has no CV linked yet.',
        destination: { space: 'applications', id: app.id, section: 'cv' },
        evidenceRefs: [ref('application', app.id, appLabel(app))],
        contextRefs: appCtx, inputRevisions: appRev,
        materialInputs: { [`application:${app.id}.stage`]: 'preparing', [`application:${app.id}.currentResumeId`]: 'none' },
        goalRelevant,
      }));
    }

    // --- IMPROVE_ACHIEVEMENT: evidence gap on an active application.
    if (isActiveApp(app) && app.opportunityId) {
      const analysis = latestAnalysisFor(input.analyses, app.opportunityId, app.id);
      if (analysis && !analysis.stale && analysis.qualification.missing.length > 0) {
        const missing = analysis.qualification.missing;
        const ids = missing.map((m) => m.requirementId).sort();
        out.push(candidate({
          actionType: 'IMPROVE_ACHIEVEMENT', subjectId: app.id, priorityBand: 'soon',
          title: `Add evidence for ${appLabel(app)}`,
          reason: `${missing.length} requirement${missing.length === 1 ? '' : 's'} in the role analysis ${missing.length === 1 ? 'has' : 'have'} no supporting fact, e.g. "${missing[0].text}".`,
          destination: { space: 'career', section: 'achievements' },
          evidenceRefs: [ref('analysis', analysis.id, 'role analysis'), ...missing.slice(0, 3).map((m) => ref('analysis', `${analysis.id}#${m.requirementId}`, m.text))],
          contextRefs: { ...appCtx, opportunity: { id: app.opportunityId, revision: analysis.opportunityRevision } },
          inputRevisions: { ...appRev, [`analysis:${analysis.id}`]: analysis.computedAt },
          materialInputs: { [`analysis:${analysis.id}.missing`]: ids.join(',') },
          goalRelevant,
        }));
      }
    }

    // --- RECORD_OUTCOME: submitted three weeks ago and nothing observed since.
    if ((app.stage === 'submitted' || app.stage === 'response') && app.submittedAt) {
      const waited = msBetween(app.submittedAt, now);
      const observed = outcomes.some((o) => o.applicationId === app.id && o.kind !== 'submitted' && o.kind !== 'correction');
      if (waited !== null && waited > 21 * DAY_MS && !observed) {
        out.push(candidate({
          actionType: 'RECORD_OUTCOME', subjectId: app.id, priorityBand: 'soon',
          title: `Record what happened with ${appLabel(app)}`,
          reason: `Submitted ${Math.floor(waited / DAY_MS)} days ago with no response recorded. An unknown outcome stays unknown until you record it.`,
          destination: { space: 'applications', id: app.id, section: 'activity' },
          evidenceRefs: [ref('application', app.id, appLabel(app))],
          contextRefs: appCtx, inputRevisions: appRev,
          materialInputs: { [`application:${app.id}.submittedAt`]: app.submittedAt },
          goalRelevant,
        }));
      }
    }
  }

  // --- Opportunities: review or start.
  const appsByOpp = new Set(applications.map((a) => a.opportunityId).filter((v): v is string => Boolean(v)));
  for (const opp of [...opportunities].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const analysis = latestAnalysisFor(input.analyses, opp.id);
    const goalRelevant = Boolean(goal && analysis && analysis.goalId === goal.id);
    const oppCtx = { opportunity: { id: opp.id, revision: opp.revision }, ...goalRefs };
    if (opp.status === 'saved' && (!analysis || analysis.stale)) {
      out.push(candidate({
        actionType: 'REVIEW_OPPORTUNITY', subjectId: opp.id, priorityBand: 'soon',
        title: `Review ${oppLabel(opp)}`,
        reason: analysis ? 'The fit analysis is out of date after a change to the listing, your goal or your facts.' : 'Saved without a fit analysis yet.',
        destination: { space: 'opportunities', id: opp.id },
        evidenceRefs: [ref('opportunity', opp.id, oppLabel(opp)), ...(analysis ? [ref('analysis', analysis.id, 'stale analysis')] : [])],
        contextRefs: oppCtx,
        inputRevisions: { [`opportunity:${opp.id}`]: opp.revision, ...goalRev, ...(analysis ? { [`analysis:${analysis.id}`]: analysis.computedAt } : {}) },
        materialInputs: { [`opportunity:${opp.id}.content`]: opp.contentFingerprint ?? opp.revision, [`opportunity:${opp.id}.analysis`]: analysis ? `${analysis.id}:stale` : 'none' },
        goalRelevant,
      }));
    }
    if ((opp.status === 'saved' || opp.status === 'watching') && analysis && !analysis.stale && !appsByOpp.has(opp.id)) {
      const { supported, considered, share } = supportedShare(analysis);
      if (share !== null && share >= 0.6) {
        out.push(candidate({
          actionType: 'START_APPLICATION', subjectId: opp.id, priorityBand: 'soon',
          title: `Start an application for ${oppLabel(opp)}`,
          reason: `${supported} of ${considered} judged requirements are supported by your confirmed evidence${analysis.hiddenByConstraint ? '; note a hard constraint is flagged' : ''}.`,
          destination: { space: 'opportunities', id: opp.id },
          evidenceRefs: [ref('analysis', analysis.id, `${supported}/${considered} supported`), ref('opportunity', opp.id, oppLabel(opp))],
          contextRefs: oppCtx,
          inputRevisions: { [`opportunity:${opp.id}`]: opp.revision, ...goalRev, [`analysis:${analysis.id}`]: analysis.computedAt },
          materialInputs: { [`analysis:${analysis.id}`]: analysis.computedAt },
          goalRelevant,
        }));
      }
    }
  }

  // --- CAPTURE_ACHIEVEMENT: employed development (goal, no active search, thin evidence).
  if (goal && !applications.some(isActiveApp)) {
    const achievements = facts.filter((f) => f.kind === 'achievement').length;
    if (achievements < 3) {
      out.push(candidate({
        actionType: 'CAPTURE_ACHIEVEMENT', subjectId: goal.id, priorityBand: 'later',
        title: 'Capture a recent achievement',
        reason: `You have ${achievements} recorded achievement${achievements === 1 ? '' : 's'}; evidence gathered now supports "${goal.title || goal.role}" later.`,
        destination: { space: 'career', section: 'achievements' },
        evidenceRefs: [ref('goal', goal.id, goal.title || goal.role)],
        contextRefs: goalRefs,
        inputRevisions: { ...goalRev, achievements },
        materialInputs: { [`goal:${goal.id}`]: goal.id },
        goalRelevant: true,
      }));
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

const deadlineMs = (c: ActionCandidate): number => {
  if (!c.ranking.deadlineAt) return Number.POSITIVE_INFINITY;
  const t = Date.parse(c.ranking.deadlineAt);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

/**
 * Confirmed deadline → dependency unblocking → goal relevance → effort fit,
 * with the dedupe key as the stable final tie-break.
 */
export function compareActions(a: ActionCandidate, b: ActionCandidate): number {
  const da = deadlineMs(a); const db = deadlineMs(b);
  if (da !== db) return da < db ? -1 : 1;
  if (a.ranking.unblocks !== b.ranking.unblocks) return a.ranking.unblocks ? -1 : 1;
  if (a.ranking.goalRelevant !== b.ranking.goalRelevant) return a.ranking.goalRelevant ? -1 : 1;
  if (a.ranking.effortMinutes !== b.ranking.effortMinutes) return a.ranking.effortMinutes - b.ranking.effortMinutes;
  return a.dedupeKey < b.dedupeKey ? -1 : a.dedupeKey > b.dedupeKey ? 1 : 0;
}

export function rankActions(candidates: ActionCandidate[]): ActionCandidate[] {
  return [...candidates].sort(compareActions);
}

export function selectTop(actions: ActionCandidate[], n = 3): ActionCandidate[] {
  return rankActions(actions).slice(0, Math.max(0, n));
}

/** The single ranking criterion that placed the action where it is. */
export function explainDominantReason(action: ActionCandidate | CareerAction): string {
  if ('ranking' in action) {
    const r = action.ranking;
    if (r.deadlineAt) return `Recorded date: ${r.deadlineAt.slice(0, 10)}`;
    if (r.unblocks) return 'Unblocks other work';
    if (r.goalRelevant) return 'Linked to your primary goal';
    return `Small step (${action.estimatedEffort ?? 'effort not estimated'})`;
  }
  return action.reason;
}

// ---------------------------------------------------------------------------
// Lifecycle helpers (pure)
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<ActionStatus, readonly ActionStatus[]> = {
  PROPOSED: ['READY', 'DISMISSED', 'EXPIRED'],
  READY: ['IN_PROGRESS', 'DISMISSED', 'EXPIRED', 'COMPLETED'],
  IN_PROGRESS: ['WAITING_FOR_USER', 'COMPLETED', 'FAILED', 'DISMISSED'],
  WAITING_FOR_USER: ['IN_PROGRESS', 'DISMISSED', 'EXPIRED'],
  FAILED: ['READY', 'DISMISSED', 'EXPIRED'],
  COMPLETED: [],
  DISMISSED: [],
  EXPIRED: [],
};

/**
 * Allowed status exits per the context model. READY → COMPLETED exists only
 * for an explicit user-reported completion; durable completion goes through
 * IN_PROGRESS.
 */
export function canTransition(from: ActionStatus, to: ActionStatus, opts: { completionSource?: CompletionSource | null } = {}): boolean {
  if (!TRANSITIONS[from].includes(to)) return false;
  if (from === 'READY' && to === 'COMPLETED') return opts.completionSource === 'user_reported';
  return true;
}

export function isExpired(action: Pick<CareerAction, 'expiresAt'>, now: Date): boolean {
  if (!action.expiresAt) return false;
  const t = Date.parse(action.expiresAt);
  return !Number.isNaN(t) && t <= now.getTime();
}

/** READY/PROPOSED, not snoozed past `now`, not expired. */
export function isEligible(action: Pick<CareerAction, 'status' | 'snoozedUntil' | 'expiresAt'>, now: Date): boolean {
  if (action.status !== 'READY' && action.status !== 'PROPOSED') return false;
  if (action.snoozedUntil) {
    const t = Date.parse(action.snoozedUntil);
    if (!Number.isNaN(t) && t > now.getTime()) return false;
  }
  return !isExpired(action, now);
}

export interface ResurfaceDecision { resurface: boolean; reason: string | null }

/**
 * A dismissed action returns only when a material trigger input changed. The
 * dedupe key already encodes the material inputs, so an identical key means
 * "still dismissed"; a sibling key (same type + subject, different hash)
 * resurfaces with an explanation of what changed.
 */
export function shouldResurface(existing: CareerAction, candidate: ActionCandidate): ResurfaceDecision {
  if (existing.status !== 'DISMISSED') return { resurface: false, reason: null };
  if (existing.actionType !== candidate.actionType) return { resurface: false, reason: null };
  if (subjectPrefix(existing.dedupeKey) !== subjectPrefix(candidate.dedupeKey)) return { resurface: false, reason: null };
  if (existing.dedupeKey === candidate.dedupeKey) return { resurface: false, reason: null };
  const changes: string[] = [];
  for (const key of Object.keys(candidate.materialInputs).sort()) {
    const before = existing.inputRevisions[key];
    const after = candidate.materialInputs[key];
    if (String(before ?? 'none') !== String(after)) changes.push(`${key}: ${String(before ?? 'none')} → ${String(after)}`);
  }
  for (const key of Object.keys(existing.inputRevisions).sort()) {
    if (!(key in candidate.materialInputs) && !(key in candidate.inputRevisions)) changes.push(`${key} no longer applies`);
  }
  return { resurface: true, reason: `Returned because ${changes.length > 0 ? changes.join('; ') : 'the trigger inputs changed'}` };
}

export interface ReceiptCompletion {
  status: ActionStatus;
  completionSource: CompletionSource | null;
  resultRef: Record<string, unknown> | null;
  lastError: CareerAction['lastError'];
}

/** Map a durable run receipt to the action status it justifies. HTTP 200 alone is not completion. */
export function completionForReceipt(run: ActionRun): ReceiptCompletion {
  switch (run.status) {
    case 'completed':
      return { status: 'COMPLETED', completionSource: 'durable_receipt', resultRef: run.resultRef ?? { runId: run.id }, lastError: null };
    case 'failed':
      return { status: 'FAILED', completionSource: null, resultRef: null, lastError: { code: run.failureCode ?? 'failed', retryable: run.retryable, at: run.finishedAt ?? run.updatedAt } };
    case 'waiting_confirmation':
      return { status: 'WAITING_FOR_USER', completionSource: null, resultRef: null, lastError: null };
    case 'cancelled':
      return { status: 'DISMISSED', completionSource: null, resultRef: run.resultRef, lastError: null };
    case 'pending':
    case 'running':
    default:
      return { status: 'IN_PROGRESS', completionSource: null, resultRef: null, lastError: null };
  }
}

// ---------------------------------------------------------------------------
// Durable-result reconciliation
// ---------------------------------------------------------------------------

export interface DurableCompletion {
  action: CareerAction;
  resultRef: Record<string, unknown>;
}

/**
 * An action a user began (IN_PROGRESS / WAITING_FOR_USER) completes only when
 * the destination workflow's owned result now exists in the durable state —
 * never because a route was opened. Each rule names the row that proves it.
 * Anything without such a rule stays in progress until a receipt arrives.
 */
export function reconcileDurableCompletions(actions: CareerAction[], input: Pick<RulesInput, 'goal' | 'facts' | 'applications' | 'interviews' | 'outcomes' | 'opportunities' | 'analyses'>): DurableCompletion[] {
  const out: DurableCompletion[] = [];
  const activeFacts = input.facts.filter((f) => f.status === 'active');
  for (const action of actions) {
    if (action.status !== 'IN_PROGRESS' && action.status !== 'WAITING_FOR_USER') continue;
    const appId = action.contextRefs.application?.id;
    const oppId = action.contextRefs.opportunity?.id;
    const app = appId ? input.applications.find((a) => a.id === appId) : undefined;
    let resultRef: Record<string, unknown> | null = null;
    switch (action.actionType) {
      case 'SET_GOAL':
        if (input.goal && input.goal.status === 'active') resultRef = { kind: 'goal', id: input.goal.id, revision: input.goal.revision };
        break;
      case 'REVIEW_IMPORT':
        if (activeFacts.length > 0 && activeFacts.every((f) => f.reviewState !== 'candidate')) resultRef = { kind: 'facts', reviewed: activeFacts.length };
        break;
      case 'RESOLVE_CONFLICT':
        if (activeFacts.every((f) => f.reviewState !== 'conflict')) resultRef = { kind: 'facts', conflicts: 0 };
        break;
      case 'START_APPLICATION': {
        const started = oppId ? input.applications.find((a) => a.opportunityId === oppId && a.stage !== 'saved') : undefined;
        if (started) resultRef = { kind: 'application', id: started.id, revision: started.revision };
        break;
      }
      case 'TAILOR_CV':
      case 'REVIEW_TAILORING':
        if (app?.currentResumeId) resultRef = { kind: 'resume', id: app.currentResumeId, applicationId: app.id };
        break;
      case 'REVIEW_OPPORTUNITY': {
        const analysis = oppId ? input.analyses.find((a) => a.opportunityId === oppId && !a.stale) : undefined;
        if (analysis) resultRef = { kind: 'analysis', id: analysis.id };
        break;
      }
      case 'PREPARE_INTERVIEW': {
        const session = input.interviews.find((s) => s.id === action.contextRefs.interview?.id || (appId && s.applicationId === appId));
        if (session && (session.status === 'prepared' || session.status === 'completed')) resultRef = { kind: 'interview', id: session.id, revision: session.revision };
        break;
      }
      case 'RECORD_OUTCOME':
      case 'FOLLOW_UP_APPLICATION': {
        const observed = (input.outcomes ?? []).find((o) => o.applicationId === appId && o.createdAt > action.createdAt);
        if (observed) resultRef = { kind: 'outcome', id: observed.id };
        break;
      }
      case 'CAPTURE_ACHIEVEMENT': {
        // Complete only from an achievement the person actually recorded after
        // the action was raised (the rule stored the count it saw at creation).
        const since = action.createdAt;
        const seen = typeof action.inputRevisions.achievements === 'number' ? action.inputRevisions.achievements : null;
        const achievements = activeFacts.filter((f) => f.kind === 'achievement');
        const recorded = achievements.filter((f) => f.createdAt >= since).sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))[0]
          ?? (seen !== null && achievements.length > seen ? achievements.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))[0] : undefined);
        if (recorded) resultRef = { kind: 'fact', id: recorded.id, revision: recorded.revision };
        break;
      }
      default:
        break;
    }
    if (resultRef) out.push({ action, resultRef });
  }
  return out;
}
