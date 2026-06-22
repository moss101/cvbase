import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/auth.ts';
import { stripe, cryptoProvider } from '../_shared/stripe.ts';
import priceMap from '../../../config/stripe-prices.json' with { type: 'json' };

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

// Reverse map price id -> {plan, cycle} so subscription events resolve the plan.
const PLAN_BY_PRICE: Record<string, { plan: string; cycle: string }> = {};
for (const [k, v] of Object.entries(priceMap as Record<string, string>)) {
  const [plan, cycle] = k.split(':');
  PLAN_BY_PRICE[v] = { plan, cycle };
}

const iso = (sec: unknown) => (typeof sec === 'number' ? new Date(sec * 1000).toISOString() : null);
const jsonResp = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// stripe-webhook: the ONLY writer of `subscriptions`. Authenticates via the
// Stripe signature (no Supabase JWT — set verify_jwt=false in config.toml).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const sig = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = (await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider)) as never;
  } catch {
    return jsonResp({ error: 'bad_signature' }, 400);
  }

  const svc = serviceClient();
  const upsert = (row: Record<string, unknown>) => svc.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Record<string, any>;
      const userId = s.client_reference_id || s.metadata?.user_id;
      if (userId) {
        await upsert({
          user_id: userId, stripe_customer_id: s.customer, stripe_subscription_id: s.subscription,
          plan_id: s.metadata?.plan_id ?? 'free', cycle: s.metadata?.cycle ?? 'monthly', status: 'active',
        });
      }
    } else if (event.type.startsWith('customer.subscription.')) {
      const sub = event.data.object as Record<string, any>;
      const userId = sub.metadata?.user_id;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const pc = priceId ? PLAN_BY_PRICE[priceId] : undefined;
      const deleted = event.type === 'customer.subscription.deleted';
      if (userId) {
        await upsert({
          user_id: userId, stripe_customer_id: sub.customer, stripe_subscription_id: sub.id,
          plan_id: deleted ? 'free' : (pc?.plan ?? 'free'),
          cycle: pc?.cycle ?? 'monthly',
          status: deleted ? 'canceled' : sub.status,
          current_period_start: iso(sub.current_period_start),
          current_period_end: iso(sub.current_period_end),
          cancel_at_period_end: !!sub.cancel_at_period_end,
        });
      }
    }
    return jsonResp({ received: true }, 200);
  } catch (e) {
    console.error('webhook handler error', e);
    return jsonResp({ error: 'handler_error' }, 500);
  }
});
