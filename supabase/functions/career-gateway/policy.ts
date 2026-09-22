import { HttpError } from '../_shared/respond.ts';

// =========================================================================
// Gateway policy primitives: the stable error vocabulary, canonical content
// hashing, confirmation tokens and context-revision checks. Everything here
// is pure (no I/O) so tools, receipts and the Coach grounding can share it
// and tests can exercise every branch without a database.
//
// Trust boundary: the model (via a Coach proposal) can only ever name a
// registered tool and an input that passes that tool's zod schema; the user
// id always comes from the JWT, never from the payload; a URL, SQL or a
// foreign id in an input is rejected by the schema or resolves to
// `not_found` without revealing whether the row exists.
// =========================================================================

export const GATEWAY_ERROR_CODES = [
  'invalid_request',
  'feature_disabled',
  'unknown_tool',
  'not_found',
  'stale_context',
  'confirmation_required',
  'confirmation_mismatch',
  'confirmation_expired',
  'limit_reached',
  'run_in_progress',
  'result_not_found',
  'timeout',
  'llm_unavailable',
  'bad_ai_output',
  'internal_error',
] as const;
export type GatewayErrorCode = (typeof GATEWAY_ERROR_CODES)[number];

/** Confirmation tokens are single-use and expire after this window. */
export const CONFIRMATION_TTL_MS = 10 * 60_000;
/** A `running` receipt with no heartbeat for this long is treated as
 *  interrupted (the worker died) and becomes a retryable failure. */
export const INTERRUPTED_AFTER_MS = 10 * 60_000;

export const notFound = (entity: string): HttpError => new HttpError(404, 'not_found', { entity });
export const invalid = (reason: string, extra: Record<string, unknown> = {}): HttpError =>
  new HttpError(400, 'invalid_request', { reason, ...extra });

// -------------------------------------------------------------------------
// Canonical JSON + hashing
// -------------------------------------------------------------------------

/** Deterministic JSON: object keys sorted recursively, `undefined` dropped,
 *  so the same proposal always hashes the same regardless of key order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Content hash a confirmation is bound to: the exact proposal, destination
 *  and the revision of whatever it would overwrite. */
export function contentHash(value: unknown): Promise<string> {
  return sha256Hex(canonicalJson(value));
}

/** 32 random bytes as hex — the confirmation token handed to the client. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string compare so a token guess cannot be timed. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// -------------------------------------------------------------------------
// Confirmation policy
// -------------------------------------------------------------------------

export interface StoredConfirmation {
  token: string;
  contentHash: string;
  destination?: string;
  expiresAt: string;
  confirmedAt?: string;
}

export interface ConfirmationClaim {
  token: string;
  contentHash: string;
}

/** Mint the receipt-side record for a proposal that needs confirmation. */
export function newConfirmation(hash: string, destination: string | undefined, now: number): StoredConfirmation {
  return {
    token: randomToken(),
    contentHash: hash,
    ...(destination ? { destination } : {}),
    expiresAt: new Date(now + CONFIRMATION_TTL_MS).toISOString(),
  };
}

/**
 * Verify a client confirmation against the stored one and the freshly
 * recomputed content hash. Order matters: a token that was already used or
 * does not match is a mismatch even when expired, and a changed proposal
 * (different current hash) invalidates a still-valid token.
 */
export function verifyConfirmation(
  stored: StoredConfirmation | null | undefined,
  claim: ConfirmationClaim,
  currentHash: string,
  now: number,
): void {
  if (!stored || stored.confirmedAt) throw new HttpError(409, 'confirmation_mismatch', { reason: 'no_pending_confirmation' });
  if (!safeEqual(stored.token, claim.token)) throw new HttpError(409, 'confirmation_mismatch', { reason: 'token' });
  if (!safeEqual(stored.contentHash, claim.contentHash) || !safeEqual(stored.contentHash, currentHash)) {
    throw new HttpError(409, 'confirmation_mismatch', { reason: 'content_changed', currentHash });
  }
  if (new Date(stored.expiresAt).getTime() <= now) throw new HttpError(409, 'confirmation_expired', { expiredAt: stored.expiresAt });
}

// -------------------------------------------------------------------------
// Context revisions
// -------------------------------------------------------------------------

export type Revisions = Record<string, number | string>;

/**
 * Compare the revisions the client acted on with the rows as they are now.
 * Only keys the client sent are compared (a client that sends nothing has
 * opted out of the check); a mismatch is 409 `stale_context` carrying the
 * current revisions so the client can re-read and retry.
 */
export function assertFreshContext(claimed: Revisions | undefined, current: Revisions): void {
  if (!claimed) return;
  const stale: string[] = [];
  for (const [key, value] of Object.entries(claimed)) {
    if (!(key in current)) continue;
    if (String(current[key]) !== String(value)) stale.push(key);
  }
  if (stale.length) throw new HttpError(409, 'stale_context', { stale, current });
}

/** Retryability of a receipt failure: our-side failures (5xx, provider
 *  outage, timeout) and quota exhaustion are worth retrying; a rejected
 *  input, a foreign id or a mismatched confirmation is not. */
export function isRetryable(err: unknown): boolean {
  if (!(err instanceof HttpError)) return true;
  if (err.code === 'limit_reached' || err.code === 'llm_unavailable' || err.code === 'timeout') return true;
  return err.status >= 500;
}
