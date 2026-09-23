import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));

import { callFn, type FnError } from '../../api';
import { cancelRun, confirmTool, GatewayError, isGatewayError, newIdempotencyKey, reportResult, runTool, TOOL_NAMES } from '../gateway';

const mockCall = vi.mocked(callFn);

const RUN_ROW = {
  id: 'run-1', user_id: 'u1', action_id: null, tool: 'start_application', status: 'completed', idempotency_key: 'start:abc12345',
  attempt: 1, request_id: 'req-1', actor: 'user', context_revisions: { opportunity: 1 }, input_summary: { opportunityId: 'opp-1' },
  result_ref: { type: 'application', id: 'app-1', revision: 1 }, retryable: false, failure_code: null,
  confirmation: null, usage: {}, started_at: '2026-09-21T10:00:00Z', finished_at: '2026-09-21T10:00:01Z',
  revision: 3, created_at: '2026-09-21T10:00:00Z', updated_at: '2026-09-21T10:00:01Z',
};

function fnError(code: string, status: number, extra: Record<string, unknown> = {}): FnError {
  const err = new Error(code) as FnError;
  err.code = code;
  err.status = status;
  err.extra = { error: code, ...extra };
  return err;
}

describe('careerOs gateway client', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('newIdempotencyKey mints prefix:uuid keys that satisfy the server bounds', () => {
    const key = newIdempotencyKey('start');
    expect(key).toMatch(/^start:[0-9a-f-]{36}$/);
    expect(newIdempotencyKey('bad prefix!/')).toMatch(/^badprefix:/);
    expect(newIdempotencyKey('')).toMatch(/^run:/);
    expect(new Set([newIdempotencyKey('a'), newIdempotencyKey('a')]).size).toBe(2);
  });

  it('runTool posts the exact contract body and maps run + result', async () => {
    mockCall.mockResolvedValue({
      run: RUN_ROW,
      result: { application: { id: 'app-1', company: 'Acme', role: 'DE', stage: 'preparing', status: 'wishlist', revision: 1, readiness: null } },
    });
    const res = await runTool('start_application', { opportunityId: 'opp-1' }, {
      idempotencyKey: 'start:abc12345', contextRevisions: { opportunity: 1 }, actionId: 'act-1', requestId: 'trace-1',
    });
    expect(mockCall).toHaveBeenCalledWith('career-gateway', {
      tool: 'start_application', input: { opportunityId: 'opp-1' }, idempotencyKey: 'start:abc12345',
      actionId: 'act-1', contextRevisions: { opportunity: 1 }, requestId: 'trace-1',
    });
    expect(res.run.id).toBe('run-1');
    expect(res.run.status).toBe('completed');
    expect(res.run.contextRevisions).toEqual({ opportunity: 1 });
    expect(res.run.resultRef).toEqual({ type: 'application', id: 'app-1', revision: 1 });
    expect(res.result?.application).toMatchObject({ id: 'app-1', company: 'Acme', stage: 'preparing', status: 'wishlist', revision: 1 });
    expect(res.confirmationRequired).toBeUndefined();
  });

  it('rejects a malformed idempotency key before any network call', async () => {
    await expect(runTool('inspect_context', {}, { idempotencyKey: 'short' })).rejects.toThrow('invalid idempotency key');
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('surfaces confirmationRequired and confirmTool replays the same key with the token', async () => {
    mockCall.mockResolvedValueOnce({
      run: { ...RUN_ROW, tool: 'record_outcome', status: 'waiting_confirmation', confirmation: { contentHash: 'h'.repeat(64), expiresAt: '2026-09-21T10:10:00Z' } },
      confirmationRequired: { token: 't'.repeat(64), contentHash: 'h'.repeat(64), summary: 'Record "rejected"…', destination: 'application:app-1', expiresAt: '2026-09-21T10:10:00Z', policy: 'explicit' },
    });
    const input = { applicationId: 'app-1', kind: 'rejected' as const };
    const first = await runTool('record_outcome', input, { idempotencyKey: 'outcome:12345678' });
    expect(first.run.status).toBe('waiting_confirmation');
    expect(first.confirmationRequired).toEqual({
      token: 't'.repeat(64), contentHash: 'h'.repeat(64), summary: 'Record "rejected"…', destination: 'application:app-1', expiresAt: '2026-09-21T10:10:00Z', policy: 'explicit',
    });
    // the run object never carries the token
    expect(first.run.confirmation?.token).toBeUndefined();

    mockCall.mockResolvedValueOnce({
      run: { ...RUN_ROW, tool: 'record_outcome' },
      result: {
        outcome: { id: 'out-1', application_id: 'app-1', kind: 'rejected', observed_at: '2026-09-20T09:00:00Z', source: 'user_reported', details: {}, note: '', created_at: '2026-09-21T10:00:00Z' },
        application: { id: 'app-1', stage: 'closed', closedReason: 'rejected', status: 'rejected', revision: 2 },
      },
    });
    const done = await confirmTool('record_outcome', input, first.confirmationRequired!, { idempotencyKey: 'outcome:12345678' });
    expect(mockCall).toHaveBeenLastCalledWith('career-gateway', {
      tool: 'record_outcome', input, idempotencyKey: 'outcome:12345678', confirmation: { token: 't'.repeat(64), contentHash: 'h'.repeat(64) },
    });
    expect(done.result?.outcome.kind).toBe('rejected');
    expect(done.result?.application.closedReason).toBe('rejected');
  });

  it('maps coded failures to GatewayError with the receipt and extra (stale_context current revisions)', async () => {
    mockCall.mockRejectedValue(fnError('stale_context', 409, { stale: ['opportunity'], current: { opportunity: 4 }, run: { ...RUN_ROW, status: 'failed', failure_code: 'stale_context' } }));
    const err = await runTool('start_application', { opportunityId: 'opp-1' }, { idempotencyKey: 'start:abc12345', contextRevisions: { opportunity: 1 } }).catch((e) => e);
    expect(isGatewayError(err)).toBe(true);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.code).toBe('stale_context');
    expect(err.status).toBe(409);
    expect(err.extra.current).toEqual({ opportunity: 4 });
    expect(err.run?.status).toBe('failed');
    expect(err.run?.failureCode).toBe('stale_context');
    expect(err.retryable).toBe(false);

    mockCall.mockRejectedValue(fnError('llm_unavailable', 503, { run: { ...RUN_ROW, status: 'failed', retryable: true, failure_code: 'llm_unavailable', usage: { kind: 'aiActions', charged: true, released: true } } }));
    const outage = await runTool('generate_artifact', { applicationId: 'app-1', kind: 'linkedin' }, { idempotencyKey: 'gen:12345678' }).catch((e) => e);
    expect(outage.retryable).toBe(true);
    expect(outage.run?.usage).toEqual({ kind: 'aiActions', charged: true, released: true });

    mockCall.mockRejectedValue(new TypeError('network down'));
    await expect(runTool('inspect_context', {}, { idempotencyKey: 'ctx:12345678' })).rejects.toBeInstanceOf(TypeError);
  });

  it('maps tool results through the shared row mappers (artifact, interview session, actions)', async () => {
    mockCall.mockResolvedValueOnce({
      run: { ...RUN_ROW, tool: 'generate_artifact' },
      result: {
        artifact: {
          id: 'art-1', application_id: 'app-1', kind: 'cover_letter', title: 'Cover letter draft', content: { text: 'Dear team' }, plain_text: 'Dear team',
          source: 'ai', status: 'draft', snapshot_of: null, provenance: { factIds: ['f1'], model: 'llm-routed' }, stale: false, revision: 1,
          created_at: '2026-09-21T10:00:00Z', updated_at: '2026-09-21T10:00:00Z',
        },
        newAssertions: ['Led a team of 12'],
      },
    });
    const gen = await runTool('generate_artifact', { applicationId: 'app-1', kind: 'cover_letter' }, { idempotencyKey: 'gen:12345678' });
    expect(gen.result?.artifact).toMatchObject({ id: 'art-1', applicationId: 'app-1', kind: 'cover_letter', source: 'ai', status: 'draft', plainText: 'Dear team' });
    expect(gen.result?.artifact.provenance.factIds).toEqual(['f1']);
    expect(gen.result?.newAssertions).toEqual(['Led a team of 12']);

    mockCall.mockResolvedValueOnce({
      run: { ...RUN_ROW, tool: 'prepare_interview' },
      result: {
        created: true,
        session: {
          id: 'int-1', application_id: 'app-1', scheduled_at: null, time_zone: 'Europe/Berlin', interview_type: 'technical',
          themes: [{ id: 'theme:r1', theme: 'Kafka', covered: false, sourceRequirementId: 'r1' }], story_fact_ids: ['f1'], practice: [], readiness: { themesTotal: 1 },
          self_reported_result: null, recruiter_feedback: null, status: 'planned', revision: 1, created_at: 'x', updated_at: 'x',
        },
      },
    });
    const prep = await runTool('prepare_interview', { applicationId: 'app-1', timeZone: 'Europe/Berlin' }, { idempotencyKey: 'prep:12345678' });
    expect(prep.result?.created).toBe(true);
    expect(prep.result?.session).toMatchObject({ id: 'int-1', applicationId: 'app-1', timeZone: 'Europe/Berlin', interviewType: 'technical', storyFactIds: ['f1'] });
    expect(prep.result?.session.themes[0]).toEqual({ id: 'theme:r1', theme: 'Kafka', covered: false, sourceRequirementId: 'r1' });

    mockCall.mockResolvedValueOnce({
      run: { ...RUN_ROW, tool: 'create_plan' },
      result: { actions: [{ id: 'a1', action_type: 'PREPARE_INTERVIEW', title: 'Prep', reason: 'r', status: 'READY', source: 'coach', dedupe_key: 'coach:x', priority_band: 'soon', destination: { space: 'applications' }, context_refs: {}, evidence_refs: [], revision: 1 }] },
    });
    const plan = await runTool('create_plan', { actions: [{ actionType: 'PREPARE_INTERVIEW', title: 'Prep', destination: { space: 'applications' } }] }, { idempotencyKey: 'plan:12345678' });
    expect(plan.result?.actions[0]).toMatchObject({ id: 'a1', actionType: 'PREPARE_INTERVIEW', status: 'READY', source: 'coach' });

    mockCall.mockResolvedValueOnce({
      run: { ...RUN_ROW, tool: 'request_tailoring', status: 'running' },
      result: { prismIdempotencyKey: 'tailor:12345678', applicationId: 'app-1', sourceResumeId: 'res-1', sourceResumeRevision: 3, templateId: null, actionRunId: 'run-1' },
    });
    const tailor = await runTool('request_tailoring', { applicationId: 'app-1', sourceResumeId: 'res-1', sourceResumeRevision: 3 }, { idempotencyKey: 'tailor:12345678' });
    expect(tailor.run.status).toBe('running');
    expect(tailor.result).toEqual({ prismIdempotencyKey: 'tailor:12345678', applicationId: 'app-1', sourceResumeId: 'res-1', sourceResumeRevision: 3, templateId: null, actionRunId: 'run-1' });
  });

  it('cancelRun and reportResult use the control paths with fresh keys', async () => {
    mockCall.mockResolvedValueOnce({ run: { ...RUN_ROW, status: 'cancelled' } });
    const cancelled = await cancelRun('run-1');
    expect(cancelled.status).toBe('cancelled');
    const cancelBody = mockCall.mock.calls[0][1] as Record<string, unknown>;
    expect(cancelBody.tool).toBe('cancel_run');
    expect(cancelBody.input).toEqual({ runId: 'run-1' });
    expect(cancelBody.idempotencyKey).toMatch(/^cancel:/);

    mockCall.mockResolvedValueOnce({ run: { ...RUN_ROW, tool: 'report_result' }, result: { run: { ...RUN_ROW, status: 'completed', result_ref: { type: 'prism', runId: 'p1', resumeId: 'r1' } } } });
    const reported = await reportResult('run-1', { kind: 'prism', id: 'p1' });
    expect(reported.result?.run.resultRef).toEqual({ type: 'prism', runId: 'p1', resumeId: 'r1' });
    const reportBody = mockCall.mock.calls[1][1] as Record<string, unknown>;
    expect(reportBody.tool).toBe('report_result');
    expect(reportBody.idempotencyKey).toMatch(/^report:/);
  });

  it('exposes every registered tool name (kept in sync with the server registry)', () => {
    expect(TOOL_NAMES.sort()).toEqual([
      'compare_opportunities', 'create_plan', 'explain_priorities', 'generate_artifact', 'inspect_context', 'prepare_interview',
      'record_outcome', 'report_result', 'request_tailoring', 'resume_application', 'review_evidence', 'save_artifact', 'start_application',
    ]);
  });
});
