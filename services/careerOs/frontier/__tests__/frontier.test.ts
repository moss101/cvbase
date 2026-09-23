import { describe, expect, it } from 'vitest';
import type {
  ApplicationRecord, CareerGoal, CareerPreferences, CareerScenario, Opportunity, OpportunityAnalysis, OutcomeObservation, CareerAction,
} from '../../types';
import { compareOrderings, computeInsights, derivePolicy, effectiveOutcomes, skillAdjustmentForOutcome } from '../outcomeInsights';
import { annualComp, compareScenario } from '../scenarios';
import { inQuietHours, localTime, nextEligible, planProactiveRun, type ActionCandidate } from '../proactive';

const NOW = new Date('2026-09-20T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const app = (id: string, submittedDaysAgo: number | null, opportunityId: string | null = null): ApplicationRecord => ({
  id, jobTitle: `Role ${id}`, company: `Co ${id}`, jobUrl: null, status: 'applied', dateApplied: null, notes: null, matchScore: null,
  opportunityId, campaignId: null, goalId: null, goalRevision: null, goalSnapshot: null, attemptNo: 1, previousAttemptId: null,
  stage: 'submitted', closedReason: null, submittedAt: submittedDaysAgo === null ? null : daysAgo(submittedDaysAgo), submissionSnapshot: null,
  currentResumeId: null, prismRunId: null, followUpAt: null, readiness: null, revision: 1, createdAt: daysAgo(40), updatedAt: daysAgo(1),
});
const outcome = (id: string, applicationId: string, kind: OutcomeObservation['kind'], supersedesId: string | null = null): OutcomeObservation => ({
  id, applicationId, kind, observedAt: daysAgo(1), source: 'user_reported', details: {}, supersedesId, note: '', createdAt: daysAgo(1),
});
const analysis = (opportunityId: string, supported: number, missing: number): OpportunityAnalysis => ({
  id: `an-${opportunityId}`, opportunityId, goalId: null, applicationId: null, opportunityRevision: 1, goalRevision: null, factsRevision: 'x',
  engineVersion: 'fit-1.0.0', inputFingerprint: '',
  qualification: {
    supported: Array.from({ length: supported }, (_, i) => ({ requirementId: `s${i}`, text: 's', state: 'supported' as const, evidence: [] })),
    partial: [], missing: Array.from({ length: missing }, (_, i) => ({ requirementId: `m${i}`, text: 'm', state: 'missing' as const, evidence: [] })), unknown: [],
  },
  direction: { factors: [], constraints: [], missing: [] }, atsScore: null, hiddenByConstraint: null, stale: false, computedAt: daysAgo(2),
});

