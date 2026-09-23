/**
 * Thin client for the ai-interview Edge Function (COS-024). Both operations
 * act on an owned interview_sessions row created through the gateway's
 * `prepare_interview` tool. Questions are appended idempotently; feedback is
 * strengths/gaps/citations only and abstains (uncharged) on answers shorter
 * than 20 characters or when no facts exist.
 */
import { callFn, type FnError } from '../api';
import { mapPracticeFeedbackResult, mapPracticeQuestionsResult, type PracticeFeedbackResult, type PracticeQuestionsResult } from './gatewayMappers';
import { GatewayError } from './gateway';

export const INTERVIEW_FN = 'ai-interview';

async function post<T>(body: Record<string, unknown>, map: (raw: unknown) => T): Promise<T> {
  try {
    return map(await callFn<unknown>(INTERVIEW_FN, body));
  } catch (e) {
    if (e && typeof e === 'object' && ('code' in e || 'status' in e)) throw new GatewayError(e as FnError);
    throw e;
  }
}

/** Generate up to 8 practice questions for the session (one AI action). */
export function generatePracticeQuestions(sessionId: string): Promise<PracticeQuestionsResult> {
  return post({ sessionId, mode: 'questions' }, mapPracticeQuestionsResult);
}

/** Feedback on one answered practice item. Save the answer through the
 *  interview repo first; the server reads it from the session row. */
export function requestPracticeFeedback(sessionId: string, practiceItemId: string): Promise<PracticeFeedbackResult> {
  return post({ sessionId, mode: 'feedback', practiceItemId }, mapPracticeFeedbackResult);
}
