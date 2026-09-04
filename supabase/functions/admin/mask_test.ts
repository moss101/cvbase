import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { maskKey, maskProviderRow } from './mask.ts';

Deno.test('maskKey hides the middle of a key and all of a short one', () => {
  assertEquals(maskKey('sk-proj-SUPERSECRETMIDDLE-1f9c'), 'sk-p••••1f9c');
  assertEquals(maskKey('sk-12345'), '••••');
  assertEquals(maskKey(''), '••••');
  assertEquals(maskKey('x'.repeat(200)).replace(/•/g, '').length, 8);
});

Deno.test('maskProviderRow strips api_keys and returns count + previews', () => {
  const out = maskProviderRow({
    id: '1',
    provider_id: 'openai',
    api_keys: ['sk-aaaaaaaaaaaa1111', 'sk-bbbbbbbbbbbb2222', 42, null],
  });
  assertEquals('api_keys' in out, false);
  assertEquals(out.key_count, 2);
  assertEquals(out.key_previews, ['sk-a••••1111', 'sk-b••••2222']);
  assertEquals(out.provider_id, 'openai');
  assertStringIncludes(JSON.stringify(out), '"key_count":2');
});

Deno.test('maskProviderRow treats a missing or malformed api_keys as no keys', () => {
  assertEquals(maskProviderRow({ provider_id: 'kimi' } as { provider_id: string; api_keys?: unknown }).key_count, 0);
  assertEquals(maskProviderRow({ provider_id: 'kimi', api_keys: 'sk-not-an-array' }).key_count, 0);
  assertEquals(maskProviderRow({ provider_id: 'kimi', api_keys: null }).key_previews, []);
});
