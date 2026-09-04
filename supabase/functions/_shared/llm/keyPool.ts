import type { ProviderCall, ProviderCallOpts, ProviderCallResult, ProviderId } from './types.ts';
import { ProviderError } from './errors.ts';

// =========================================================================
// Round-robin key pool with per-key cooldowns. Round-robin (not sticky-
// first-key, not random) because it naturally spreads load across genuinely
// separate accounts when an operator provisions keys that way (the one case
// where pooling actually helps with rate limits — both DeepSeek's and
// Kimi's rate limits are account-level, not per-key, per their docs), while
// still degrading correctly to "try each key once, in order" when every key
// shares one account. Cooldown state is a module-scope in-memory Map —
// best-effort only, since edge isolates are short-lived: a cold isolate
// starts with an empty map and simply walks the pool from index 0, which is
// still correct, just not yet informed by recent failures. `initKeyHealth`
// narrows that gap by seeding the map from `llm_key_health` once per isolate.
// =========================================================================

interface CooldownState {
  until: number;
}

const cooldowns = new Map<string, CooldownState>();
const cursors = new Map<ProviderId, number>();

function cooldownKey(provider: ProviderId, index: number): string {
  return `${provider}:${index}`;
}

function isOnCooldown(provider: ProviderId, index: number): boolean {
  const state = cooldowns.get(cooldownKey(provider, index));
  return !!state && state.until > Date.now();
}

// ---------------------------------------------------------------------------
// Optional cross-isolate key health. A cooldown set in one isolate is
// invisible to the next cold start; persisting it lets a fresh isolate skip
// a key that is known to be dead. Strictly best-effort: the table may not
// exist yet, the read may fail, the write may race — none of that can
// affect a call.
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
type KeyHealthClient = { from: (t: string) => any };

let healthClient: KeyHealthClient | null = null;
let healthLoaded: Promise<void> | null = null;

/**
 * Seeds in-memory cooldowns from `llm_key_health` (rows whose
 * `cooldown_until` is still in the future) and remembers the client so later
 * cooldowns are written back. Idempotent — the load happens once per
 * isolate and later calls resolve immediately. Never rejects.
 */
export function initKeyHealth(client: KeyHealthClient): Promise<void> {
  healthClient = client;
  if (healthLoaded) return healthLoaded;
  healthLoaded = (async () => {
    try {
      const { data, error } = await client
        .from('llm_key_health')
        .select('provider_id, key_index, cooldown_until')
        .gt('cooldown_until', new Date().toISOString());
      if (error || !Array.isArray(data)) return;
      for (const row of data as Record<string, unknown>[]) {
        const provider = row?.provider_id;
        const index = row?.key_index;
        const until = typeof row?.cooldown_until === 'string' ? Date.parse(row.cooldown_until) : NaN;
        if (typeof provider !== 'string' || typeof index !== 'number' || !Number.isFinite(until)) continue;
        if (until > Date.now()) cooldowns.set(cooldownKey(provider as ProviderId, index), { until });
      }
    } catch {
      // A missing table or a transient read failure just means "start cold".
    }
  })();
  return healthLoaded;
}

