import { getSupabase } from '../supabase';
import { rowToResume, resumeToRow, type StoredResume } from './mappers';
import { ConflictError, NotFoundError } from '../careerOs/types';

/** What a precondition-checked write returns: the row's new server-owned
 *  revision/timestamp so the caller can send them with its next write. */
export interface SavedRevision {
  id: string;
  revision: number | null;
  updatedAt: string | null;
}

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

/**
 * Persist edits to a specific resume by id (the multi-resume editor auto-save).
 *
 * With `expectedRevision` the update is an optimistic-concurrency write: it
 * only applies when the row still carries that revision. Zero affected rows
 * then means another device saved first and is surfaced as a `ConflictError`
 * (the caller stages a conflict instead of overwriting). Without a
 * precondition, zero rows means the row is gone or not owned by this user —
 * a `NotFoundError`, never a silent no-op that claims success.
 */
export async function saveById(
  userId: string, id: string, r: Partial<StoredResume>, expectedRevision?: number,
): Promise<SavedRevision> {
  let query = getSupabase().from('resumes')
    .update(resumeToRow({ ...r, id: undefined }, userId)).eq('user_id', userId).eq('id', id);
  if (expectedRevision !== undefined) query = query.eq('revision', expectedRevision);
  const { data, error } = await query.select('id,revision,updated_at');
  if (error) throw error;
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) {
    if (expectedRevision !== undefined) throw new ConflictError('resume', id, expectedRevision);
    throw new NotFoundError('resume', id);
  }
  return {
    id: typeof row.id === 'string' ? row.id : id,
    revision: typeof row.revision === 'number' ? row.revision : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from('resumes')
    .delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
