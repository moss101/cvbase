import { getSupabase } from '../supabase';
import {
  rowToFact, factToRow, rowToFactReference, factReferenceToRow,
  type FactInput, type FactPatch, type FactReferenceInput,
} from './mappers';
import { assertUuid, getOwned, isUuid, rows, updateWithRevision } from './repoUtils';
import { NotFoundError, type CareerFact, type FactArtifactKind, type FactKind, type FactReference, type FactStatus, type FactVerification, type ReviewState, type StaleReference } from './types';

// Canonical career facts (claims with provenance) and their artifact edges.
// Imports arrive as unconfirmed candidates; only the user moves a fact to
// user_confirmed, and `verified` needs a recorded method/source/time.

const TABLE = 'career_facts';
const REF_TABLE = 'career_fact_references';
const ENTITY = 'career_fact';

export interface FactFilter {
  kind?: FactKind | FactKind[];
  /** Defaults to 'active'; pass 'any' to include withdrawn and deleted tombstones. */
  status?: FactStatus | 'any';
  reviewState?: ReviewState;
  parentFactId?: string;
}

export async function list(userId: string, filter: FactFilter = {}): Promise<CareerFact[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  const status = filter.status ?? 'active';
  if (status !== 'any') q = q.eq('status', status);
  if (Array.isArray(filter.kind)) q = q.in('kind', filter.kind);
  else if (filter.kind) q = q.eq('kind', filter.kind);
  if (filter.reviewState) q = q.eq('review_state', filter.reviewState);
  if (filter.parentFactId) q = q.eq('parent_fact_id', filter.parentFactId);
  q = q.order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  return (await rows(q)).map(rowToFact);
}

export async function get(userId: string, id: string): Promise<CareerFact> {
  return rowToFact(await getOwned(TABLE, ENTITY, userId, id));
}

/**
 * Bulk insert candidates. Rows whose (user, source_fingerprint) already exist
 * — including deleted tombstones — are skipped, so a re-import is idempotent
 * and an earlier deletion is honoured. Returns only the rows actually inserted.
 */
export async function createMany(userId: string, inputs: FactInput[]): Promise<CareerFact[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await getSupabase().from(TABLE)
    .upsert(inputs.map((f) => factToRow(f, userId)), { onConflict: 'user_id,source_fingerprint', ignoreDuplicates: true })
    .select('*');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(rowToFact);
}

export async function create(userId: string, input: FactInput): Promise<CareerFact> {
  const { data, error } = await getSupabase().from(TABLE).insert(factToRow(input, userId)).select('*').single();
  if (error) throw error;
  return rowToFact(data as Record<string, unknown>);
}

export async function update(userId: string, id: string, patch: FactPatch, expectedRevision: number): Promise<CareerFact> {
  const row = factToRow(patch, userId);
  delete row.user_id;
  return rowToFact(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

/** User affirmation of an imported/inferred claim. Never produces `verified`. */
export async function confirm(userId: string, id: string, expectedRevision: number): Promise<CareerFact> {
  return update(userId, id, { confirmationState: 'user_confirmed', reviewState: 'reviewed' }, expectedRevision);
}

/** Verified requires a recorded method, source and time (mirrors the CHECK constraint). */
export async function verify(userId: string, id: string, expectedRevision: number, verification: FactVerification): Promise<CareerFact> {
  if (!verification?.method || !verification.source || !verification.verifiedAt) {
    throw new Error('verification_requires_method_source_time');
  }
  return update(userId, id, { confirmationState: 'verified', verification, reviewState: 'reviewed' }, expectedRevision);
}

export async function withdraw(userId: string, id: string, expectedRevision: number): Promise<CareerFact> {
  return update(userId, id, { status: 'withdrawn' }, expectedRevision);
}

/**
 * Tombstone: the narrative is redacted and the row stays so references and
 * the source fingerprint survive (a re-import will not resurrect it).
 */
export async function softDelete(userId: string, id: string, expectedRevision: number): Promise<CareerFact> {
  return update(userId, id, { status: 'deleted', narrative: '' }, expectedRevision);
}

/**
 * Resolve a conflict group: the winner is reviewed and leaves the group; every
 * other member is withdrawn with its provenance intact. Nothing is merged.
 */
export async function resolveConflict(userId: string, groupId: string, winnerId: string): Promise<{ winner: CareerFact; withdrawn: CareerFact[] }> {
  if (!isUuid(groupId)) throw new NotFoundError('conflict_group', groupId);
  assertUuid(ENTITY, winnerId);
  const members = (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('conflict_group', groupId),
  )).map(rowToFact);
  const winnerRow = members.find((m) => m.id === winnerId);
  if (!winnerRow) throw new NotFoundError(ENTITY, winnerId);
  const winner = await update(userId, winnerId, { reviewState: 'reviewed', conflictGroup: null }, winnerRow.revision);
  const withdrawn: CareerFact[] = [];
  for (const m of members) {
    if (m.id === winnerId) continue;
    withdrawn.push(await update(userId, m.id, { status: 'withdrawn', reviewState: 'reviewed' }, m.revision));
  }
  return { winner, withdrawn };
}

// ---------------------------------------------------------------------------
// References (claim -> artifact edges)
// ---------------------------------------------------------------------------

export async function listForFact(userId: string, factId: string): Promise<FactReference[]> {
  if (!isUuid(factId)) return [];
  return (await rows(
    getSupabase().from(REF_TABLE).select('*').eq('user_id', userId).eq('fact_id', factId).order('created_at', { ascending: true }),
  )).map(rowToFactReference);
}

export async function listForArtifact(userId: string, artifactKind: FactArtifactKind, artifactId: string): Promise<FactReference[]> {
  if (!isUuid(artifactId)) return [];
  return (await rows(
    getSupabase().from(REF_TABLE).select('*').eq('user_id', userId).eq('artifact_kind', artifactKind).eq('artifact_id', artifactId),
  )).map(rowToFactReference);
}

/** Idempotent: an edge that already exists for the same section is kept as is. */
export async function addReferences(userId: string, refs: FactReferenceInput[]): Promise<FactReference[]> {
  if (refs.length === 0) return [];
  const { data, error } = await getSupabase().from(REF_TABLE)
    .upsert(refs.map((r) => factReferenceToRow(r, userId)), { onConflict: 'fact_id,artifact_kind,artifact_id,artifact_section', ignoreDuplicates: true })
    .select('*');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(rowToFactReference);
}

/** Edges recorded against an older fact revision than the fact now carries. */
export async function staleReferences(userId: string): Promise<StaleReference[]> {
  const refs = (await rows(getSupabase().from(REF_TABLE).select('*').eq('user_id', userId))).map(rowToFactReference);
  if (refs.length === 0) return [];
  const facts = (await rows(
    getSupabase().from(TABLE).select('id,revision').eq('user_id', userId).in('id', Array.from(new Set(refs.map((r) => r.factId)))),
  ));
  const current = new Map<string, number>();
  for (const f of facts) if (typeof f.id === 'string' && typeof f.revision === 'number') current.set(f.id, f.revision);
  return refs.flatMap((r) => {
    const rev = current.get(r.factId);
    return rev !== undefined && r.factRevision < rev ? [{ ...r, currentRevision: rev }] : [];
  });
}
