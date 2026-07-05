import type { ProviderId } from './types.ts';

export interface ProviderConfig {
  id: ProviderId;
  apiKeys: string[];
  modelFull: string;
  modelLite: string;
  baseUrl: string;
}

export interface LlmConfig {
  primary: ProviderConfig;
  fallback: ProviderConfig;
  timeoutMs: number;
  retriesPerKey: number;
  rateLimitCooldownMs: number;
  badKeyCooldownMs: number;
}

function splitKeys(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

function intEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** `Deno.env.get` returns '' (not undefined) for a var that's present but set
 *  to an empty value — e.g. `DEEPSEEK_BASE_URL=` left blank as a placeholder.
 *  Plain `??` doesn't fall back on '', only null/undefined, so every
 *  string-with-default lookup here goes through this instead. */
function stringEnv(name: string, fallback: string): string {
  const raw = Deno.env.get(name);
  return raw && raw.trim() !== '' ? raw : fallback;
}

/** Strips a trailing slash so callers can safely do `${baseUrl}/chat/completions`
 *  regardless of whether the operator's env value ends in one. */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function providerConfig(id: ProviderId): ProviderConfig {
  if (id === 'deepseek') {
    return {
      id,
      apiKeys: splitKeys(Deno.env.get('DEEPSEEK_API_KEYS')),
      modelFull: stringEnv('DEEPSEEK_MODEL_FULL', 'deepseek-v4-pro'),
      modelLite: stringEnv('DEEPSEEK_MODEL_LITE', 'deepseek-v4-flash'),
      // Official DeepSeek platform by default — override if your keys come
      // from an aggregator (Together, Fireworks, DeepInfra, OpenRouter, ...)
      // that fronts deepseek-v4-pro/-flash under a different host.
      baseUrl: normalizeBaseUrl(stringEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')),
    };
  }
  const kimiModel = stringEnv('KIMI_MODEL', 'kimi-k2.6');
  return {
    id,
    apiKeys: splitKeys(Deno.env.get('KIMI_API_KEYS')),
    // Kimi is a single uniform fallback model — no lite/full split.
    modelFull: kimiModel,
    modelLite: kimiModel,
    // Official Moonshot platform by default — override for an aggregator.
    baseUrl: normalizeBaseUrl(stringEnv('KIMI_BASE_URL', 'https://api.moonshot.ai/v1')),
  };
}

function providerId(envVar: string, fallback: ProviderId): ProviderId {
  const raw = Deno.env.get(envVar);
  return raw === 'deepseek' || raw === 'kimi' ? raw : fallback;
}

/**
 * Reads every LLM_/DEEPSEEK_/KIMI_ env var FRESH on each call — deliberately
 * NOT cached at module scope like every other shared module (_shared/auth.ts,
 * _shared/gemini.ts, _shared/stripe.ts). A multi-key list is exactly where a
 * stale module-level cache becomes a correctness hazard: an operator revokes
 * or rotates a key via `supabase secrets set` and a warm isolate would
 * otherwise keep using the dead key for the rest of its lifetime.
 * `Deno.env.get` is a synchronous, in-memory lookup, so there's no
 * performance cost to paying it on every call.
 */
export function getLlmConfig(): LlmConfig {
  const primaryId = providerId('LLM_PRIMARY_PROVIDER', 'deepseek');
  const fallbackId = providerId('LLM_FALLBACK_PROVIDER', 'kimi');
  return {
    primary: providerConfig(primaryId),
    fallback: providerConfig(fallbackId),
    timeoutMs: intEnv('LLM_TIMEOUT_MS', 60_000),
    retriesPerKey: intEnv('LLM_RETRIES_PER_KEY', 2),
    rateLimitCooldownMs: intEnv('LLM_RATE_LIMIT_COOLDOWN_MS', 15_000),
    badKeyCooldownMs: intEnv('LLM_BAD_KEY_COOLDOWN_MS', 600_000),
  };
}
