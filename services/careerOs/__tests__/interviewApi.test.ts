import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));

import { callFn, type FnError } from '../../api';
import { generatePracticeQuestions, requestPracticeFeedback } from '../interviewApi';
import { GatewayError } from '../gateway';

const mockCall = vi.mocked(callFn);

const SESSION_ROW = {
  id: 'int-1', application_id: 'app-1', scheduled_at: '2026-10-01T09:00:00+02:00', time_zone: 'Europe/Berlin', interview_type: 'technical',
  themes: [{ id: 'theme:r1', theme: 'Kafka', covered: false }], story_fact_ids: ['f1'],
  practice: [{ id: 'q:abc', question: 'Tell me about Kafka.', themeId: 'theme:r1', answer: 'We rebuilt ingestion.', feedback: null, answeredAt: 'x' }],
  readiness: { themesTotal: 1, themesCovered: 0 }, self_reported_result: null, recruiter_feedback: null, status: 'prepared', revision: 2, created_at: 'x', updated_at: 'x',
};

describe('careerOs interviewApi', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('generatePracticeQuestions posts the questions mode and maps the session', async () => {
    mockCall.mockResolvedValue({ session: SESSION_ROW, added: 1, charged: true });
    const res = await generatePracticeQuestions('int-1');
    expect(mockCall).toHaveBeenCalledWith('ai-interview', { sessionId: 'int-1', mode: 'questions' });
    expect(res.added).toBe(1);
    expect(res.charged).toBe(true);
    expect(res.session).toMatchObject({ id: 'int-1', applicationId: 'app-1', status: 'prepared', timeZone: 'Europe/Berlin' });
    expect(res.session.practice[0]).toMatchObject({ id: 'q:abc', question: 'Tell me about Kafka.', themeId: 'theme:r1', feedback: null });
  });

  it('requestPracticeFeedback posts the item id and maps feedback, including uncharged abstentions', async () => {
    mockCall.mockResolvedValueOnce({
      session: { ...SESSION_ROW, practice: [{ ...SESSION_ROW.practice[0], feedback: { strengths: ['Concrete result'], gaps: ['Say what you changed'], citations: ['f1'], abstained: false } }] },
      practiceItemId: 'q:abc', feedback: { strengths: ['Concrete result'], gaps: ['Say what you changed'], citations: ['f1'], abstained: false }, charged: true,
    });
    const res = await requestPracticeFeedback('int-1', 'q:abc');
    expect(mockCall).toHaveBeenCalledWith('ai-interview', { sessionId: 'int-1', mode: 'feedback', practiceItemId: 'q:abc' });
    expect(res.feedback).toEqual({ strengths: ['Concrete result'], gaps: ['Say what you changed'], citations: ['f1'], abstained: false });
    expect(res.charged).toBe(true);
    expect(res.session.practice[0].feedback?.citations).toEqual(['f1']);

    mockCall.mockResolvedValueOnce({
      session: SESSION_ROW, practiceItemId: 'q:abc', feedback: { strengths: [], gaps: [], citations: [], abstained: true, reason: 'answer_too_short' }, charged: false,
    });
    const short = await requestPracticeFeedback('int-1', 'q:abc');
    expect(short.feedback).toEqual({ strengths: [], gaps: [], citations: [], abstained: true, reason: 'answer_too_short' });
    expect(short.charged).toBe(false);
  });

  it('maps coded failures (quota, ownership) to GatewayError', async () => {
    const err = new Error('limit_reached') as FnError;
    err.code = 'limit_reached';
    err.status = 402;
    err.extra = { error: 'limit_reached', kind: 'aiActions', upgrade: true };
    mockCall.mockRejectedValue(err);
    const failure = await generatePracticeQuestions('int-1').catch((e) => e);
    expect(failure).toBeInstanceOf(GatewayError);
    expect(failure.code).toBe('limit_reached');
    expect(failure.status).toBe(402);
    expect(failure.extra.upgrade).toBe(true);
  });
});
