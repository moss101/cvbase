import type { ProviderCall, ProviderCallOpts, ProviderCallResult, ProviderId } from '../types.ts';
import { ProviderError, type FailureKind } from '../errors.ts';

/**
 * Anthropic Messages API adapter.
 *
 * Anthropic does not speak the OpenAI chat-completions dialect, so this cannot
 * reuse `openAiCompatible.ts`. Four differences drive the mapping:
 *
 *  1. `system` is a top-level request field, not a message with role 'system'.
 *  2. `max_tokens` is required rather than optional.
 *  3. A forced tool call is `tool_choice: {type:'tool', name}`, and the result
 *     comes back as a `tool_use` content block whose `input` is **already a
 *     parsed object** — OpenAI returns a JSON *string* in `arguments`. The
 *     router's contract is a string, so it is re-serialised here.
 *  4. `temperature`, `top_p` and `top_k` are rejected with a 400 on current
 *     models (Opus 5, Sonnet 5, Opus 4.8/4.7), so they are never sent.
 *
 * Written against the raw HTTP API rather than @anthropic-ai/sdk to stay
 * symmetric with the other adapters here: every provider in this directory is a
 * thin request/response mapper behind the same `ProviderCall` type, and the
 * router's retry, key-pool and fallback logic is built on that shape.
 */

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 8192;

function statusToKind(status: number): FailureKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 402) return 'balance';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'transient';
  return 'unknown';
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  stop_details?: { category?: string | null } | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * @param baseUrl  host root; `/v1/messages` is appended here.
 * @param provider the configured provider id to report in errors — `anthropic`
 *   by default, but a `custom` (or aggregator) row with `dialect = anthropic`
 *   passes its own id so logs and fallback reasons name the row, not the
 *   wire format.
 */
export function anthropicCall(baseUrl: string, provider: ProviderId = 'anthropic'): ProviderCall {
  return async (opts: ProviderCallOpts): Promise<ProviderCallResult> => {
    // The router passes system and user turns through one `messages` array;
    // Anthropic wants the system prompt hoisted to a top-level field.
    const system = opts.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const messages = opts.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: 'user' as const, content: m.content }));

    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages,
    };
    if (system) body.system = system;

    if (opts.tool) {
      body.tools = [{
        name: opts.tool.name,
        description: opts.tool.description,
        input_schema: opts.tool.parameters,
      }];
      body.tool_choice = { type: 'tool', name: opts.tool.name };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new ProviderError(provider, 'timeout', undefined, `${provider}: request timed out after ${opts.timeoutMs}ms`);
      }
      throw new ProviderError(provider, 'transient', undefined, `${provider}: network error — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new ProviderError(provider, statusToKind(res.status), res.status, `${provider} HTTP ${res.status}: ${errBody.slice(0, 500)}`);
    }

    const json = await res.json() as AnthropicResponse;

    /**
     * Safety classifiers can decline a request: HTTP 200, `stop_reason:
     * "refusal"`, and empty or partial content. Reading the blocks without
     * checking would surface a decline as an empty success.
     */
    if (json.stop_reason === 'refusal') {
      const category = json.stop_details?.category ?? 'unspecified';
      throw new ProviderError(provider, 'invalid_response', res.status, `${provider}: request refused by safety classifier (${category})`);
    }

    const blocks = json.content ?? [];
    const promptTokens = json.usage?.input_tokens ?? 0;
    const completionTokens = json.usage?.output_tokens ?? 0;

    if (opts.tool) {
      const toolName = opts.tool.name;
      const call = blocks.find((b) => b.type === 'tool_use' && b.name === toolName);
      if (!call) {
        throw new ProviderError(provider, 'invalid_response', res.status, `${provider}: forced tool call did not return a tool_use block (stop_reason=${json.stop_reason ?? 'unknown'})`);
      }
      // `input` arrives parsed; the router contract is a raw JSON string.
      return { toolArguments: JSON.stringify(call.input ?? {}), promptTokens, completionTokens };
    }

    const text = blocks
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('');

    if (!text) {
      throw new ProviderError(provider, 'invalid_response', res.status, `${provider}: no text content in response (stop_reason=${json.stop_reason ?? 'unknown'})`);
    }

    return { content: text, promptTokens, completionTokens };
  };
}
