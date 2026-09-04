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

/**
 * A provider is misconfigured — unknown provider id, no adapter for its
 * dialect, or a base URL that fails SSRF validation. Raised by config.ts and
 * router.ts and re-thrown as-is by the router: a config problem is not a
 * provider outage, so it must NOT be laundered into a fallback call, and it
 * must name what is wrong. Extends HttpError (500 `llm_config_error`) so the
 * existing `fail(err)` pipeline returns a stable code, and the admin function
 * can `instanceof` it to map to a 400 when validating operator input.
 */
export class ProviderConfigError extends HttpError {
  constructor(message: string, extra: Record<string, unknown> = {}) {
    super(500, 'llm_config_error', { ...extra, reason: message });
    this.name = 'ProviderConfigError';
    this.message = message;
  }
}

/**
 * The provider answered successfully but the payload does not parse as the
 * structured output we asked for (malformed tool-call JSON, non-JSON text
 * where JSON was required). This is a *validation* failure, not a transport
 * failure: the router never falls back on it (a second provider call would
 * just spend tokens re-rolling the dice), and it surfaces as the same
 * `502 bad_ai_output` that validateShape already uses so callers see one
 * error code for "the model gave us garbage".
 */
export class SchemaViolationError extends HttpError {
  constructor(public provider: ProviderId, message: string, public raw?: string) {
    super(502, 'bad_ai_output', { provider, reason: message });
    this.name = 'SchemaViolationError';
    this.message = message;
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
