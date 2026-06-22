import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { stripe } from '../_shared/stripe.ts';

const APP_URL = Deno.env.get('APP_URL') ?? 'http://127.0.0.1:3000';

// stripe-portal: open the Stripe Customer Portal (invoices, payment methods,
// plan changes, cancellation).
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const svc = serviceClient();
    const { data: sub } = await svc.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    const customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) throw new HttpError(400, 'no_customer');

    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${APP_URL}/?view=billing`,
    });
    return ok({ url: session.url });
  } catch (err) {
    return fail(err);
  }
});
