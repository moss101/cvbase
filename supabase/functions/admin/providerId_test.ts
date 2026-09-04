import { assertEquals } from 'jsr:@std/assert';
import { isProviderId, PROVIDER_IDS } from './providerId.ts';

Deno.test('isProviderId accepts every listed provider', () => {
  for (const id of PROVIDER_IDS) assertEquals(isProviderId(id), true, id);
  assertEquals(isProviderId('custom'), true);
  assertEquals(isProviderId('anthropic'), true);
});

Deno.test('isProviderId rejects anything outside the union', () => {
  assertEquals(isProviderId('gemini'), false);
  assertEquals(isProviderId('OpenAI'), false); // case matters — it is a DB key
  assertEquals(isProviderId(' openai'), false); // callers trim before checking
  assertEquals(isProviderId(''), false);
  assertEquals(isProviderId(null), false);
  assertEquals(isProviderId(undefined), false);
  assertEquals(isProviderId(42), false);
  assertEquals(isProviderId(['openai']), false);
  assertEquals(isProviderId({ toString: () => 'openai' }), false);
});
