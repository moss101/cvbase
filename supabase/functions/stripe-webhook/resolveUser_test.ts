import { assertEquals } from 'jsr:@std/assert';
import { asUuid, resolveUserId } from './resolveUser.ts';

const U = '6f4c2a1e-9b3d-4c5e-8f7a-1b2c3d4e5f60';

Deno.test('asUuid accepts only well-formed uuids, lower-cased', () => {
  assertEquals(asUuid(U.toUpperCase()), U);
  assertEquals(asUuid('not-a-uuid'), null);
  assertEquals(asUuid(42), null);
  assertEquals(asUuid(undefined), null);
});

Deno.test('resolveUserId prefers client_reference_id, then metadata, without hitting the lookup', async () => {
  let calls = 0;
  const lookup = () => { calls++; return Promise.resolve(null); };
  assertEquals(await resolveUserId({ clientReferenceId: U, metadataUserId: 'x', customerId: 'cus_1' }, lookup), U);
  assertEquals(await resolveUserId({ metadataUserId: U, customerId: 'cus_1' }, lookup), U);
  assertEquals(calls, 0);
});

Deno.test('resolveUserId falls back to the customer lookup when metadata is missing or garbage', async () => {
  const seen: string[] = [];
  const lookup = (id: string) => { seen.push(id); return Promise.resolve(id === 'cus_known' ? U : null); };
  assertEquals(await resolveUserId({ customerId: 'cus_known' }, lookup), U);
  assertEquals(await resolveUserId({ metadataUserId: 'garbage', customerId: { id: 'cus_known' } }, lookup), U);
  assertEquals(await resolveUserId({ customerId: 'cus_unknown' }, lookup), null);
  assertEquals(seen, ['cus_known', 'cus_known', 'cus_unknown']);
});

Deno.test('resolveUserId returns null (no lookup) when there is no customer at all', async () => {
  let calls = 0;
  const lookup = () => { calls++; return Promise.resolve(U); };
  assertEquals(await resolveUserId({}, lookup), null);
  assertEquals(await resolveUserId({ customerId: '' }, lookup), null);
  assertEquals(calls, 0);
});

Deno.test('resolveUserId rejects a non-uuid value returned by the lookup', async () => {
  assertEquals(await resolveUserId({ customerId: 'cus_1' }, () => Promise.resolve('bogus')), null);
});
