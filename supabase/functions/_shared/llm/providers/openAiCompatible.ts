import type { ProviderCallOpts, ProviderCallResult, ProviderId } from '../types.ts';
import { ProviderError, type FailureKind } from '../errors.ts';

// Both DeepSeek and Kimi (Moonshot) expose a plain OpenAI-compatible
// `POST /chat/completions` endpoint with `Authorization: Bearer <key>` auth —
// this is the one shared request/response mapper both provider adapters
// call, so the HTTP-status→FailureKind logic and forced-tool-call shaping
// live in exactly one place instead of being duplicated per provider.

function statusToKind(status: number): FailureKind {
  if (status === 401) return 'auth';
  if (status === 402) return 'balance';
  if (status === 429) return 'rate_limit';
  if (status === 500 || status === 502 || status === 503 || status === 504) return 'transient';
  return 'unknown';
}

interface OpenAiChatBody {
  model: string;
  messages: { role: string; content: string }[];
  tools?: { type: 'function'; function: { name: string; description: string; parameters: unknown } }[];
  tool_choice?: { type: 'function'; function: { name: string } };
  // Both DeepSeek V4 (Pro/Flash) and Kimi K2.6 default to "thinking mode" on
  // — which (a) rejects a forced tool_choice outright ("Thinking mode does
  // not support this tool_choice" / "incompatible with thinking enabled",
  // verified against both APIs live) and (b) adds a separate reasoning_content
  // pass most callers here never asked for, at real latency/token cost. Since
  // this app never wants exposed chain-of-thought and every structured call
  // needs forced tool-calling to work at all, thinking is disabled uniformly.
  thinking: { type: 'disabled' };
}

export async function callOpenAiCompatible(
  provider: ProviderId,
  baseUrl: string,
  opts: ProviderCallOpts,
): Promise<ProviderCallResult> {
  const body: OpenAiChatBody = {
    model: opts.model,
    messages: opts.messages,
    thinking: { type: 'disabled' },
  };
  if (opts.tool) {
    body.tools = [{ type: 'function', function: opts.tool }];
    body.tool_choice = { type: 'function', function: { name: opts.tool.name } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
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
    const kind = statusToKind(res.status);
    const errBody = await res.text().catch(() => '');
    throw new ProviderError(provider, kind, res.status, `${provider} HTTP ${res.status}: ${errBody.slice(0, 500)}`);
  }

  // deno-lint-ignore no-explicit-any
  const json = await res.json() as any;
  const message = json?.choices?.[0]?.message;
  if (!message) {
    throw new ProviderError(provider, 'invalid_response', res.status, `${provider}: no choices[0].message in response`);
  }

  const promptTokens = json?.usage?.prompt_tokens ?? 0;
  const completionTokens = json?.usage?.completion_tokens ?? 0;

  if (opts.tool) {
    const toolArguments = message?.tool_calls?.[0]?.function?.arguments;
    if (typeof toolArguments !== 'string') {
      throw new ProviderError(provider, 'invalid_response', res.status, `${provider}: forced tool call did not return arguments`);
    }
    return { toolArguments, promptTokens, completionTokens };
  }

  return { content: message?.content ?? '', promptTokens, completionTokens };
}
