import { serviceClient } from '../auth.ts';

/**
 * Opt-in response cache backed by `public.llm_response_cache`.
 *
 * Off by default: most calls here are personalised (a resume + a job ad) and
 * a repeat is rare. It exists for the callers that *do* repeat — the same
 * prompt re-run within a session, a deterministic classification — where a
 * hit saves the full provider latency and cost. A caller opts in per call
 * with `cache: { ttlSec }`; nothing is written without it.
 *
 * Key = sha256 of provider/model, the system + user prompt, and the schema
 * (tool name + normalised JSON Schema), so a model swap, a prompt edit, or a
 * schema change never serves a stale shape. The stored `response` is the
 * router's own `{ content?, data? }` payload, so a hit is indistinguishable
 * from a live result except for `cached: true`.
 *
 * Every operation is best-effort: a cache failure logs and the call
 * proceeds as if it missed. Expired rows are removed by `llm_cache_prune()`
 * (SQL) — there is no pg_cron on this project, so schedule it externally or
 * call it from an ops task.
 */

export interface CacheOptions {
  /** Seconds a stored response stays valid. Must be > 0. */
  ttlSec: number;
}

export interface CachedResponse {
  content?: string;
  data?: unknown;
}

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CacheKeyParts {
  provider: string;
  model: string;
  system: string;
  prompt: string;
  /** Tool name, or '' for a free-text call. */
  schemaName: string;
  /** Normalised JSON Schema, or undefined for a free-text call. */
  schema?: Record<string, unknown>;
}

/** Deterministic key. Each part is length-prefixed so `a`+`bc` and
 *  `ab`+`c` can never collide. */
export async function buildCacheKey(parts: CacheKeyParts): Promise<string> {
  const fields = [
    `${parts.provider}/${parts.model}`,
    parts.system,
    parts.prompt,
    parts.schemaName,
    parts.schema ? JSON.stringify(parts.schema) : '',
  ];
  return sha256Hex(fields.map((f) => `${f.length}:${f}`).join('|'));
}

function isCacheRow(v: unknown): v is { response: CachedResponse; expires_at: string } {
  if (!v || typeof v !== 'object') return false;
  const row = v as Record<string, unknown>;
  return !!row.response && typeof row.response === 'object' && typeof row.expires_at === 'string';
}

/** A valid, unexpired entry or null. Never throws. */
export async function cacheGet(key: string): Promise<CachedResponse | null> {
  try {
    const { data, error } = await serviceClient()
      .from('llm_response_cache')
      .select('response, expires_at')
      .eq('key', key)
      .maybeSingle();
    if (error || !isCacheRow(data)) return null;
    if (Date.parse(data.expires_at) <= Date.now()) return null;
    return data.response;
  } catch (e) {
    console.warn('llm_response_cache read failed (non-fatal):', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Upserts an entry. Never throws. */
export async function cacheSet(key: string, model: string, response: CachedResponse, ttlSec: number): Promise<void> {
  if (!(ttlSec > 0)) return;
  try {
    const { error } = await serviceClient()
      .from('llm_response_cache')
      .upsert({
        key,
        response,
        model,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
      }, { onConflict: 'key' });
    if (error) console.warn('llm_response_cache write failed (non-fatal):', error.message ?? error);
  } catch (e) {
    console.warn('llm_response_cache write failed (non-fatal):', e instanceof Error ? e.message : e);
  }
}
