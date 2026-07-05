import { HttpError } from '../respond.ts';
import type { ProviderId } from './types.ts';

/** Why a single provider call ultimately failed, after the key pool gave up
 *  on it. Distinguishing these lets the router decide retry-same-key vs
 *  rotate-key vs give-up-on-provider without re-parsing error strings. */
export type FailureKind =
  | 'auth'
  | 'balance'
  | 'rate_limit'
  | 'transient'
  | 'invalid_response'
  | 'timeout'
  | 'unknown';

/** One provider's failure, carrying enough to log/route without ever
 *  including the API key itself. */
export class ProviderError extends Error {
  constructor(
    public provider: ProviderId,
    public kind: FailureKind,
    public status?: number,
    message?: string,
  ) {
    super(message ?? `${provider} ${kind}${status ? ` (${status})` : ''}`);
    this.name = 'ProviderError';
  }
}

/** Thrown when the primary provider's entire key pool AND the fallback
 *  provider's entire key pool have both failed. Extends HttpError so it
 *  flows through the existing `fail(err)` pipeline (respond.ts) unchanged —
 *  callers already do `catch (err) { return fail(err); }` everywhere. */
export class LlmAllProvidersFailedError extends HttpError {
  constructor(public primary: ProviderError, public fallback: ProviderError) {
    super(503, 'llm_unavailable', {
      primaryProvider: primary.provider,
      primaryKind: primary.kind,
      fallbackProvider: fallback.provider,
      fallbackKind: fallback.kind,
    });
    this.name = 'LlmAllProvidersFailedError';
  }
}
