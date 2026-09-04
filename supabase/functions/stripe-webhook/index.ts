import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/auth.ts';
import { stripe, cryptoProvider } from '../_shared/stripe.ts';
import priceMap from '../../../config/stripe-prices.json' with { type: 'json' };
import { dedupeAction, isUniqueViolation, type EventRow } from './dedupe.ts';
import {
  EMPTY_PATCH, SUBSCRIPTION_STATE_EVENTS, idOf, invoiceMetadataUserId, planByPriceMap,
  reduceInvoiceEvent, reduceSubscriptionEvent, type SubscriptionPatch,
} from './ordering.ts';
import { resolveUserId, type CustomerLookup } from './resolveUser.ts';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const PLAN_BY_PRICE = planByPriceMap(priceMap as Record<string, string>);

interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

const jsonResp = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Outcome = { received: true; duplicate?: true; stale?: true; unresolved?: true; ignored?: true };

// stripe-webhook: the ONLY writer of `subscriptions`. Authenticates via the
// Stripe signature (no Supabase JWT — set verify_jwt=false in config.toml).
//
// Delivery guarantees handled here (see the two 202609011* migrations):
//   * at-least-once  -> stripe_events ledger (claim before work, mark after)
//   * unordered      -> apply_stripe_subscription() compare-and-set on event.created
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const sig = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  let event: StripeEvent;
  try {
    event = (await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider)) as never;
  } catch {
    return jsonResp({ error: 'bad_signature' }, 400);
  }
  if (typeof event.id !== 'string' || !event.id) return jsonResp({ error: 'bad_event' }, 400);
  const eventCreated = typeof event.created === 'number' ? Math.floor(event.created) : Math.floor(Date.now() / 1000);

  const svc = serviceClient();

  // ---- 1. claim the event (idempotency) -----------------------------------
  const claim = await svc.from('stripe_events').insert({ id: event.id, type: event.type });
  if (claim.error) {
    if (!isUniqueViolation(claim.error)) {
      console.error('stripe_events insert failed', claim.error);
      return jsonResp({ error: 'ledger_error' }, 500); // Stripe retries
    }
    const { data: existing } = await svc.from('stripe_events')
      .select('processed_at, created_at').eq('id', event.id).maybeSingle<EventRow>();
    const action = dedupeAction(existing);
    if (action === 'duplicate') return jsonResp({ received: true, duplicate: true }, 200);
    if (action === 'in_flight') return jsonResp({ error: 'in_flight', retry: true }, 409);
    if (action === 'retry') {
      // Re-claim a stale claim: compare-and-set on the old created_at so only
      // one of several concurrent retries wins.
      const { data: reclaimed } = await svc.from('stripe_events')
        .update({ created_at: new Date().toISOString() })
        .eq('id', event.id).is('processed_at', null).eq('created_at', existing!.created_at)
        .select('id');
      if (!reclaimed?.length) return jsonResp({ error: 'in_flight', retry: true }, 409);
    }
    // 'process': the row vanished (previous worker released it) — the insert
    // race is benign; fall through and process.
  }

  // ---- 2. handle ------------------------------------------------------------
  try {
    const outcome = await handle(event, eventCreated, svc);
    await svc.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id);
    return jsonResp(outcome, 200);
  } catch (e) {
    console.error('webhook handler error', event.type, event.id, e);
    // Release the claim so Stripe's next retry is accepted immediately.
    await svc.from('stripe_events').delete().eq('id', event.id).is('processed_at', null);
    return jsonResp({ error: 'handler_error' }, 500);
  }
});

type Svc = ReturnType<typeof serviceClient>;

