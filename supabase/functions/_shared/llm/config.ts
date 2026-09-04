import { isProviderDialect, type ProviderDialect, type ProviderId } from './types.ts';
import { ProviderConfigError } from './errors.ts';

export interface ProviderConfig {
  id: ProviderId;
  apiKeys: string[];
  modelFull: string;
  modelLite: string;
  baseUrl: string;
  /** Wire format. Set from an `llm_providers` row (or `<PREFIX>_DIALECT`);
   *  when absent the router picks the adapter by provider id instead. */
  dialect?: ProviderDialect;
}

export interface LlmConfig {
  primary: ProviderConfig;
  fallback: ProviderConfig;
  timeoutMs: number;
  /** Retries per key AFTER the first attempt — `1` means 2 attempts. */
  retriesPerKey: number;
  /** Base for the jittered transient-error backoff in keyPool.ts. */
  backoffBaseMs: number;
  rateLimitCooldownMs: number;
  badKeyCooldownMs: number;
}

// ---------------------------------------------------------------------------
// Base-URL validation (SSRF hardening).
//
// `llm_providers.base_url` is written from the admin panel, and the router
// POSTs an API key to `${base_url}/chat/completions`. Without a check, a
// compromised admin session could point the router at the cloud metadata
// endpoint, a private service, or an attacker-owned host that then receives
// the key. The rules: https only, no credentials in the URL, no loopback /
// private / link-local / metadata addresses, and — when `LLM_ALLOWED_HOSTS`
// is set — a host allowlist on top.
// ---------------------------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata']);
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal'];

function parseIpv4(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

/** RFC 1918 / loopback / link-local (incl. 169.254.169.254 metadata) / this-
 *  host / CGNAT / multicast / reserved — anything that is not a public unicast
 *  address. */
function isBlockedIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 0) return true;                       // 0.0.0.0/8
  if (a === 10) return true;                      // 10/8
  if (a === 127) return true;                     // 127/8
  if (a === 169 && b === 254) return true;        // 169.254/16 (metadata lives here)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true;        // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a >= 224) return true;                      // multicast + reserved
  return false;
}

/** The WHATWG parser hands IPv6 hosts back as `[...]`, lowercase and
 *  compressed. Enough structure is recoverable from that to classify. */
function isBlockedIpv6(bracketed: string): boolean {
  const ip = bracketed.slice(1, -1).toLowerCase();
  if (ip === '::' || ip === '::1') return true;   // unspecified, loopback
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(ip)) return true;          // fe80::/10 link-local
  // IPv4-mapped / -compatible (::ffff:a.b.c.d or ::a.b.c.d): judge the v4 part.
  const v4 = /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(ip)?.[1];
  if (v4) {
    const parts = parseIpv4(v4);
    return !parts || isBlockedIpv4(parts);
  }
  // Hex form of an IPv4-mapped address (::ffff:7f00:1).
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(ip)) {
    const [hi, lo] = ip.split(':').slice(-2).map((h) => parseInt(h, 16));
    return isBlockedIpv4([hi >> 8, hi & 0xff, lo >> 8, lo & 0xff]);
  }
  return false;
}

