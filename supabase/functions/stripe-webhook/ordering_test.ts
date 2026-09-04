import { assertEquals } from 'jsr:@std/assert';
import {
  SUBSCRIPTION_STATE_EVENTS, idOf, invoiceMetadataUserId, invoicePeriod, invoiceSubscriptionId,
  planByPriceMap, reduceInvoiceEvent, reduceSubscriptionEvent, shouldApply, unixToIso,
} from './ordering.ts';

const ISO_START = new Date(1_756_000_000 * 1000).toISOString();
const ISO_END = new Date(1_758_000_000 * 1000).toISOString();
const PLANS = planByPriceMap({ 'pro:monthly': 'price_pm', 'pro:yearly': 'price_py', 'elite:monthly': 'price_em' });

Deno.test('planByPriceMap inverts plan:cycle -> price', () => {
  assertEquals(PLANS.price_pm, { plan: 'pro', cycle: 'monthly' });
  assertEquals(PLANS.price_em, { plan: 'elite', cycle: 'monthly' });
  assertEquals(planByPriceMap({ bad: 'price_x', 'pro:monthly': '' }), {});
});

Deno.test('shouldApply: newer or equal events apply, older ones do not', () => {
  assertEquals(shouldApply(null, 100), true);
  assertEquals(shouldApply(undefined, 100), true);
  assertEquals(shouldApply(100, 100), true);
  assertEquals(shouldApply(100, 101), true);
  assertEquals(shouldApply(100, 99), false);
});

Deno.test('unixToIso / idOf normalise Stripe values', () => {
  assertEquals(unixToIso(1_756_000_000), new Date(1_756_000_000 * 1000).toISOString());
  assertEquals(unixToIso('x'), null);
  assertEquals(unixToIso(null), null);
  assertEquals(idOf('cus_1'), 'cus_1');
  assertEquals(idOf({ id: 'cus_2' }), 'cus_2');
  assertEquals(idOf(''), null);
  assertEquals(idOf(undefined), null);
});

Deno.test('reduceSubscriptionEvent: updated event maps price -> plan and copies dates', () => {
  const p = reduceSubscriptionEvent('customer.subscription.updated', {
    id: 'sub_1', customer: 'cus_1', status: 'active',
    items: { data: [{ price: { id: 'price_py' } }] },
    current_period_start: 1_756_000_000, current_period_end: 1_758_000_000, cancel_at_period_end: true,
  }, PLANS);
  assertEquals(p, {
    stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', plan_id: 'pro', cycle: 'yearly', status: 'active',
    current_period_start: ISO_START, current_period_end: ISO_END,
    cancel_at_period_end: true,
  });
});

Deno.test('reduceSubscriptionEvent: unknown price leaves plan/cycle null (no silent downgrade)', () => {
  const p = reduceSubscriptionEvent('customer.subscription.updated', {
    id: 'sub_1', customer: { id: 'cus_1' }, status: 'past_due', items: { data: [{ price: { id: 'price_unknown' } }] },
  }, PLANS);
  assertEquals(p.plan_id, null);
  assertEquals(p.cycle, null);
  assertEquals(p.status, 'past_due');
  assertEquals(p.stripe_customer_id, 'cus_1');
  assertEquals(p.cancel_at_period_end, null);
});

Deno.test('reduceSubscriptionEvent: deleted -> free/canceled regardless of price', () => {
  const p = reduceSubscriptionEvent('customer.subscription.deleted', {
    id: 'sub_1', customer: 'cus_1', status: 'active', items: { data: [{ price: { id: 'price_pm' } }] },
  }, PLANS);
  assertEquals(p.plan_id, 'free');
  assertEquals(p.status, 'canceled');
});

Deno.test('SUBSCRIPTION_STATE_EVENTS excludes trial_will_end', () => {
  assertEquals(SUBSCRIPTION_STATE_EVENTS.has('customer.subscription.updated'), true);
  assertEquals(SUBSCRIPTION_STATE_EVENTS.has('customer.subscription.trial_will_end'), false);
});

const invoiceOld = {
  customer: 'cus_1', subscription: 'sub_1',
  subscription_details: { metadata: { user_id: 'u-old' } },
  lines: { data: [{ period: { start: 1_756_000_000, end: 1_758_000_000 } }] },
};
const invoiceNew = {
  customer: { id: 'cus_2' },
  parent: { subscription_details: { subscription: 'sub_2', metadata: { user_id: 'u-new' } } },
  lines: { data: [] },
};

Deno.test('invoice helpers read both the pre- and post-2025 invoice shapes', () => {
  assertEquals(invoiceSubscriptionId(invoiceOld), 'sub_1');
  assertEquals(invoiceSubscriptionId(invoiceNew), 'sub_2');
  assertEquals(invoiceSubscriptionId({}), null);
  assertEquals(invoiceMetadataUserId(invoiceOld), 'u-old');
  assertEquals(invoiceMetadataUserId(invoiceNew), 'u-new');
  assertEquals(invoicePeriod(invoiceOld), { start: ISO_START, end: ISO_END });
  assertEquals(invoicePeriod(invoiceNew), { start: null, end: null });
});

Deno.test('reduceInvoiceEvent: paid -> active + period; failed -> past_due, plan untouched', () => {
  const paid = reduceInvoiceEvent('invoice.paid', invoiceOld);
  assertEquals(paid.status, 'active');
  assertEquals(paid.plan_id, null);
  assertEquals(paid.cycle, null);
  assertEquals(paid.stripe_subscription_id, 'sub_1');
  assertEquals(paid.current_period_end, ISO_END);

  const failed = reduceInvoiceEvent('invoice.payment_failed', invoiceOld);
  assertEquals(failed.status, 'past_due');
  assertEquals(failed.plan_id, null);
  assertEquals(failed.current_period_start, null);
  assertEquals(failed.current_period_end, null);
  assertEquals(failed.stripe_customer_id, 'cus_1');
});
