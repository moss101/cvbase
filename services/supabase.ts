import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getClientEnv } from '../config/env';

let client: SupabaseClient | null = null;

/** Lazily create and memoize the browser Supabase client (anon key only). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = getClientEnv();
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // completes the OAuth redirect on return
      /**
       * PKCE rather than the default implicit flow. Implicit returns tokens in
       * the URL *fragment*, which a native deep link never delivers to the app
       * and which leaks into browser history on the web. PKCE returns a
       * short-lived `code` in the query string that is exchanged for a session,
       * so one code path works on both. See services/authFlow.ts.
       */
      flowType: 'pkce',
    },
  });
  return client;
}

/** Convenience singleton for non-test callers. */
export const supabase: SupabaseClient = getSupabase();
