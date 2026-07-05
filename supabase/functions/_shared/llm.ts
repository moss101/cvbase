import { routedCall } from './llm/router.ts';

/**
 * Provider-agnostic text-generation entry point — routes to DeepSeek V4 Pro
 * (primary) with Kimi K2.6 automatic fallback (see _shared/llm/router.ts,
 * _shared/llm/config.ts). Preserves the exact call signatures of the old
 * _shared/gemini.ts geminiText/geminiJson/geminiJsonMetered, so callers only
 * change their import path. Image generation (ai-headshot) and PDF/file
 * vision extraction (ai-parse-pdf) are NOT part of this module — they stay
 * on Gemini directly via the trimmed _shared/gemini.ts.
 */

export const ROUTED_MODEL_LABEL = 'llm-routed';

/** Generate text (optionally schema-constrained via forced tool-calling).
 *  Returns raw text; if a schema is given, returns the JSON-stringified
 *  structured result instead (parity with the old geminiText behavior —
 *  no current caller actually passes a schema here, they use llmJson). */
export async function llmText(
  prompt: string,
  opts: { model?: string; schema?: unknown; system?: string; timeoutMs?: number } = {},
): Promise<string> {
  const result = await routedCall({
    prompt,
    schema: opts.schema,
    system: opts.system,
    model: opts.model,
    timeoutMs: opts.timeoutMs,
  });
  if (result.data !== undefined) return JSON.stringify(result.data);
  return result.content ?? '';
}

/** Generate JSON and parse it. Throws if the model returns non-JSON. */
export async function llmJson<T = unknown>(prompt: string, schema?: unknown, system?: string): Promise<T> {
  const result = await routedCall({ prompt, schema, system });
  if (result.data !== undefined) return result.data as T;
  return JSON.parse(result.content ?? '') as T;
}

export interface LlmJsonMeteredResult<T> {
  data: T;
  tokens: number;
  provider: string;
  keySlot?: number;
  usedFallback: boolean;
  fallbackReason?: string;
}

/** Structured generation with token accounting, provider/key-slot/fallback
 *  provenance, and a hard per-call timeout — used by PRISM (via
 *  prism-tailor/model_router.ts) for its per-run spend budget. */
export async function llmJsonMetered<T = unknown>(
  prompt: string,
  opts: { schema?: unknown; system?: string; model?: string; timeoutMs?: number } = {},
): Promise<LlmJsonMeteredResult<T>> {
  const result = await routedCall({
    prompt,
    schema: opts.schema,
    system: opts.system,
    model: opts.model,
    timeoutMs: opts.timeoutMs,
  });
  const data = (result.data !== undefined ? result.data : JSON.parse(result.content ?? '')) as T;
  return {
    data,
    tokens: result.tokens,
    provider: result.provider,
    keySlot: result.keySlot,
    usedFallback: result.usedFallback,
    fallbackReason: result.fallbackReason,
  };
}