async function handle(event: StripeEvent, eventCreated: number, svc: Svc): Promise<Outcome> {
  const obj = event.data.object;
  const lookup: CustomerLookup = async (customerId) => {
    const { data, error } = await svc.from('subscriptions')
      .select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    if (error) throw error;
    return (data?.user_id as string | undefined) ?? null;
  };
  const apply = async (userId: string | null, patch: SubscriptionPatch, why: string): Promise<Outcome> => {
    if (!userId) {
      console.warn('stripe-webhook: could not resolve user', { type: event.type, id: event.id, customer: patch.stripe_customer_id, why });
      return { received: true, unresolved: true };
    }
    const { data, error } = await svc.rpc('apply_stripe_subscription', {
      p_user: userId,
      p_event_created: eventCreated,
      p_stripe_customer_id: patch.stripe_customer_id,
      p_stripe_subscription_id: patch.stripe_subscription_id,
      p_plan_id: patch.plan_id,
      p_cycle: patch.cycle,
      p_status: patch.status,
      p_current_period_start: patch.current_period_start,
      p_current_period_end: patch.current_period_end,
      p_cancel_at_period_end: patch.cancel_at_period_end,
    });
    if (error) throw error; // -> 500 so Stripe retries instead of silently dropping the update
    if (data === false) {
      console.warn('stripe-webhook: stale event ignored', { type: event.type, id: event.id, created: eventCreated });
      return { received: true, stale: true };
    }
    return { received: true };
  };

  if (event.type === 'checkout.session.completed') {
    const meta = (obj.metadata ?? {}) as Record<string, unknown>;
    const userId = await resolveUserId(
      { clientReferenceId: obj.client_reference_id, metadataUserId: meta.user_id, customerId: obj.customer },
      lookup,
    );
    const subId = idOf(obj.subscription);
    let patch: SubscriptionPatch = {
      ...EMPTY_PATCH,
      stripe_customer_id: idOf(obj.customer),
      stripe_subscription_id: subId,
      plan_id: typeof meta.plan_id === 'string' ? meta.plan_id : null,
      cycle: typeof meta.cycle === 'string' ? meta.cycle : null,
      status: 'active',
    };
    if (subId) {
      // The session carries no period dates: fetch the subscription so the
      // row is complete even if customer.subscription.created arrives later.
      const sub = await retrieveSubscription(subId);
      if (sub) {
        const fromSub = reduceSubscriptionEvent('checkout.session.completed', sub, PLAN_BY_PRICE);
        patch = {
          ...patch,
          plan_id: fromSub.plan_id ?? patch.plan_id,
          cycle: fromSub.cycle ?? patch.cycle,
          status: fromSub.status ?? patch.status,
          current_period_start: fromSub.current_period_start,
          current_period_end: fromSub.current_period_end,
          cancel_at_period_end: fromSub.cancel_at_period_end,
        };
      }
    }
    return apply(userId, patch, 'checkout');
  }

  if (event.type === 'customer.subscription.trial_will_end') {
    console.log('stripe-webhook: trial ending soon', { subscription: idOf(obj.id), customer: idOf(obj.customer), trial_end: obj.trial_end });
    return { received: true };
  }

  if (SUBSCRIPTION_STATE_EVENTS.has(event.type)) {
    const meta = (obj.metadata ?? {}) as Record<string, unknown>;
    const userId = await resolveUserId({ metadataUserId: meta.user_id, customerId: obj.customer }, lookup);
    return apply(userId, reduceSubscriptionEvent(event.type, obj, PLAN_BY_PRICE), 'subscription');
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    let patch = reduceInvoiceEvent(event.type, obj);
    if (!patch.stripe_subscription_id) return { received: true, ignored: true }; // one-off invoice, not a subscription
    if (event.type === 'invoice.paid' && (!patch.current_period_start || !patch.current_period_end)) {
      const sub = await retrieveSubscription(patch.stripe_subscription_id);
      if (sub) {
        const fromSub = reduceSubscriptionEvent('invoice.paid', sub, PLAN_BY_PRICE);
        patch = { ...patch, current_period_start: fromSub.current_period_start, current_period_end: fromSub.current_period_end };
      }
    }
    const userId = await resolveUserId({ metadataUserId: invoiceMetadataUserId(obj), customerId: obj.customer }, lookup);
    return apply(userId, patch, 'invoice');
  }

  return { received: true, ignored: true };
}

/** Fetch a subscription; a Stripe outage must not 500 (Stripe would retry the
 *  whole event) — the later customer.subscription.* event fills the gaps. */
async function retrieveSubscription(id: string): Promise<Record<string, unknown> | null> {
  try {
    return (await stripe.subscriptions.retrieve(id)) as unknown as Record<string, unknown>;
  } catch (e) {
    console.warn('stripe-webhook: subscriptions.retrieve failed', id, e);
    return null;
  }
}
