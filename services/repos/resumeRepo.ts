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

export async function count(userId: string): Promise<number> {
  const { count: n, error } = await getSupabase().from('resumes')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return n ?? 0;
}

export async function get(userId: string, id: string): Promise<StoredResume | null> {
  const { data, error } = await getSupabase().from('resumes')
    .select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToResume(data as Record<string, unknown>) : null;
}

/** Create a new (non-primary) resume. Caller is responsible for plan-limit checks. */
export async function create(userId: string, r: Partial<StoredResume>): Promise<StoredResume> {
  const row = resumeToRow({
    title: 'Untitled resume', isPrimary: false, ...r,
  }, userId);
  delete (row as Record<string, unknown>).id; // let Postgres assign the id
  const { data, error } = await getSupabase().from('resumes').insert(row).select('*').single();
  if (error) throw error;
  return rowToResume(data as Record<string, unknown>);
}

/** Duplicate an existing resume into a new non-primary copy. */
export async function duplicate(userId: string, id: string): Promise<StoredResume> {
  const src = await get(userId, id);
  if (!src) throw new Error('resume_not_found');
  return create(userId, {
    title: `${src.title} (copy)`,
    data: src.data,
    settings: src.settings,
    templateId: src.templateId,
    visibleSections: src.visibleSections,
    isPrimary: false,
  });
}

export async function rename(userId: string, id: string, title: string): Promise<void> {
  const { error } = await getSupabase().from('resumes')
    .update({ title: title.trim() || 'Untitled resume' }).eq('user_id', userId).eq('id', id);
  if (error) throw error;
}

/** Persist edits to a specific resume by id (the multi-resume editor auto-save). */
export async function saveById(userId: string, id: string, r: Partial<StoredResume>): Promise<void> {
  const { error } = await getSupabase().from('resumes')
    .update(resumeToRow({ ...r, id: undefined }, userId)).eq('user_id', userId).eq('id', id);
  if (error) throw error;
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from('resumes')
    .delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
