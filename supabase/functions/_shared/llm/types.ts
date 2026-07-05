// Provider-agnostic shapes shared by the router, the key pool, and every
// provider adapter. Kept intentionally minimal — just enough to describe an
// OpenAI-compatible chat-completions call with an optional forced tool call.

export type ProviderId = 'deepseek' | 'kimi';

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
  promptTokens: number;
  completionTokens: number;
}

/** One provider's raw transport call — no retry/pooling/fallback logic here,
 *  that all lives in keyPool.ts/router.ts so every provider adapter stays a
 *  thin, easily-testable request/response mapper. */
export type ProviderCall = (opts: ProviderCallOpts) => Promise<ProviderCallResult>;
