import { getSupabase } from '../supabase';
import { rowToInterview, interviewToRow, type InterviewInput, type InterviewPatch } from './mappers';
import { getOwned, insertOne, isUuid, rows, updateWithRevision } from './repoUtils';
import type { InterviewSession, InterviewStatus } from './types';

// Interview sessions belong to one application. The scheduled time is only
// ever what the user recorded (time + IANA zone); nothing here invents dates.

const TABLE = 'interview_sessions';
const ENTITY = 'interview_session';

export async function listForApplication(userId: string, applicationId: string): Promise<InterviewSession[]> {
  if (!isUuid(applicationId)) return [];
  return (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('application_id', applicationId).order('scheduled_at', { ascending: true, nullsFirst: false }),
  )).map(rowToInterview);
}

export async function list(userId: string): Promise<InterviewSession[]> {
  return (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).order('scheduled_at', { ascending: true, nullsFirst: false }),
  )).map(rowToInterview);
}

export async function get(userId: string, id: string): Promise<InterviewSession> {
  return rowToInterview(await getOwned(TABLE, ENTITY, userId, id));
}

export async function create(userId: string, input: InterviewInput): Promise<InterviewSession> {
  return rowToInterview(await insertOne(TABLE, interviewToRow({
    interviewType: 'unknown', themes: [], storyFactIds: [], practice: [], readiness: {}, status: 'planned', ...input,
  }, userId)));
}

export async function update(userId: string, id: string, patch: InterviewPatch, expectedRevision: number): Promise<InterviewSession> {
  const row = interviewToRow(patch, userId);
  delete row.user_id;
  return rowToInterview(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

/** Store the user's answer to one practice item; feedback stays as it was until re-run. */
export async function saveAnswer(userId: string, sessionId: string, itemId: string, answer: string, expectedRevision: number): Promise<InterviewSession> {
  const session = await get(userId, sessionId);
  if (!session.practice.some((p) => p.id === itemId)) throw new Error('practice_item_not_found');
  const practice = session.practice.map((p) => (p.id === itemId ? { ...p, answer, answeredAt: new Date().toISOString() } : p));
  return update(userId, sessionId, { practice }, expectedRevision);
}

/** Self-reported result and recruiter feedback are recorded separately, never inferred. */
export async function setResult(
  userId: string, id: string,
  result: { selfReportedResult?: string | null; recruiterFeedback?: string | null; status?: InterviewStatus },
  expectedRevision: number,
): Promise<InterviewSession> {
  const patch: InterviewPatch = {};
  if (result.selfReportedResult !== undefined) patch.selfReportedResult = result.selfReportedResult;
  if (result.recruiterFeedback !== undefined) patch.recruiterFeedback = result.recruiterFeedback;
  patch.status = result.status ?? 'completed';
  return update(userId, id, patch, expectedRevision);
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
