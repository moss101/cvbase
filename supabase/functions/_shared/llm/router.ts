import { estimateCostUsd, getLlmConfig, getLlmConfigFromDb, type ProviderConfig } from './config.ts';
import { serviceClient } from '../auth.ts';
import { callWithKeyPool, initKeyHealth, type KeyPoolCallResult, type KeyPoolConfig } from './keyPool.ts';
import { deepseekCall } from './providers/deepseek.ts';
import { kimiCall } from './providers/kimi.ts';
import { anthropicCall } from './providers/anthropic.ts';
import { callOpenAiCompatible } from './providers/openAiCompatible.ts';
import { buildToolSpec, normalizeSchema } from './schemaAdapter.ts';
import { LlmAllProvidersFailedError, ProviderConfigError, ProviderError, SchemaViolationError } from './errors.ts';
import { logLlmCall } from './callLog.ts';
import { buildCacheKey, cacheGet, cacheSet, type CacheOptions } from './cache.ts';
import { JsonRepairError, parseJsonLenient } from './jsonRepair.ts';
import type { ChatMessage, LlmUsage, ProviderCall, ProviderDialect, ProviderId } from './types.ts';

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
 * OpenAI-compatible endpoint via config alone. Used only when a provider has
 * no explicit `dialect` (see DIALECT_CALL_FACTORIES).
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

/** Adapter by wire format. An `llm_providers.dialect` (or `<PREFIX>_DIALECT`)
 *  wins over the provider id, which is how `custom` — or any built-in id
 *  pointed at an aggregator — can speak the Anthropic Messages API. Errors
 *  still carry the configured provider id, not the dialect. */
const DIALECT_CALL_FACTORIES: Record<ProviderDialect, (id: ProviderId, baseUrl: string) => ProviderCall> = {
  openai: (id, baseUrl) => (opts) => callOpenAiCompatible(id, baseUrl, opts),
  anthropic: (id, baseUrl) => anthropicCall(baseUrl, id),
};

/** Resolves the transport for a provider config, throwing ProviderConfigError
 *  (never a ProviderError, so it is not mistaken for an outage) when neither
 *  the dialect nor the id maps to an adapter. */
export function resolveProviderCall(cfg: ProviderConfig): ProviderCall {
  if (cfg.dialect) {
    const byDialect = DIALECT_CALL_FACTORIES[cfg.dialect];
    if (!byDialect) throw new ProviderConfigError(`no adapter for dialect "${cfg.dialect}" (provider ${cfg.id})`, { provider: cfg.id });
    return byDialect(cfg.id, cfg.baseUrl);
  }
  const byId = PROVIDER_CALL_FACTORIES[cfg.id];
  if (!byId) throw new ProviderConfigError(`no adapter for provider "${cfg.id}" — set a dialect or use a known provider id`, { provider: cfg.id });
  return byId(cfg.baseUrl);
}

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
  /** Opt-in response cache (see cache.ts). Absent = no caching. */
  cache?: CacheOptions;
}

export interface RoutedResult {
  content?: string;
  data?: unknown;
  /** prompt + completion tokens (0 on a cache hit). */
  tokens: number;
  usage: LlmUsage;
  provider: ProviderId;
  keySlot: number;
  usedFallback: boolean;
  fallbackReason?: string;
  /** True when served from llm_response_cache without a provider call. */
  cached: boolean;
}

function toUsage(model: string, promptTokens: number, completionTokens: number): LlmUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: estimateCostUsd(model, promptTokens, completionTokens),
  };
}

