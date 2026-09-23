// Typed builders for domain fixtures. Every field has an honest default (no
// dates, pay or outcomes invented); tests override what they assert on.
import type {
  ActionRun, ApplicationArtifact, ApplicationRecord, CareerAction, CareerFact, CareerGoal, Campaign, InterviewSession,
  Opportunity, OpportunityAnalysis, OutcomeObservation,
} from '../types';
import {
  actionToRow, analysisToRow, applicationToRow, artifactToRow, campaignToRow, factToRow, goalToRow, interviewToRow,
  opportunityToRow, outcomeToRow,
} from '../mappers';

/** A full table row (id, revision, timestamps) for a domain fixture, as PostgREST would return it. */
const withMeta = (row: Record<string, unknown>, e: { id: string; revision?: number; createdAt?: string; updatedAt?: string }): Record<string, unknown> => ({
  ...row, id: e.id, ...(e.revision !== undefined ? { revision: e.revision } : {}), created_at: e.createdAt ?? T0, updated_at: e.updatedAt ?? T0,
});
export const rows = {
  fact: (f: CareerFact, userId = 'u1') => withMeta(factToRow(f, userId), f),
  goal: (g: CareerGoal, userId = 'u1') => withMeta(goalToRow(g, userId), g),
  opportunity: (o: Opportunity, userId = 'u1') => withMeta(opportunityToRow(o, userId), o),
  campaign: (c: Campaign, userId = 'u1') => withMeta(campaignToRow(c, userId), c),
  application: (a: ApplicationRecord, userId = 'u1') => withMeta({ ...applicationToRow(a, userId), attempt_no: a.attemptNo, previous_attempt_id: a.previousAttemptId, goal_revision: a.goalRevision }, a),
  artifact: (a: ApplicationArtifact, userId = 'u1') => withMeta(artifactToRow(a, userId), a),
  interview: (s: InterviewSession, userId = 'u1') => withMeta(interviewToRow(s, userId), s),
  outcome: (o: OutcomeObservation, userId = 'u1') => withMeta(outcomeToRow(o, userId), o),
  analysis: (a: OpportunityAnalysis, userId = 'u1') => ({ ...analysisToRow(a, userId), id: a.id }),
  action: (a: CareerAction, userId = 'u1') => withMeta(actionToRow(a, userId), a),
};

const T0 = '2026-09-01T00:00:00.000Z';

/**
 * Deterministic, readable v4-shaped UUID for a short label ('a1' -> a UUID
 * whose first block spells the label in hex-safe form). Repositories reject
 * ids that are not UUID-shaped before querying, so repo tests use these.
 */
