import { getSupabase } from '../supabase';
import { rowToPreferences, preferencesToRow, type PreferencesPatch } from './mappers';
import { getByUser, updateByUserWithRevision } from './repoUtils';
import type { CareerPreferences } from './types';

// Proactive-assistance consent and budgets (pk = user id). Proactive runs are
// off until the user explicitly opts in; `consentAt` records when.

const TABLE = 'career_preferences';

export async function get(userId: string): Promise<CareerPreferences | null> {
  const row = await getByUser(TABLE, userId);
  return row ? rowToPreferences(row) : null;
}

export async function ensure(userId: string): Promise<CareerPreferences> {
  const existing = await get(userId);
  if (existing) return existing;
  const { error } = await getSupabase().from(TABLE)
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
  const created = await get(userId);
  if (!created) throw new Error('career_preferences_unavailable');
  return created;
}

export async function update(userId: string, patch: PreferencesPatch, expectedRevision: number): Promise<CareerPreferences> {
  const row = preferencesToRow(patch, userId);
  delete row.user_id;
  if (patch.proactiveEnabled === true && patch.consentAt === undefined) row.consent_at = new Date().toISOString();
  return rowToPreferences(await updateByUserWithRevision(TABLE, 'career_preferences', userId, expectedRevision, row));
}
