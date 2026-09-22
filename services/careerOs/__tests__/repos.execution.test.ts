import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueue, has, query, reset, state, tables } from './supabaseMock';

vi.mock('../../supabase', async () => {
  const m = await import('./supabaseMock');
  return { getSupabase: () => m.mockClient() };
});

import * as applicationRepo from '../applicationRepo';
import * as artifactRepo from '../artifactRepo';
import * as interviewRepo from '../interviewRepo';
import * as outcomeRepo from '../outcomeRepo';
import * as analysisRepo from '../analysisRepo';
import { isUuid } from '../repoUtils';
import { ConflictError, NotFoundError } from '../types';
import { analysis, application, artifact, interview, outcome, rows, uuidFor } from './fixtures';

const ID = uuidFor;
const A1 = ID('a1'); const O1 = ID('o1'); const C1 = ID('c1'); const ART1 = ID('art1'); const I1 = ID('i1'); const X1 = ID('x1'); const AN1 = ID('an1');

beforeEach(reset);

describe('repoUtils.isUuid', () => {
  it('accepts the 8-4-4-4-12 hex shape only', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
    expect(isUuid(uuidFor('a1'))).toBe(true);
    expect(isUuid('not-a-real-id')).toBe(false);
    expect(isUuid('123e4567e89b12d3a456426614174000')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe('applicationRepo', () => {
  it('get is owner-scoped, NotFound for missing/foreign rows and for malformed ids without a query', async () => {
    enqueue({ data: rows.application(application({ id: A1 })), error: null });
    const app = await applicationRepo.get('u1', A1);
    expect(app.stage).toBe('preparing');
    expect(query(0)!.table).toBe('job_applications');
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'id', A1)).toBe(true);
    enqueue({ data: null, error: null });
    await expect(applicationRepo.get('u1', ID('a-foreign'))).rejects.toBeInstanceOf(NotFoundError);
    reset();
    await expect(applicationRepo.get('u1', 'not-a-real-id')).rejects.toMatchObject({ code: 'not_found', entity: 'application', id: 'not-a-real-id' });
    expect(tables()).toEqual([]);
    expect(await applicationRepo.listForCampaign('u1', 'bad')).toEqual([]);
    expect(await applicationRepo.listForOpportunity('u1', 'bad')).toEqual([]);
    expect(tables()).toEqual([]);
  });
  it('list filters by stage and activeOnly; listForCampaign scopes by campaign', async () => {
    enqueue({ data: [], error: null });
    await applicationRepo.list('u1', { stage: ['submitted', 'response'], activeOnly: true });
    expect(has(query(0), 'in', 'stage', ['submitted', 'response']) && has(query(0), 'neq', 'stage', 'closed') && has(query(0), 'eq', 'user_id', 'u1')).toBe(true);
    enqueue({ data: [], error: null });
    await applicationRepo.listForCampaign('u1', C1);
    expect(has(query(1), 'eq', 'campaign_id', C1) && has(query(1), 'eq', 'user_id', 'u1')).toBe(true);
  });
  it('start calls career_start_application with the exact parameters and maps the returned row', async () => {
    enqueue({ data: rows.application(application({ id: A1, stage: 'preparing' })), error: null });
    const app = await applicationRepo.start('u1', { opportunityId: O1, campaignId: C1, idempotencyKey: 'start:o1', reapply: false });
    expect(app.id).toBe(A1);
    expect(state.rpcs).toEqual([{ name: 'career_start_application', args: { p_opportunity_id: O1, p_campaign_id: C1, p_idempotency_key: 'start:o1', p_reapply: false } }]);
    enqueue({ data: [rows.application(application({ id: ID('a2'), attemptNo: 2, previousAttemptId: A1 }))], error: null });
    const again = await applicationRepo.start('u1', { opportunityId: O1, idempotencyKey: 'reapply:o1', reapply: true });
    expect(again.attemptNo).toBe(2);
    expect(again.previousAttemptId).toBe(A1);
    expect(state.rpcs[1].args).toMatchObject({ p_campaign_id: null, p_reapply: true });
    enqueue({ data: null, error: { code: 'P0002', message: 'opportunity_not_found' } });
    await expect(applicationRepo.start('u1', { opportunityId: ID('o-foreign'), idempotencyKey: 'k' })).rejects.toMatchObject({ message: 'opportunity_not_found' });
  });
  it('update maps the allowed patch to columns with a revision precondition', async () => {
    enqueue({ data: [rows.application(application({ id: A1, stage: 'submitted', followUpAt: '2026-09-20', revision: 2 }))], error: null });
    const app = await applicationRepo.update('u1', A1, { stage: 'submitted', followUpAt: '2026-09-20', currentResumeId: ID('r1'), notes: 'n' }, 1);
    expect(app.revision).toBe(2);
    expect(has(query(0), 'update', { stage: 'submitted', follow_up_at: '2026-09-20', current_resume_id: ID('r1'), notes: 'n' })).toBe(true);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'id', A1) && has(query(0), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: [], error: null });
    await expect(applicationRepo.update('u1', A1, { notes: 'x' }, 1)).rejects.toBeInstanceOf(ConflictError);
  });
  it('recordSubmission stores timestamp + snapshot + stage and refuses to overwrite an existing snapshot', async () => {
    const snapshot = { resumeId: ID('r1'), resumeVersionId: ID('v1'), resumeRevision: 3, artifactIds: [ART1], confirmedAt: '2026-09-10T12:00:00.000Z', method: 'export' as const };
    enqueue({ data: rows.application(application({ id: A1 })), error: null });
    enqueue({ data: [rows.application(application({ id: A1, stage: 'submitted', submittedAt: snapshot.confirmedAt, submissionSnapshot: snapshot, revision: 2 }))], error: null });
    const app = await applicationRepo.recordSubmission('u1', A1, snapshot, 1);
    expect(app.submissionSnapshot).toEqual(snapshot);
    expect(has(query(1), 'update', { submitted_at: snapshot.confirmedAt, submission_snapshot: snapshot, stage: 'submitted', date_applied: '2026-09-10' })).toBe(true);
    expect(has(query(1), 'eq', 'revision', 1)).toBe(true);

    reset();
    enqueue({ data: rows.application(application({ id: A1, submittedAt: snapshot.confirmedAt, submissionSnapshot: snapshot, revision: 2 })), error: null });
    await expect(applicationRepo.recordSubmission('u1', A1, { ...snapshot, confirmedAt: '2026-09-11T00:00:00.000Z' }, 2)).rejects.toBeInstanceOf(applicationRepo.SubmissionLockedError);
    expect(tables()).toEqual(['job_applications']); // read only, no write

    reset();
    const second = { ...snapshot, resumeRevision: 4, confirmedAt: '2026-09-11T00:00:00.000Z' };
    enqueue({ data: rows.application(application({ id: A1, submittedAt: snapshot.confirmedAt, submissionSnapshot: snapshot, dateApplied: '2026-09-10', revision: 2 })), error: null });
    enqueue({ data: [rows.application(application({ id: A1, revision: 3 }))], error: null });
    await applicationRepo.recordSubmission('u1', A1, second, 2, { supersede: true });
    const sent = query(1)!.calls.find(([n]) => n === 'update')![1][0] as { submission_snapshot: Record<string, unknown>; date_applied: string };
    expect(sent.submission_snapshot).toEqual({ ...second, previous: snapshot });
    expect(sent.date_applied).toBe('2026-09-10'); // the original applied date is kept
  });
});

