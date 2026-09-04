import { assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  automaticTaxEnabled, checkoutIdempotencyKey, customerIdempotencyKey, customerSearchQuery, taxSessionParams,
} from './checkout.ts';

const U = '6f4c2a1e-9b3d-4c5e-8f7a-1b2c3d4e5f60';

Deno.test('checkoutIdempotencyKey is stable within a minute and changes across minutes', () => {
  const t = Date.UTC(2026, 8, 1, 12, 30, 5);
  const bucket = Math.floor(t / 60_000);
  assertEquals(checkoutIdempotencyKey(U, 'pro', 'monthly', t), `${U}:pro:monthly:${bucket}`);
  assertEquals(checkoutIdempotencyKey(U, 'pro', 'monthly', t + 50_000), checkoutIdempotencyKey(U, 'pro', 'monthly', t));
  assertEquals(checkoutIdempotencyKey(U, 'pro', 'monthly', t + 60_000) === checkoutIdempotencyKey(U, 'pro', 'monthly', t), false);
  assertEquals(checkoutIdempotencyKey(U, 'pro', 'yearly', t) === checkoutIdempotencyKey(U, 'pro', 'monthly', t), false);
});

Deno.test('customerIdempotencyKey / customerSearchQuery are per user and reject junk ids', () => {
  assertEquals(customerIdempotencyKey(U), `customer:${U}`);
  assertEquals(customerSearchQuery(U), `metadata['user_id']:'${U}'`);
  assertThrows(() => customerSearchQuery("x' OR 1"), Error, 'bad_user_id');
});

Deno.test('automatic tax is opt-in via STRIPE_AUTOMATIC_TAX=1', () => {
  const env = (v?: string) => ({ get: () => v });
  assertEquals(automaticTaxEnabled(env(undefined)), false);
  assertEquals(automaticTaxEnabled(env('0')), false);
  assertEquals(automaticTaxEnabled(env('true')), false);
  assertEquals(automaticTaxEnabled(env(' 1 ')), true);
  assertEquals(taxSessionParams(false), {});
  assertEquals(taxSessionParams(true), { automatic_tax: { enabled: true }, customer_update: { address: 'auto' } });
});
