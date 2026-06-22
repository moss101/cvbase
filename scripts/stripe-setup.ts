/**
 * One-off: create Stripe TEST-mode products/prices from the plan catalog and
 * write the plan+cycle -> price-id map to config/stripe-prices.json.
 *
 *   STRIPE_SECRET_KEY=sk_test_… npx tsx scripts/stripe-setup.ts
 *
 * Refuses to run against a live key. Yearly amounts are the "billed yearly"
 * monthly rate * 12 (Pro $8/mo -> $96/yr; Elite $16/mo -> $192/yr).
 */
import Stripe from 'stripe';
import { writeFileSync } from 'node:fs';

const SK = process.env.STRIPE_SECRET_KEY ?? '';
if (!SK.startsWith('sk_test')) {
  console.error('Refusing to run: STRIPE_SECRET_KEY must be a TEST key (sk_test_…).');
  process.exit(1);
}
const stripe = new Stripe(SK);

const CATALOG = [
  { plan: 'pro', name: 'CVBase Pro', monthly: 1200, yearly: 9600 },
  { plan: 'elite', name: 'CVBase Elite', monthly: 2400, yearly: 19200 },
];

async function main() {
  const map: Record<string, string> = {};
  for (const item of CATALOG) {
    const product = await stripe.products.create({ name: item.name, metadata: { plan: item.plan } });
    const monthly = await stripe.prices.create({
      product: product.id, currency: 'usd', unit_amount: item.monthly,
      recurring: { interval: 'month' }, metadata: { plan: item.plan, cycle: 'monthly' },
    });
    const yearly = await stripe.prices.create({
      product: product.id, currency: 'usd', unit_amount: item.yearly,
      recurring: { interval: 'year' }, metadata: { plan: item.plan, cycle: 'yearly' },
    });
    map[`${item.plan}:monthly`] = monthly.id;
    map[`${item.plan}:yearly`] = yearly.id;
  }
  writeFileSync('config/stripe-prices.json', JSON.stringify(map, null, 2) + '\n');
  console.log('Wrote config/stripe-prices.json:', map);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