describe('artifactRepo', () => {
  it('save inserts without an id and updates with id + revision; snapshots are immutable', async () => {
    enqueue({ data: rows.artifact(artifact({ id: ART1, kind: 'cover_letter' })), error: null });
    const created = await artifactRepo.save('u1', { applicationId: A1, kind: 'cover_letter', title: 'CL', content: { html: '<p>x</p>' }, plainText: 'x', source: 'ai' });
    expect(created.kind).toBe('cover_letter');
    const row = query(0)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: 'u1', application_id: A1, status: 'draft', provenance: {}, stale: false });
    await expect(artifactRepo.save('u1', { id: ART1, title: 'x' })).rejects.toThrow('artifact_update_requires_revision');
    enqueue({ data: rows.artifact(artifact({ id: ART1 })), error: null }, { data: [rows.artifact(artifact({ id: ART1, title: 'New', revision: 2 }))], error: null });
    await artifactRepo.save('u1', { id: ART1, title: 'New', status: 'reviewed' }, 1);
    expect(has(query(2), 'update', { title: 'New', status: 'reviewed' }) && has(query(2), 'eq', 'id', ART1) && has(query(2), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: rows.artifact(artifact({ id: ART1, status: 'snapshot' })), error: null });
    await expect(artifactRepo.save('u1', { id: ART1, title: 'x' }, 1)).rejects.toThrow('artifact_snapshot_immutable');
    await expect(artifactRepo.save('u1', { id: ART1, status: 'snapshot' }, 1)).rejects.toThrow('artifact_snapshot_immutable');
  });
  it('snapshot inserts a status=snapshot copy pointing at the source and records its revision', async () => {
    enqueue({ data: rows.artifact(artifact({ id: ART1, kind: 'cover_letter', title: 'CL', content: { html: 'x' }, plainText: 'x', status: 'reviewed', revision: 3, provenance: { factIds: [ID('f1')] } })), error: null });
    enqueue({ data: rows.artifact(artifact({ id: ID('snap'), status: 'snapshot', snapshotOf: ART1 })), error: null });
    const snap = await artifactRepo.snapshot('u1', ART1);
    expect(snap.status).toBe('snapshot');
    const row = query(1)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ status: 'snapshot', snapshot_of: ART1, kind: 'cover_letter', content: { html: 'x' }, provenance: { factIds: [ID('f1')], sourceRevisions: { [ART1]: 3 } } });
  });
  it('markStale flags only owned non-snapshot rows and returns the count', async () => {
    enqueue({ data: [{ id: ART1 }], error: null });
    expect(await artifactRepo.markStale('u1', [ART1, ID('art2')])).toBe(1);
    expect(has(query(0), 'update', { stale: true }) && has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'in', 'id', [ART1, ID('art2')]) && has(query(0), 'neq', 'status', 'snapshot')).toBe(true);
    expect(await artifactRepo.markStale('u1', [])).toBe(0);
  });
});

