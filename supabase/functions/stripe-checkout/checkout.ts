// Pure helpers for stripe-checkout (no I/O; unit-tested).

/**
 * Idempotency key for checkout.sessions.create: a double-click or a retried
 * request within the same minute returns the same session instead of creating
 * a second one.
 */
export function checkoutIdempotencyKey(userId: string, planId: string, cycle: string, now: number = Date.now()): string {
  const minuteBucket = Math.floor(now / 60_000);
  return `${userId}:${planId}:${cycle}:${minuteBucket}`;
}

/** Idempotency key for customers.create: concurrent first checkouts for one
 *  user collapse to a single Stripe customer. */
export const customerIdempotencyKey = (userId: string) => `customer:${userId}`;

/** Stripe search query that finds a customer we stamped with metadata.user_id. */
export function customerSearchQuery(userId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('bad_user_id');
  return `metadata['user_id']:'${userId}'`;
}

/** Automatic tax is opt-in: STRIPE_AUTOMATIC_TAX=1 (Stripe Tax must be enabled
 *  on the account first, or session creation fails). */
export function automaticTaxEnabled(env: { get(k: string): string | undefined }): boolean {
  return (env.get('STRIPE_AUTOMATIC_TAX') ?? '').trim() === '1';
}

/** Session params that depend on the automatic-tax flag. */
export function taxSessionParams(enabled: boolean): {
  automatic_tax?: { enabled: true };
  customer_update?: { address: 'auto' };
} {
  return enabled ? { automatic_tax: { enabled: true }, customer_update: { address: 'auto' } } : {};
}
