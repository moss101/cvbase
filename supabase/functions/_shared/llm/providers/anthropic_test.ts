import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { anthropicCall } from './anthropic.ts';
import { ProviderError } from '../errors.ts';
import type { ProviderCallOpts } from '../types.ts';

const BASE_URL = 'https://api.anthropic.test';

function baseOpts(overrides: Partial<ProviderCallOpts> = {}): ProviderCallOpts {
  return {
    apiKey: 'test-key',
    model: 'claude-sonnet-5',
    messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }],
    timeoutMs: 1000,
    ...overrides,
  };
}

interface SeenRequest { url: string; body: Record<string, unknown>; headers: Headers }

async function withMockedFetch(
  impl: (req: SeenRequest) => Response,
  run: () => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return Promise.resolve(impl({ url: String(input), body, headers: new Headers(init?.headers) }));
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.test('anthropicCall: hoists system to a top-level field, sets auth/version headers, maps usage', async () => {
  await withMockedFetch(
    ({ url, body, headers }) => {
      assertEquals(url, `${BASE_URL}/v1/messages`);
      assertEquals(headers.get('x-api-key'), 'test-key');
      assertEquals(headers.get('anthropic-version'), '2023-06-01');
      assertEquals(body.system, 'sys');
      assertEquals(body.messages, [{ role: 'user', content: 'hi' }]);
      assertEquals(typeof body.max_tokens, 'number');
      assertEquals(body.temperature, undefined);
      assertEquals(body.tools, undefined);
      return json({ content: [{ type: 'text', text: 'hello ' }, { type: 'text', text: 'there' }], stop_reason: 'end_turn', usage: { input_tokens: 11, output_tokens: 4 } });
    },
    async () => {
      const result = await anthropicCall(BASE_URL)(baseOpts());
      assertEquals(result.content, 'hello there');
      assertEquals(result.promptTokens, 11);
      assertEquals(result.completionTokens, 4);
    },
  );
});

Deno.test('anthropicCall: a forced tool pins tool_choice and re-serialises the parsed tool_use input', async () => {
  const tool = { name: 'return_result', description: 'desc', parameters: { type: 'object', properties: { a: { type: 'integer' } } } };
  await withMockedFetch(
    ({ body }) => {
      assertEquals(body.tool_choice, { type: 'tool', name: 'return_result' });
      assertEquals((body.tools as Record<string, unknown>[])[0].input_schema, tool.parameters);
      return json({ content: [{ type: 'tool_use', name: 'return_result', input: { a: 1 } }], stop_reason: 'tool_use', usage: { input_tokens: 1, output_tokens: 1 } });
    },
    async () => {
      const result = await anthropicCall(BASE_URL)(baseOpts({ tool }));
      assertEquals(result.toolArguments, '{"a":1}');
      assertEquals(JSON.parse(result.toolArguments!), { a: 1 });
    },
  );
});

Deno.test('anthropicCall: missing tool_use block for a forced tool is invalid_response', async () => {
  const tool = { name: 'return_result', description: 'desc', parameters: { type: 'object' } };
  await withMockedFetch(
    () => json({ content: [{ type: 'text', text: 'I would rather chat' }], stop_reason: 'end_turn' }),
    async () => {
      const err = await assertRejects(() => anthropicCall(BASE_URL)(baseOpts({ tool })), ProviderError) as ProviderError;
      assertEquals(err.kind, 'invalid_response');
    },
  );
});

Deno.test('anthropicCall: a safety refusal (HTTP 200, stop_reason=refusal) is surfaced, not returned as empty text', async () => {
  await withMockedFetch(
    () => json({ content: [], stop_reason: 'refusal', stop_details: { category: 'harmful' } }),
    async () => {
      const err = await assertRejects(() => anthropicCall(BASE_URL)(baseOpts()), ProviderError) as ProviderError;
      assertEquals(err.kind, 'invalid_response');
      assertEquals(err.message.includes('harmful'), true);
    },
  );
});

Deno.test('anthropicCall: HTTP status maps to FailureKind (401/403 auth, 429 rate_limit, 5xx transient, 400 unknown)', async () => {
  const cases: [number, string][] = [[401, 'auth'], [403, 'auth'], [402, 'balance'], [429, 'rate_limit'], [529, 'transient'], [400, 'unknown']];
  for (const [status, kind] of cases) {
    await withMockedFetch(
      () => json({ error: { message: 'nope' } }, status),
      async () => {
        const err = await assertRejects(() => anthropicCall(BASE_URL)(baseOpts()), ProviderError) as ProviderError;
        assertEquals(err.kind, kind, `status ${status}`);
        assertEquals(err.status, status);
        assertEquals(err.message.includes('test-key'), false, 'the API key must never appear in an error');
      },
    );
  }
});

Deno.test('anthropicCall: errors carry the configured provider id when used as a dialect adapter', async () => {
  await withMockedFetch(
    () => json({ error: 'nope' }, 401),
    async () => {
      const err = await assertRejects(() => anthropicCall(BASE_URL, 'custom')(baseOpts()), ProviderError) as ProviderError;
      assertEquals(err.provider, 'custom');
      assertEquals(err.message.startsWith('custom HTTP 401'), true);
    },
  );
});

Deno.test('anthropicCall: an aborted fetch is a timeout-kind error', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new DOMException('aborted', 'AbortError'))) as typeof fetch;
  try {
    const err = await assertRejects(() => anthropicCall(BASE_URL)(baseOpts()), ProviderError) as ProviderError;
    assertEquals(err.kind, 'timeout');
  } finally {
    globalThis.fetch = realFetch;
  }
});
