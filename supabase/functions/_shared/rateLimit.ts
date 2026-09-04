import { HttpError } from './respond.ts';

// Per-user sliding-window rate limiting for the AI Edge Functions, backed by
// the append-only `rate_limit_events` table (20260901500100_rate_limit_events.sql).
// Monthly metering (entitlement.ts) bounds total spend; this bounds burst rate
// so a runaway client or a stolen token cannot drain a whole month's quota (or
// an Elite user's unlimited quota) in seconds. Every plan is bounded.

export interface RateLimitOpts {
  perHour: number;
  perMinute?: number;
}

export interface RateLimitInfo {
  bucket: string;
  perHour: number;
  perMinute?: number;
  /** Requests seen in the trailing hour, including this one. */
  usedThisHour: number;
}

// Minimal structural type so tests can inject a fake instead of supabase-js.
// deno-lint-ignore no-explicit-any
export type RateLimitClient = { from: (table: string) => any };

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const PRUNE_AFTER_MS = 24 * HOUR_MS;
/** Fraction of calls that also prune the caller's day-old rows (cheap
 *  amortized cleanup; no cron needed). */
const PRUNE_PROBABILITY = 0.05;

async function windowCount(
  svc: RateLimitClient,
  userId: string,
  bucket: string,
  sinceIso: string,
): Promise<{ count: number; oldestIso: string | null } | null> {
  const { count, error } = await svc.from('rate_limit_events')
    .select('created_at', { count: 'exact', head: true })
    .eq('user_id', userId).eq('bucket', bucket).gte('created_at', sinceIso);
  if (error) {
    console.error('rate_limit_events count failed (fail-open):', error.message ?? error);
    return null;
  }
  return { count: count ?? 0, oldestIso: null };
}

async function oldestInWindow(
  svc: RateLimitClient,
  userId: string,
  bucket: string,
  sinceIso: string,
): Promise<string | null> {
  const { data } = await svc.from('rate_limit_events')
    .select('created_at')
    .eq('user_id', userId).eq('bucket', bucket).gte('created_at', sinceIso)
    .order('created_at', { ascending: true }).limit(1);
  const row = Array.isArray(data) ? data[0] : data;
  return (row?.created_at as string | undefined) ?? null;
}

function retryAfterSec(oldestIso: string | null, windowMs: number, now: number): number {
  if (!oldestIso) return Math.ceil(windowMs / 1000);
  const freeAt = new Date(oldestIso).getTime() + windowMs;
  return Math.max(1, Math.ceil((freeAt - now) / 1000));
}

/**
 * Enforce `perHour` (and optionally `perMinute`) requests for `userId` in
 * `bucket`. Throws 429 `rate_limited` with `{ retryAfterSec, limit, window }`
 * when over; otherwise records this request and returns the window usage.
 *
 * Failure mode: if the table is unreachable the check fails OPEN with an
 * error log — monthly metering still caps spend, and a DB blip must not take
 * every AI feature down. The record insert is likewise non-fatal.
 */
export async function enforceRateLimit(
  svc: RateLimitClient,
  userId: string,
  bucket: string,
  opts: RateLimitOpts,
  now: number = Date.now(),
): Promise<RateLimitInfo> {
  const hourAgo = new Date(now - HOUR_MS).toISOString();
  const hour = await windowCount(svc, userId, bucket, hourAgo);
  if (hour && hour.count >= opts.perHour) {
    const oldest = await oldestInWindow(svc, userId, bucket, hourAgo);
    throw new HttpError(429, 'rate_limited', {
      retryAfterSec: retryAfterSec(oldest, HOUR_MS, now), limit: opts.perHour, window: '1h', bucket,
    });
  }
  if (opts.perMinute && opts.perMinute > 0) {
    const minuteAgo = new Date(now - MINUTE_MS).toISOString();
    const minute = await windowCount(svc, userId, bucket, minuteAgo);
    if (minute && minute.count >= opts.perMinute) {
      const oldest = await oldestInWindow(svc, userId, bucket, minuteAgo);
      throw new HttpError(429, 'rate_limited', {
        retryAfterSec: retryAfterSec(oldest, MINUTE_MS, now), limit: opts.perMinute, window: '1m', bucket,
      });
    }
  }

  const { error: insErr } = await svc.from('rate_limit_events')
    .insert({ user_id: userId, bucket, created_at: new Date(now).toISOString() });
  if (insErr) console.error('rate_limit_events insert failed (non-fatal):', insErr.message ?? insErr);

  if (Math.random() < PRUNE_PROBABILITY) {
    const cutoff = new Date(now - PRUNE_AFTER_MS).toISOString();
    await svc.from('rate_limit_events').delete().eq('user_id', userId).lt('created_at', cutoff)
      .then((r: { error?: unknown }) => {
        if (r?.error) console.error('rate_limit_events prune failed (non-fatal):', r.error);
      }, () => {});
  }

  return { bucket, perHour: opts.perHour, perMinute: opts.perMinute, usedThisHour: (hour?.count ?? 0) + 1 };
}
