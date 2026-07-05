import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { callWithKeyPool, _resetKeyPoolStateForTests } from './keyPool.ts';
import { ProviderError } from './errors.ts';
import type { ProviderCall, ProviderCallOpts } from './types.ts';

const CFG = { retriesPerKey: 2, rateLimitCooldownMs: 15_000, badKeyCooldownMs: 600_000 };

function makeCallOpts(apiKey: string): ProviderCallOpts {
  return { apiKey, model: 'test-model', messages: [{ role: 'user', content: 'hi' }], timeoutMs: 1000 };
}

Deno.test('callWithKeyPool: a 429 on one key rotates to the next key instead of retrying the same one', async () => {
  _resetKeyPoolStateForTests();
  const attempts: string[] = [];
  const call: ProviderCall = (opts) => {
    attempts.push(opts.apiKey);
    if (opts.apiKey === 'key0') throw new ProviderError('deepseek', 'rate_limit', 429);
    return Promise.resolve({ content: 'ok from key1', promptTokens: 5, completionTokens: 5 });
  };
  const { result, keySlot } = await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(keySlot, 1);
  assertEquals(result.content, 'ok from key1');
  // key0 was tried exactly once — a rate_limit rotates immediately, no
  // same-key retry (retrying a 429 within the same call wastes the retry
  // budget on an error that won't clear that fast).
  assertEquals(attempts.filter((k) => k === 'key0').length, 1);
});

Deno.test('callWithKeyPool: a transient error retries the SAME key up to retriesPerKey before rotating', async () => {
  _resetKeyPoolStateForTests();
  const attempts: string[] = [];
  let key0Calls = 0;
  const call: ProviderCall = (opts) => {
    attempts.push(opts.apiKey);
    if (opts.apiKey === 'key0') {
      key0Calls++;
      throw new ProviderError('deepseek', 'transient', 503);
    }
    return Promise.resolve({ content: 'ok from key1', promptTokens: 1, completionTokens: 1 });
  };
  const { keySlot } = await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(keySlot, 1);
  assertEquals(key0Calls, CFG.retriesPerKey, 'key0 exhausted its bounded retry budget before rotating');
});

Deno.test('callWithKeyPool: auth/balance errors rotate immediately, no same-key retry', async () => {
  _resetKeyPoolStateForTests();
  let key0Calls = 0;
  const call: ProviderCall = (opts) => {
    if (opts.apiKey === 'key0') {
      key0Calls++;
      throw new ProviderError('deepseek', 'auth', 401);
    }
    return Promise.resolve({ content: 'ok', promptTokens: 1, completionTokens: 1 });
  };
  const { keySlot } = await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(keySlot, 1);
  assertEquals(key0Calls, 1);
});

Deno.test('callWithKeyPool: every key failing throws a ProviderError (pool exhaustion)', async () => {
  _resetKeyPoolStateForTests();
  const call: ProviderCall = () => {
    throw new ProviderError('deepseek', 'rate_limit', 429);
  };
  await assertRejects(
    () => callWithKeyPool('deepseek', ['key0', 'key1', 'key2'], makeCallOpts, call, CFG),
    ProviderError,
  );
});

Deno.test('callWithKeyPool: no keys configured throws an auth-kind ProviderError', async () => {
  _resetKeyPoolStateForTests();
  const call: ProviderCall = () => Promise.resolve({ content: 'unreachable', promptTokens: 0, completionTokens: 0 });
  const err = await assertRejects(
    () => callWithKeyPool('deepseek', [], makeCallOpts, call, CFG),
    ProviderError,
  ) as ProviderError;
  assertEquals(err.kind, 'auth');
});
