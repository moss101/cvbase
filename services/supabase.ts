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
    },
  });
  return client;
}

/** Convenience singleton for non-test callers. */
export const supabase: SupabaseClient = getSupabase();
