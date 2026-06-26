import { getSupabase } from '../supabase';
import { rowToVersion, versionToRow, type StoredVersion } from './mappers';
import type { ResumeData } from '../../types';

/**
 * Saved snapshots of a resume (the W6 version manager), backed by the
 * `resume_versions` table. RLS scopes every row to its owner; a version always
 * belongs to one resume and is immutable once written (snapshot semantics).
 */

const MAX_LABEL = 80;

/** Save the current resume data as a new immutable version snapshot. */
export async function snapshot(
  userId: string,
  resumeId: string,
  label: string,
  data: ResumeData,
): Promise<StoredVersion> {
  const clean = (label || '').trim().slice(0, MAX_LABEL) || new Date().toLocaleString();
  const row = versionToRow({ resumeId, label: clean, data }, userId);
  const { data: out, error } = await getSupabase()
    .from('resume_versions').insert(row).select('*').single();
  if (error) throw error;
  return rowToVersion(out as Record<string, unknown>);
}

/** List a resume's versions, newest first. */
export async function listForResume(userId: string, resumeId: string): Promise<StoredVersion[]> {
  const { data, error } = await getSupabase()
    .from('resume_versions')
    .select('*')
    .eq('user_id', userId)
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => rowToVersion(d as Record<string, unknown>));
}

/** Permanently delete a single version. */
export async function remove(userId: string, versionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('resume_versions').delete().eq('user_id', userId).eq('id', versionId);
  if (error) throw error;
}
