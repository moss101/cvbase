import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { routedCall } from './router.ts';
import { LlmAllProvidersFailedError } from './errors.ts';
import { _resetKeyPoolStateForTests } from './keyPool.ts';

const ENV_KEYS = [
  'LLM_PRIMARY_PROVIDER', 'LLM_FALLBACK_PROVIDER', 'DEEPSEEK_API_KEYS', 'KIMI_API_KEYS',
  'DEEPSEEK_MODEL_FULL', 'DEEPSEEK_MODEL_LITE', 'KIMI_MODEL',
  'LLM_TIMEOUT_MS', 'LLM_RETRIES_PER_KEY', 'LLM_RATE_LIMIT_COOLDOWN_MS', 'LLM_BAD_KEY_COOLDOWN_MS',
];

function setTestEnv(): void {
  Deno.env.set('LLM_PRIMARY_PROVIDER', 'deepseek');
  Deno.env.set('LLM_FALLBACK_PROVIDER', 'kimi');
  Deno.env.set('DEEPSEEK_API_KEYS', 'ds-key-0,ds-key-1');
  Deno.env.set('KIMI_API_KEYS', 'kimi-key-0');
  Deno.env.set('DEEPSEEK_MODEL_FULL', 'deepseek-v4-pro');
  Deno.env.set('DEEPSEEK_MODEL_LITE', 'deepseek-v4-flash');
  Deno.env.set('KIMI_MODEL', 'kimi-k2.6');
  Deno.env.set('LLM_TIMEOUT_MS', '1000');
  Deno.env.set('LLM_RETRIES_PER_KEY', '1'); // keep tests fast — no real backoff sleeps to wait out
  Deno.env.set('LLM_RATE_LIMIT_COOLDOWN_MS', '0');
  Deno.env.set('LLM_BAD_KEY_COOLDOWN_MS', '0');
}

function clearTestEnv(): void {
  for (const k of ENV_KEYS) Deno.env.delete(k);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function successBody(content: string) {
  return { choices: [{ message: { content } }], usage: { prompt_tokens: 3, completion_tokens: 2 } };
}

function toolCallBody(args: Record<string, unknown>) {
  return {
    choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify(args) } }] } }],
    usage: { prompt_tokens: 4, completion_tokens: 6 },
  };
}

/** Installs a fetch stub for the duration of one test and restores the real
 *  fetch afterward — no --allow-net needed since the real network is never
 *  reached, only the in-process global is swapped. */
async function withMockedFetch(
  impl: (url: string) => Response | Promise<Response>,
  run: () => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) => Promise.resolve(impl(String(input)))) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

Deno.test('routedCall: plain-text prompt (no schema) succeeds on primary, returns content', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    await withMockedFetch(
      () => jsonResponse(successBody('hello world')),
      async () => {
        const result = await routedCall({ prompt: 'hi' });
        assertEquals(result.content, 'hello world');
        assertEquals(result.provider, 'deepseek');
        assertEquals(result.usedFallback, false);
        assertEquals(result.tokens, 5);
      },
    );
  } finally {
    clearTestEnv();
  }
});

Deno.test('routedCall: a schema triggers a forced tool call and returns parsed structured data', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    await withMockedFetch(
      () => jsonResponse(toolCallBody({ matchScore: 88 })),
      async () => {
        const result = await routedCall({
          prompt: 'hi',
          schema: { type: 'OBJECT', properties: { matchScore: { type: 'INTEGER' } }, required: ['matchScore'] },
        });
        assertEquals(result.data, { matchScore: 88 });
        assertEquals(result.provider, 'deepseek');
      },
    );
  } finally {
    clearTestEnv();
  }
});

Deno.test('routedCall: full DeepSeek pool exhaustion (both keys rate-limited) falls back to Kimi', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    await withMockedFetch(
      (url) => url.includes('deepseek.com') ? jsonResponse({ error: 'rate limited' }, 429) : jsonResponse(successBody('kimi saved the day')),
      async () => {
        const result = await routedCall({ prompt: 'hi' });
        assertEquals(result.provider, 'kimi');
        assertEquals(result.usedFallback, true);
        assertEquals(result.fallbackReason, 'deepseek:rate_limit');
        assertEquals(result.content, 'kimi saved the day');
      },
    );
  } finally {
    clearTestEnv();
  }
});

Deno.test('routedCall: both DeepSeek and Kimi pools exhausted throws LlmAllProvidersFailedError, not a generic error', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    await withMockedFetch(
      () => jsonResponse({ error: 'down' }, 503),
      async () => {
        const err = await assertRejects(() => routedCall({ prompt: 'hi' }), LlmAllProvidersFailedError) as LlmAllProvidersFailedError;
        assertEquals(err.status, 503);
        assertEquals(err.code, 'llm_unavailable');
        assertEquals(err.primary.provider, 'deepseek');
        assertEquals(err.fallback.provider, 'kimi');
      },
    );
  } finally {
    clearTestEnv();
  }
});