describe('outcomeInsights', () => {
  it('returns nothing without submitted applications', () => {
    expect(computeInsights({ now: NOW, applications: [app('a', null)], outcomes: [], analyses: [], opportunities: [] })).toEqual([]);
  });

  it('keeps unknown outcomes unknown and labels small samples', () => {
    const apps = [app('a', 30), app('b', 30), app('c', 5)];
    const insights = computeInsights({ now: NOW, applications: apps, outcomes: [outcome('o1', 'a', 'rejected')], analyses: [], opportunities: [] });
    const rate = insights.find((i) => i.kind === 'response_rate')!;
    expect(rate.sampleSize).toBe(1);
    expect(rate.denominator).toBe(2);
    expect(rate.missingOutcomes).toBe(1);
    expect(rate.statement).toContain('1 of 2');
    expect(rate.statement).toContain('unknown, not counted as rejections');
    expect(rate.statement).toContain('still inside the observation window');
    expect(rate.statement).toContain('Too few');
    expect(rate.statement).not.toMatch(/caus/i);
    expect(insights.find((i) => i.kind === 'unknown_outcomes')?.sampleSize).toBe(1);
  });

  it('applies corrections by superseding observations', () => {
    const rows = [outcome('o1', 'a', 'rejected'), outcome('o2', 'a', 'interview_scheduled', 'o1')];
    expect(effectiveOutcomes(rows).map((o) => o.id)).toEqual(['o2']);
    const apps = [app('a', 30)];
    const before = computeInsights({ now: NOW, applications: apps, outcomes: [rows[0]], analyses: [], opportunities: [] });
    const after = computeInsights({ now: NOW, applications: apps, outcomes: rows, analyses: [], opportunities: [] });
    expect(before.find((i) => i.kind === 'response_rate')?.sampleSize).toBe(1);
    expect(after.find((i) => i.kind === 'response_rate')?.sampleSize).toBe(1);
  });

  it('describes interviews by fit without causal claims and derives no policy on small samples', () => {
    const apps = [app('a', 30, 'oa'), app('b', 30, 'ob'), app('c', 30, 'oc')];
    const outcomes = [outcome('o1', 'a', 'interview_scheduled'), outcome('o2', 'b', 'interview_completed')];
    const analyses = [analysis('oa', 8, 2), analysis('ob', 2, 8), analysis('oc', 5, 5)];
    const insights = computeInsights({ now: NOW, applications: apps, outcomes, analyses, opportunities: [] });
    const fit = insights.find((i) => i.kind === 'interviews_by_fit')!;
    expect(fit.statement).toContain('1 of 2 recorded interviews');
    expect(fit.statement).toContain('not a cause');
    expect(fit.sourceRefs).toHaveLength(2);
    const policy = derivePolicy(insights);
    expect(policy.preferSupportedRatioAtLeast).toBeNull();
    expect(policy.basis[0]).toContain('Only 2 interviews');
  });

  it('never adjusts a skill for an outcome and compares orderings offline', () => {
    expect(skillAdjustmentForOutcome('rejected')).toBeNull();
    expect(compareOrderings(['a', 'b', 'c'], ['a', 'b', 'c']).unchanged).toBe(true);
    expect(compareOrderings(['a', 'b', 'c'], ['b', 'a', 'c']).moved).toEqual([{ id: 'a', from: 0, to: 1 }, { id: 'b', from: 1, to: 0 }]);
  });
});

const goal = (over: Partial<CareerGoal> = {}): CareerGoal => ({
  id: 'g1', title: 'Staff engineer', role: 'Staff engineer', level: 'staff', industry: 'software', location: 'Berlin', remotePreference: 'hybrid',
  compMin: 120000, compMax: 140000, compCurrency: 'EUR', compPeriod: 'year', targetDate: null, targetEmployers: [], constraints: [],
  priorities: [{ key: 'compensation', weight: 0.5 }, { key: 'flexibility', weight: 0.5 }], isPrimary: true, status: 'active', source: 'user',
  revision: 1, createdAt: daysAgo(10), updatedAt: daysAgo(10), ...over,
});
const opp = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: 'o1', opportunityType: 'role', title: 'Staff engineer', company: 'Acme', location: 'Berlin', remoteType: 'remote', sourceUrl: null,
  sourceKind: 'paste', capturedContent: '', contentFingerprint: null, capturedAt: daysAgo(3), sourceDate: null, listingStatus: 'unknown',
  status: 'saved', compMin: null, compMax: null, compCurrency: null, compPeriod: null, requirements: [], legacyApplicationId: null,
  mergedIntoId: null, mergeUndo: null, notInterestedReason: null, revision: 1, createdAt: daysAgo(3), updatedAt: daysAgo(3), ...over,
});