function persistCooldown(provider: ProviderId, index: number, until: number, reason: string): void {
  if (!healthClient) return;
  try {
    const p = healthClient
      .from('llm_key_health')
      .upsert({
        provider_id: provider,
        key_index: index,
        cooldown_until: new Date(until).toISOString(),
        reason,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider_id,key_index' });
    // PostgREST builders are thenables; swallow whatever they settle to.
    Promise.resolve(p).then(() => {}, () => {});
  } catch {
    // never let the health write affect the call
  }
}

function setCooldown(provider: ProviderId, index: number, ms: number, reason: string): void {
  const until = Date.now() + ms;
  cooldowns.set(cooldownKey(provider, index), { until });
  if (ms > 0) persistCooldown(provider, index, until, reason);
}

function rotationOrder(provider: ProviderId, poolSize: number): number[] {
  const start = cursors.get(provider) ?? 0;
  cursors.set(provider, (start + 1) % poolSize);
  return Array.from({ length: poolSize }, (_, i) => (start + i) % poolSize);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toProviderError(provider: ProviderId, e: unknown): ProviderError {
  if (e instanceof ProviderError) return e;
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new ProviderError(provider, 'timeout', undefined, `${provider}: request timed out`);
  }
  return new ProviderError(provider, 'unknown', undefined, e instanceof Error ? e.message : String(e));
}

export const DEFAULT_BACKOFF_BASE_MS = 800;
export const MAX_BACKOFF_MS = 10_000;

/**
 * Full-jitter exponential backoff: `base * 2^retry * U(0.5, 1.5)`, capped at
 * MAX_BACKOFF_MS. `retry` is 0 for the wait before the first retry. Jitter
 * matters here because a provider-wide 503 hits every warm isolate at once;
 * without it they all retry in lockstep. `rand` is injectable for tests.
 */
export function backoffDelayMs(retry: number, baseMs: number = DEFAULT_BACKOFF_BASE_MS, rand: () => number = Math.random): number {
  if (baseMs <= 0) return 0;
  const raw = baseMs * Math.pow(2, Math.max(0, retry));
  const jittered = raw * (0.5 + rand());
  return Math.round(Math.min(MAX_BACKOFF_MS, jittered));
}

export interface KeyPoolConfig {
  /** Retries per key AFTER the first attempt, for transient errors only.
   *  `2` = 2 retries = 3 attempts. `0` disables retrying. */
  retriesPerKey: number;
  rateLimitCooldownMs: number;
  badKeyCooldownMs: number;
  /** Base for `backoffDelayMs`; defaults to 800ms. `0` disables the sleep. */
  backoffBaseMs?: number;
}

export interface KeyPoolCallResult {
  result: ProviderCallResult;
  keySlot: number;
}

/**
 * Tries every key in the pool (round-robin start, cooldown-skipped) before
 * giving up. Per key: the first attempt plus a bounded transient-error retry
 * budget (`retriesPerKey`, jittered exponential backoff between attempts) —
 * auth/balance/rate_limit errors rotate to the next key immediately instead
 * of retrying the same one, since retrying won't help within this call. Only
 * once every key has been tried (and, for transient errors, retried its
 * budget) does this throw — the router treats that as "pool exhausted" and
 * moves to the fallback provider. This is what prevents falling back on the
 * very first transient error: a single 503 on key 0 just rotates or retries,
 * it never escapes this function until the whole pool is spent.
 */
export async function callWithKeyPool(
  provider: ProviderId,
  apiKeys: string[],
  makeCallOpts: (apiKey: string) => ProviderCallOpts,
  call: ProviderCall,
  cfg: KeyPoolConfig,
): Promise<KeyPoolCallResult> {
  if (apiKeys.length === 0) {
    throw new ProviderError(provider, 'auth', undefined, `${provider}: no API keys configured`);
  }
  const order = rotationOrder(provider, apiKeys.length);
  const maxAttempts = 1 + Math.max(0, Math.floor(cfg.retriesPerKey));
  const backoffBase = cfg.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
  let lastErr: ProviderError | undefined;

  for (const index of order) {
    if (isOnCooldown(provider, index)) continue;
    const opts = makeCallOpts(apiKeys[index]);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await call(opts);
        return { result, keySlot: index };
      } catch (e) {
        const err = toProviderError(provider, e);
        lastErr = err;
        if (err.kind === 'auth' || err.kind === 'balance') {
          setCooldown(provider, index, cfg.badKeyCooldownMs, err.kind);
          break;
        }
        if (err.kind === 'rate_limit') {
          setCooldown(provider, index, cfg.rateLimitCooldownMs, err.kind);
          break;
        }
        // transient / timeout / invalid_response / unknown: bounded retry
        // on this same key before moving on to the next one.
        if (attempt === maxAttempts - 1) break;
        await sleep(backoffDelayMs(attempt, backoffBase));
      }
    }
  }

  throw lastErr ?? new ProviderError(provider, 'unknown', undefined, `${provider}: key pool exhausted`);
}

/** Test-only: clears module-scope cooldown/cursor/health state so tests
 *  don't leak round-robin position or cooldowns across cases. Not used by
 *  production code paths. */
export function _resetKeyPoolStateForTests(): void {
  cooldowns.clear();
  cursors.clear();
  healthClient = null;
  healthLoaded = null;
}
