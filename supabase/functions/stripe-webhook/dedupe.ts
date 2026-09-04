// Pure idempotency decision for stripe-webhook (no I/O; unit-tested).
// The ledger is public.stripe_events — see 20260901100000_stripe_events.sql.

/** An unprocessed claim older than this is assumed to belong to a dead worker. */
export const IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000;

export type DedupeAction =
  | 'process'    // no prior claim: handle the event
  | 'duplicate'  // already handled: acknowledge with 200 and do nothing
  | 'in_flight'  // another worker claimed it recently: tell Stripe to retry later
  | 'retry';     // a stale unprocessed claim: try to re-claim it (compare-and-set)

export interface EventRow {
  processed_at: string | null;
  created_at: string;
}

/**
 * Classify the existing ledger row for an event id whose insert just failed
 * with a unique violation. `null` means the row vanished in between (the
 * previous worker released its claim) — treat as fresh.
 */
export function dedupeAction(existing: EventRow | null | undefined, now: Date = new Date()): DedupeAction {
  if (!existing) return 'process';
  if (existing.processed_at) return 'duplicate';
  const age = now.getTime() - new Date(existing.created_at).getTime();
  // A malformed timestamp must never wedge an event forever: treat as stale.
  if (!Number.isFinite(age) || age >= IN_FLIGHT_WINDOW_MS) return 'retry';
  return 'in_flight';
}

/** Postgres unique_violation, as surfaced by PostgREST / supabase-js. */
export function isUniqueViolation(err: { code?: string } | null | undefined): boolean {
  return err?.code === '23505';
}
