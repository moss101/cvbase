import { corsHeaders } from './cors.ts';

/** A typed, client-safe error. `code` is a stable string the UI can branch on. */
export class HttpError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;
  constructor(status: number, code: string, extra?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** Optional per-response metadata. `requestId` is echoed both in the JSON
 *  error body and as an `x-request-id` header so a client-side error report
 *  can be matched to the structured server log line for the same request. */
export interface RespondInit {
  requestId?: string;
  headers?: Record<string, string>;
}

const json = (body: unknown, status: number, init: RespondInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      // Let browser clients read the correlation id / retry hint.
      'Access-Control-Expose-Headers': 'x-request-id, Retry-After',
      ...(init.requestId ? { 'x-request-id': init.requestId } : {}),
      ...(init.headers ?? {}),
    },
  });

/** 200 JSON. Backward compatible: `ok(data)` is unchanged; pass `{ requestId }`
 *  to add the header (the success body is left untouched so payload shapes
 *  the client already consumes stay stable). */
export function ok(data: unknown, init?: RespondInit): Response {
  return json(data, 200, init);
}

/** Error JSON `{ error: code, ...extra, requestId? }`. Non-HttpError values are
 *  masked as 500 `internal_error` (details go to the server log only). 429s
 *  carrying `retryAfterSec` also get a standard `Retry-After` header. */
export function fail(err: unknown, init?: RespondInit): Response {
  const e = err instanceof HttpError ? err : new HttpError(500, 'internal_error');
  if (!(err instanceof HttpError)) console.error('Unhandled function error:', err);
  const headers: Record<string, string> = { ...(init?.headers ?? {}) };
  const retryAfter = e.extra?.retryAfterSec;
  if (e.status === 429 && typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
    headers['Retry-After'] = String(Math.max(1, Math.ceil(retryAfter)));
  }
  return json(
    { error: e.code, ...(e.extra ?? {}), ...(init?.requestId ? { requestId: init.requestId } : {}) },
    e.status,
    { ...init, headers },
  );
}
