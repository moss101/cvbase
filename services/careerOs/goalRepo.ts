import { getSupabase } from '../supabase';
import { rowToGoal, goalToRow, rowToGoalRevision, type GoalPatch } from './mappers';
import { getOwned, insertOne, isUniqueViolation, isUuid, rows, updateWithRevision } from './repoUtils';
import { ConflictError, type CareerGoal, type GoalInput, type GoalStatus } from './types';

// Versioned goals. At most one primary active goal per user is enforced by a
// partial unique index; a missing primary is a valid state and is never
// filled in automatically. Every revision is snapshotted server-side.

const TABLE = 'career_goals';
const REVISIONS_TABLE = 'career_goal_revisions';
const ENTITY = 'career_goal';

export async function list(userId: string, status: GoalStatus | 'any' = 'active'): Promise<CareerGoal[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (status !== 'any') q = q.eq('status', status);
  q = q.order('is_primary', { ascending: false }).order('created_at', { ascending: true });
  return (await rows(q)).map(rowToGoal);
}

export async function get(userId: string, id: string): Promise<CareerGoal> {
  return rowToGoal(await getOwned(TABLE, ENTITY, userId, id));
}

/** The primary active goal, or null (a valid, common state). */
export async function getPrimary(userId: string): Promise<CareerGoal | null> {
  const { data, error } = await getSupabase().from(TABLE)
    .select('*').eq('user_id', userId).eq('is_primary', true).eq('status', 'active').maybeSingle();
  if (error) throw error;
  return data ? rowToGoal(data as Record<string, unknown>) : null;
}

export async function create(userId: string, input: GoalInput): Promise<CareerGoal> {
  // A new goal never claims primary implicitly; use setPrimary so the swap is explicit.
  return rowToGoal(await insertOne(TABLE, goalToRow({ ...input, isPrimary: false }, userId)));
}

export async function update(userId: string, id: string, patch: GoalPatch, expectedRevision: number): Promise<CareerGoal> {
  const row = goalToRow(patch, userId);
  delete row.user_id;
  delete row.is_primary; // primary changes go through setPrimary
  return rowToGoal(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

export async function archive(userId: string, id: string, expectedRevision: number): Promise<CareerGoal> {
  return rowToGoal(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { status: 'archived', is_primary: false }));
}

/**
 * Make `id` the primary goal: clear the current primary, then set the new one
 * with its revision precondition. If two clients race, the partial unique
 * index rejects the second write; we re-read and report the truth instead of
 * guessing.
 */
export async function setPrimary(userId: string, id: string, expectedRevision: number): Promise<CareerGoal> {
  const { error: clearError } = await getSupabase().from(TABLE)
    .update({ is_primary: false })
    .eq('user_id', userId).eq('is_primary', true).neq('id', id);
  if (clearError) throw clearError;
  try {
    return rowToGoal(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { is_primary: true, status: 'active' }));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const current = await get(userId, id);
    if (current.isPrimary) return current;
    throw new ConflictError(ENTITY, id, expectedRevision);
  }
}

/** Every recorded revision of a goal, oldest first (decision-time snapshots). */
export async function listRevisions(userId: string, goalId: string): Promise<CareerGoal[]> {
  if (!isUuid(goalId)) return [];
  return (await rows(
    getSupabase().from(REVISIONS_TABLE).select('*').eq('user_id', userId).eq('goal_id', goalId).order('revision', { ascending: true }),
  )).map(rowToGoalRevision);
}
