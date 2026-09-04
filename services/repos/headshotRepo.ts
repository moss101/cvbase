import { getSupabase } from '../supabase';

// Client-side access to a user's OWN headshots rows (the index of private
// storage objects ai-headshot produces). Rows are written by the edge function
// (service role); reads go through RLS. Signed URLs come straight from
// storage: the headshots_owner_rw policy scopes the bucket to the caller's
// own {uid}/ folder, so the user JWT can sign its own paths.

const BUCKET = 'headshots';
export const HEADSHOT_URL_TTL_SECONDS = 60 * 60; // 1 hour

export interface Headshot {
  id: string;
  storagePath: string;
  createdAt: string;
}

export function rowToHeadshot(r: Record<string, unknown>): Headshot {
  return {
    id: String(r.id),
    storagePath: String(r.storage_path ?? ''),
    createdAt: String(r.created_at ?? ''),
  };
}

/** All of the user's headshots, newest first. */
export async function list(userId: string): Promise<Headshot[]> {
  const { data, error } = await getSupabase().from('headshots')
    .select('id,storage_path,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(rowToHeadshot);
}

/** Short-lived URL for one stored headshot (the bucket is private). */
export async function signedUrl(
  storagePath: string,
  expiresInSeconds = HEADSHOT_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await getSupabase().storage.from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
