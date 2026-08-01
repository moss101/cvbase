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

/**
 * Per-provider defaults. Everything is overridable by env, so adding a provider
 * that is already OpenAI-compatible needs only keys — and `custom` needs no
 * entry here at all beyond the operator's own base URL and model, which is how
 * a provider is added with no code change.
 *
 * Env var names follow `<PREFIX>_API_KEYS`, `<PREFIX>_MODEL_FULL`,
 * `<PREFIX>_MODEL_LITE` and `<PREFIX>_BASE_URL`.
 */
const PROVIDER_DEFAULTS: Record<ProviderId, { prefix: string; baseUrl: string; modelFull: string; modelLite: string }> = {
  deepseek:   { prefix: 'DEEPSEEK',   baseUrl: 'https://api.deepseek.com',      modelFull: 'deepseek-v4-pro', modelLite: 'deepseek-v4-flash' },
  kimi:       { prefix: 'KIMI',       baseUrl: 'https://api.moonshot.ai/v1',    modelFull: 'kimi-k2.6',       modelLite: 'kimi-k2.6' },
  // Anthropic's adapter appends /v1/messages itself, so no /v1 suffix here.
  anthropic:  { prefix: 'ANTHROPIC',  baseUrl: 'https://api.anthropic.com',     modelFull: 'claude-opus-5',   modelLite: 'claude-haiku-4-5' },
  openai:     { prefix: 'OPENAI',     baseUrl: 'https://api.openai.com/v1',     modelFull: 'gpt-5',           modelLite: 'gpt-5-mini' },
  groq:       { prefix: 'GROQ',       baseUrl: 'https://api.groq.com/openai/v1', modelFull: 'llama-3.3-70b-versatile', modelLite: 'llama-3.1-8b-instant' },
  together:   { prefix: 'TOGETHER',   baseUrl: 'https://api.together.xyz/v1',   modelFull: '',                modelLite: '' },
  openrouter: { prefix: 'OPENROUTER', baseUrl: 'https://openrouter.ai/api/v1',  modelFull: '',                modelLite: '' },
  mistral:    { prefix: 'MISTRAL',    baseUrl: 'https://api.mistral.ai/v1',     modelFull: 'mistral-large-latest', modelLite: 'mistral-small-latest' },
  // Fully operator-defined: base URL, model and key all come from env.
  custom:     { prefix: 'CUSTOM_LLM', baseUrl: '',                              modelFull: '',                modelLite: '' },
};

function providerConfig(id: ProviderId): ProviderConfig {
  const d = PROVIDER_DEFAULTS[id];
  const full = stringEnv(`${d.prefix}_MODEL_FULL`, d.modelFull);
  return {
    id,
    apiKeys: splitKeys(Deno.env.get(`${d.prefix}_API_KEYS`)),
    modelFull: full,
    // Providers without a lite tier reuse the full model rather than sending ''.
    modelLite: stringEnv(`${d.prefix}_MODEL_LITE`, d.modelLite || full),
    baseUrl: normalizeBaseUrl(stringEnv(`${d.prefix}_BASE_URL`, d.baseUrl)),
  };
}

const PROVIDER_IDS = Object.keys(PROVIDER_DEFAULTS) as ProviderId[];

function providerId(envVar: string, fallback: ProviderId): ProviderId {
  const raw = Deno.env.get(envVar);
  return PROVIDER_IDS.includes(raw as ProviderId) ? (raw as ProviderId) : fallback;
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

/**
 * Database-backed configuration, layered over the env defaults.
 *
 * The admin panel writes `public.llm_providers`; this reads it with the
 * service-role client (that table has no RLS policies at all, so nothing else
 * can). A provider row overrides only the fields it actually sets, so an
 * operator can re-point a base URL from the panel while leaving keys in
 * `supabase secrets`.
 *
 * Falls back to `getLlmConfig()` on any failure — an unreachable or empty
 * table must never take LLM generation down, it just means "no overrides".
 * Deliberately not cached, for the same key-rotation reason as getLlmConfig.
 */
export async function getLlmConfigFromDb(
  // deno-lint-ignore no-explicit-any
  serviceClient: { from: (t: string) => any },
): Promise<LlmConfig> {
  const envConfig = getLlmConfig();
  try {
    const { data, error } = await serviceClient
      .from('llm_providers')
      .select('provider_id, base_url, model_full, model_lite, api_keys, enabled, role');
    if (error || !Array.isArray(data) || data.length === 0) return envConfig;

    const rows = data.filter((r: { enabled?: boolean }) => r.enabled !== false);
    const pick = (role: string) => rows.find((r: { role?: string }) => r.role === role);

    const merge = (
      row: Record<string, unknown> | undefined,
      fallbackCfg: ProviderConfig,
    ): ProviderConfig => {
      if (!row) return fallbackCfg;
      const id = String(row.provider_id) as ProviderId;
      // Start from the provider's own env defaults so a row that sets only a
      // model still inherits the right base URL and keys.
      const base = PROVIDER_DEFAULTS[id] ? providerConfig(id) : fallbackCfg;
      const keys = Array.isArray(row.api_keys) ? (row.api_keys as string[]).filter(Boolean) : [];
      return {
        id,
        apiKeys: keys.length > 0 ? keys : base.apiKeys,
        modelFull: String(row.model_full || base.modelFull),
        modelLite: String(row.model_lite || base.modelLite || row.model_full || base.modelFull),
        baseUrl: normalizeBaseUrl(String(row.base_url || base.baseUrl)),
      };
    };

    return {
      ...envConfig,
      primary: merge(pick('primary'), envConfig.primary),
      fallback: merge(pick('fallback'), envConfig.fallback),
    };
  } catch {
    // Config lookup must never be the reason a generation fails.
    return envConfig;
  }
}
