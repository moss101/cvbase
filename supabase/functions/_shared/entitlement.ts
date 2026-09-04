import { serviceClient } from './auth.ts';
import { HttpError } from './respond.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type UsageKind = 'atsScans' | 'aiActions';
export type PlanId = 'free' | 'pro' | 'elite';
export type Feature = 'smartStudio' | 'aiHeadshot';
/** Every numeric plan limit (`resumes` is enforced by the client/data layer,
 *  not metered here, but lives in the same table so the two stay in sync). */
export type LimitKind = UsageKind | 'resumes';

export interface PlanLimits {
  resumes: number;
  atsScans: number;
  aiActions: number;
  smartStudio: boolean;
  aiHeadshot: boolean;
}

// Mirrors services/subscriptionService.ts PLANS[].limits (-1 = unlimited).
export const LIMITS: Record<PlanId, PlanLimits> = {
  free: { resumes: 1, atsScans: 3, aiActions: 10, smartStudio: false, aiHeadshot: false },
  pro: { resumes: -1, atsScans: -1, aiActions: 200, smartStudio: false, aiHeadshot: false },
  elite: { resumes: -1, atsScans: -1, aiActions: -1, smartStudio: true, aiHeadshot: true },
};

/** Numeric limit for a plan (-1 = unlimited). Unknown plan ids fall back to free. */
export function limitFor(plan: PlanId | string, kind: LimitKind): number {
  const p = (LIMITS as Record<string, PlanLimits>)[plan] ?? LIMITS.free;
  return p[kind];
}

/**
 * Dunning grace window. Stripe marks a subscription `past_due` when a renewal
 * charge fails and keeps retrying for up to ~3 weeks before cancelling. During
 * that window the customer is still legitimately subscribed (a card retry may
 * still succeed), so a `past_due` row keeps its paid plan for GRACE_DAYS after
 * the last paid period ended. Past that, or with no period end on record, it
 * degrades to free. A `canceled`/`expired` row never gets grace.
 */
export const GRACE_DAYS = 21;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

export interface SubscriptionRow {
  plan_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
}

function isPlanId(v: unknown): v is PlanId {
  return v === 'free' || v === 'pro' || v === 'elite';
}

/** Pure plan resolution from a subscriptions row (exported for tests). */
export function resolvePlan(row: SubscriptionRow | null | undefined, now: number = Date.now()): PlanId {
  if (!row || !isPlanId(row.plan_id)) return 'free';
  const status = row.status ?? '';
  if (status === 'active' || status === 'trialing') return row.plan_id;
  if (status === 'past_due') {
    const end = row.current_period_end ? new Date(row.current_period_end).getTime() : NaN;
    if (Number.isFinite(end) && now - end <= GRACE_MS) return row.plan_id;
  }
  return 'free';
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function planFor(svc: SupabaseClient, userId: string): Promise<PlanId> {
  const { data } = await svc.from('subscriptions')
    .select('plan_id,status,current_period_end').eq('user_id', userId).maybeSingle();
  return resolvePlan(data as SubscriptionRow | null);
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
  const limit = limitFor(plan, kind);
  const month = monthKey();
  const { data: allowed, error } = await svc.rpc('consume_usage', {
    p_user: userId, p_month: month, p_kind: kind, p_limit: limit,
  });
  if (error) throw new HttpError(500, 'meter_failed', { detail: error.message });
  if (allowed === false) {
    throw new HttpError(402, 'limit_reached', { upgrade: true, kind, limit, plan });
  }
}

/**
 * Refund one metered action (release_usage() SQL, 20260901500000): the
 * current month's counter is decremented by 1, never below 0. Called by the
 * shared handler when the model call fails on our side after metering, so a
 * provider outage never eats the user's quota. Never throws — a failed refund
 * is logged, the original error still reaches the client.
 */
export async function releaseUsage(userId: string, kind: UsageKind): Promise<void> {
  try {
    const { error } = await serviceClient().rpc('release_usage', { p_user_id: userId, p_kind: kind });
    if (error) console.error('release_usage failed (non-fatal):', error.message);
  } catch (e) {
    console.error('release_usage threw (non-fatal):', e);
  }
}

/** Boolean feature gate (smartStudio, aiHeadshot). Throws 403 when not entitled. */
export async function requireFeature(userId: string, feature: Feature): Promise<void> {
  const svc = serviceClient();
  const plan = await planFor(svc, userId);
  if (!LIMITS[plan][feature]) throw new HttpError(403, 'feature_locked', { upgrade: true, feature, plan });
}
