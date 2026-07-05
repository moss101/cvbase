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
// still correct, just not yet informed by recent failures.
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

function setCooldown(provider: ProviderId, index: number, ms: number): void {
  cooldowns.set(cooldownKey(provider, index), { until: Date.now() + ms });
}

function rotationOrder(provider: ProviderId, poolSize: number): number[] {
  const start = cursors.get(provider) ?? 0;
  cursors.set(provider, (start + 1) % poolSize);
  return Array.from({ length: poolSize }, (_, i) => (start + i) % poolSize);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toProviderError(provider: ProviderId, e: unknown): ProviderError {
  if (e instanceof ProviderError) return e;
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new ProviderError(provider, 'timeout', undefined, `${provider}: request timed out`);
  }
  return new ProviderError(provider, 'unknown', undefined, e instanceof Error ? e.message : String(e));
}

export interface KeyPoolConfig {
  retriesPerKey: number;
  rateLimitCooldownMs: number;
  badKeyCooldownMs: number;
}

export interface KeyPoolCallResult {
  result: ProviderCallResult;
  keySlot: number;
}

/**
 * Tries every key in the pool (round-robin start, cooldown-skipped) before
 * giving up. Per key: a bounded transient-error retry (`retriesPerKey`,
 * 800ms*attempt backoff — ported from the old gemini.ts withRetry) — auth/
 * balance/rate_limit errors rotate to the next key immediately instead of
 * retrying the same one, since retrying won't help within this call. Only
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
  let lastErr: ProviderError | undefined;

  for (const index of order) {
    if (isOnCooldown(provider, index)) continue;
    const opts = makeCallOpts(apiKeys[index]);
    const maxAttempts = Math.max(1, cfg.retriesPerKey);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await call(opts);
        return { result, keySlot: index };
      } catch (e) {
        const err = toProviderError(provider, e);
        lastErr = err;
        if (err.kind === 'auth' || err.kind === 'balance') {
          setCooldown(provider, index, cfg.badKeyCooldownMs);
          break;
        }
        if (err.kind === 'rate_limit') {
          setCooldown(provider, index, cfg.rateLimitCooldownMs);
          break;
        }
        // transient / timeout / invalid_response / unknown: bounded retry
        // on this same key before moving on to the next one.
        if (attempt === maxAttempts - 1) break;
        await sleep(800 * (attempt + 1));
      }
    }
  }

  throw lastErr ?? new ProviderError(provider, 'unknown', undefined, `${provider}: key pool exhausted`);
}

/** Test-only: clears module-scope cooldown/cursor state so tests don't leak
 *  round-robin position or cooldowns across cases. Not used by production
 *  code paths. */
export function _resetKeyPoolStateForTests(): void {
  cooldowns.clear();
  cursors.clear();
}
