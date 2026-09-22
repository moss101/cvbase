import { getSupabase } from '../supabase';
import { rowToCampaign, campaignToRow, rowToApplication, type CampaignInput, type CampaignPatch } from './mappers';
import { getOwned, insertOne, isUuid, rows, updateWithRevision } from './repoUtils';
import type { ApplicationRecord, Campaign, CampaignStatus } from './types';

// Campaigns coordinate one goal's pursuit. An opportunity may sit in several
// campaigns; an application has one owning campaign or none, and assigning
// it never copies the application.

const TABLE = 'campaigns';
const MEMBERS_TABLE = 'campaign_opportunities';
const ENTITY = 'campaign';

export async function list(userId: string, status: CampaignStatus | 'any' = 'any'): Promise<Campaign[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (status !== 'any') q = q.eq('status', status);
  q = q.order('updated_at', { ascending: false });
  return (await rows(q)).map(rowToCampaign);
}

export async function get(userId: string, id: string): Promise<Campaign> {
  return rowToCampaign(await getOwned(TABLE, ENTITY, userId, id));
}

export async function create(userId: string, input: CampaignInput): Promise<Campaign> {
  return rowToCampaign(await insertOne(TABLE, campaignToRow({ status: 'active', milestones: [], notes: '', ...input }, userId)));
}

export async function update(userId: string, id: string, patch: CampaignPatch, expectedRevision: number): Promise<Campaign> {
  const row = campaignToRow(patch, userId);
  delete row.user_id;
  return rowToCampaign(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

export async function pause(userId: string, id: string, expectedRevision: number): Promise<Campaign> {
  return rowToCampaign(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { status: 'paused' }));
}

export async function close(userId: string, id: string, expectedRevision: number, reason: string | null = null): Promise<Campaign> {
  return rowToCampaign(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { status: 'closed', closed_reason: reason }));
}

export async function reopen(userId: string, id: string, expectedRevision: number): Promise<Campaign> {
  return rowToCampaign(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { status: 'active', closed_reason: null }));
}

/** Idempotent membership add (same-owner FK rejects foreign ids server-side). */
export async function addOpportunity(userId: string, campaignId: string, opportunityId: string): Promise<void> {
  const { error } = await getSupabase().from(MEMBERS_TABLE)
    .upsert({ campaign_id: campaignId, opportunity_id: opportunityId, user_id: userId }, { onConflict: 'campaign_id,opportunity_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeOpportunity(userId: string, campaignId: string, opportunityId: string): Promise<void> {
  const { error } = await getSupabase().from(MEMBERS_TABLE)
    .delete().eq('user_id', userId).eq('campaign_id', campaignId).eq('opportunity_id', opportunityId);
  if (error) throw error;
}

export async function listOpportunityIds(userId: string, campaignId: string): Promise<string[]> {
  if (!isUuid(campaignId)) return [];
  const found = await rows(
    getSupabase().from(MEMBERS_TABLE).select('opportunity_id').eq('user_id', userId).eq('campaign_id', campaignId).order('created_at', { ascending: true }),
  );
  return found.map((r) => r.opportunity_id).filter((v): v is string => typeof v === 'string');
}

/** Campaign ids an opportunity belongs to (many-to-many). */
export async function listCampaignIdsForOpportunity(userId: string, opportunityId: string): Promise<string[]> {
  if (!isUuid(opportunityId)) return [];
  const found = await rows(
    getSupabase().from(MEMBERS_TABLE).select('campaign_id').eq('user_id', userId).eq('opportunity_id', opportunityId),
  );
  return found.map((r) => r.campaign_id).filter((v): v is string => typeof v === 'string');
}

/**
 * Set (or clear with null) the owning campaign of an existing application.
 * Touches only job_applications.campaign_id — never duplicates the record.
 */
export async function assignApplication(
  userId: string, applicationId: string, campaignId: string | null, expectedRevision: number,
): Promise<ApplicationRecord> {
  return rowToApplication(await updateWithRevision('job_applications', 'application', userId, applicationId, expectedRevision, { campaign_id: campaignId }));
}
