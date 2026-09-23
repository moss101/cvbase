import { describe, expect, it } from 'vitest';
import type { ApplicationRecord, CareerAction, CareerFact, CareerGoal } from '../types';
import {
  RULES_VERSION, canTransition, compareActions, completionForReceipt, computeCandidateActions, dedupeKeyFor,
  explainDominantReason, hashInputs, isEligible, isExpired, rankActions, selectTop, shouldResurface, subjectPrefix,
  supportedShare, reconcileDurableCompletions, type ActionCandidate, type RulesInput,
} from '../careerActions';
import { action, analysis, application, fact, goal, interview, opportunity, outcome, run } from './fixtures';

const NOW = new Date('2026-09-20T12:00:00.000Z');
const input = (o: Partial<RulesInput> = {}): RulesInput => ({
  now: NOW, goal: null, facts: [], opportunities: [], applications: [], interviews: [], analyses: [], prismRuns: [], artifacts: [], ...o,
});
const types = (list: ActionCandidate[]) => list.map((c) => c.actionType).sort();
const req = (id: string, text: string) => ({ requirementId: id, text, state: 'missing' as const, evidence: [] });

describe('computeCandidateActions — empty and onboarding states', () => {
  it('no data → at most a profile review, never an invented goal or campaign', () => {
    const out = computeCandidateActions(input());
    expect(types(out)).toEqual(['REVIEW_PROFILE']);
    expect(out[0].priorityBand).toBe('later');
    expect(out[0].ruleVersion).toBe(RULES_VERSION);
    const withProfile = computeCandidateActions(input({ facts: [fact({ kind: 'profile_field', title: 'Current title' })] }));
    expect(withProfile).toEqual([]);
  });
  it('unreviewed import → REVIEW_IMPORT with fact evidence and a count-sensitive dedupe key', () => {
    const facts = [fact({ id: 'f1', reviewState: 'candidate', sourceRef: { resumeId: 'r1' } }), fact({ id: 'f2', reviewState: 'candidate', sourceRef: { resumeId: 'r1' } })];
    const [a] = computeCandidateActions(input({ facts }));
    expect(a.actionType).toBe('REVIEW_IMPORT');
    expect(a.priorityBand).toBe('now');
    expect(a.ranking.unblocks).toBe(true);
    expect(a.evidenceRefs.map((e) => e.id)).toEqual(['f1', 'f2']);
    expect(a.inputRevisions).toMatchObject({ 'fact:f1': 1, 'fact:f2': 1 });
    expect(a.destination).toEqual({ space: 'career', section: 'evidence', sub: 'review' });
    const [b] = computeCandidateActions(input({ facts: facts.slice(0, 1) }));
    expect(b.dedupeKey).not.toBe(a.dedupeKey);
    expect(subjectPrefix(b.dedupeKey)).toBe(subjectPrefix(a.dedupeKey));
  });
  it('conflict groups → one RESOLVE_CONFLICT per group, sorted deterministically', () => {
    const facts = [
      fact({ id: 'f1', reviewState: 'conflict', conflictGroup: 'cg-b' }), fact({ id: 'f2', reviewState: 'conflict', conflictGroup: 'cg-b' }),
      fact({ id: 'f3', reviewState: 'conflict', conflictGroup: 'cg-a' }), fact({ id: 'f4', reviewState: 'conflict', conflictGroup: 'cg-a' }),
    ];
    const out = computeCandidateActions(input({ facts }));
    expect(out.map((c) => [c.actionType, c.subjectId])).toEqual([['RESOLVE_CONFLICT', 'cg-a'], ['RESOLVE_CONFLICT', 'cg-b']]);
    expect(out[0].evidenceRefs.map((e) => e.id)).toEqual(['f3', 'f4']);
  });
  it('SET_GOAL only when there is an opportunity or application to aim at', () => {
    expect(types(computeCandidateActions(input({ facts: [fact()] })))).toEqual([]);
    const out = computeCandidateActions(input({ opportunities: [opportunity({ status: 'archived' })] }));
    expect(types(out)).toEqual(['SET_GOAL']);
    expect(out[0].reason).toContain('1 opportunity and 0 applications');
    expect(types(computeCandidateActions(input({ goal: goal(), opportunities: [opportunity({ status: 'archived' })] })))).not.toContain('SET_GOAL');
  });
});