describe('scenarios', () => {
  it('annualises only when the period is known', () => {
    expect(annualComp(100, 120, 'year')).toBe(110);
    expect(annualComp(10, null, 'month')).toBe(120);
    expect(annualComp(100, 120, null)).toBeNull();
    expect(annualComp(null, null, 'year')).toBeNull();
  });

  it('keeps unknown pay unknown, separates recorded from assumed inputs and exposes sensitivity', () => {
    const scenario: CareerScenario = {
      id: 's1', name: 'Berlin vs remote', kind: 'mixed',
      options: [
        { id: 'A', label: 'Acme (recorded, pay unknown)', refs: { opportunityId: 'o1' }, inputs: { growth: 4 } },
        { id: 'B', label: 'Goal B', refs: { goalId: 'g1' }, inputs: {} },
        { id: 'C', label: 'Assumed offer', refs: {}, inputs: { compMin: 150000, compMax: 150000, compPeriod: 'year', compCurrency: 'EUR', remote: 'onsite' } },
      ],
      priorities: [{ key: 'compensation', weight: 0.6 }, { key: 'flexibility', weight: 0.4 }],
      assumptions: [{ id: 'as1', optionId: 'C', text: 'Offer is 150k', source: 'user' }],
      result: null, revision: 1, createdAt: daysAgo(1), updatedAt: daysAgo(1),
    };
    const result = compareScenario(scenario, { goals: [goal()], opportunities: [opp()], applications: [] }, goal(), NOW);
    const a = result.ranking.find((r) => r.optionId === 'A')!;
    expect(a.unknownInputs).toContain('compMin');
    expect(a.verifiedInputs).toContain('remote');
    expect(a.assumedInputs).toContain('growth');
    const c = result.ranking.find((r) => r.optionId === 'C')!;
    expect(c.assumedInputs).toContain('compMin');
    expect(result.tradeoffs.find((t) => t.optionId === 'A' && t.key === 'compensation')?.verdict).toBe('unknown');
    expect(result.caveats.join(' ')).toContain('not predictions');
    expect(result.caveats.join(' ')).toContain('No market');
    expect(result.sensitivity).toHaveLength(2);
    expect(result.ranking.every((r) => r.score === null || r.score <= 1)).toBe(true);
  });

  it('drops compensation from the score when currencies differ', () => {
    const scenario: CareerScenario = {
      id: 's2', name: 'x', kind: 'offers',
      options: [
        { id: 'A', label: 'EUR', refs: {}, inputs: { compMin: 100, compMax: 100, compPeriod: 'year', compCurrency: 'EUR' } },
        { id: 'B', label: 'USD', refs: {}, inputs: { compMin: 200, compMax: 200, compPeriod: 'year', compCurrency: 'USD' } },
      ],
      priorities: [{ key: 'compensation', weight: 1 }], assumptions: [], result: null, revision: 1, createdAt: daysAgo(1), updatedAt: daysAgo(1),
    };
    const result = compareScenario(scenario, { goals: [], opportunities: [], applications: [] }, null, NOW);
    expect(result.caveats.join(' ')).toContain('different currencies');
    expect(result.ranking.every((r) => r.score === null)).toBe(true);
  });
});

const prefs = (over: Partial<CareerPreferences> = {}): CareerPreferences => ({
  userId: 'u', proactiveEnabled: true, consentAt: daysAgo(5), timeZone: 'Europe/Berlin', quietHours: { start: '22:00', end: '07:00' },
  dailyActionCap: 2, triggers: { interview: true, followUp: true, staleImport: false, evidenceGap: true }, lastProactiveRunAt: null, checkpoint: {}, revision: 1, ...over,
});
const candidate = (type: CareerAction['actionType'], key: string, dueAt?: string): ActionCandidate => ({
  actionType: type, title: `${type} title`, reason: 'Because of a recorded date.', evidenceRefs: [], priorityBand: 'now', contextRefs: {},
  inputRevisions: dueAt ? { dueAt } : {}, source: 'proactive', ruleVersion: 'rules-1.0.0', status: 'READY', dedupeKey: key,
  destination: { space: 'today' }, estimatedEffort: null, effortSource: null, confidence: null, snoozedUntil: null, expiresAt: null,
  dismissedAt: null, completedAt: null, completionSource: null, resultRef: null, lastError: null, resurfacedReason: null,
});

