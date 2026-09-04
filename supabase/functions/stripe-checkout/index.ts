import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { stripe } from '../_shared/stripe.ts';
import priceMap from '../../../config/stripe-prices.json' with { type: 'json' };
import {
  automaticTaxEnabled, checkoutIdempotencyKey, customerIdempotencyKey, customerSearchQuery, taxSessionParams,
} from './checkout.ts';

const APP_URL = Deno.env.get('APP_URL') ?? 'http://127.0.0.1:3000';
const AUTOMATIC_TAX = automaticTaxEnabled(Deno.env);

// stripe-checkout: create a Checkout Session for a plan+cycle. The subscription
// is only recorded once the webhook confirms it — this just starts the flow.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));
    const planId = String(body?.planId ?? '');
    const cycle = String(body?.cycle ?? '');
    if (!['pro', 'elite'].includes(planId) || !['monthly', 'yearly'].includes(cycle)) {
      throw new HttpError(400, 'bad_plan');
    }
    const price = (priceMap as Record<string, string>)[`${planId}:${cycle}`];
    if (!price) throw new HttpError(500, 'price_not_configured');

    const customer = await ensureCustomer(user.id, user.email ?? undefined);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_id: planId, cycle },
      subscription_data: { metadata: { user_id: user.id, plan_id: planId, cycle } },
      allow_promotion_codes: true,
      ...taxSessionParams(AUTOMATIC_TAX),
      success_url: `${APP_URL}/?billing=success`,
      cancel_url: `${APP_URL}/?billing=cancel`,
    }, { idempotencyKey: checkoutIdempotencyKey(user.id, planId, cycle) });
    return ok({ url: session.url });
  } catch (err) {
    return fail(err);
  }
});

/**
 * Find or create the user's Stripe customer, safely under concurrent requests:
 *   1. the id already stored on `subscriptions`;
 *   2. a Stripe customer stamped with metadata.user_id (created by an earlier
 *      request whose DB write never landed);
 *   3. create one with a per-user idempotency key, so two parallel creates
 *      return the same customer;
 * then record it without clobbering a row (or a customer id) that exists.
 */
async function ensureCustomer(userId: string, email: string | undefined): Promise<string> {
  const svc = serviceClient();
  const { data: sub } = await svc.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (sub?.stripe_customer_id) return sub.stripe_customer_id as string;

  let customer: string | undefined;
  try {
    const found = await stripe.customers.search({ query: customerSearchQuery(userId), limit: 1 });
    customer = found.data[0]?.id;
  } catch (e) {
    console.warn('stripe-checkout: customers.search failed, creating', e);
  }
  if (!customer) {
    const c = await stripe.customers.create(
      { email, metadata: { user_id: userId } },
      { idempotencyKey: customerIdempotencyKey(userId) },
    );
    customer = c.id;
  }

  // Insert a free/incomplete row only if none exists (ON CONFLICT DO NOTHING) …
  await svc.from('subscriptions').upsert(
    { user_id: userId, stripe_customer_id: customer, plan_id: 'free', status: 'incomplete' },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
  // … then fill in the customer id on an existing row that lacks one.
  await svc.from('subscriptions').update({ stripe_customer_id: customer })
    .eq('user_id', userId).is('stripe_customer_id', null);
  // A concurrent request may have stored a different id first: use the stored one.
  const { data: stored } = await svc.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  return (stored?.stripe_customer_id as string | undefined) ?? customer;
}
