import { serviceClient } from './auth.ts';
import { HttpError } from './respond.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type UsageKind = 'atsScans' | 'aiActions';
type PlanId = 'free' | 'pro' | 'elite';
type Feature = 'smartStudio' | 'aiHeadshot';

// Mirrors subscriptionService PLANS limits (-1 = unlimited).
const LIMITS: Record<PlanId, { atsScans: number; aiActions: number; smartStudio: boolean; aiHeadshot: boolean }> = {
  free: { atsScans: 3, aiActions: 10, smartStudio: false, aiHeadshot: false },
  pro: { atsScans: -1, aiActions: -1, smartStudio: true, aiHeadshot: false },
  elite: { atsScans: -1, aiActions: -1, smartStudio: true, aiHeadshot: true },
};
const COL: Record<UsageKind, 'ats_scans' | 'ai_actions'> = { atsScans: 'ats_scans', aiActions: 'ai_actions' };

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function planFor(svc: SupabaseClient, userId: string): Promise<PlanId> {
  const { data } = await svc.from('subscriptions').select('plan_id,status').eq('user_id', userId).maybeSingle();
  const active = data && (data.status === 'active' || data.status === 'trialing');
  return (active ? (data!.plan_id as PlanId) : 'free');
}

/**
 * Enforce a metered limit: throws 402 `limit_reached` if the user is at/over the
 * plan limit for the month, otherwise increments the counter by 1 (service_role).
 * NOTE: read-then-write; acceptable for per-user metering, hardened in W7.
 */
export async function checkAndMeter(userId: string, kind: UsageKind): Promise<void> {
  const svc = serviceClient();
  const plan = await planFor(svc, userId);
  const limit = LIMITS[plan][kind];
  const month = monthKey();
  const col = COL[kind];
  const { data: usage } = await svc.from('usage_counters').select(col).eq('user_id', userId).eq('month', month).maybeSingle();
  const used = (usage?.[col] as number | undefined) ?? 0;
  if (limit !== -1 && used >= limit) {
    throw new HttpError(402, 'limit_reached', { upgrade: true, kind, limit, plan });
  }
  await svc.from('usage_counters').upsert(
    { user_id: userId, month, [col]: used + 1 },
    { onConflict: 'user_id,month' },
  );
}

/** Boolean feature gate (smartStudio, aiHeadshot). Throws 403 when not entitled. */
export async function requireFeature(userId: string, feature: Feature): Promise<void> {
  const svc = serviceClient();
  const plan = await planFor(svc, userId);
  if (!LIMITS[plan][feature]) throw new HttpError(403, 'feature_locked', { upgrade: true, feature, plan });
}