describe('interviewRepo', () => {
  it('saveAnswer stores the answer on the exact practice item with the revision precondition', async () => {
    const session = interview({ id: I1, practice: [{ id: 'p1', question: 'Q1', answer: '', feedback: null, answeredAt: null }, { id: 'p2', question: 'Q2', answer: '', feedback: null, answeredAt: null }] });
    enqueue({ data: rows.interview(session), error: null }, { data: [rows.interview({ ...session, revision: 2 })], error: null });
    await interviewRepo.saveAnswer('u1', I1, 'p2', 'My answer', 1);
    const sent = query(1)!.calls.find(([n]) => n === 'update')![1][0] as { practice: Array<{ id: string; answer: string; answeredAt: string | null }> };
    expect(sent.practice[0].answer).toBe('');
    expect(sent.practice[1].answer).toBe('My answer');
    expect(sent.practice[1].answeredAt).not.toBeNull();
    expect(has(query(1), 'eq', 'id', I1) && has(query(1), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: rows.interview(session), error: null });
    await expect(interviewRepo.saveAnswer('u1', I1, 'missing', 'x', 1)).rejects.toThrow('practice_item_not_found');
  });
  it('setResult records self-reported result and recruiter feedback separately; create defaults are honest', async () => {
    enqueue({ data: [rows.interview(interview({ id: I1, status: 'completed' }))], error: null });
    await interviewRepo.setResult('u1', I1, { selfReportedResult: 'Went well', recruiterFeedback: null }, 3);
    expect(has(query(0), 'update', { self_reported_result: 'Went well', recruiter_feedback: null, status: 'completed' }) && has(query(0), 'eq', 'revision', 3)).toBe(true);
    enqueue({ data: rows.interview(interview({ id: I1 })), error: null });
    await interviewRepo.create('u1', { applicationId: A1 });
    const row = query(1)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: 'u1', application_id: A1, interview_type: 'unknown', status: 'planned', themes: [], practice: [] });
    expect(row).not.toHaveProperty('scheduled_at');
    enqueue({ data: [], error: null });
    await expect(interviewRepo.update('u1', I1, { status: 'prepared' }, 1)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('outcomeRepo', () => {
  it('record inserts an append-only observation; list is owner-scoped and chronological', async () => {
    enqueue({ data: rows.outcome(outcome({ id: X1, kind: 'offer' })), error: null });
    const o = await outcomeRepo.record('u1', A1, 'offer', { observedAt: '2026-09-15T00:00:00Z', note: 'phone call' });
    expect(o.kind).toBe('offer');
    expect(has(query(0), 'insert', { user_id: 'u1', application_id: A1, kind: 'offer', observed_at: '2026-09-15T00:00:00Z', source: 'user_reported', details: {}, supersedes_id: null, note: 'phone call' })).toBe(true);
    enqueue({ data: [], error: null });
    await outcomeRepo.list('u1', A1);
    expect(has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'application_id', A1) && has(query(1), 'order', 'observed_at', { ascending: true })).toBe(true);
  });
  it('correct records a correction pointing at the superseded observation of the same application', async () => {
    enqueue({ data: rows.outcome(outcome({ id: X1, applicationId: A1, kind: 'rejected', observedAt: '2026-09-05T00:00:00Z' })), error: null });
    enqueue({ data: rows.outcome(outcome({ id: ID('x2'), kind: 'correction', supersedesId: X1 })), error: null });
    const c = await outcomeRepo.correct('u1', A1, X1, { correctedKind: 'response', note: 'it was a response, not a rejection' });
    expect(c.kind).toBe('correction');
    const sent = query(1)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(sent).toMatchObject({ kind: 'correction', supersedes_id: X1, observed_at: '2026-09-05T00:00:00Z', details: { correctedKind: 'response' } });
    enqueue({ data: rows.outcome(outcome({ id: X1, applicationId: ID('a-other') })), error: null });
    await expect(outcomeRepo.correct('u1', A1, X1, {})).rejects.toThrow('correction_application_mismatch');
    enqueue({ data: null, error: null });
    await expect(outcomeRepo.correct('u1', A1, ID('x-missing'), {})).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('analysisRepo', () => {
  it('latestForOpportunity reads the newest owned row; malformed ids short-circuit', async () => {
    enqueue({ data: rows.analysis(analysis({ id: AN1 })), error: null });
    const a = await analysisRepo.latestForOpportunity('u1', O1);
    expect(a?.id).toBe(AN1);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'opportunity_id', O1) && has(query(0), 'order', 'computed_at', { ascending: false }) && has(query(0), 'limit', 1)).toBe(true);
    expect(await analysisRepo.latestForOpportunity('u1', 'bad')).toBeNull();
    expect(tables()).toHaveLength(1);
  });
  it('save inserts the recorded revisions; markStale* target only fresh rows of the owner', async () => {
    const input = analysis({ id: AN1, opportunityRevision: 3, goalRevision: 2, factsRevision: 'fr' });
    enqueue({ data: rows.analysis(input), error: null });
    await analysisRepo.save('u1', input);
    const row = query(0)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: 'u1', opportunity_revision: 3, goal_revision: 2, facts_revision: 'fr', engine_version: 'fit-1.0.0', stale: false });
    enqueue({ data: [{ id: AN1 }, { id: ID('an2') }], error: null });
    expect(await analysisRepo.markStaleForGoal('u1', ID('g1'))).toBe(2);
    expect(has(query(1), 'update', { stale: true }) && has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'goal_id', ID('g1')) && has(query(1), 'eq', 'stale', false)).toBe(true);
    enqueue({ data: [], error: null });
    await analysisRepo.markStaleForOpportunity('u1', O1);
    expect(has(query(2), 'eq', 'opportunity_id', O1)).toBe(true);
    enqueue({ data: [{ id: AN1 }], error: null });
    expect(await analysisRepo.markStaleForFacts('u1', 'fr2')).toBe(1);
    expect(has(query(3), 'neq', 'facts_revision', 'fr2')).toBe(true);
  });
});
