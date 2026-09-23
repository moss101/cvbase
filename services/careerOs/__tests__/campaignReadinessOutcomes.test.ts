import { describe, expect, it } from 'vitest';
import { computeFunnel, milestoneSummary } from '../campaignFunnel';
import { computeReadiness, summarizeReadiness } from '../readiness';
import { applyOutcomeToStage, effectiveOutcomes, latestOutcome, outcomeHistory, unknownResponses } from '../outcomes';
import { application, artifact, campaign, interview, opportunity, outcome } from './fixtures';

const NOW = new Date('2026-09-20T12:00:00.000Z');

describe('computeFunnel', () => {
  it('counts observed stages and outcomes once per application; unknownOutcome is submitted with no response', () => {
    const apps = [
      application({ id: 'a1', stage: 'preparing' }),
      application({ id: 'a2', stage: 'submitted', submittedAt: '2026-08-01T00:00:00Z' }),
      application({ id: 'a3', stage: 'submitted', submittedAt: '2026-08-01T00:00:00Z' }),
      application({ id: 'a4', stage: 'response' }),
      application({ id: 'a5', stage: 'interview' }),
      application({ id: 'a6', stage: 'final' }),
      application({ id: 'a7', stage: 'closed', closedReason: 'rejected' }),
      application({ id: 'a8', stage: 'closed', closedReason: 'accepted' }),
    ];
    const outcomes = [
      outcome({ id: 'x1', applicationId: 'a2', kind: 'submitted' }),
      outcome({ id: 'x2', applicationId: 'a3', kind: 'response' }),
      outcome({ id: 'x3', applicationId: 'a6', kind: 'offer' }),
      outcome({ id: 'x4', applicationId: 'a6', kind: 'offer' }), // duplicate report counts once
      outcome({ id: 'x5', applicationId: 'a7', kind: 'rejected' }),
    ];
    const funnel = computeFunnel(apps, [opportunity({ id: 'o1' }), opportunity({ id: 'o1' }), opportunity({ id: 'o2' })], outcomes);
    expect(funnel).toEqual({ opportunities: 2, preparing: 1, submitted: 2, response: 1, interview: 1, final: 1, closed: 2, offers: 2, rejected: 1, unknownOutcome: 1 });
    expect(Object.values(funnel).every((v) => Number.isInteger(v))).toBe(true);
    expect(funnel).not.toHaveProperty('progress');
    expect(computeFunnel([], [], [])).toEqual({ opportunities: 0, preparing: 0, submitted: 0, response: 0, interview: 0, final: 0, closed: 0, offers: 0, rejected: 0, unknownOutcome: 0 });
  });
  it('milestoneSummary reports states, overdue by recorded due date, and the next milestone — no percentage', () => {
    const c = campaign({ milestones: [
      { id: 'm1', title: 'Shortlist', state: 'done', dueDate: '2026-09-01' },
      { id: 'm2', title: 'Apply to 3', state: 'todo', dueDate: '2026-09-10' },
      { id: 'm3', title: 'Network', state: 'todo', dueDate: '2026-10-01' },
      { id: 'm4', title: 'Prep', state: 'doing' },
      { id: 'm5', title: 'Undated', state: 'todo' },
    ] });
    const s = milestoneSummary(c, NOW);
    expect(s).toMatchObject({ total: 5, todo: 3, doing: 1, done: 1 });
    expect(s.overdue.map((m) => m.id)).toEqual(['m2']);
    expect(s.next?.id).toBe('m4');
    expect(milestoneSummary({ milestones: c.milestones.filter((m) => m.state !== 'doing') }, NOW).next?.id).toBe('m2');
    expect(milestoneSummary({ milestones: [] }, NOW)).toEqual({ total: 0, todo: 0, doing: 0, done: 0, overdue: [], next: null });
    expect(s).not.toHaveProperty('percent');
  });
});

