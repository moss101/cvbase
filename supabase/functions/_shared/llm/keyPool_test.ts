import { assert, assertEquals, assertRejects } from 'jsr:@std/assert';
import {
  _resetKeyPoolStateForTests,
  backoffDelayMs,
  callWithKeyPool,
  initKeyHealth,
  MAX_BACKOFF_MS,
} from './keyPool.ts';
import { ProviderError } from './errors.ts';
import type { ProviderCall, ProviderCallOpts } from './types.ts';

// backoffBaseMs: 0 keeps the retry loop from sleeping — the jitter maths has
// its own tests below, the pool tests are about rotation/retry decisions.
const CFG = { retriesPerKey: 2, rateLimitCooldownMs: 15_000, badKeyCooldownMs: 600_000, backoffBaseMs: 0 };

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

Deno.test('callWithKeyPool: a transient error retries the SAME key retriesPerKey times (1 + retries attempts) before rotating', async () => {
  _resetKeyPoolStateForTests();
  let key0Calls = 0;
  const call: ProviderCall = (opts) => {
    if (opts.apiKey === 'key0') {
      key0Calls++;
      throw new ProviderError('deepseek', 'transient', 503);
    }
    return Promise.resolve({ content: 'ok from key1', promptTokens: 1, completionTokens: 1 });
  };
  const { keySlot } = await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(keySlot, 1);
  // retriesPerKey = retries AFTER the first attempt: 2 retries = 3 attempts.
  assertEquals(key0Calls, CFG.retriesPerKey + 1, 'key0 exhausted its bounded retry budget before rotating');
});

Deno.test('callWithKeyPool: retriesPerKey = 0 means exactly one attempt per key', async () => {
  _resetKeyPoolStateForTests();
  let calls = 0;
  const call: ProviderCall = () => {
    calls++;
    throw new ProviderError('deepseek', 'transient', 503);
  };
  await assertRejects(
    () => callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, { ...CFG, retriesPerKey: 0 }),
    ProviderError,
  );
  assertEquals(calls, 2);
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

// --- backoff -----------------------------------------------------------------

Deno.test('backoffDelayMs: exponential with ±50% jitter, capped, and 0 when the base is 0', () => {
  // rand() = 0 → 0.5x, rand() = 1 → 1.5x
  assertEquals(backoffDelayMs(0, 800, () => 0), 400);
  assertEquals(backoffDelayMs(0, 800, () => 1), 1200);
  assertEquals(backoffDelayMs(1, 800, () => 0.5), 1600);
  assertEquals(backoffDelayMs(2, 800, () => 0.5), 3200);
  assertEquals(backoffDelayMs(10, 800, () => 1), MAX_BACKOFF_MS);
  assertEquals(backoffDelayMs(3, 0), 0);
  for (let i = 0; i < 50; i++) {
    const d = backoffDelayMs(1, 800);
    assert(d >= 800 && d <= 2400, `jittered delay ${d} outside [800, 2400]`);
  }
});

// --- cross-isolate key health -------------------------------------------------

/** Minimal PostgREST-builder stand-in: `.from().select().gt()` resolves to
 *  the seeded rows, `.from().upsert()` records writes. */
function stubHealthClient(rows: unknown, opts: { fail?: boolean } = {}) {
  const upserts: Record<string, unknown>[] = [];
  const client = {
    from: (_table: string) => ({
      select: () => ({
        gt: () => opts.fail ? Promise.reject(new Error('relation does not exist')) : Promise.resolve({ data: rows, error: null }),
      }),
      upsert: (row: Record<string, unknown>) => {
        upserts.push(row);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  };
  return { client, upserts };
}

Deno.test('initKeyHealth: a persisted cooldown makes the pool skip that key on a cold start', async () => {
  _resetKeyPoolStateForTests();
  const { client } = stubHealthClient([
    { provider_id: 'deepseek', key_index: 0, cooldown_until: new Date(Date.now() + 60_000).toISOString() },
  ]);
  await initKeyHealth(client);
  const attempts: string[] = [];
  const call: ProviderCall = (opts) => {
    attempts.push(opts.apiKey);
    return Promise.resolve({ content: 'ok', promptTokens: 1, completionTokens: 1 });
  };
  const { keySlot } = await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(keySlot, 1);
  assertEquals(attempts, ['key1']);
});

Deno.test('initKeyHealth: a cooldown set in this isolate is written back to llm_key_health', async () => {
  _resetKeyPoolStateForTests();
  const { client, upserts } = stubHealthClient([]);
  await initKeyHealth(client);
  const call: ProviderCall = (opts) => {
    if (opts.apiKey === 'key0') throw new ProviderError('deepseek', 'auth', 401);
    return Promise.resolve({ content: 'ok', promptTokens: 1, completionTokens: 1 });
  };
  await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(upserts.length, 1);
  assertEquals(upserts[0].provider_id, 'deepseek');
  assertEquals(upserts[0].key_index, 0);
  assertEquals(upserts[0].reason, 'auth');
});

Deno.test('initKeyHealth: a missing table (read failure) is harmless and the pool starts cold', async () => {
  _resetKeyPoolStateForTests();
  const { client } = stubHealthClient(null, { fail: true });
  await initKeyHealth(client); // must not reject
  const call: ProviderCall = () => Promise.resolve({ content: 'ok', promptTokens: 1, completionTokens: 1 });
  const { keySlot } = await callWithKeyPool('deepseek', ['key0', 'key1'], makeCallOpts, call, CFG);
  assertEquals(keySlot, 0);
});
