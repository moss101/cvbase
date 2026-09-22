import { getSupabase } from '../supabase';
import { rowToOutcome, outcomeToRow } from './mappers';
import { getOwned, insertOne, isUuid, rows } from './repoUtils';
import type { OutcomeKind, OutcomeObservation, OutcomeSource } from './types';

// Append-only outcome observations. A correction is a new observation that
// supersedes an earlier one; history is never rewritten.

const TABLE = 'application_outcomes';
const ENTITY = 'application_outcome';

export async function list(userId: string, applicationId?: string): Promise<OutcomeObservation[]> {
  if (applicationId !== undefined && !isUuid(applicationId)) return [];
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (applicationId) q = q.eq('application_id', applicationId);
  q = q.order('observed_at', { ascending: true }).order('created_at', { ascending: true });
  return (await rows(q)).map(rowToOutcome);
}

export async function get(userId: string, id: string): Promise<OutcomeObservation> {
  return rowToOutcome(await getOwned(TABLE, ENTITY, userId, id));
}

export interface RecordOptions {
  observedAt?: string;
  note?: string;
  details?: Record<string, unknown>;
  supersedesId?: string | null;
  source?: OutcomeSource;
}

export async function record(userId: string, applicationId: string, kind: OutcomeKind, opts: RecordOptions = {}): Promise<OutcomeObservation> {
  return rowToOutcome(await insertOne(TABLE, outcomeToRow({
    applicationId,
    kind,
    observedAt: opts.observedAt ?? new Date().toISOString(),
    source: opts.source ?? 'user_reported',
    details: opts.details ?? {},
    supersedesId: opts.supersedesId ?? null,
    note: opts.note ?? '',
  }, userId)));
}

export interface CorrectionInput {
  /** What the superseded observation should have been; omit to retract it. */
  correctedKind?: OutcomeKind;
  correctedObservedAt?: string;
  note?: string;
  details?: Record<string, unknown>;
}

/**
 * Correct an earlier observation: records `kind = 'correction'` pointing at
 * it. The original stays in the history, flagged as superseded.
 */
export async function correct(userId: string, applicationId: string, supersedesId: string, input: CorrectionInput = {}): Promise<OutcomeObservation> {
  const target = await get(userId, supersedesId);
  if (target.applicationId !== applicationId) throw new Error('correction_application_mismatch');
  return record(userId, applicationId, 'correction', {
    supersedesId,
    note: input.note,
    observedAt: input.correctedObservedAt ?? target.observedAt,
    details: {
      ...(input.details ?? {}),
      ...(input.correctedKind ? { correctedKind: input.correctedKind } : { retracted: true }),
      ...(input.correctedObservedAt ? { correctedObservedAt: input.correctedObservedAt } : {}),
    },
  });
}
