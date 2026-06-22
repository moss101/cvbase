import { getSupabase } from '../supabase';
import { rowToResume, resumeToRow, type StoredResume } from './mappers';

export async function getPrimary(userId: string): Promise<StoredResume | null> {
  const { data, error } = await getSupabase().from('resumes')
    .select('*').eq('user_id', userId).eq('is_primary', true).maybeSingle();
  if (error) throw error;
  return data ? rowToResume(data as Record<string, unknown>) : null;
}

export async function upsertPrimary(userId: string, r: StoredResume): Promise<StoredResume> {
  const existing = await getPrimary(userId);
  const row = {
    ...resumeToRow({ ...r, isPrimary: true }, userId),
    ...(existing?.id ? { id: existing.id } : {}),
  };
  const { data, error } = await getSupabase().from('resumes').upsert(row).select('*').single();
  if (error) throw error;
  return rowToResume(data as Record<string, unknown>);
}

export async function list(userId: string): Promise<StoredResume[]> {
  const { data, error } = await getSupabase().from('resumes')
    .select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => rowToResume(d as Record<string, unknown>));
}
