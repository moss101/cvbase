import { routedCall, type RoutedResult } from './llm/router.ts';
import type { CacheOptions } from './llm/cache.ts';
import type { LlmUsage } from './llm/types.ts';
import { JsonRepairError, parseJsonLenient } from './llm/jsonRepair.ts';
import { SchemaViolationError } from './llm/errors.ts';

export type { CacheOptions, LlmUsage };

/**
 * Provider-agnostic text-generation entry point — routes to DeepSeek V4 Pro
 * (primary) with Kimi K2.6 automatic fallback (see _shared/llm/router.ts,
 * _shared/llm/config.ts). Preserves the exact call signatures of the old
 * _shared/gemini.ts geminiText/geminiJson/geminiJsonMetered, so callers only
 * change their import path. Image generation (ai-headshot) and PDF/file
 * vision extraction (ai-parse-pdf) are NOT part of this module — they stay
 * on Gemini directly via the trimmed _shared/gemini.ts.
 *
 * Every entry point takes an optional `cache: { ttlSec }` (see
 * _shared/llm/cache.ts). It is off unless a caller passes it: most prompts
 * here are personalised and never repeat, so the default must not spend a
 * DB round-trip on a lookup that will miss.
 */

export const ROUTED_MODEL_LABEL = 'llm-routed';

/**
 * JSON out of a free-text completion (no schema). Forced tool-calling is the
 * normal path and never lands here; this is the parity path for callers that
 * ask for JSON in the prompt instead. Same rule as the router: one repair
 * pass, then SchemaViolationError (502 bad_ai_output) — never a second
 * provider call.
 */
function parseContentJson<T>(result: RoutedResult): T {
  if (result.data !== undefined) return result.data as T;
  try {
    return parseJsonLenient(result.content) as T;
  } catch (e) {
    const reason = e instanceof JsonRepairError ? e.message : String(e);
    throw new SchemaViolationError(result.provider, `${result.provider}: response text — ${reason}`, result.content);
  }
}

/** Generate text (optionally schema-constrained via forced tool-calling).
 *  Returns raw text; if a schema is given, returns the JSON-stringified
 *  structured result instead (parity with the old geminiText behavior —
 *  no current caller actually passes a schema here, they use llmJson). */
export async function llmText(
  prompt: string,
  opts: { model?: string; schema?: unknown; system?: string; timeoutMs?: number; cache?: CacheOptions } = {},
): Promise<string> {
  const result = await routedCall({
    prompt,
    schema: opts.schema,
    system: opts.system,
    model: opts.model,
    timeoutMs: opts.timeoutMs,
    cache: opts.cache,
  });
  if (result.data !== undefined) return JSON.stringify(result.data);
  return result.content ?? '';
}

/** Generate JSON and parse it. Throws SchemaViolationError (502
 *  bad_ai_output) if the model returns non-JSON that one repair pass cannot
 *  fix. The fourth argument is additive — existing 2/3-arg call sites are
 *  unchanged. */
export async function llmJson<T = unknown>(
  prompt: string,
  schema?: unknown,
  system?: string,
  opts: { model?: string; timeoutMs?: number; cache?: CacheOptions } = {},
): Promise<T> {
  const result = await routedCall({
    prompt,
    schema,
    system,
    model: opts.model,
    timeoutMs: opts.timeoutMs,
    cache: opts.cache,
  });
  return parseContentJson<T>(result);
}

export interface LlmJsonMeteredResult<T> {
  data: T;
  /** prompt + completion tokens; 0 on a cache hit. */
  tokens: number;
  /** Split token counts and estimated cost (null = unpriced model). */
  usage: LlmUsage;
  provider: string;
  keySlot?: number;
  usedFallback: boolean;
  fallbackReason?: string;
  /** True when served from llm_response_cache without a provider call. */
  cached: boolean;
}

/** Structured generation with token accounting, provider/key-slot/fallback
 *  provenance, and a hard per-call timeout — used by PRISM (via
 *  prism-tailor/model_router.ts) for its per-run spend budget. */
export async function llmJsonMetered<T = unknown>(
  prompt: string,
  opts: { schema?: unknown; system?: string; model?: string; timeoutMs?: number; cache?: CacheOptions } = {},
): Promise<LlmJsonMeteredResult<T>> {
  const result = await routedCall({
    prompt,
    schema: opts.schema,
    system: opts.system,
    model: opts.model,
    timeoutMs: opts.timeoutMs,
    cache: opts.cache,
  });
  return {
    data: parseContentJson<T>(result),
    tokens: result.tokens,
    usage: result.usage,
    provider: result.provider,
    keySlot: result.keySlot,
    usedFallback: result.usedFallback,
    fallbackReason: result.fallbackReason,
    cached: result.cached,
  };
}
