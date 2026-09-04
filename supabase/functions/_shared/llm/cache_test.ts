import { assertEquals, assertMatch, assertNotEquals } from 'jsr:@std/assert';
import { buildCacheKey } from './cache.ts';

const base = {
  provider: 'deepseek', model: 'deepseek-v4-pro', system: 'sys', prompt: 'hello',
  schemaName: 'return_result', schema: { type: 'object', properties: { a: { type: 'string' } } },
};

Deno.test('buildCacheKey: deterministic sha256 hex', async () => {
  const a = await buildCacheKey(base);
  const b = await buildCacheKey({ ...base });
  assertEquals(a, b);
  assertMatch(a, /^[0-9a-f]{64}$/);
});

Deno.test('buildCacheKey: model, prompt and schema changes all produce a different key', async () => {
  const k = await buildCacheKey(base);
  assertNotEquals(k, await buildCacheKey({ ...base, model: 'deepseek-v4-flash' }));
  assertNotEquals(k, await buildCacheKey({ ...base, prompt: 'hello!' }));
  assertNotEquals(k, await buildCacheKey({ ...base, schema: { type: 'object', properties: { b: { type: 'string' } } } }));
  assertNotEquals(k, await buildCacheKey({ ...base, schemaName: '', schema: undefined }));
});

Deno.test('buildCacheKey: length-prefixed parts cannot collide across field boundaries', async () => {
  const a = await buildCacheKey({ ...base, system: 'ab', prompt: 'c' });
  const b = await buildCacheKey({ ...base, system: 'a', prompt: 'bc' });
  assertNotEquals(a, b);
});