describe('proactive', () => {
  it('computes local time across zones and DST', () => {
    // 2026-03-29 is the EU DST switch: 01:30 UTC is 03:30 in Berlin (CEST).
    expect(localTime(new Date('2026-03-29T01:30:00Z'), 'Europe/Berlin').hour).toBe(3);
    expect(localTime(new Date('2026-01-15T01:30:00Z'), 'Europe/Berlin').hour).toBe(2);
    expect(localTime(new Date('2026-01-15T01:30:00Z'), 'Not/AZone').hour).toBe(1);
  });

  it('honours quiet hours that wrap midnight and reports the next eligible time', () => {
    const p = prefs();
    expect(inQuietHours(new Date('2026-09-20T21:30:00Z'), p)).toBe(true); // 23:30 Berlin
    expect(inQuietHours(new Date('2026-09-20T10:00:00Z'), p)).toBe(false);
    const plan = planProactiveRun({ now: new Date('2026-09-20T21:30:00Z'), preferences: p, candidates: [candidate('PREPARE_INTERVIEW', 'k1')], existingActions: [], existingNotifications: [], createdTodayCount: 0 });
    expect(plan.quietHours).toBe(true);
    expect(plan.create).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe('quiet_hours');
    expect(nextEligible(new Date('2026-09-20T21:30:00Z'), p)).toBe('2026-09-21T05:00:00.000Z'); // 07:00 Berlin
  });

  it('does nothing without consent', () => {
    const plan = planProactiveRun({ now: NOW, preferences: prefs({ proactiveEnabled: false }), candidates: [candidate('PREPARE_INTERVIEW', 'k1')], existingActions: [], existingNotifications: [], createdTodayCount: 0 });
    expect(plan.enabled).toBe(false);
    expect(plan.skipped[0].reason).toBe('disabled');
  });

  it('applies triggers, cap, dedupe, dismissals and marks late reminders', () => {
    const dismissed: CareerAction = { ...candidate('FOLLOW_UP_APPLICATION', 'dismissed'), id: 'x', revision: 1, createdAt: daysAgo(1), updatedAt: daysAgo(1), status: 'DISMISSED' };
    const plan = planProactiveRun({
      now: NOW,
      preferences: prefs(),
      candidates: [
        candidate('REVIEW_IMPORT', 'import'),                       // trigger off
        candidate('FOLLOW_UP_APPLICATION', 'dismissed'),            // dismissed
        candidate('FOLLOW_UP_APPLICATION', 'dup'),                  // already notified
        candidate('PREPARE_INTERVIEW', 'late', daysAgo(1)),         // late, first by deadline
        candidate('FOLLOW_UP_APPLICATION', 'soon', daysAgo(-2)),    // second by deadline
        candidate('IMPROVE_ACHIEVEMENT', 'gap'),                    // over the cap
        candidate('COMPARE_ROLES', 'na'),                           // not actionable proactively
      ],
      existingActions: [dismissed],
      existingNotifications: [{ id: 'n', kind: 'action_required', title: '', body: '', actionId: null, dedupeKey: 'proactive:dup', readAt: null, dismissedAt: null, createdAt: daysAgo(1) }],
      createdTodayCount: 0,
    });
    expect(plan.create.map((c) => c.candidate.dedupeKey)).toEqual(['late', 'soon']);
    expect(plan.create[0].notification.late).toBe(true);
    expect(plan.create[0].notification.body).toContain('This reminder is late');
    expect(plan.create[1].notification.late).toBe(false);
    const reasons = Object.fromEntries(plan.skipped.map((s) => [s.dedupeKey, s.reason]));
    expect(reasons).toEqual({ import: 'trigger_off', dismissed: 'dismissed', dup: 'duplicate', gap: 'cap', na: 'not_actionable' });
  });

  it('is idempotent for a repeated run: nothing new once notified', () => {
    const first = planProactiveRun({ now: NOW, preferences: prefs(), candidates: [candidate('PREPARE_INTERVIEW', 'k1')], existingActions: [], existingNotifications: [], createdTodayCount: 0 });
    const notif = { id: 'n1', actionId: null, readAt: null, dismissedAt: null, createdAt: NOW.toISOString(), ...first.create[0].notification };
    const second = planProactiveRun({ now: NOW, preferences: prefs(), candidates: [candidate('PREPARE_INTERVIEW', 'k1')], existingActions: [], existingNotifications: [notif], createdTodayCount: 1 });
    expect(second.create).toHaveLength(0);
    expect(second.skipped[0].reason).toBe('duplicate');
  });
});
