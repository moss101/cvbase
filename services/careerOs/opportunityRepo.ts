import { getSupabase } from '../supabase';
import { rowToOpportunity, opportunityToRow, type OpportunityPatch } from './mappers';
import { getOwned, insertOne, rows, updateWithRevision } from './repoUtils';
import { fingerprint, normaliseText } from './util';
import type { Opportunity, OpportunityInput, OpportunityStatus } from './types';

// User-owned opportunities with identity independent of applications. Views
// are filters over canonical rows; merges are reversible through `merge_undo`
// and never imply the two listings were verified to be the same vacancy.

const TABLE = 'opportunities';
const ENTITY = 'opportunity';

export type OpportunityView = 'all' | 'for_you' | 'saved' | 'watching' | 'applied' | 'not_interested' | 'archived';

/** Stable fingerprint over the captured listing text (whitespace/case-insensitive). */
export function contentFingerprint(capturedContent: string): string | null {
  const norm = normaliseText(capturedContent);
  return norm ? fingerprint(`opportunity|${norm}`) : null;
}

export async function list(userId: string, view: OpportunityView = 'all', opts: { includeMerged?: boolean } = {}): Promise<Opportunity[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (!opts.includeMerged) q = q.is('merged_into_id', null);
  switch (view) {
    case 'for_you': q = q.in('status', ['saved', 'watching']); break;
    case 'saved': q = q.eq('status', 'saved'); break;
    case 'watching': q = q.eq('status', 'watching'); break;
    case 'applied': q = q.eq('status', 'applied'); break;
    case 'not_interested': q = q.eq('status', 'not_interested'); break;
    case 'archived': q = q.eq('status', 'archived'); break;
    default: break;
  }
  q = q.order('updated_at', { ascending: false });
  return (await rows(q)).map(rowToOpportunity);
}

export async function get(userId: string, id: string): Promise<Opportunity> {
  return rowToOpportunity(await getOwned(TABLE, ENTITY, userId, id));
}

export async function create(userId: string, input: OpportunityInput): Promise<Opportunity> {
  const patch: OpportunityPatch = {
    ...input,
    contentFingerprint: input.contentFingerprint ?? contentFingerprint(input.capturedContent ?? ''),
  };
  return rowToOpportunity(await insertOne(TABLE, opportunityToRow(patch, userId)));
}

