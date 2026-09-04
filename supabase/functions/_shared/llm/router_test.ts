import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert';
import { resolveProviderCall, routedCall } from './router.ts';
import { LlmAllProvidersFailedError, ProviderConfigError, SchemaViolationError } from './errors.ts';
import { _resetKeyPoolStateForTests } from './keyPool.ts';
import type { ProviderConfig } from './config.ts';
import type { ProviderId } from './types.ts';

const ENV_KEYS = [
  'LLM_PRIMARY_PROVIDER', 'LLM_FALLBACK_PROVIDER', 'DEEPSEEK_API_KEYS', 'KIMI_API_KEYS',
  'DEEPSEEK_MODEL_FULL', 'DEEPSEEK_MODEL_LITE', 'KIMI_MODEL',
  'LLM_TIMEOUT_MS', 'LLM_RETRIES_PER_KEY', 'LLM_BACKOFF_BASE_MS', 'LLM_RATE_LIMIT_COOLDOWN_MS', 'LLM_BAD_KEY_COOLDOWN_MS',
  'CUSTOM_LLM_API_KEYS', 'CUSTOM_LLM_BASE_URL', 'CUSTOM_LLM_MODEL_FULL', 'CUSTOM_LLM_DIALECT',
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
  Deno.env.set('LLM_RETRIES_PER_KEY', '1');
  Deno.env.set('LLM_BACKOFF_BASE_MS', '0'); // keep tests fast — no real backoff sleeps to wait out
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

function toolCallBody(args: Record<string, unknown> | string) {
  const argumentsStr = typeof args === 'string' ? args : JSON.stringify(args);
  return {
    choices: [{ message: { tool_calls: [{ function: { arguments: argumentsStr } }] } }],
    usage: { prompt_tokens: 4, completion_tokens: 6 },
  };
}

/** Installs a fetch stub for the duration of one test and restores the real
 *  fetch afterward — no --allow-net needed since the real network is never
 *  reached, only the in-process global is swapped. */
async function withMockedFetch(
  impl: (url: string, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(impl(String(input), init))) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

Deno.test('routedCall: plain-text prompt (no schema) succeeds on primary, returns content + usage', async () => {
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
        assertEquals(result.cached, false);
        assertEquals(result.tokens, 5);
        assertEquals(result.usage.promptTokens, 3);
        assertEquals(result.usage.completionTokens, 2);
        assertEquals(result.usage.totalTokens, 5);
        // deepseek-v4-pro is priced in config.ts: (3*0.55 + 2*2.19) / 1e6, rounded to micro-dollars.
        assertEquals(result.usage.costUsd, 0.000006);
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

Deno.test('routedCall: slightly-broken tool arguments (fence + trailing comma) are repaired once', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    await withMockedFetch(
      () => jsonResponse(toolCallBody('```json\n{"matchScore": 88,}\n```')),
      async () => {
        const result = await routedCall({
          prompt: 'hi',
          schema: { type: 'OBJECT', properties: { matchScore: { type: 'INTEGER' } }, required: ['matchScore'] },
        });
        assertEquals(result.data, { matchScore: 88 });
      },
    );
  } finally {
    clearTestEnv();
  }
});

Deno.test('routedCall: unrepairable tool arguments throw SchemaViolationError (502) and never call the fallback', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    let kimiCalls = 0;
    await withMockedFetch(
      (url) => {
        if (url.includes('moonshot.ai')) kimiCalls++;
        return jsonResponse(toolCallBody('{"matchScore": '));
      },
      async () => {
        const err = await assertRejects(
          () => routedCall({ prompt: 'hi', schema: { type: 'OBJECT', properties: { matchScore: { type: 'INTEGER' } } } }),
          SchemaViolationError,
        ) as SchemaViolationError;
        assertEquals(err.status, 502);
        assertEquals(err.code, 'bad_ai_output');
        assertEquals(err.provider, 'deepseek');
        assertEquals(kimiCalls, 0, 'a validation failure must not spend tokens on a second provider');
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

Deno.test('routedCall: a `custom` provider with dialect=anthropic is routed through the Messages adapter', async () => {
  setTestEnv();
  Deno.env.set('LLM_PRIMARY_PROVIDER', 'custom');
  Deno.env.set('CUSTOM_LLM_API_KEYS', 'custom-key');
  Deno.env.set('CUSTOM_LLM_BASE_URL', 'https://aggregator.test');
  Deno.env.set('CUSTOM_LLM_MODEL_FULL', 'claude-sonnet-5');
  Deno.env.set('CUSTOM_LLM_DIALECT', 'anthropic');
  _resetKeyPoolStateForTests();
  try {
    const seen: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
    await withMockedFetch(
      (url, init) => {
        seen.push({ url, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
        return jsonResponse({
          content: [{ type: 'text', text: 'from anthropic dialect' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 7, output_tokens: 1 },
        });
      },
      async () => {
        const result = await routedCall({ prompt: 'hi', system: 'be brief' });
        assertEquals(result.content, 'from anthropic dialect');
        assertEquals(result.provider, 'custom');
        assertEquals(result.usage.promptTokens, 7);
        assertEquals(seen.length, 1);
        assertEquals(seen[0].url, 'https://aggregator.test/v1/messages');
        assertEquals(seen[0].headers.get('x-api-key'), 'custom-key');
        assertEquals(seen[0].body.system, 'be brief');
      },
    );
  } finally {
    clearTestEnv();
  }
});

Deno.test('routedCall: cache option is accepted and, with no DB reachable, is a transparent no-op', async () => {
  setTestEnv();
  _resetKeyPoolStateForTests();
  try {
    await withMockedFetch(
      () => jsonResponse(successBody('live')),
      async () => {
        const result = await routedCall({ prompt: 'hi', cache: { ttlSec: 60 } });
        assertEquals(result.content, 'live');
        assertEquals(result.cached, false);
      },
    );
  } finally {
    clearTestEnv();
  }
});

Deno.test('resolveProviderCall: an id with no adapter and no dialect is a ProviderConfigError, not a ProviderError', () => {
  const cfg: ProviderConfig = { id: 'nope' as ProviderId, apiKeys: ['k'], modelFull: 'm', modelLite: 'm', baseUrl: 'https://x.test' };
  const err = assertThrows(() => resolveProviderCall(cfg), ProviderConfigError);
  assertEquals(err.status, 500);
  assertEquals(err.code, 'llm_config_error');
  // With a dialect set, the same unknown id resolves — the dialect decides the adapter.
  resolveProviderCall({ ...cfg, dialect: 'openai' });
});
