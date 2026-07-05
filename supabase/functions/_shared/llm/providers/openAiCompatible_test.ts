import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { callOpenAiCompatible } from './openAiCompatible.ts';
import { ProviderError } from '../errors.ts';
import type { ProviderCallOpts } from '../types.ts';

const BASE_URL = 'https://example-provider.test';

function baseOpts(overrides: Partial<ProviderCallOpts> = {}): ProviderCallOpts {
  return {
    apiKey: 'test-key',
    model: 'test-model',
    messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }],
    timeoutMs: 1000,
    ...overrides,
  };
}

async function withMockedFetch(
  impl: (req: { url: string; body: unknown; headers: Headers }) => Response,
  run: () => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const headers = new Headers(init?.headers);
    return Promise.resolve(impl({ url: String(input), body, headers }));
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

Deno.test('callOpenAiCompatible: plain call (no tool) sends messages only, returns content + usage', async () => {
  await withMockedFetch(
    ({ url, body, headers }) => {
      assertEquals(url, `${BASE_URL}/chat/completions`);
      assertEquals(headers.get('Authorization'), 'Bearer test-key');
      assertEquals((body as Record<string, unknown>).tools, undefined);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'hi there' } }],
        usage: { prompt_tokens: 2, completion_tokens: 3 },
      }));
    },
    async () => {
      const result = await callOpenAiCompatible('deepseek', BASE_URL, baseOpts());
      assertEquals(result.content, 'hi there');
      assertEquals(result.promptTokens, 2);
      assertEquals(result.completionTokens, 3);
    },
  );
});

Deno.test('callOpenAiCompatible: a forced tool sends tools + tool_choice pinned to that function', async () => {
  const tool = { name: 'return_result', description: 'desc', parameters: { type: 'object', properties: {} } };
  await withMockedFetch(
    ({ body }) => {
      const b = body as Record<string, unknown>;
      assertEquals((b.tools as unknown[]).length, 1);
      assertEquals(b.tool_choice, { type: 'function', function: { name: 'return_result' } });
      return new Response(JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { arguments: '{"a":1}' } }] } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }));
    },
    async () => {
      const result = await callOpenAiCompatible('deepseek', BASE_URL, baseOpts({ tool }));
      assertEquals(result.toolArguments, '{"a":1}');
    },
  );
});

Deno.test('callOpenAiCompatible: HTTP status maps to the right FailureKind', async () => {
  const cases: [number, string][] = [[401, 'auth'], [402, 'balance'], [429, 'rate_limit'], [503, 'transient'], [418, 'unknown']];
  for (const [status, kind] of cases) {
    await withMockedFetch(
      () => new Response('error body', { status }),
      async () => {
        const err = await assertRejects(
          () => callOpenAiCompatible('deepseek', BASE_URL, baseOpts()),
          ProviderError,
        ) as ProviderError;
        assertEquals(err.kind, kind, `status ${status} should map to ${kind}`);
      },
    );
  }
});

Deno.test('callOpenAiCompatible: a forced tool call without tool_calls in the response is invalid_response', async () => {
  const tool = { name: 'return_result', description: 'desc', parameters: { type: 'object', properties: {} } };
  await withMockedFetch(
    () => new Response(JSON.stringify({ choices: [{ message: { content: 'oops, plain text' } }], usage: {} })),
    async () => {
      const err = await assertRejects(
        () => callOpenAiCompatible('deepseek', BASE_URL, baseOpts({ tool })),
        ProviderError,
      ) as ProviderError;
      assertEquals(err.kind, 'invalid_response');
    },
  );
});
