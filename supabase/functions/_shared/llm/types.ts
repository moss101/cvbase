// Provider-agnostic shapes shared by the router, the key pool, and every
// provider adapter. Kept intentionally minimal — just enough to describe an
// OpenAI-compatible chat-completions call with an optional forced tool call.

/**
 * Providers the router can route to. `custom` is an operator-defined
 * OpenAI-compatible endpoint (base URL + model + key supplied at config time),
 * which is how a provider gets added without a code change.
 */
export type ProviderId = 'deepseek' | 'kimi' | 'anthropic' | 'openai' | 'groq' | 'together' | 'openrouter' | 'mistral' | 'custom';

/**
 * Wire format an endpoint speaks. Mirrors the `dialect` check constraint on
 * `public.llm_providers`. When a provider row sets one, the router picks the
 * adapter by dialect rather than by provider id — which is what lets `custom`
 * (or any built-in id pointed at an aggregator) talk Anthropic's Messages API.
 */
export type ProviderDialect = 'openai' | 'anthropic';

export const PROVIDER_DIALECTS: readonly ProviderDialect[] = ['openai', 'anthropic'];

export function isProviderDialect(value: unknown): value is ProviderDialect {
  return typeof value === 'string' && (PROVIDER_DIALECTS as readonly string[]).includes(value);
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/** A single forced function/tool the model must call, carrying the desired
 *  output shape as a standard JSON Schema object. */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderCallOpts {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  tool?: ToolSpec;
  timeoutMs: number;
}

export interface ProviderCallResult {
  /** Plain-text content, present when no tool was forced. */
  content?: string;
  /** Raw JSON-arguments string from the forced tool call, present otherwise. */
  toolArguments?: string;
  /** From the provider's usage block (OpenAI `usage.prompt_tokens`,
   *  Anthropic `usage.input_tokens`); 0 when the provider omits it. */
  promptTokens: number;
  completionTokens: number;
}

/** Per-call token accounting as exposed on the router result and written to
 *  `llm_call_logs`. `costUsd` is null when the model has no known price (see
 *  config.ts `LLM_PRICES`) — never 0, so "unpriced" is distinguishable from
 *  "free". */
export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  /** promptTokens + completionTokens — the legacy `tokens` figure. */
  totalTokens: number;
  costUsd: number | null;
}

/** Providers that can appear in `llm_call_logs.provider`: everything the
 *  router routes to, plus Gemini, which is metered from _shared/gemini.ts
 *  without going through the router. */
export type LogProviderId = ProviderId | 'gemini';

/** One provider's raw transport call — no retry/pooling/fallback logic here,
 *  that all lives in keyPool.ts/router.ts so every provider adapter stays a
 *  thin, easily-testable request/response mapper. */
export type ProviderCall = (opts: ProviderCallOpts) => Promise<ProviderCallResult>;
