// Pure user resolution for stripe-webhook: which CVBase user does a Stripe
// object belong to? Prefers the ids we stamped at checkout, then falls back to
// the stored stripe_customer_id (injected lookup so this stays testable).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserHints {
  /** checkout.session.client_reference_id */
  clientReferenceId?: unknown;
  /** metadata.user_id (session, subscription, or invoice.subscription_details) */
  metadataUserId?: unknown;
  /** Stripe customer id or expanded customer object */
  customerId?: unknown;
}

/** Looks up `subscriptions.user_id` by `stripe_customer_id`; null when unknown. */
export type CustomerLookup = (customerId: string) => Promise<string | null>;

/** Only accept well-formed uuids: subscriptions.user_id is a uuid FK, and a
 *  garbage value would 500 forever on every retry instead of falling back. */
export function asUuid(v: unknown): string | null {
  return typeof v === 'string' && UUID_RE.test(v) ? v.toLowerCase() : null;
}

function customerIdOf(v: unknown): string | null {
  if (typeof v === 'string') return v || null;
  if (v && typeof v === 'object') {
    const id = (v as { id?: unknown }).id;
    if (typeof id === 'string' && id) return id;
  }
  return null;
}

/**
 * Resolve the user id, in order: client_reference_id, metadata.user_id, then
 * the customer id via `lookup`. The lookup is only invoked when needed.
 */
export async function resolveUserId(hints: UserHints, lookup: CustomerLookup): Promise<string | null> {
  const direct = asUuid(hints.clientReferenceId) ?? asUuid(hints.metadataUserId);
  if (direct) return direct;
  const customer = customerIdOf(hints.customerId);
  if (!customer) return null;
  return asUuid(await lookup(customer));
}
