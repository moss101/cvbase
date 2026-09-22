import { getSupabase } from '../supabase';
import { rowToAnalysis, analysisToRow, type AnalysisInput } from './mappers';
import { getOwned, insertOne, isUuid, rows } from './repoUtils';
import type { OpportunityAnalysis } from './types';

// Versioned fit projections. Each row records the opportunity, goal and facts
// revisions it was computed from; a change to any of them marks it stale
// rather than silently recomputing.

const TABLE = 'opportunity_analyses';
const ENTITY = 'opportunity_analysis';

export async function latestForOpportunity(userId: string, opportunityId: string): Promise<OpportunityAnalysis | null> {
  if (!isUuid(opportunityId)) return null;
  const { data, error } = await getSupabase().from(TABLE)
    .select('*').eq('user_id', userId).eq('opportunity_id', opportunityId)
    .order('computed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? rowToAnalysis(data as Record<string, unknown>) : null;
}

export async function listForOpportunity(userId: string, opportunityId: string): Promise<OpportunityAnalysis[]> {
  if (!isUuid(opportunityId)) return [];
  return (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('opportunity_id', opportunityId).order('computed_at', { ascending: false }),
  )).map(rowToAnalysis);
}

/** Latest analysis per opportunity for the owner (one query; reduced client-side). */
export async function listLatest(userId: string): Promise<OpportunityAnalysis[]> {
  const all = (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).order('computed_at', { ascending: false }),
  )).map(rowToAnalysis);
  const seen = new Set<string>();
  return all.filter((a) => (seen.has(a.opportunityId) ? false : (seen.add(a.opportunityId), true)));
}

export async function get(userId: string, id: string): Promise<OpportunityAnalysis> {
  return rowToAnalysis(await getOwned(TABLE, ENTITY, userId, id));
}

export async function save(userId: string, input: AnalysisInput): Promise<OpportunityAnalysis> {
  return rowToAnalysis(await insertOne(TABLE, analysisToRow(input, userId)));
}

async function markStale(userId: string, refine: (q: ReturnType<ReturnType<typeof getSupabase>['from']>) => unknown): Promise<number> {
  const base = getSupabase().from(TABLE);
  const q = (refine(base) as { select: (cols: string) => PromiseLike<{ data: unknown; error: unknown }> }).select('id');
  return (await rows(q)).length;
}

export async function markStaleForGoal(userId: string, goalId: string): Promise<number> {
  return markStale(userId, (b) => b.update({ stale: true }).eq('user_id', userId).eq('goal_id', goalId).eq('stale', false));
}

export async function markStaleForOpportunity(userId: string, opportunityId: string): Promise<number> {
  return markStale(userId, (b) => b.update({ stale: true }).eq('user_id', userId).eq('opportunity_id', opportunityId).eq('stale', false));
}

/** Every analysis not computed from the current facts revision. */
export async function markStaleForFacts(userId: string, currentFactsRevision: string): Promise<number> {
  return markStale(userId, (b) => b.update({ stale: true }).eq('user_id', userId).neq('facts_revision', currentFactsRevision).eq('stale', false));
}
