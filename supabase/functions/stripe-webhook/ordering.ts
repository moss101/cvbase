// Pure helpers for the stripe-webhook reducer: price -> plan mapping, the
// event-ordering rule, and the customer.subscription.* -> row reduction.
// No I/O so they can be unit-tested with `deno test`.

export interface PlanCycle {
  plan: string;
  cycle: string;
}

/** Invert config/stripe-prices.json ("pro:monthly" -> price id) to price id -> {plan, cycle}. */
export function planByPriceMap(priceMap: Record<string, string>): Record<string, PlanCycle> {
  const out: Record<string, PlanCycle> = {};
  for (const [key, priceId] of Object.entries(priceMap)) {
    const [plan, cycle] = key.split(':');
    if (plan && cycle && priceId) out[priceId] = { plan, cycle };
  }
  return out;
}

/**
 * Mirrors the WHERE clause of apply_stripe_subscription() in
 * 20260901100100_subscriptions_event_ordering.sql: an event is applied when
 * the row has no recorded event yet, or when it is not older than the last
 * one applied. Equal timestamps apply (same-second events: last write wins).
 */
export function shouldApply(stored: number | null | undefined, incoming: number): boolean {
  return stored == null || incoming >= stored;
}

/** Stripe unix seconds -> ISO timestamp; anything else -> null. */
export const unixToIso = (sec: unknown): string | null =>
  typeof sec === 'number' && Number.isFinite(sec) ? new Date(sec * 1000).toISOString() : null;

/** Stripe references arrive as ids or expanded objects; normalise to the id. */
export function idOf(v: unknown): string | null {
  if (typeof v === 'string') return v || null;
  if (v && typeof v === 'object') {
    const id = (v as { id?: unknown }).id;
    if (typeof id === 'string' && id) return id;
  }
  return null;
}

/**
 * Patch passed to apply_stripe_subscription(). A null field means "leave the
 * stored value unchanged" — invoice events only know the status, and an
 * unknown price must not silently downgrade a paying user to free.
 */
export interface SubscriptionPatch {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: string | null;
  cycle: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

export const EMPTY_PATCH: SubscriptionPatch = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan_id: null,
  cycle: null,
  status: null,
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: null,
};

/** Reduce a customer.subscription.{created,updated,deleted,...} object to a row patch. */
export function reduceSubscriptionEvent(
  eventType: string,
  sub: Record<string, unknown>,
  planByPrice: Record<string, PlanCycle>,
): SubscriptionPatch {
  const deleted = eventType === 'customer.subscription.deleted';
  const items = (sub.items as { data?: Array<{ price?: { id?: unknown } }> } | undefined)?.data ?? [];
  const priceId = idOf(items[0]?.price);
  const pc = priceId ? planByPrice[priceId] : undefined;
  return {
    stripe_customer_id: idOf(sub.customer),
    stripe_subscription_id: idOf(sub.id),
    plan_id: deleted ? 'free' : (pc?.plan ?? null),
    cycle: pc?.cycle ?? null,
    status: deleted ? 'canceled' : (typeof sub.status === 'string' && sub.status ? sub.status : null),
    current_period_start: unixToIso(sub.current_period_start),
    current_period_end: unixToIso(sub.current_period_end),
    cancel_at_period_end: typeof sub.cancel_at_period_end === 'boolean' ? sub.cancel_at_period_end : null,
  };
}

/** The subscription an invoice bills, across Stripe API versions (top-level
 *  `subscription` before 2025-03, `parent.subscription_details` after). */
export function invoiceSubscriptionId(inv: Record<string, unknown>): string | null {
  const parent = inv.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  return idOf(inv.subscription) ?? idOf(parent?.subscription_details?.subscription);
}

/** metadata.user_id for an invoice: subscription_details.metadata (old API)
 *  or parent.subscription_details.metadata (new API). */
export function invoiceMetadataUserId(inv: Record<string, unknown>): unknown {
  const sd = inv.subscription_details as { metadata?: { user_id?: unknown } } | undefined;
  const parent = inv.parent as { subscription_details?: { metadata?: { user_id?: unknown } } } | undefined;
  return sd?.metadata?.user_id ?? parent?.subscription_details?.metadata?.user_id;
}

/** Billing period covered by an invoice, from its first subscription line item. */
export function invoicePeriod(inv: Record<string, unknown>): { start: string | null; end: string | null } {
  const lines = (inv.lines as { data?: Array<{ period?: { start?: unknown; end?: unknown } }> } | undefined)?.data ?? [];
  const p = lines[0]?.period;
  return { start: unixToIso(p?.start), end: unixToIso(p?.end) };
}

/**
 * Reduce invoice.paid / invoice.payment_failed to a row patch. Only the status
 * (and, for a paid invoice, the period it covers) is known here; plan and
 * cycle are left untouched (null) so a dunning event cannot change the plan.
 */
export function reduceInvoiceEvent(eventType: string, inv: Record<string, unknown>): SubscriptionPatch {
  const paid = eventType === 'invoice.paid';
  const period = paid ? invoicePeriod(inv) : { start: null, end: null };
  return {
    ...EMPTY_PATCH,
    stripe_customer_id: idOf(inv.customer),
    stripe_subscription_id: invoiceSubscriptionId(inv),
    status: paid ? 'active' : 'past_due',
    current_period_start: period.start,
    current_period_end: period.end,
  };
}

/** Event types that carry a subscription object and mutate the row. */
export const SUBSCRIPTION_STATE_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
]);