async function tryProvider(
  providerCfg: ProviderConfig,
  messages: ChatMessage[],
  tool: ReturnType<typeof buildToolSpec>['tool'] | undefined,
  tier: string | undefined,
  timeoutMs: number,
  retryCfg: KeyPoolConfig,
): Promise<{ pool: KeyPoolCallResult; model: string }> {
  const model = resolveModel(providerCfg, tier);
  const call = resolveProviderCall(providerCfg);
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
 *
 * Two things deliberately do NOT trigger a fallback: a ProviderConfigError
 * (misconfiguration is not an outage — surface it) and a
 * SchemaViolationError (the provider answered, the answer is garbage; a
 * second provider call would just spend tokens re-rolling).
 */
export async function routedCall(opts: RoutedCallOpts): Promise<RoutedResult> {
  // Admin-panel rows in `llm_providers` take precedence; the helper falls back
  // to the env config on any failure, so a config lookup can never be the
  // reason a generation fails. The key-health seed is best-effort too. When
  // the service client itself cannot be built (no SUPABASE_URL — unit tests,
  // a stripped-down local run) every DB-backed extra — admin rows, key
  // health, the response cache, call logs — degrades to "off" and routing
  // runs purely from env.
  let svc: ReturnType<typeof serviceClient> | null = null;
  try {
    svc = serviceClient();
  } catch {
    svc = null;
  }
  const [config] = await Promise.all([
    svc ? getLlmConfigFromDb(svc).catch(() => getLlmConfig()) : Promise.resolve(getLlmConfig()),
    svc ? initKeyHealth(svc) : Promise.resolve(),
  ]);
  const system = opts.system ?? ANTI_HALLUCINATION;
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: opts.prompt },
  ];
  const timeoutMs = opts.timeoutMs ?? config.timeoutMs;
  const retryCfg: KeyPoolConfig = {
    retriesPerKey: config.retriesPerKey,
    backoffBaseMs: config.backoffBaseMs,
    rateLimitCooldownMs: config.rateLimitCooldownMs,
    badKeyCooldownMs: config.badKeyCooldownMs,
  };

  const normalized = normalizeSchema(opts.schema);
  const toolSpec = normalized
    ? buildToolSpec('return_result', 'Return the result matching the required schema.', normalized)
    : undefined;

  // --- cache lookup (opt-in) -------------------------------------------
  const cacheTtl = opts.cache && opts.cache.ttlSec > 0 ? opts.cache.ttlSec : 0;
  const primaryModel = resolveModel(config.primary, opts.model);
  let cacheKey: string | undefined;
  if (cacheTtl > 0) {
    const startedCache = Date.now();
    cacheKey = await buildCacheKey({
      provider: config.primary.id,
      model: primaryModel,
      system,
      prompt: opts.prompt,
      schemaName: toolSpec?.tool.name ?? '',
      schema: normalized,
    });
    const hit = await cacheGet(cacheKey);
    if (hit) {
      void logLlmCall({
        provider: config.primary.id, model: primaryModel, usedFallback: false,
        tokens: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, cached: true,
        status: 'ok', latencyMs: Date.now() - startedCache,
      });
      return {
        content: hit.content,
        data: hit.data,
        tokens: 0,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
        provider: config.primary.id,
        keySlot: -1,
        usedFallback: false,
        cached: true,
      };
    }
  }

  // --- provider calls ---------------------------------------------------
  let pool: KeyPoolCallResult;
  let model: string;
  let provider: ProviderId;
  let usedFallback = false;
  let fallbackReason: string | undefined;
  let started = Date.now();

  try {
    ({ pool, model } = await tryProvider(config.primary, messages, toolSpec?.tool, opts.model, timeoutMs, retryCfg));
    provider = config.primary.id;
  } catch (e) {
    if (e instanceof ProviderConfigError) throw e;
    const primaryErr = e instanceof ProviderError
      ? e
      : new ProviderError(config.primary.id, 'unknown', undefined, String(e));

    started = Date.now();
    usedFallback = true;
    fallbackReason = `${primaryErr.provider}:${primaryErr.kind}`;
    try {
      ({ pool, model } = await tryProvider(config.fallback, messages, toolSpec?.tool, opts.model, timeoutMs, retryCfg));
      provider = config.fallback.id;
    } catch (e2) {
      if (e2 instanceof ProviderConfigError) throw e2;
      const fallbackErr = e2 instanceof ProviderError
        ? e2
        : new ProviderError(config.fallback.id, 'unknown', undefined, String(e2));
      void logLlmCall({
        provider: config.fallback.id, model: config.fallback.modelFull, usedFallback: true,
        fallbackReason, tokens: 0, status: 'error',
        latencyMs: Date.now() - started,
      });
      throw new LlmAllProvidersFailedError(primaryErr, fallbackErr);
    }
  }

  // --- shape the answer -------------------------------------------------
  const usage = toUsage(model, pool.result.promptTokens, pool.result.completionTokens);
  const latencyMs = Date.now() - started;
  let content: string | undefined;
  let data: unknown;
  if (toolSpec) {
    try {
      data = toolSpec.unwrap(parseJsonLenient(pool.result.toolArguments, { emptyAsObject: true }));
    } catch (e) {
      const reason = e instanceof JsonRepairError ? e.message : String(e);
      void logLlmCall({
        provider, model, keySlot: pool.keySlot, usedFallback, fallbackReason,
        tokens: usage.totalTokens, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens,
        costUsd: usage.costUsd, status: 'error', latencyMs,
      });
      throw new SchemaViolationError(provider, `${provider}: tool arguments — ${reason}`, pool.result.toolArguments);
    }
  } else {
    content = pool.result.content ?? '';
  }

  void logLlmCall({
    provider, model, keySlot: pool.keySlot, usedFallback, fallbackReason,
    tokens: usage.totalTokens, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens,
    costUsd: usage.costUsd, cached: false, status: 'ok', latencyMs,
  });
  if (cacheKey) void cacheSet(cacheKey, model, { content, data }, cacheTtl);

  return {
    content, data, tokens: usage.totalTokens, usage, provider,
    keySlot: pool.keySlot, usedFallback, fallbackReason, cached: false,
  };
}
