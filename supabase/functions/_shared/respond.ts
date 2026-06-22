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

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export function ok(data: unknown): Response {
  return json(data, 200);
}

export function fail(err: unknown): Response {
  const e = err instanceof HttpError ? err : new HttpError(500, 'internal_error');
  if (!(err instanceof HttpError)) console.error('Unhandled function error:', err);
  return json({ error: e.code, ...(e.extra ?? {}) }, e.status);
}
