import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { stripe } from '../_shared/stripe.ts';
import priceMap from '../../../config/stripe-prices.json' with { type: 'json' };

const APP_URL = Deno.env.get('APP_URL') ?? 'http://127.0.0.1:3000';

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

    const svc = serviceClient();
    const { data: sub } = await svc.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    let customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) {
      const c = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      customer = c.id;
      await svc.from('subscriptions').upsert(
        { user_id: user.id, stripe_customer_id: customer, plan_id: 'free', status: 'incomplete' },
        { onConflict: 'user_id' },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_id: planId, cycle },
      subscription_data: { metadata: { user_id: user.id, plan_id: planId, cycle } },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/?billing=success`,
      cancel_url: `${APP_URL}/?billing=cancel`,
    });
    return ok({ url: session.url });
  } catch (err) {
    return fail(err);
  }
});