describe('computeCandidateActions — interviews', () => {
  it('a dated session within 7 days is a deadline; beyond 7 days or completed it is not', () => {
    const apps = [application({ id: 'a1', stage: 'interview', goalId: 'g1' })];
    const soon = interview({ id: 'i1', applicationId: 'a1', scheduledAt: '2026-09-24T09:00:00.000Z', timeZone: 'Europe/London', themes: [{ id: 't', theme: 'x', covered: true }, { id: 'u', theme: 'y', covered: false }] });
    const out = computeCandidateActions(input({ goal: goal(), applications: apps, interviews: [soon] }));
    const prep = out.filter((c) => c.actionType === 'PREPARE_INTERVIEW');
    expect(prep).toHaveLength(1);
    expect(prep[0]).toMatchObject({ subjectId: 'i1', priorityBand: 'now', expiresAt: '2026-09-24T09:00:00.000Z' });
    expect(prep[0].ranking).toEqual({ deadlineAt: '2026-09-24T09:00:00.000Z', unblocks: false, goalRelevant: true, effortMinutes: 45 });
    expect(prep[0].reason).toContain('Thu, Sep 24, 10:00 AM (Europe/London)');
    expect(prep[0].reason).toContain('1 of 2 themes covered');
    expect(prep[0].materialInputs).toEqual({ 'interview:i1.scheduledAt': '2026-09-24T09:00:00.000Z' });
    const far = interview({ id: 'i2', applicationId: 'a1', scheduledAt: '2026-10-15T09:00:00.000Z' });
    expect(types(computeCandidateActions(input({ goal: goal(), applications: apps, interviews: [far] })))).not.toContain('PREPARE_INTERVIEW');
    const done = { ...soon, status: 'completed' as const };
    expect(types(computeCandidateActions(input({ goal: goal(), applications: apps, interviews: [done] })))).not.toContain('PREPARE_INTERVIEW');
    const past = { ...soon, scheduledAt: '2026-09-19T09:00:00.000Z' };
    expect(types(computeCandidateActions(input({ goal: goal(), applications: apps, interviews: [past] })))).not.toContain('PREPARE_INTERVIEW');
  });
  it('interview stage with no recorded date never becomes a deadline', () => {
    const out = computeCandidateActions(input({ applications: [application({ id: 'a1', stage: 'interview' })], interviews: [interview({ id: 'i1', applicationId: 'a1', scheduledAt: null })] }));
    const prep = out.find((c) => c.actionType === 'PREPARE_INTERVIEW')!;
    expect(prep.subjectId).toBe('a1');
    expect(prep.priorityBand).toBe('soon');
    expect(prep.ranking.deadlineAt).toBeNull();
    expect(prep.expiresAt).toBeNull();
    expect(prep.reason).toBe('Interview stage recorded; no date recorded. Add the interview time to plan around it.');
    expect(explainDominantReason(prep)).not.toContain('Recorded date');
    const ranked = rankActions([prep, ...computeCandidateActions(input({ applications: [application({ id: 'a2', stage: 'submitted', followUpAt: '2026-09-21' })] }))]);
    expect(ranked[0].actionType).toBe('FOLLOW_UP_APPLICATION'); // the real date wins over the undated interview
  });
});

