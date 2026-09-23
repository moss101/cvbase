import { getSupabase } from '../supabase';
import { rowToProfile, profileToRow } from './mappers';
import { getByUser, updateByUserWithRevision } from './repoUtils';
import type { CareerProfile, OnboardingState } from './types';

// The career aggregate row (pk = user id). Created lazily by `ensure` or by
// the server-side migration; never read for another user.

const TABLE = 'career_profiles';

export async function get(userId: string): Promise<CareerProfile | null> {
  const row = await getByUser(TABLE, userId);
  return row ? rowToProfile(row) : null;
}

/** Get the profile, creating the empty aggregate row on first use. */
export async function ensure(userId: string): Promise<CareerProfile> {
  const existing = await get(userId);
  if (existing) return existing;
  const { error } = await getSupabase().from(TABLE)
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
  const created = await get(userId);
  if (!created) throw new Error('career_profile_unavailable');
  return created;
}

async function patch(userId: string, expectedRevision: number, fields: Parameters<typeof profileToRow>[0]): Promise<CareerProfile> {
  const row = profileToRow(fields, userId);
  delete row.user_id;
  return rowToProfile(await updateByUserWithRevision(TABLE, 'career_profile', userId, expectedRevision, row));
}

export const updateOnboarding = (userId: string, onboarding: OnboardingState, expectedRevision: number): Promise<CareerProfile> =>
  patch(userId, expectedRevision, { onboarding });

export const updateHeadline = (userId: string, headline: string, expectedRevision: number): Promise<CareerProfile> =>
  patch(userId, expectedRevision, { headline });

/** Record the hash over active facts so derived analyses can detect staleness. */
export const setFactsRevision = (userId: string, factsRevision: string, expectedRevision: number): Promise<CareerProfile> =>
  patch(userId, expectedRevision, { factsRevision });

export interface MigrationSummary { version: number; opportunities: number; facts: number; skipped: number }

/** Restartable server-side backfill (legacy tracker rows, primary CV facts, profile fields). */
export async function runMigration(userId: string): Promise<MigrationSummary> {
  const { data, error } = await getSupabase().rpc('career_os_migrate_user', { p_user: userId });
  if (error) throw error;
  const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' ? v : 0);
  return { version: n(o.version), opportunities: n(o.opportunities), facts: n(o.facts), skipped: n(o.skipped) };
}

/** After a cohort rollback: push new-model writes back into legacy-readable columns. Returns rows touched. */
export async function reconcileLegacy(userId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('career_os_reconcile_legacy', { p_user: userId });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
