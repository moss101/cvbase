import { getLlmConfig, getLlmConfigFromDb, type ProviderConfig } from './config.ts';
import { serviceClient } from '../auth.ts';
import { callWithKeyPool, type KeyPoolCallResult } from './keyPool.ts';
import { deepseekCall } from './providers/deepseek.ts';
import { kimiCall } from './providers/kimi.ts';
import { anthropicCall } from './providers/anthropic.ts';
import { callOpenAiCompatible } from './providers/openAiCompatible.ts';
import { buildToolSpec, normalizeSchema } from './schemaAdapter.ts';
import { LlmAllProvidersFailedError, ProviderError } from './errors.ts';
import { logLlmCall } from './callLog.ts';
import type { ChatMessage, ProviderCall, ProviderId } from './types.ts';

/** Anti-hallucination system instruction applied to every text generation
 *  by default (a caller-supplied `system` overrides it). Moved here from the
 *  old _shared/gemini.ts, whose only remaining exports (geminiImage,
 *  geminiFromFile) never used it. */
export const ANTI_HALLUCINATION =
  'You are an expert resume assistant. Use ONLY the information the user provides. ' +
  'For any metric, statistic, number, employer, or date the user did not supply, insert a ' +
  'clearly-marked placeholder like [X], [ADD METRIC], or [COMPANY] — never invent specific ' +
  'facts. Keep output truthful, concise, and ATS-friendly.';

/**
 * Anthropic speaks its own dialect and gets a dedicated adapter; everything
 * else here is OpenAI-compatible, so each entry is just a base URL bound to the
 * shared adapter. `custom` lets an operator point the router at any
 * OpenAI-compatible endpoint via config alone.
 */
const PROVIDER_CALL_FACTORIES: Record<ProviderId, (baseUrl: string) => ProviderCall> = {
  deepseek: deepseekCall,
  kimi: kimiCall,
  anthropic: anthropicCall,
  openai: (baseUrl) => (opts) => callOpenAiCompatible('openai', baseUrl, opts),
  groq: (baseUrl) => (opts) => callOpenAiCompatible('groq', baseUrl, opts),
  together: (baseUrl) => (opts) => callOpenAiCompatible('together', baseUrl, opts),
  openrouter: (baseUrl) => (opts) => callOpenAiCompatible('openrouter', baseUrl, opts),
  mistral: (baseUrl) => (opts) => callOpenAiCompatible('mistral', baseUrl, opts),
  custom: (baseUrl) => (opts) => callOpenAiCompatible('custom', baseUrl, opts),
};

function resolveModel(cfg: ProviderConfig, tier: string | undefined): string {
  return tier === 'lite' ? cfg.modelLite : cfg.modelFull;
}

export interface RoutedCallOpts {
  prompt: string;
  /** A zod schema, a plain Gemini-dialect schema literal, or undefined for
   *  a plain free-text completion (no forced tool call). */
  schema?: unknown;
  system?: string;
  /** Tier token ('lite' | 'full') threaded through from PRISM's AGENT_MODELS;
   *  ignored (always resolves to modelFull) for the 4 direct callers, which
   *  have no tiering concept. */
  model?: string;
  timeoutMs?: number;
}

export interface RoutedResult {
  content?: string;
  data?: unknown;
  tokens: number;
  provider: ProviderId;
  keySlot: number;
  usedFallback: boolean;
  fallbackReason?: string;
}

async function tryProvider(
  providerCfg: ProviderConfig,
  messages: ChatMessage[],
  tool: ReturnType<typeof buildToolSpec>['tool'] | undefined,
  tier: string | undefined,
  timeoutMs: number,
  retryCfg: { retriesPerKey: number; rateLimitCooldownMs: number; badKeyCooldownMs: number },
): Promise<{ pool: KeyPoolCallResult; model: string }> {
  const model = resolveModel(providerCfg, tier);
  const call = PROVIDER_CALL_FACTORIES[providerCfg.id](providerCfg.baseUrl);
  const pool = await callWithKeyPool(
    providerCfg.id,
    providerCfg.apiKeys,
    (apiKey) => ({ apiKey, model, messages, tool, timeoutMs }),
    call,
    retryCfg,
  );
  return { pool, model };
}

/**
 * Primary-pool → fallback-pool orchestration. Only a fully-exhausted
 * primary pool (every key tried, transient retries spent — see keyPool.ts)
 * triggers a switch to the fallback provider; if the fallback pool also
 * exhausts, throws LlmAllProvidersFailedError rather than returning a
 * silent/degraded response.
 */
export async function routedCall(opts: RoutedCallOpts): Promise<RoutedResult> {
  // Admin-panel rows in `llm_providers` take precedence; the helper falls back
  // to the env config on any failure, so a config lookup can never be the
  // reason a generation fails.
  const config = await getLlmConfigFromDb(serviceClient()).catch(() => getLlmConfig());
  const messages: ChatMessage[] = [
    { role: 'system', content: opts.system ?? ANTI_HALLUCINATION },
    { role: 'user', content: opts.prompt },
  ];
  const timeoutMs = opts.timeoutMs ?? config.timeoutMs;
  const retryCfg = {
    retriesPerKey: config.retriesPerKey,
    rateLimitCooldownMs: config.rateLimitCooldownMs,
    badKeyCooldownMs: config.badKeyCooldownMs,
  };

  const normalized = normalizeSchema(opts.schema);
  const toolSpec = normalized
    ? buildToolSpec('return_result', 'Return the result matching the required schema.', normalized)
    : undefined;

  function finalize(
    pool: KeyPoolCallResult,
    model: string,
    provider: ProviderId,
    usedFallback: boolean,
    fallbackReason: string | undefined,
    started: number,
  ): RoutedResult {
    const tokens = pool.result.promptTokens + pool.result.completionTokens;
    let content: string | undefined;
    let data: unknown;
    if (toolSpec) {
      const parsed = JSON.parse(pool.result.toolArguments ?? '{}');
      data = toolSpec.unwrap(parsed);
    } else {
      content = pool.result.content ?? '';
    }
    void logLlmCall({
      provider, model, keySlot: pool.keySlot, usedFallback, fallbackReason,
      tokens, status: 'ok', latencyMs: Date.now() - started,
    });
    return { content, data, tokens, provider, keySlot: pool.keySlot, usedFallback, fallbackReason };
  }

  const startedPrimary = Date.now();
  try {
    const { pool, model } = await tryProvider(config.primary, messages, toolSpec?.tool, opts.model, timeoutMs, retryCfg);
    return finalize(pool, model, config.primary.id, false, undefined, startedPrimary);
  } catch (e) {
    const primaryErr = e instanceof ProviderError
      ? e
      : new ProviderError(config.primary.id, 'unknown', undefined, String(e));

    const startedFallback = Date.now();
    try {
      const { pool, model } = await tryProvider(config.fallback, messages, toolSpec?.tool, opts.model, timeoutMs, retryCfg);
      return finalize(pool, model, config.fallback.id, true, `${primaryErr.provider}:${primaryErr.kind}`, startedFallback);
    } catch (e2) {
      const fallbackErr = e2 instanceof ProviderError
        ? e2
        : new ProviderError(config.fallback.id, 'unknown', undefined, String(e2));
      void logLlmCall({
        provider: config.fallback.id, model: config.fallback.modelFull, usedFallback: true,
        fallbackReason: `${primaryErr.provider}:${primaryErr.kind}`, tokens: 0, status: 'error',
        latencyMs: Date.now() - startedFallback,
      });
      throw new LlmAllProvidersFailedError(primaryErr, fallbackErr);
    }
  }
}