describe('computeCandidateActions — applications and runs', () => {
  it('REVIEW_TAILORING for a run in review; TAILOR_CV only when nothing is in flight', () => {
    const app = application({ id: 'a1', stage: 'preparing', currentResumeId: null });
    const review = computeCandidateActions(input({ applications: [app], prismRuns: [{ id: 'p1', status: 'review', applicationId: 'a1', updatedAt: 't' }] }));
    expect(types(review)).toEqual(['REVIEW_TAILORING', 'SET_GOAL']);
    expect(review.find((c) => c.actionType === 'REVIEW_TAILORING')).toMatchObject({ subjectId: 'p1', priorityBand: 'now', destination: { space: 'applications', id: 'a1', section: 'cv', sub: 'p1' } });
    const idle = computeCandidateActions(input({ applications: [app] }));
    expect(types(idle)).toEqual(['SET_GOAL', 'TAILOR_CV']);
    const running = computeCandidateActions(input({ applications: [app], prismRuns: [{ id: 'p2', status: 'awaiting_answers', applicationId: 'a1', updatedAt: 't' }] }));
    expect(types(running)).toEqual(['SET_GOAL']);
    const linked = computeCandidateActions(input({ applications: [{ ...app, currentResumeId: 'r1' }] }));
    expect(types(linked)).not.toContain('TAILOR_CV');
  });
  it('FOLLOW_UP_APPLICATION when the user-set date is within two days and the stage is submitted/response', () => {
    const due = application({ id: 'a1', stage: 'submitted', followUpAt: '2026-09-22' });
    const out = computeCandidateActions(input({ goal: goal(), applications: [due] }));
    const f = out.find((c) => c.actionType === 'FOLLOW_UP_APPLICATION')!;
    expect(f.ranking.deadlineAt).toBe('2026-09-22');
    expect(f.expiresAt).toBe('2026-10-06T00:00:00.000Z');
    expect(f.materialInputs).toEqual({ 'application:a1.followUpAt': '2026-09-22', 'application:a1.stage': 'submitted' });
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [{ ...due, followUpAt: '2026-09-23' }] })))).not.toContain('FOLLOW_UP_APPLICATION');
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [{ ...due, stage: 'interview' }] })))).not.toContain('FOLLOW_UP_APPLICATION');
  });
  it('IMPROVE_ACHIEVEMENT for an active application whose fresh analysis lists missing requirements', () => {
    const app = application({ id: 'a1', stage: 'submitted', opportunityId: 'o1', goalId: 'g1' });
    const an = analysis({ id: 'an1', opportunityId: 'o1', applicationId: 'a1', qualification: { supported: [], partial: [], missing: [req('r1', 'Epic EHR experience'), req('r2', 'Team leadership')], unknown: [] } });
    const out = computeCandidateActions(input({ goal: goal(), applications: [app], analyses: [an] }));
    const gap = out.find((c) => c.actionType === 'IMPROVE_ACHIEVEMENT')!;
    expect(gap).toMatchObject({ subjectId: 'a1', priorityBand: 'soon', destination: { space: 'career', section: 'achievements' } });
    expect(gap.reason).toContain('2 requirements');
    expect(gap.reason).toContain('"Epic EHR experience"');
    expect(gap.evidenceRefs[0]).toEqual({ kind: 'analysis', id: 'an1', label: 'role analysis' });
    expect(gap.materialInputs).toEqual({ 'analysis:an1.missing': 'r1,r2' });
    expect(gap.ranking.goalRelevant).toBe(true);
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [{ ...app, stage: 'closed' }], analyses: [an] })))).not.toContain('IMPROVE_ACHIEVEMENT');
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [app], analyses: [{ ...an, stale: true }] })))).not.toContain('IMPROVE_ACHIEVEMENT');
  });
  it('RECORD_OUTCOME after 21 days of silence, suppressed once any response is observed', () => {
    const app = application({ id: 'a1', stage: 'submitted', submittedAt: '2026-08-20T00:00:00.000Z' });
    const out = computeCandidateActions(input({ goal: goal(), applications: [app] }));
    const rec = out.find((c) => c.actionType === 'RECORD_OUTCOME')!;
    expect(rec.reason).toContain('Submitted 31 days ago');
    expect(rec.materialInputs).toEqual({ 'application:a1.submittedAt': '2026-08-20T00:00:00.000Z' });
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [app], outcomes: [outcome({ applicationId: 'a1', kind: 'response' })] })))).not.toContain('RECORD_OUTCOME');
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [{ ...app, submittedAt: '2026-09-10T00:00:00.000Z' }] })))).not.toContain('RECORD_OUTCOME');
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [{ ...app, submittedAt: null }] })))).not.toContain('RECORD_OUTCOME');
  });
});

