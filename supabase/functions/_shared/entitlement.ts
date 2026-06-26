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
 * Atomic check-and-increment via the consume_usage() SQL function so concurrent
 * AI calls cannot race past the cap (see 20260626120000_consume_usage.sql).
 */
export async function checkAndMeter(userId: string, kind: UsageKind): Promise<void> {
  const svc = serviceClient();
  const plan = await planFor(svc, userId);
  const limit = LIMITS[plan][kind];
  const month = monthKey();
  const { data: allowed, error } = await svc.rpc('consume_usage', {
    p_user: userId, p_month: month, p_kind: kind, p_limit: limit,
  });
  if (error) throw new HttpError(500, 'meter_failed', { detail: error.message });
  if (allowed === false) {
    throw new HttpError(402, 'limit_reached', { upgrade: true, kind, limit, plan });
  }
}

/** Boolean feature gate (smartStudio, aiHeadshot). Throws 403 when not entitled. */
export async function requireFeature(userId: string, feature: Feature): Promise<void> {
  const svc = serviceClient();
  const plan = await planFor(svc, userId);
  if (!LIMITS[plan][feature]) throw new HttpError(403, 'feature_locked', { upgrade: true, feature, plan });
}