export function uuidFor(label: string): string {
  const hex = Array.from(label).map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const body = (hex.repeat(8)).slice(0, 32).split('');
  body[12] = '4'; body[16] = '8';
  const b = body.join('');
  return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20)}`;
}

export const goal = (o: Partial<CareerGoal> = {}): CareerGoal => ({
  id: 'g1', title: 'Senior nurse role', role: 'Senior Nurse', level: 'senior', industry: 'healthcare', location: 'London',
  remotePreference: null, compMin: null, compMax: null, compCurrency: null, compPeriod: null, targetDate: null,
  targetEmployers: [], constraints: [], priorities: [], isPrimary: true, status: 'active', source: 'user',
  revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const opportunity = (o: Partial<Opportunity> = {}): Opportunity => ({
  id: 'o1', opportunityType: 'role', title: 'Senior Nurse', company: 'Acme Health', location: '', remoteType: null,
  sourceUrl: null, sourceKind: 'paste', capturedContent: '', contentFingerprint: null, capturedAt: T0, sourceDate: null,
  listingStatus: 'unknown', status: 'saved', compMin: null, compMax: null, compCurrency: null, compPeriod: null,
  requirements: [], legacyApplicationId: null, mergedIntoId: null, mergeUndo: null, notInterestedReason: null,
  revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const application = (o: Partial<ApplicationRecord> = {}): ApplicationRecord => ({
  id: 'a1', jobTitle: 'Senior Nurse', company: 'Acme Health', jobUrl: null, status: 'wishlist', dateApplied: null,
  notes: null, matchScore: null, opportunityId: 'o1', campaignId: null, goalId: null, goalRevision: null,
  goalSnapshot: null, attemptNo: 1, previousAttemptId: null, stage: 'preparing', closedReason: null, submittedAt: null,
  submissionSnapshot: null, currentResumeId: null, prismRunId: null, followUpAt: null, readiness: null,
  revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const fact = (o: Partial<CareerFact> = {}): CareerFact => ({
  id: 'f1', kind: 'experience', title: 'Senior Nurse', organization: 'St Mary Hospital', location: 'London',
  startDate: '2019-01', endDate: '2023-06', narrative: '', payload: {}, parentFactId: null,
  confirmationState: 'user_confirmed', verification: null, extractionConfidence: null, sourceKind: 'manual',
  sourceRef: {}, sourceFingerprint: null, legacyId: null, conflictGroup: null, reviewState: 'reviewed', status: 'active',
  sortOrder: 0, revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const interview = (o: Partial<InterviewSession> = {}): InterviewSession => ({
  id: 'i1', applicationId: 'a1', scheduledAt: null, timeZone: null, interviewType: 'unknown', themes: [], storyFactIds: [],
  practice: [], readiness: {}, selfReportedResult: null, recruiterFeedback: null, status: 'planned',
  revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const analysis = (o: Partial<OpportunityAnalysis> = {}): OpportunityAnalysis => ({
  id: 'an1', opportunityId: 'o1', goalId: 'g1', applicationId: null, opportunityRevision: 1, goalRevision: 1,
  factsRevision: 'abc', inputFingerprint: '', engineVersion: 'fit-1.0.0', qualification: { supported: [], partial: [], missing: [], unknown: [] },
  direction: { factors: [], constraints: [], missing: [] }, atsScore: null, hiddenByConstraint: null, stale: false,
  computedAt: T0, ...o,
});

export const artifact = (o: Partial<ApplicationArtifact> = {}): ApplicationArtifact => ({
  id: 'art1', applicationId: 'a1', kind: 'note', title: '', content: {}, plainText: '', source: 'user', status: 'draft',
  snapshotOf: null, provenance: {}, stale: false, revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const outcome = (o: Partial<OutcomeObservation> = {}): OutcomeObservation => ({
  id: 'x1', applicationId: 'a1', kind: 'response', observedAt: T0, source: 'user_reported', details: {}, supersedesId: null,
  note: '', createdAt: T0, ...o,
});

export const campaign = (o: Partial<Campaign> = {}): Campaign => ({
  id: 'c1', goalId: 'g1', name: 'Autumn search', status: 'active', milestones: [], notes: '', closedReason: null,
  revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const action = (o: Partial<CareerAction> = {}): CareerAction => ({
  id: 'act1', actionType: 'TAILOR_CV', title: 'Create the CV', reason: '', evidenceRefs: [], priorityBand: 'soon',
  contextRefs: {}, inputRevisions: {}, source: 'rule', ruleVersion: 'rules-1.0.0', status: 'READY',
  dedupeKey: 'TAILOR_CV:a1:hash', destination: { space: 'applications', id: 'a1', section: 'cv' }, estimatedEffort: null,
  effortSource: null, confidence: null, snoozedUntil: null, expiresAt: null, dismissedAt: null, completedAt: null,
  completionSource: null, resultRef: null, lastError: null, resurfacedReason: null, revision: 1, createdAt: T0, updatedAt: T0, ...o,
});

export const run = (o: Partial<ActionRun> = {}): ActionRun => ({
  id: 'run1', actionId: 'act1', tool: 'tailor_cv', status: 'completed', idempotencyKey: 'k1', attempt: 1, requestId: 'r1',
  actor: 'user', contextRevisions: {}, inputSummary: {}, resultRef: { resumeId: 'r9' }, retryable: false, failureCode: null,
  confirmation: null, usage: {}, startedAt: T0, finishedAt: T0, revision: 1, createdAt: T0, updatedAt: T0, ...o,
});
