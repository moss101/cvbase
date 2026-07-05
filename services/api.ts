import { getSupabase } from './supabase';
import { getClientEnv } from '../config/env';

export interface FnError extends Error {
  code?: string;
  status?: number;
  extra?: unknown;
}

/** Build the authenticated request for an Edge Function call: current user's
 *  JWT (anon key when signed out) + standard headers. Shared by callFn and
 *  streamFn so auth changes land in exactly one place. */
async function fnRequest(name: string, body: unknown): Promise<Response> {
  const { supabaseUrl, supabaseAnonKey } = getClientEnv();
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token ?? supabaseAnonKey;

  return fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
}

/** Coerce a non-2xx function response into the coded FnError the UI branches
 *  on (`code` is the function's stable error string, e.g. 'limit_reached'). */
function toFnError(res: Response, json: Record<string, unknown>): FnError {
  const err = new Error(
    (typeof json.error === 'string' && json.error) || `function_error_${res.status}`,
  ) as FnError;
  err.code = typeof json.error === 'string' ? json.error : undefined;
  err.status = res.status;
  err.extra = json;
  return err;
}

/**
 * Call a Supabase Edge Function with the current user's JWT. On a non-2xx
 * response, throws an Error whose `code` is the function's stable error string
 * (e.g. 'limit_reached', 'feature_locked', 'invalid_token') so the UI can branch
 * (show an upgrade prompt, etc.).
 */
export async function callFn<T = unknown>(name: string, body?: unknown): Promise<T> {
  const res = await fnRequest(name, body);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw toFnError(res, json);
  return json as T;
}

/**
 * Call a streaming (NDJSON) Edge Function. Each complete line is parsed and
 * passed to `onEvent` in order. Non-2xx responses throw the same coded FnError
 * as callFn; errors that occur mid-stream arrive as an in-band event (the
 * function has already committed to a 200 by then).
 */
export async function streamFn(
  name: string,
  body: unknown,
  onEvent: (event: Record<string, unknown>) => void,
): Promise<void> {
  const res = await fnRequest(name, body);
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw toFnError(res, json);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as Record<string, unknown>);
      } catch { /* skip malformed line */ }
    }
  }
}