describe('computeReadiness', () => {
  it('lists necessary and optional items with destinations; nothing is a score', () => {
    const app = application({ id: 'a1', currentResumeId: null, submittedAt: null, submissionSnapshot: null });
    const r = computeReadiness({ application: app, artifacts: [], now: NOW });
    expect(r.computedAt).toBe(NOW.toISOString());
    expect(r.items.map((i) => [i.id, i.kind, i.state, i.destination])).toEqual([
      ['role-analysis', 'necessary', 'incomplete', 'analysis'],
      ['cv', 'necessary', 'incomplete', 'cv'],
      ['submission', 'necessary', 'incomplete', 'activity'],
      ['cover-letter', 'optional', 'incomplete', 'cover-letter'],
      ['linkedin', 'optional', 'incomplete', 'linkedin'],
      ['networking', 'optional', 'incomplete', 'networking'],
      ['interview-prep', 'optional', 'incomplete', 'interview'],
    ]);
    expect(r.items.find((i) => i.id === 'submission')!.detail).toContain('opening the employer site does not count');
    expect(JSON.stringify(r)).not.toMatch(/score|percent/i);
    const s = summarizeReadiness(r);
    expect(s).toMatchObject({ necessaryComplete: 0, necessaryTotal: 3, ready: false });
  });
  it('completes items from reviewed artifacts, a linked CV and a recorded submission; questions only when they exist', () => {
    const snapshot = { resumeId: 'r1', resumeVersionId: null, resumeRevision: 2, artifactIds: [], confirmedAt: '2026-09-10T00:00:00Z', method: 'export' as const };
    const app = application({ id: 'a1', currentResumeId: 'r1', submittedAt: '2026-09-10T00:00:00Z', submissionSnapshot: snapshot });
    const artifacts = [
      artifact({ id: 'ra', kind: 'role_analysis', status: 'reviewed' }),
      artifact({ id: 'q1', kind: 'employer_question', status: 'reviewed', content: { answer: 'Because...' } }),
      artifact({ id: 'q2', kind: 'employer_question', status: 'draft', content: { answer: '' } }),
      artifact({ id: 'cl', kind: 'cover_letter', status: 'reviewed' }),
      artifact({ id: 'snap', kind: 'cover_letter', status: 'snapshot', stale: true }),
      artifact({ id: 'other', applicationId: 'a9', kind: 'linkedin', status: 'reviewed' }),
    ];
    const r = computeReadiness({ application: app, artifacts, resume: { id: 'r1' }, prismRun: { id: 'p1', status: 'completed' }, interviewSessions: [interview({ applicationId: 'a1', status: 'prepared' })], now: NOW });
    const state = Object.fromEntries(r.items.map((i) => [i.id, i.state]));
    expect(state).toEqual({ 'role-analysis': 'complete', cv: 'complete', questions: 'incomplete', submission: 'complete', 'cover-letter': 'complete', linkedin: 'incomplete', networking: 'incomplete', 'interview-prep': 'complete' });
    expect(r.items.find((i) => i.id === 'questions')!.detail).toBe('1 of 2 still need a reviewed answer.');
    expect(summarizeReadiness(r)).toMatchObject({ necessaryComplete: 3, necessaryTotal: 4, ready: false });
    const answered = computeReadiness({ application: app, artifacts: artifacts.map((a) => (a.id === 'q2' ? { ...a, status: 'reviewed' as const, plainText: 'Answered' } : a)), resume: { id: 'r1' }, now: NOW });
    expect(summarizeReadiness(answered).ready).toBe(true);
  });
  it('CV is blocked when the tailoring run failed with no CV, incomplete when a review is pending or the linked CV is unavailable', () => {
    const base = application({ id: 'a1', currentResumeId: null });
    const cv = (input: Parameters<typeof computeReadiness>[0]) => computeReadiness(input).items.find((i) => i.id === 'cv')!;
    expect(cv({ application: base, artifacts: [], prismRun: { id: 'p', status: 'failed' } })).toMatchObject({ state: 'blocked', detail: 'The tailoring run failed; retry it or link a CV manually.' });
    expect(cv({ application: base, artifacts: [], prismRun: { id: 'p', status: 'review' } })).toMatchObject({ state: 'incomplete', detail: 'Tailored CV is waiting for your review.' });
    expect(cv({ application: base, artifacts: [], prismRun: { id: 'p', status: 'generating' } })).toMatchObject({ state: 'incomplete', detail: 'Tailoring in progress.' });
    expect(cv({ application: { ...base, currentResumeId: 'r1' }, artifacts: [], resume: null })).toMatchObject({ state: 'incomplete', detail: 'The linked CV is unavailable; link another one explicitly.' });
    expect(cv({ application: { ...base, currentResumeId: 'r1' }, artifacts: [], resume: { id: 'r1' }, prismRun: { id: 'p', status: 'review' } }).state).toBe('incomplete');
    expect(cv({ application: { ...base, currentResumeId: 'r1' }, artifacts: [], resume: { id: 'r1' }, prismRun: { id: 'p', status: 'failed' } }).state).toBe('complete');
    const stale = computeReadiness({ application: base, artifacts: [artifact({ kind: 'role_analysis', status: 'reviewed', stale: true })] }).items[0];
    expect(stale).toMatchObject({ state: 'incomplete', detail: 'Analysis is stale after a change; review it again.' });
    expect(summarizeReadiness(computeReadiness({ application: base, artifacts: [], prismRun: { id: 'p', status: 'failed' } })).blocked.map((b) => b.id)).toEqual(['cv']);
  });
});