describe('computeCandidateActions — opportunities and development', () => {
  it('REVIEW_OPPORTUNITY for saved opportunities without a fresh analysis; merged rows are ignored', () => {
    const opps = [opportunity({ id: 'o1', status: 'saved', contentFingerprint: 'fp1' }), opportunity({ id: 'o2', status: 'saved', mergedIntoId: 'o1' }), opportunity({ id: 'o3', status: 'watching' })];
    const out = computeCandidateActions(input({ goal: goal(), opportunities: opps, analyses: [analysis({ id: 'an3', opportunityId: 'o3' })] }));
    const reviews = out.filter((c) => c.actionType === 'REVIEW_OPPORTUNITY');
    expect(reviews.map((r) => r.subjectId)).toEqual(['o1']);
    expect(reviews[0].reason).toBe('Saved without a fit analysis yet.');
    expect(reviews[0].materialInputs).toEqual({ 'opportunity:o1.content': 'fp1', 'opportunity:o1.analysis': 'none' });
    const stale = computeCandidateActions(input({ goal: goal(), opportunities: [opps[0]], analyses: [analysis({ id: 'an1', opportunityId: 'o1', stale: true })] }));
    expect(stale.find((c) => c.actionType === 'REVIEW_OPPORTUNITY')!.reason).toContain('out of date');
  });
  it('START_APPLICATION when ≥60% of judged requirements are supported and no application exists, with an explanation', () => {
    const q = { supported: [req('r1', 'a'), req('r2', 'b'), req('r3', 'c')], partial: [req('r4', 'd')], missing: [req('r5', 'e')], unknown: [req('r6', 'f'), req('r7', 'g')] };
    const an = analysis({ id: 'an1', opportunityId: 'o1', goalId: 'g1', qualification: q });
    expect(supportedShare(an)).toEqual({ supported: 3, considered: 5, share: 0.6 });
    const out = computeCandidateActions(input({ goal: goal(), opportunities: [opportunity({ id: 'o1', status: 'saved' })], analyses: [an] }));
    const start = out.find((c) => c.actionType === 'START_APPLICATION')!;
    expect(start.reason).toBe('3 of 5 judged requirements are supported by your confirmed evidence.');
    expect(start.ranking.goalRelevant).toBe(true);
    expect(start.evidenceRefs[0]).toEqual({ kind: 'analysis', id: 'an1', label: '3/5 supported' });
    const below = { ...an, qualification: { ...q, supported: q.supported.slice(0, 2) } };
    expect(types(computeCandidateActions(input({ goal: goal(), opportunities: [opportunity({ id: 'o1' })], analyses: [below] })))).not.toContain('START_APPLICATION');
    expect(types(computeCandidateActions(input({ goal: goal(), opportunities: [opportunity({ id: 'o1' })], analyses: [an], applications: [application({ opportunityId: 'o1' })] })))).not.toContain('START_APPLICATION');
    expect(supportedShare(analysis()).share).toBeNull();
  });
  it('CAPTURE_ACHIEVEMENT for employed development only (goal, no active applications, thin evidence)', () => {
    const out = computeCandidateActions(input({ goal: goal({ id: 'g1', title: 'Charge nurse' }), facts: [fact({ kind: 'achievement', id: 'ach1' })] }));
    const cap = out.find((c) => c.actionType === 'CAPTURE_ACHIEVEMENT')!;
    expect(cap).toMatchObject({ subjectId: 'g1', priorityBand: 'later', materialInputs: { 'goal:g1': 'g1' } });
    expect(cap.reason).toContain('1 recorded achievement;');
    expect(cap.reason).toContain('"Charge nurse"');
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [application({ stage: 'preparing' })] })))).not.toContain('CAPTURE_ACHIEVEMENT');
    expect(types(computeCandidateActions(input({ goal: goal(), applications: [application({ stage: 'closed', closedReason: 'rejected' })] })))).toContain('CAPTURE_ACHIEVEMENT');
    expect(types(computeCandidateActions(input({ goal: goal(), facts: [1, 2, 3].map((i) => fact({ id: `ach${i}`, kind: 'achievement' })) })))).not.toContain('CAPTURE_ACHIEVEMENT');
  });
});

