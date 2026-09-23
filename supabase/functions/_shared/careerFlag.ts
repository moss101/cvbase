import { HttpError } from './respond.ts';

// =========================================================================
// Server-side Career OS cohort gate. Mirrors prism-tailor's
// requirePrismEnabled for the `career_os` row in `feature_flags`: the same
// FNV-1a bucket the client uses, so a user is either in the cohort on every
// surface or on none. Fails closed — no flag row means the feature is off.
// =========================================================================

/** FNV-1a hash → stable 0-99 bucket per user for percentage rollout. */
export function rolloutBucket(userId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

// Minimal structural client so tests can inject an in-memory fake.
// deno-lint-ignore no-explicit-any
export type FlagClient = { from: (table: string) => any };

export const CAREER_OS_FLAG = 'career_os';

/** Throws 403 `feature_disabled` unless the user is inside the career_os
 *  rollout. A lookup failure is treated as "off" (never fail open). */
export async function requireCareerOs(svc: FlagClient, userId: string): Promise<void> {
  let row: { enabled?: boolean; rollout_pct?: number } | null = null;
  try {
    const { data } = await svc.from('feature_flags')
      .select('enabled,rollout_pct').eq('flag', CAREER_OS_FLAG).maybeSingle();
    row = data ?? null;
  } catch {
    row = null;
  }
  const inRollout = !!row?.enabled && rolloutBucket(userId) < (row?.rollout_pct ?? 0);
  if (!inRollout) throw new HttpError(403, 'feature_disabled', { feature: CAREER_OS_FLAG });
}