describe('outcomes', () => {
  it('applyOutcomeToStage maps observations to stages and never upgrades silence', () => {
    expect(applyOutcomeToStage('submitted')).toEqual({ stage: 'submitted', closedReason: null });
    expect(applyOutcomeToStage('response')).toEqual({ stage: 'response', closedReason: null });
    expect(applyOutcomeToStage('interview_scheduled')).toEqual({ stage: 'interview', closedReason: null });
    expect(applyOutcomeToStage('interview_completed')).toEqual({ stage: 'interview', closedReason: null });
    expect(applyOutcomeToStage('offer')).toEqual({ stage: 'final', closedReason: null });
    expect(applyOutcomeToStage('accepted')).toEqual({ stage: 'closed', closedReason: 'accepted' });
    expect(applyOutcomeToStage('rejected')).toEqual({ stage: 'closed', closedReason: 'rejected' });
    expect(applyOutcomeToStage('withdrawn')).toEqual({ stage: 'closed', closedReason: 'withdrawn' });
    expect(applyOutcomeToStage('no_response')).toBeNull();
    expect(applyOutcomeToStage('correction')).toBeNull();
  });
  it('outcomeHistory keeps every entry in order, flags superseded ones and resolves corrections', () => {
    const obs = [
      outcome({ id: 'x2', applicationId: 'a1', kind: 'rejected', observedAt: '2026-09-05T00:00:00Z', createdAt: '2026-09-05T00:00:00Z' }),
      outcome({ id: 'x1', applicationId: 'a1', kind: 'submitted', observedAt: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z' }),
      outcome({ id: 'x3', applicationId: 'a1', kind: 'correction', supersedesId: 'x2', details: { correctedKind: 'response' }, observedAt: '2026-09-05T00:00:00Z', createdAt: '2026-09-06T00:00:00Z' }),
      outcome({ id: 'x4', applicationId: 'a1', kind: 'interview_scheduled', observedAt: '2026-09-08T00:00:00Z', createdAt: '2026-09-08T00:00:00Z' }),
      outcome({ id: 'x5', applicationId: 'a1', kind: 'correction', supersedesId: 'x4', details: { retracted: true }, observedAt: '2026-09-08T00:00:00Z', createdAt: '2026-09-09T00:00:00Z' }),
    ];
    const history = outcomeHistory(obs);
    expect(history.map((h) => [h.id, h.superseded, h.supersededBy, h.effectiveKind, h.retracted])).toEqual([
      ['x1', false, null, 'submitted', false],
      ['x2', true, 'x3', 'rejected', false],
      ['x3', false, null, 'response', false],
      ['x4', true, 'x5', 'interview_scheduled', false],
      ['x5', false, null, null, true],
    ]);
    expect(effectiveOutcomes(obs).map((o) => [o.id, o.kind])).toEqual([['x1', 'submitted'], ['x3', 'response']]);
    expect(latestOutcome(obs)?.id).toBe('x3');
    expect(latestOutcome([])).toBeNull();
    expect(obs.map((o) => o.kind)).toEqual(['rejected', 'submitted', 'correction', 'interview_scheduled', 'correction']); // input untouched
  });
  it('unknownResponses lists dated submissions with no standing response after the window; undated ones are not counted', () => {
    const apps = [
      application({ id: 'a1', stage: 'submitted', submittedAt: '2026-08-20T00:00:00Z' }),
      application({ id: 'a2', stage: 'submitted', submittedAt: '2026-08-25T00:00:00Z' }),
      application({ id: 'a3', stage: 'submitted', submittedAt: '2026-09-15T00:00:00Z' }),
      application({ id: 'a4', stage: 'submitted', submittedAt: null }),
      application({ id: 'a5', stage: 'interview', submittedAt: '2026-08-01T00:00:00Z' }),
      application({ id: 'a6', stage: 'response', submittedAt: '2026-08-01T00:00:00Z' }),
    ];
    const obs = [
      outcome({ id: 'x1', applicationId: 'a2', kind: 'response', observedAt: '2026-09-01T00:00:00Z' }),
      outcome({ id: 'x2', applicationId: 'a2', kind: 'correction', supersedesId: 'x1', details: { retracted: true }, observedAt: '2026-09-01T00:00:00Z', createdAt: '2026-09-02T00:00:00Z' }),
      outcome({ id: 'x3', applicationId: 'a6', kind: 'no_response', observedAt: '2026-09-10T00:00:00Z' }),
    ];
    expect(unknownResponses(apps, obs, NOW)).toEqual([
      { applicationId: 'a1', submittedAt: '2026-08-20T00:00:00Z', daysWaiting: 31 },
      { applicationId: 'a2', submittedAt: '2026-08-25T00:00:00Z', daysWaiting: 26 },
    ]);
    expect(unknownResponses(apps, obs, NOW, 5).map((u) => u.applicationId)).toEqual(['a1', 'a2', 'a3']);
    expect(unknownResponses(apps, [...obs, outcome({ id: 'x9', applicationId: 'a1', kind: 'rejected' })], NOW).map((u) => u.applicationId)).toEqual(['a2']);
  });
});
