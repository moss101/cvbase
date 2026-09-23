import { getSupabase } from '../supabase';
import { rowToApplication, applicationToRow, type ApplicationPatch } from './mappers';
import { getOwned, isUuid, rows, updateWithRevision } from './repoUtils';
import type { ApplicationRecord, ApplicationStage, SubmissionSnapshot } from './types';

// job_applications is THE application authority (legacy columns untouched,
// Career OS columns additive). Starting is idempotent and server-side; a
// submission is a user-confirmed record whose snapshot is immutable.

const TABLE = 'job_applications';
const ENTITY = 'application';

/** Thrown when a submission snapshot already exists and `supersede` was not requested. */
export class SubmissionLockedError extends Error {
  readonly code = 'submission_locked';
  constructor(public readonly applicationId: string) {
    super(`application ${applicationId} already has a submission snapshot`);
    this.name = 'SubmissionLockedError';
  }
}

export interface ApplicationFilter {
  stage?: ApplicationStage | ApplicationStage[];
  /** true = only stages before 'closed'. */
  activeOnly?: boolean;
}

export async function list(userId: string, filter: ApplicationFilter = {}): Promise<ApplicationRecord[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (Array.isArray(filter.stage)) q = q.in('stage', filter.stage);
  else if (filter.stage) q = q.eq('stage', filter.stage);
  if (filter.activeOnly) q = q.neq('stage', 'closed');
  q = q.order('updated_at', { ascending: false });
  return (await rows(q)).map(rowToApplication);
}

export async function listForCampaign(userId: string, campaignId: string): Promise<ApplicationRecord[]> {
  if (!isUuid(campaignId)) return [];
  return (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('campaign_id', campaignId).order('updated_at', { ascending: false }),
  )).map(rowToApplication);
}

export async function listForOpportunity(userId: string, opportunityId: string): Promise<ApplicationRecord[]> {
  if (!isUuid(opportunityId)) return [];
  return (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('opportunity_id', opportunityId).order('attempt_no', { ascending: false }),
  )).map(rowToApplication);
}

export async function get(userId: string, id: string): Promise<ApplicationRecord> {
  return rowToApplication(await getOwned(TABLE, ENTITY, userId, id));
}

export interface StartInput {
  opportunityId: string;
  campaignId?: string | null;
  /** Scoped to the user; retries with the same key return the same application. */
  idempotencyKey: string;
  /** Explicit new attempt linked to the previous one (never implicit). */
  reapply?: boolean;
}

/**
 * Idempotent Start Application through `career_start_application` (advisory
 * lock per user+opportunity, dormant wishlist shell activated in place).
 * `userId` is not sent: the function derives the owner from auth.uid().
 */
export async function start(userId: string, input: StartInput): Promise<ApplicationRecord> {
  void userId;
  const { data, error } = await getSupabase().rpc('career_start_application', {
    p_opportunity_id: input.opportunityId,
    p_campaign_id: input.campaignId ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_reapply: input.reapply === true,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('start_application_no_row');
  return rowToApplication(row as Record<string, unknown>);
}

export type ApplicationUpdate = Pick<ApplicationPatch, 'stage' | 'closedReason' | 'notes' | 'followUpAt' | 'currentResumeId' | 'prismRunId' | 'readiness' | 'matchScore' | 'dateApplied' | 'jobTitle' | 'company' | 'jobUrl'>;

export async function update(userId: string, id: string, patch: ApplicationUpdate, expectedRevision: number): Promise<ApplicationRecord> {
  const row = applicationToRow(patch, userId);
  delete row.user_id;
  return rowToApplication(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

/**
 * Record a user-confirmed submission: timestamp, exact document versions and
 * stage 'submitted'. A second call is refused unless `supersede` is set, in
 * which case the earlier snapshot is preserved verbatim under `previous`.
 */
export async function recordSubmission(
  userId: string, id: string, snapshot: SubmissionSnapshot, expectedRevision: number, opts: { supersede?: boolean } = {},
): Promise<ApplicationRecord> {
  const current = await get(userId, id);
  if (current.submissionSnapshot && !opts.supersede) throw new SubmissionLockedError(id);
  if (!snapshot.confirmedAt) throw new Error('submission_requires_confirmed_at');
  const stored: SubmissionSnapshot = current.submissionSnapshot
    ? { ...snapshot, previous: current.submissionSnapshot }
    : { ...snapshot };
  return rowToApplication(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, {
    submitted_at: snapshot.confirmedAt,
    submission_snapshot: stored,
    stage: 'submitted',
    date_applied: current.dateApplied ?? snapshot.confirmedAt.slice(0, 10),
  }));
}
