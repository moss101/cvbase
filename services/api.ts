import { getSupabase } from './supabase';
import { getClientEnv } from '../config/env';

export interface FnError extends Error {
  code?: string;
  status?: number;
  extra?: unknown;
}

/**
 * Call a Supabase Edge Function with the current user's JWT. On a non-2xx
 * response, throws an Error whose `code` is the function's stable error string
 * (e.g. 'limit_reached', 'feature_locked', 'invalid_token') so the UI can branch
 * (show an upgrade prompt, etc.).
 */
export async function callFn<T = unknown>(name: string, body?: unknown): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = getClientEnv();
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token ?? supabaseAnonKey;

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      (typeof json.error === 'string' && json.error) || `function_error_${res.status}`,
    ) as FnError;
    err.code = typeof json.error === 'string' ? json.error : undefined;
    err.status = res.status;
    err.extra = json;
    throw err;
  }
  return json as T;
}
