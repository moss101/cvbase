import { getSupabase } from '../supabase';
import { rowToArtifact, artifactToRow, type ArtifactInput, type ArtifactPatch } from './mappers';
import { getOwned, insertOne, isUuid, rows, updateWithRevision } from './repoUtils';
import type { ApplicationArtifact, ArtifactKind } from './types';

// Application preparation artifacts (cover letter, employer questions,
// LinkedIn, networking notes, interview stories, submission copies). A
// `snapshot` row is an immutable copy taken at submission time.

const TABLE = 'application_artifacts';
const ENTITY = 'application_artifact';

export async function list(userId: string, applicationId: string, kind?: ArtifactKind): Promise<ApplicationArtifact[]> {
  if (!isUuid(applicationId)) return [];
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('application_id', applicationId);
  if (kind) q = q.eq('kind', kind);
  q = q.order('created_at', { ascending: true });
  return (await rows(q)).map(rowToArtifact);
}

export async function get(userId: string, id: string): Promise<ApplicationArtifact> {
  return rowToArtifact(await getOwned(TABLE, ENTITY, userId, id));
}

/**
 * Create (no id) or update (id + expectedRevision) an artifact. Snapshot rows
 * are never edited; take a new snapshot instead.
 */
export async function save(
  userId: string,
  input: (ArtifactInput & { id?: undefined }) | (ArtifactPatch & { id: string }),
  expectedRevision?: number,
): Promise<ApplicationArtifact> {
  if (!input.id) {
    const create = input as ArtifactInput;
    return rowToArtifact(await insertOne(TABLE, artifactToRow({
      status: 'draft', provenance: {}, plainText: '', stale: false, ...create,
    }, userId)));
  }
  if (typeof expectedRevision !== 'number') throw new Error('artifact_update_requires_revision');
  const { id, ...patch } = input;
  if (patch.status === 'snapshot') throw new Error('artifact_snapshot_immutable');
  const current = await get(userId, id);
  if (current.status === 'snapshot') throw new Error('artifact_snapshot_immutable');
  const row = artifactToRow(patch, userId);
  delete row.user_id;
  delete row.application_id;
  return rowToArtifact(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

/** Immutable copy of the artifact as it is now (used by submission records). */
export async function snapshot(userId: string, artifactId: string): Promise<ApplicationArtifact> {
  const src = await get(userId, artifactId);
  return rowToArtifact(await insertOne(TABLE, artifactToRow({
    applicationId: src.applicationId,
    kind: src.kind,
    title: src.title,
    content: src.content,
    plainText: src.plainText,
    source: src.source,
    status: 'snapshot',
    snapshotOf: src.snapshotOf ?? src.id,
    provenance: { ...src.provenance, sourceRevisions: { ...(src.provenance.sourceRevisions ?? {}), [src.id]: src.revision } },
    stale: false,
  }, userId)));
}

/** Flag drafts built from facts that have since changed (never touches snapshots). */
export async function markStale(userId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await getSupabase().from(TABLE)
    .update({ stale: true }).eq('user_id', userId).in('id', ids).neq('status', 'snapshot').select('id');
  if (error) throw error;
  return (data ?? []).length;
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