function allowedHostsFromEnv(): string[] {
  return (Deno.env.get('LLM_ALLOWED_HOSTS') ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** `api.example.com` matches the entry `api.example.com` exactly, or any
 *  entry it is a subdomain of (`example.com`, `.example.com`). */
function hostMatchesAllowlist(hostname: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => {
    const suffix = entry.startsWith('.') ? entry : `.${entry}`;
    return hostname === entry || hostname === entry.replace(/^\./, '') || hostname.endsWith(suffix);
  });
}

/**
 * Validates a provider base URL and returns it normalised (trailing slashes
 * stripped). Throws ProviderConfigError with a human-readable reason on any
 * violation. Exported for the admin function so a bad URL is rejected at
 * save time with a 400 rather than silently skipped at routing time.
 *
 * @param url       the operator-supplied base URL
 * @param options.allowedHosts overrides the `LLM_ALLOWED_HOSTS` env allowlist
 *   (mainly for tests); an empty list means "no allowlist", same as unset env.
 */
export function validateProviderBaseUrl(
  url: string,
  options: { allowedHosts?: string[] } = {},
): string {
  const raw = (url ?? '').trim();
  if (!raw) throw new ProviderConfigError('base URL is empty');

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ProviderConfigError(`base URL is not a valid absolute URL: ${raw}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new ProviderConfigError(`base URL must use https (got ${parsed.protocol.replace(':', '')})`, { url: raw });
  }
  if (parsed.username || parsed.password) {
    throw new ProviderConfigError('base URL must not embed credentials', { url: raw });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) throw new ProviderConfigError('base URL has no host', { url: raw });

  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_HOST_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new ProviderConfigError(`base URL host is not allowed: ${hostname}`, { url: raw });
  }
  if (hostname.startsWith('[')) {
    if (isBlockedIpv6(hostname)) {
      throw new ProviderConfigError(`base URL points at a private/loopback IPv6 address: ${hostname}`, { url: raw });
    }
  } else {
    const v4 = parseIpv4(hostname);
    if (v4 && isBlockedIpv4(v4)) {
      throw new ProviderConfigError(`base URL points at a private/loopback address: ${hostname}`, { url: raw });
    }
  }

  const allowlist = options.allowedHosts ?? allowedHostsFromEnv();
  if (allowlist.length > 0 && !hostMatchesAllowlist(hostname, allowlist)) {
    throw new ProviderConfigError(`base URL host ${hostname} is not in LLM_ALLOWED_HOSTS`, { url: raw });
  }

  return normalizeBaseUrl(parsed.toString());
}

// ---------------------------------------------------------------------------
// Pricing. USD per 1M tokens, keyed by model id (exact match first, then the
// longest key the model id starts with, so `gpt-5-2026-01-01` finds `gpt-5`).
// These are seed values for the cost column in llm_call_logs — treat them as
// approximate and override with LLM_PRICES, a JSON object of the same shape:
//   LLM_PRICES='{"deepseek-v4-pro":{"in":0.55,"out":2.19}}'
// An unknown model yields null so a missing price is never mistaken for free.
// ---------------------------------------------------------------------------

export interface ModelPrice {
  /** USD per 1M prompt (input) tokens. */
  in: number;
  /** USD per 1M completion (output) tokens. */
  out: number;
}

const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'deepseek-v4-pro':          { in: 0.55, out: 2.19 },
  'deepseek-v4-flash':        { in: 0.14, out: 0.28 },
  'kimi-k2.6':                { in: 0.60, out: 2.50 },
  'claude-opus-5':            { in: 15.0, out: 75.0 },
  'claude-sonnet-5':          { in: 3.0,  out: 15.0 },
  'claude-haiku-4-5':         { in: 1.0,  out: 5.0 },
  'gpt-5':                    { in: 1.25, out: 10.0 },
  'gpt-5-mini':               { in: 0.25, out: 2.0 },
  'llama-3.3-70b-versatile':  { in: 0.59, out: 0.79 },
  'llama-3.1-8b-instant':     { in: 0.05, out: 0.08 },
  'mistral-large-latest':     { in: 2.0,  out: 6.0 },
  'mistral-small-latest':     { in: 0.2,  out: 0.6 },
  // Gemini stays outside the router (vision/image only, _shared/gemini.ts)
  // but its calls are metered through the same table.
  'gemini-2.5-flash-image':   { in: 0.30, out: 30.0 },
  'gemini-2.5-flash':         { in: 0.30, out: 2.5 },
};

function isModelPrice(v: unknown): v is ModelPrice {
  return !!v && typeof v === 'object'
    && typeof (v as ModelPrice).in === 'number' && Number.isFinite((v as ModelPrice).in)
    && typeof (v as ModelPrice).out === 'number' && Number.isFinite((v as ModelPrice).out);
}

/** Built-in table merged with the `LLM_PRICES` JSON env override (override
 *  wins per key). A malformed override is logged and ignored, never fatal. */
export function getModelPrices(): Record<string, ModelPrice> {
  const raw = Deno.env.get('LLM_PRICES');
  if (!raw || raw.trim() === '') return DEFAULT_PRICES;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const merged: Record<string, ModelPrice> = { ...DEFAULT_PRICES };
    for (const [model, price] of Object.entries(parsed ?? {})) {
      if (isModelPrice(price)) merged[model] = price;
      else console.warn(`LLM_PRICES: ignoring malformed entry for ${model}`);
    }
    return merged;
  } catch (e) {
    console.warn('LLM_PRICES is not valid JSON; using built-in prices:', e instanceof Error ? e.message : e);
    return DEFAULT_PRICES;
  }
}

export function findModelPrice(model: string, prices: Record<string, ModelPrice> = getModelPrices()): ModelPrice | null {
  if (!model) return null;
  if (prices[model]) return prices[model];
  let best: string | null = null;
  for (const key of Object.keys(prices)) {
    if (model.startsWith(key) && (best === null || key.length > best.length)) best = key;
  }
  return best ? prices[best] : null;
}

/** USD cost of one call, rounded to micro-dollars; null when the model has
 *  no known price so the log column stays honest. */
export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
  prices?: Record<string, ModelPrice>,
): number | null {
  const price = findModelPrice(model, prices);
  if (!price) return null;
  const usd = (promptTokens * price.in + completionTokens * price.out) / 1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
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
  const cfg: ProviderConfig = {
    id,
    apiKeys: splitKeys(Deno.env.get(`${d.prefix}_API_KEYS`)),
    modelFull: full,
    // Providers without a lite tier reuse the full model rather than sending ''.
    modelLite: stringEnv(`${d.prefix}_MODEL_LITE`, d.modelLite || full),
    baseUrl: normalizeBaseUrl(stringEnv(`${d.prefix}_BASE_URL`, d.baseUrl)),
  };
  // `<PREFIX>_DIALECT` is the env-only way to make e.g. `custom` speak the
  // Anthropic Messages API; an unrecognised value is ignored (adapter by id).
  const dialect = Deno.env.get(`${d.prefix}_DIALECT`)?.trim().toLowerCase();
  if (isProviderDialect(dialect)) cfg.dialect = dialect;
  return cfg;
}

const PROVIDER_IDS = Object.keys(PROVIDER_DEFAULTS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDER_IDS.includes(value as ProviderId);
}

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
    // 2 retries = 3 attempts per key on transient errors (see keyPool.ts).
    retriesPerKey: Math.max(0, intEnv('LLM_RETRIES_PER_KEY', 2)),
    backoffBaseMs: Math.max(0, intEnv('LLM_BACKOFF_BASE_MS', 800)),
    rateLimitCooldownMs: intEnv('LLM_RATE_LIMIT_COOLDOWN_MS', 15_000),
    badKeyCooldownMs: intEnv('LLM_BAD_KEY_COOLDOWN_MS', 600_000),
  };
}

// ---------------------------------------------------------------------------
// Database-backed configuration.
// ---------------------------------------------------------------------------

/** One validated `llm_providers` row, ready to merge. `baseUrl` is either a
 *  URL that passed `validateProviderBaseUrl` or '' (inherit the default). */
interface ProviderRow {
  id: ProviderId;
  role: string;
  dialect?: ProviderDialect;
  baseUrl: string;
  modelFull: string;
  modelLite: string;
  apiKeys: string[];
}

/** How long a successful `llm_providers` read is reused before the table is
 *  hit again. Small on purpose: it turns one PostgREST round-trip per
 *  generation into one per ~20s per isolate, while keeping the **key-rotation
 *  window** short — after an admin replaces a key (or `invalidateLlmConfigCache()`
 *  is not reachable, e.g. from another isolate) the old key can still be used
 *  for at most this long. Env-derived values are never cached: they are
 *  re-read on every call and merged under the cached rows. */
export const LLM_CONFIG_CACHE_TTL_MS = 20_000;

let rowCache: { rows: ProviderRow[]; expiresAt: number } | null = null;

/** Drops the cached `llm_providers` rows so the next `getLlmConfigFromDb`
 *  re-reads the table. Call after an admin write in the same isolate; other
 *  isolates converge within `LLM_CONFIG_CACHE_TTL_MS`. */
export function invalidateLlmConfigCache(): void {
  rowCache = null;
}

/** Turns a raw row into a ProviderRow, or `null` (with a warning) when it
 *  cannot be routed to safely: unknown provider id, or a base URL that fails
 *  SSRF validation. A skipped row simply means "no override" — the provider's
 *  env defaults apply, so a bad admin save degrades, never breaks, routing. */
function validateRow(raw: Record<string, unknown>): ProviderRow | null {
  const id = raw.provider_id;
  if (!isProviderId(id)) {
    console.warn(`llm_providers: skipping row with unknown provider_id ${JSON.stringify(id)}`);
    return null;
  }
  let baseUrl = '';
  const rawUrl = typeof raw.base_url === 'string' ? raw.base_url.trim() : '';
  if (rawUrl) {
    try {
      baseUrl = validateProviderBaseUrl(rawUrl);
    } catch (e) {
      console.warn(`llm_providers: skipping ${id} row — ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  const dialectRaw = typeof raw.dialect === 'string' ? raw.dialect.toLowerCase() : undefined;
  return {
    id,
    role: String(raw.role ?? 'off'),
    dialect: isProviderDialect(dialectRaw) ? dialectRaw : undefined,
    baseUrl,
    modelFull: typeof raw.model_full === 'string' ? raw.model_full.trim() : '',
    modelLite: typeof raw.model_lite === 'string' ? raw.model_lite.trim() : '',
    apiKeys: Array.isArray(raw.api_keys) ? (raw.api_keys as unknown[]).map(String).map((k) => k.trim()).filter(Boolean) : [],
  };
}

async function loadProviderRows(
  // deno-lint-ignore no-explicit-any
  serviceClient: { from: (t: string) => any },
): Promise<ProviderRow[]> {
  const now = Date.now();
  if (rowCache && rowCache.expiresAt > now) return rowCache.rows;

  const { data, error } = await serviceClient
    .from('llm_providers')
    .select('provider_id, dialect, base_url, model_full, model_lite, api_keys, enabled, role');
  if (error) throw error;
  const rows: ProviderRow[] = [];
  if (Array.isArray(data)) {
    for (const raw of data as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object' || raw.enabled === false) continue;
      const row = validateRow(raw);
      if (row) rows.push(row);
    }
  }
  rowCache = { rows, expiresAt: now + LLM_CONFIG_CACHE_TTL_MS };
  return rows;
}

function mergeRow(row: ProviderRow | undefined, envCfg: ProviderConfig): ProviderConfig {
  if (!row) return envCfg;
  // Start from the provider's own env defaults so a row that sets only a
  // model still inherits the right base URL and keys.
  const base = providerConfig(row.id);
  const merged: ProviderConfig = {
    id: row.id,
    apiKeys: row.apiKeys.length > 0 ? row.apiKeys : base.apiKeys,
    modelFull: row.modelFull || base.modelFull,
    modelLite: row.modelLite || base.modelLite || row.modelFull || base.modelFull,
    baseUrl: row.baseUrl || base.baseUrl,
  };
  const dialect = row.dialect ?? base.dialect;
  if (dialect) merged.dialect = dialect;
  return merged;
}

/**
 * Database-backed configuration, layered over the env defaults.
 *
 * The admin panel writes `public.llm_providers`; this reads it with the
 * service-role client (that table has no RLS policies at all, so nothing else
 * can). A provider row overrides only the fields it actually sets, so an
 * operator can re-point a base URL from the panel while leaving keys in
 * `supabase secrets`. Rows whose `base_url` fails `validateProviderBaseUrl`
 * or whose `provider_id` is unknown are skipped with a warning.
 *
 * Falls back to `getLlmConfig()` on any failure — an unreachable or empty
 * table must never take LLM generation down, it just means "no overrides".
 * Rows are cached for `LLM_CONFIG_CACHE_TTL_MS`; env values never are.
 */
export async function getLlmConfigFromDb(
  // deno-lint-ignore no-explicit-any
  serviceClient: { from: (t: string) => any },
): Promise<LlmConfig> {
  const envConfig = getLlmConfig();
  try {
    const rows = await loadProviderRows(serviceClient);
    if (rows.length === 0) return envConfig;
    const pick = (role: string) => rows.find((r) => r.role === role);
    return {
      ...envConfig,
      primary: mergeRow(pick('primary'), envConfig.primary),
      fallback: mergeRow(pick('fallback'), envConfig.fallback),
    };
  } catch {
    // Config lookup must never be the reason a generation fails.
    return envConfig;
  }
}