describe('dedupe keys', () => {
  it('are stable across input order, type + subject + material hash, and change only with material inputs', () => {
    const apps = [application({ id: 'a1', stage: 'preparing' }), application({ id: 'a2', stage: 'preparing' })];
    const a = computeCandidateActions(input({ goal: goal(), applications: apps })).map((c) => c.dedupeKey).sort();
    const b = computeCandidateActions(input({ goal: goal(), applications: [...apps].reverse() })).map((c) => c.dedupeKey).sort();
    expect(a).toEqual(b);
    const bumped = computeCandidateActions(input({ goal: goal({ revision: 9 }), applications: apps.map((x) => ({ ...x, revision: 7, notes: 'edited' })) })).map((c) => c.dedupeKey).sort();
    expect(bumped).toEqual(a); // non-material edits keep the same logical action
    expect(dedupeKeyFor('TAILOR_CV', 'a1', { x: 1 })).toBe(`TAILOR_CV:a1:${hashInputs({ x: 1 })}`);
    expect(hashInputs({ a: 1, b: 'x' })).toBe(hashInputs({ b: 'x', a: 1 }));
    expect(subjectPrefix('TAILOR_CV:a1:abc')).toBe('TAILOR_CV:a1:');
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('rankActions / selectTop / explainDominantReason', () => {
  const mk = (o: Partial<Omit<ActionCandidate, 'ranking'>> & { ranking?: Partial<ActionCandidate['ranking']> }): ActionCandidate => ({
    actionType: 'TAILOR_CV', subjectId: 's', title: '', reason: 'r', evidenceRefs: [], priorityBand: 'soon', contextRefs: {}, inputRevisions: {},
    source: 'rule', ruleVersion: RULES_VERSION, dedupeKey: 'k', destination: { space: 'today' }, estimatedEffort: '~10 min', effortSource: 'rule_estimate',
    confidence: null, expiresAt: null, materialInputs: {}, ...o,
    ranking: { deadlineAt: null, unblocks: false, goalRelevant: false, effortMinutes: 10, ...(o.ranking ?? {}) },
  });
  it('orders by confirmed deadline, then unblocking, then goal relevance, then effort, then dedupe key — no scores', () => {
    const late = mk({ dedupeKey: 'late', ranking: { deadlineAt: '2026-09-30T00:00:00Z' } });
    const early = mk({ dedupeKey: 'early', ranking: { deadlineAt: '2026-09-21T00:00:00Z', effortMinutes: 90 } });
    const unblock = mk({ dedupeKey: 'unblock', actionType: 'SET_GOAL', ranking: { unblocks: true, effortMinutes: 60 } });
    const goalLinked = mk({ dedupeKey: 'goal', ranking: { goalRelevant: true, effortMinutes: 30 } });
    const cheap = mk({ dedupeKey: 'b-cheap', ranking: { effortMinutes: 5 } });
    const cheapToo = mk({ dedupeKey: 'a-cheap', ranking: { effortMinutes: 5 } });
    const ranked = rankActions([cheap, goalLinked, late, cheapToo, unblock, early]);
    expect(ranked.map((c) => c.dedupeKey)).toEqual(['early', 'late', 'unblock', 'goal', 'a-cheap', 'b-cheap']);
    expect(rankActions([cheapToo, cheap]).map((c) => c.dedupeKey)).toEqual(rankActions([cheap, cheapToo]).map((c) => c.dedupeKey));
    expect(compareActions(cheap, cheap)).toBe(0);
    expect(selectTop([cheap, goalLinked, late, cheapToo, unblock, early]).map((c) => c.dedupeKey)).toEqual(['early', 'late', 'unblock']);
    expect(selectTop([cheap], 0)).toEqual([]);
    expect(explainDominantReason(early)).toBe('Recorded date: 2026-09-21');
    expect(explainDominantReason(unblock)).toBe('Unblocks other work');
    expect(explainDominantReason(goalLinked)).toBe('Linked to your primary goal');
    expect(explainDominantReason(cheap)).toBe('Small step (~10 min)');
    expect(explainDominantReason(action({ reason: 'persisted reason' }))).toBe('persisted reason');
  });
  it('an unparsable deadline sorts as no deadline rather than first', () => {
    const bad = mk({ dedupeKey: 'bad', ranking: { deadlineAt: 'someday' } });
    const none = mk({ dedupeKey: 'a-none' });
    expect(rankActions([bad, none]).map((c) => c.dedupeKey)).toEqual(['a-none', 'bad']);
  });
});

describe('lifecycle helpers', () => {
  it('canTransition follows the context-model table; READY→COMPLETED only for user-reported completion', () => {
    expect(canTransition('PROPOSED', 'READY')).toBe(true);
    expect(canTransition('READY', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'WAITING_FOR_USER')).toBe(true);
    expect(canTransition('WAITING_FOR_USER', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('FAILED', 'READY')).toBe(true);
    expect(canTransition('READY', 'COMPLETED')).toBe(false);
    expect(canTransition('READY', 'COMPLETED', { completionSource: 'user_reported' })).toBe(true);
    expect(canTransition('READY', 'COMPLETED', { completionSource: 'durable_receipt' })).toBe(false);
    expect(canTransition('COMPLETED', 'READY')).toBe(false);
    expect(canTransition('DISMISSED', 'READY')).toBe(false);
    expect(canTransition('EXPIRED', 'IN_PROGRESS')).toBe(false);
    expect(canTransition('PROPOSED', 'IN_PROGRESS')).toBe(false);
  });
  it('isEligible / isExpired honour snooze and expiry against the given clock', () => {
    expect(isEligible(action({ status: 'READY' }), NOW)).toBe(true);
    expect(isEligible(action({ status: 'PROPOSED' }), NOW)).toBe(true);
    expect(isEligible(action({ status: 'IN_PROGRESS' }), NOW)).toBe(false);
    expect(isEligible(action({ status: 'READY', snoozedUntil: '2026-09-21T00:00:00Z' }), NOW)).toBe(false);
    expect(isEligible(action({ status: 'READY', snoozedUntil: '2026-09-20T11:00:00Z' }), NOW)).toBe(true);
    expect(isEligible(action({ status: 'READY', expiresAt: '2026-09-20T12:00:00.000Z' }), NOW)).toBe(false);
    expect(isExpired(action({ expiresAt: '2026-09-20T12:00:00.001Z' }), NOW)).toBe(false);
    expect(isExpired(action({ expiresAt: null }), NOW)).toBe(false);
  });
  it('a dismissed action is not resurfaced by non-material changes, but is (with a reason) by a material one', () => {
    const [before] = computeCandidateActions(input({ applications: [application({ id: 'a1', stage: 'submitted', followUpAt: '2026-09-21' })] })).filter((c) => c.actionType === 'FOLLOW_UP_APPLICATION');
    const dismissed = action({ actionType: 'FOLLOW_UP_APPLICATION', status: 'DISMISSED', dedupeKey: before.dedupeKey, inputRevisions: before.inputRevisions });
    const [same] = computeCandidateActions(input({ applications: [application({ id: 'a1', stage: 'submitted', followUpAt: '2026-09-21', revision: 9, notes: 'edited' })] })).filter((c) => c.actionType === 'FOLLOW_UP_APPLICATION');
    expect(shouldResurface(dismissed, same)).toEqual({ resurface: false, reason: null });
    const [moved] = computeCandidateActions(input({ applications: [application({ id: 'a1', stage: 'response', followUpAt: '2026-09-22' })] })).filter((c) => c.actionType === 'FOLLOW_UP_APPLICATION');
    const decision = shouldResurface(dismissed, moved);
    expect(decision.resurface).toBe(true);
    expect(decision.reason).toBe('Returned because application:a1.followUpAt: 2026-09-21 → 2026-09-22; application:a1.stage: submitted → response');
    expect(shouldResurface({ ...dismissed, status: 'READY' }, moved).resurface).toBe(false);
    expect(shouldResurface({ ...dismissed, actionType: 'TAILOR_CV' }, moved).resurface).toBe(false);
    expect(shouldResurface({ ...dismissed, dedupeKey: 'FOLLOW_UP_APPLICATION:other:zzz' }, moved).resurface).toBe(false);
  });
  it('completionForReceipt maps run status to action status; only a completed run completes', () => {
    expect(completionForReceipt(run({ status: 'completed', resultRef: { resumeId: 'r9' } }))).toEqual({ status: 'COMPLETED', completionSource: 'durable_receipt', resultRef: { resumeId: 'r9' }, lastError: null });
    expect(completionForReceipt(run({ status: 'completed', resultRef: null })).resultRef).toEqual({ runId: 'run1' });
    expect(completionForReceipt(run({ status: 'failed', failureCode: 'quota_exceeded', retryable: true, finishedAt: 'f' }))).toEqual({ status: 'FAILED', completionSource: null, resultRef: null, lastError: { code: 'quota_exceeded', retryable: true, at: 'f' } });
    expect(completionForReceipt(run({ status: 'waiting_confirmation' })).status).toBe('WAITING_FOR_USER');
    expect(completionForReceipt(run({ status: 'running' })).status).toBe('IN_PROGRESS');
    expect(completionForReceipt(run({ status: 'pending' })).status).toBe('IN_PROGRESS');
    expect(completionForReceipt(run({ status: 'cancelled' })).status).toBe('DISMISSED');
    expect(completionForReceipt(run({ status: 'running' })).completionSource).toBeNull();
  });
});

describe('reconcileDurableCompletions', () => {
  const base = { goal: null, facts: [], applications: [], interviews: [], outcomes: [], opportunities: [], analyses: [] };
  const action = (over: Partial<CareerAction>): CareerAction => ({
    id: 'a1', actionType: 'SET_GOAL', title: 't', reason: 'r', evidenceRefs: [], priorityBand: 'now', contextRefs: {}, inputRevisions: {},
    source: 'rule', ruleVersion: 'rules-1.0.0', status: 'IN_PROGRESS', dedupeKey: 'k', destination: { space: 'career' }, estimatedEffort: null,
    effortSource: null, confidence: null, snoozedUntil: null, expiresAt: null, dismissedAt: null, completedAt: null, completionSource: null,
    resultRef: null, lastError: null, resurfacedReason: null, revision: 1, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', ...over,
  });

  it('completes SET_GOAL only once an active goal exists, never on open', () => {
    expect(reconcileDurableCompletions([action({})], base)).toEqual([]);
    const goal = { id: 'g1', revision: 2, status: 'active' } as unknown as CareerGoal;
    const done = reconcileDurableCompletions([action({})], { ...base, goal });
    expect(done).toHaveLength(1);
    expect(done[0].resultRef).toEqual({ kind: 'goal', id: 'g1', revision: 2 });
  });

  it('ignores READY actions and actions without a durable rule', () => {
    const goal = { id: 'g1', revision: 2, status: 'active' } as unknown as CareerGoal;
    expect(reconcileDurableCompletions([action({ status: 'READY' })], { ...base, goal })).toEqual([]);
    expect(reconcileDurableCompletions([action({ actionType: 'COMPARE_ROLES' })], { ...base, goal })).toEqual([]);
  });

  it('completes TAILOR_CV when the application has a linked CV', () => {
    const app = { id: 'app1', opportunityId: 'o1', stage: 'preparing', currentResumeId: null, revision: 1 } as unknown as ApplicationRecord;
    const a = action({ actionType: 'TAILOR_CV', contextRefs: { application: { id: 'app1', revision: 1 } } });
    expect(reconcileDurableCompletions([a], { ...base, applications: [app] })).toEqual([]);
    const linked = { ...app, currentResumeId: 'r9' } as unknown as ApplicationRecord;
    expect(reconcileDurableCompletions([a], { ...base, applications: [linked] })[0].resultRef).toEqual({ kind: 'resume', id: 'r9', applicationId: 'app1' });
  });

  it('completes CAPTURE_ACHIEVEMENT only from an achievement recorded after the action started', () => {
    const ach = (id: string, createdAt: string) => ({ id, kind: 'achievement', status: 'active', revision: 1, createdAt } as unknown as CareerFact);
    const a = action({ actionType: 'CAPTURE_ACHIEVEMENT', createdAt: '2026-09-02T00:00:00Z', inputRevisions: { achievements: 1 } });
    // The achievement the rule already counted does not complete it.
    expect(reconcileDurableCompletions([a], { ...base, facts: [ach('f-old', '2026-08-01T00:00:00Z')] })).toEqual([]);
    const done = reconcileDurableCompletions([a], { ...base, facts: [ach('f-old', '2026-08-01T00:00:00Z'), ach('f-new', '2026-09-03T00:00:00Z')] });
    expect(done).toHaveLength(1);
    expect(done[0].resultRef).toEqual({ kind: 'fact', id: 'f-new', revision: 1 });
    // A withdrawn achievement never counts.
    const withdrawn = { ...ach('f-w', '2026-09-03T00:00:00Z'), status: 'withdrawn' } as unknown as CareerFact;
    expect(reconcileDurableCompletions([a], { ...base, facts: [ach('f-old', '2026-08-01T00:00:00Z'), withdrawn] })).toEqual([]);
  });
});