export async function update(userId: string, id: string, patch: OpportunityPatch, expectedRevision: number): Promise<Opportunity> {
  const row = opportunityToRow(patch, userId);
  delete row.user_id;
  if (patch.capturedContent !== undefined && patch.contentFingerprint === undefined) {
    row.content_fingerprint = contentFingerprint(patch.capturedContent);
  }
  return rowToOpportunity(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

export async function setStatus(
  userId: string, id: string, status: OpportunityStatus, expectedRevision: number, notInterestedReason?: string | null,
): Promise<Opportunity> {
  const patch: Record<string, unknown> = { status };
  if (status === 'not_interested') patch.not_interested_reason = notInterestedReason ?? null;
  return rowToOpportunity(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, patch));
}

// ---------------------------------------------------------------------------
// Duplicates, merge and unmerge
// ---------------------------------------------------------------------------

export interface DuplicateProbe { fingerprint?: string | null; title?: string; company?: string; excludeId?: string }
export interface DuplicateMatches {
  /** Same captured content: safe to treat as the same listing. */
  exact: Opportunity[];
  /** Same normalised title + company: a candidate only — company/title alone is not identity. */
  possible: Opportunity[];
}

export async function findDuplicates(userId: string, probe: DuplicateProbe): Promise<DuplicateMatches> {
  const exact: Opportunity[] = [];
  const possible: Opportunity[] = [];
  const seen = new Set<string>();
  if (probe.fingerprint) {
    const found = (await rows(
      getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('content_fingerprint', probe.fingerprint).is('merged_into_id', null),
    )).map(rowToOpportunity);
    for (const o of found) if (o.id !== probe.excludeId && !seen.has(o.id)) { seen.add(o.id); exact.push(o); }
  }
  const title = normaliseText(probe.title ?? '');
  const company = normaliseText(probe.company ?? '');
  if (title && company) {
    const found = (await rows(
      getSupabase().from(TABLE).select('*').eq('user_id', userId).ilike('title', title).ilike('company', company).is('merged_into_id', null),
    )).map(rowToOpportunity);
    for (const o of found) {
      if (o.id === probe.excludeId || seen.has(o.id)) continue;
      if (normaliseText(o.title) === title && normaliseText(o.company) === company) { seen.add(o.id); possible.push(o); }
    }
  }
  return { exact, possible };
}

export interface MergeUndo {
  targetId: string;
  mergedAt: string;
  /** Campaign memberships the source had before the merge. */
  campaignIds: string[];
  /** Memberships that were newly created on the target (removed on unmerge). */
  addedToTarget: string[];
  applicationIds: string[];
  analysisIds: string[];
}

const idsOf = (list: Record<string, unknown>[], key: string): string[] =>
  list.map((r) => r[key]).filter((v): v is string => typeof v === 'string');

/**
 * Merge `sourceId` into `targetId`: campaign memberships, applications and
 * analyses move to the target; the source records what moved so the merge
 * can be reversed. The source keeps its own captured content.
 */
export async function merge(userId: string, sourceId: string, targetId: string): Promise<{ source: Opportunity; target: Opportunity }> {
  if (sourceId === targetId) throw new Error('merge_same_opportunity');
  const source = await get(userId, sourceId);
  const target = await get(userId, targetId);
  if (source.mergedIntoId) throw new Error('opportunity_already_merged');
  if (target.mergedIntoId) throw new Error('merge_target_is_merged');
  const db = getSupabase();

  const sourceMemberships = idsOf(await rows(db.from('campaign_opportunities').select('campaign_id').eq('user_id', userId).eq('opportunity_id', sourceId)), 'campaign_id');
  const targetMemberships = new Set(idsOf(await rows(db.from('campaign_opportunities').select('campaign_id').eq('user_id', userId).eq('opportunity_id', targetId)), 'campaign_id'));
  const applicationIds = idsOf(await rows(db.from('job_applications').select('id').eq('user_id', userId).eq('opportunity_id', sourceId)), 'id');
  const analysisIds = idsOf(await rows(db.from('opportunity_analyses').select('id').eq('user_id', userId).eq('opportunity_id', sourceId)), 'id');
  const addedToTarget = sourceMemberships.filter((c) => !targetMemberships.has(c));

  if (addedToTarget.length > 0) {
    const { error } = await db.from('campaign_opportunities')
      .upsert(addedToTarget.map((campaignId) => ({ campaign_id: campaignId, opportunity_id: targetId, user_id: userId })), { onConflict: 'campaign_id,opportunity_id', ignoreDuplicates: true });
    if (error) throw error;
  }
  if (sourceMemberships.length > 0) {
    const { error } = await db.from('campaign_opportunities').delete().eq('user_id', userId).eq('opportunity_id', sourceId);
    if (error) throw error;
  }
  if (applicationIds.length > 0) {
    const { error } = await db.from('job_applications').update({ opportunity_id: targetId }).eq('user_id', userId).in('id', applicationIds);
    if (error) throw error;
  }
  if (analysisIds.length > 0) {
    // Analyses were computed against the source revision; they stay reviewable but stale.
    const { error } = await db.from('opportunity_analyses').update({ opportunity_id: targetId, stale: true }).eq('user_id', userId).in('id', analysisIds);
    if (error) throw error;
  }
  const undo: MergeUndo = {
    targetId, mergedAt: new Date().toISOString(), campaignIds: sourceMemberships, addedToTarget, applicationIds, analysisIds,
  };
  const merged = rowToOpportunity(await updateWithRevision(TABLE, ENTITY, userId, sourceId, source.revision, {
    merged_into_id: targetId, merge_undo: undo,
  }));
  return { source: merged, target };
}

/** Reverse a merge using the recorded undo snapshot. Surviving links are restored. */
export async function unmerge(userId: string, sourceId: string): Promise<Opportunity> {
  const source = await get(userId, sourceId);
  const undo = source.mergeUndo as Partial<MergeUndo> | null;
  if (!source.mergedIntoId || !undo || typeof undo.targetId !== 'string') throw new Error('opportunity_not_merged');
  const db = getSupabase();
  const targetId = undo.targetId;
  const applicationIds = Array.isArray(undo.applicationIds) ? undo.applicationIds : [];
  const analysisIds = Array.isArray(undo.analysisIds) ? undo.analysisIds : [];
  const campaignIds = Array.isArray(undo.campaignIds) ? undo.campaignIds : [];
  const addedToTarget = Array.isArray(undo.addedToTarget) ? undo.addedToTarget : [];

  if (applicationIds.length > 0) {
    const { error } = await db.from('job_applications').update({ opportunity_id: sourceId }).eq('user_id', userId).in('id', applicationIds);
    if (error) throw error;
  }
  if (analysisIds.length > 0) {
    const { error } = await db.from('opportunity_analyses').update({ opportunity_id: sourceId }).eq('user_id', userId).in('id', analysisIds);
    if (error) throw error;
  }
  if (addedToTarget.length > 0) {
    const { error } = await db.from('campaign_opportunities').delete().eq('user_id', userId).eq('opportunity_id', targetId).in('campaign_id', addedToTarget);
    if (error) throw error;
  }
  if (campaignIds.length > 0) {
    const { error } = await db.from('campaign_opportunities')
      .upsert(campaignIds.map((campaignId) => ({ campaign_id: campaignId, opportunity_id: sourceId, user_id: userId })), { onConflict: 'campaign_id,opportunity_id', ignoreDuplicates: true });
    if (error) throw error;
  }
  return rowToOpportunity(await updateWithRevision(TABLE, ENTITY, userId, sourceId, source.revision, { merged_into_id: null, merge_undo: null }));
}
