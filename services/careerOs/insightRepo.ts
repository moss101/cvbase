import { getSupabase } from '../supabase';
import { rowToInsight, insightToRow, type InsightInput } from './mappers';
import { deleteOwned, getOwned, insertOne, rows } from './repoUtils';
import { NotFoundError, type CareerInsight } from './types';

// Descriptive outcome insights with their sample size, denominator, missing
// outcomes and window recorded. Rows have no revision column; status changes
// are the only mutation and are keyed by owner + id.

const TABLE = 'career_insights';
const ENTITY = 'career_insight';

export async function list(userId: string, status: CareerInsight['status'] | 'any' = 'active'): Promise<CareerInsight[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (status !== 'any') q = q.eq('status', status);
  q = q.order('computed_at', { ascending: false });
  return (await rows(q)).map(rowToInsight);
}

export async function get(userId: string, id: string): Promise<CareerInsight> {
  return rowToInsight(await getOwned(TABLE, ENTITY, userId, id));
}

export async function create(userId: string, input: InsightInput): Promise<CareerInsight> {
  return rowToInsight(await insertOne(TABLE, insightToRow(input, userId)));
}

export async function setStatus(userId: string, id: string, status: CareerInsight['status']): Promise<CareerInsight> {
  const { data, error } = await getSupabase().from(TABLE)
    .update({ status }).eq('user_id', userId).eq('id', id).select('*');
  if (error) throw error;
  const found = (data ?? []) as Record<string, unknown>[];
  if (found.length === 0) throw new NotFoundError(ENTITY, id);
  return rowToInsight(found[0]);
}

export const remove = (userId: string, id: string) => deleteOwned(TABLE, userId, id);
