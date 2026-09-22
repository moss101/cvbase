/**
 * Canonical context projection (COS-006). Resolves one owned subject from a
 * route, then its related context from persisted relationships. Query hints
 * are validated, never applied over a persisted relation; a contradiction is
 * reported as a ContextConflict and the authoritative relation is kept.
 */
import type {
  ApplicationRecord, Campaign, CareerContext, CareerGoal, CareerProfile, ContextConflict, ContextRefs, ContextSource,
  Opportunity, Ref,
} from './types';
import { NotFoundError } from './types';

export const PROJECTION_VERSION = 1;

export type ContextField = 'goal' | 'campaign' | 'opportunity' | 'application' | 'document';

export interface ContextRoute {
  goal?: string;
  campaign?: string;
  opportunity?: string;
  application?: string;
  document?: string;
  conversation?: string;
}

/** A hint is an id, or a Ref when the caller also knows the revision it last saw. */
export type ContextHints = Partial<Record<ContextField, string | Ref>>;

export interface DocumentSummary { id: string; title: string; revision: number; applicationId: string | null }

/** Injectable repository surface (owner-scoped reads that throw NotFoundError). */
export interface ContextDeps {
  profile: { get(userId: string): Promise<CareerProfile | null> };
  goals: { get(userId: string, id: string): Promise<CareerGoal>; getPrimary?(userId: string): Promise<CareerGoal | null> };
  campaigns: { get(userId: string, id: string): Promise<Campaign>; listOpportunityIds?(userId: string, campaignId: string): Promise<string[]> };
  opportunities: { get(userId: string, id: string): Promise<Opportunity> };
  applications: { get(userId: string, id: string): Promise<ApplicationRecord> };
  documents: { get(userId: string, id: string): Promise<DocumentSummary | null> };
  conversations?: { get(userId: string, id: string): Promise<{ id: string; revision: number }> };
}

const hintId = (h: string | Ref | undefined): string | undefined => (typeof h === 'string' ? h : h?.id);
const hintRevision = (h: string | Ref | undefined): number | undefined => (typeof h === 'object' && h ? h.revision : undefined);

async function tryGet<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch (err) { if (err instanceof NotFoundError) return null; throw err; }
}

interface Resolution {
  refs: ContextRefs;
  projection: CareerContext['projection'];
  missing: string[];
  conflicts: ContextConflict[];
  stale: string[];
  unavailable: boolean;
}

/**
 * Resolve the context for a route. Order: main owned object first (the
 * deepest of application > document > opportunity > campaign > goal), then
 * related objects through persisted relationships. Missing/unowned main
 * object → 'unavailable'; absent related objects → 'partial'; a supplied
 * revision older than the persisted one → 'stale'.
 */
export async function resolveContext(
  userId: string, route: ContextRoute, hints: ContextHints = {}, deps: ContextDeps, source: ContextSource = 'route',
): Promise<CareerContext> {
  const profile = await deps.profile.get(userId);
  const r: Resolution = {
    refs: { schemaVersion: 1, career: { id: userId, revision: profile?.revision ?? 0 } },
    projection: { goal: null, campaign: null, opportunity: null, application: null, document: null },
    missing: [], conflicts: [], stale: [], unavailable: false,
  };

  const checkStale = (field: ContextField, persisted: number) => {
    const expected = hintRevision(hints[field]);
    if (expected !== undefined && expected !== persisted) r.stale.push(field);
  };
  const conflict = (field: ContextField, requestedId: string | undefined, authoritativeId: string | null, reason: string) => {
    if (requestedId && requestedId !== authoritativeId) r.conflicts.push({ field, requestedId, authoritativeId, reason });
  };

  const loadGoal = async (id: string | null, snapshot: CareerGoal | null = null, revision: number | null = null) => {
    if (!id) { r.missing.push('goal'); return; }
    if (snapshot) {
      // Decision-time snapshot is the authority for an application's goal context.
      r.refs.goal = { id, revision: revision ?? snapshot.revision };
      r.projection.goal = snapshot;
      return;
    }
    const goal = await tryGet(() => deps.goals.get(userId, id));
    if (!goal) { r.missing.push('goal'); return; }
    r.refs.goal = { id: goal.id, revision: goal.revision };
    r.projection.goal = goal;
    checkStale('goal', goal.revision);
  };
  const loadCampaign = async (id: string | null) => {
    if (!id) { r.missing.push('campaign'); return null; }
    const campaign = await tryGet(() => deps.campaigns.get(userId, id));
    if (!campaign) { r.missing.push('campaign'); return null; }
    r.refs.campaign = { id: campaign.id, revision: campaign.revision };
    r.projection.campaign = campaign;
    checkStale('campaign', campaign.revision);
    return campaign;
  };
  const loadOpportunity = async (id: string | null) => {
    if (!id) { r.missing.push('opportunity'); return null; }
    const opp = await tryGet(() => deps.opportunities.get(userId, id));
    if (!opp) { r.missing.push('opportunity'); return null; }
    r.refs.opportunity = { id: opp.id, revision: opp.revision };
    r.projection.opportunity = opp;
    checkStale('opportunity', opp.revision);
    return opp;
  };
  const loadApplicationGraph = async (app: ApplicationRecord) => {
    r.refs.application = { id: app.id, revision: app.revision };
    r.projection.application = app;
    checkStale('application', app.revision);
    // Persisted relations win over hints.
    conflict('opportunity', hintId(hints.opportunity) ?? route.opportunity, app.opportunityId, 'application.opportunityId is authoritative');
    conflict('campaign', hintId(hints.campaign) ?? route.campaign, app.campaignId, 'application.campaignId is authoritative');
    conflict('goal', hintId(hints.goal) ?? route.goal, app.goalId, 'application keeps its decision-time goal');
    await loadOpportunity(app.opportunityId);
    await loadCampaign(app.campaignId);
    await loadGoal(app.goalId, app.goalSnapshot, app.goalRevision);
  };

  if (route.application) {
    const app = await tryGet(() => deps.applications.get(userId, route.application!));
    if (!app) { r.missing.push('application'); r.unavailable = true; }
    else await loadApplicationGraph(app);
  } else if (route.document) {
    const doc = await deps.documents.get(userId, route.document);
    if (!doc) { r.missing.push('document'); r.unavailable = true; }
    else {
      r.refs.document = { id: doc.id, revision: doc.revision };
      r.projection.document = doc;
      checkStale('document', doc.revision);
      const requestedApp = hintId(hints.application);
      conflict('application', requestedApp, doc.applicationId, 'document.applicationId is authoritative');
      if (doc.applicationId) {
        const app = await tryGet(() => deps.applications.get(userId, doc.applicationId!));
        if (!app) r.missing.push('application');
        else await loadApplicationGraph(app);
      } else {
        r.missing.push('application');
      }
    }
  } else if (route.opportunity) {
    const opp = await loadOpportunity(route.opportunity);
    if (!opp) r.unavailable = true;
    else {
      const campaignHint = hintId(hints.campaign) ?? route.campaign;
      if (campaignHint) {
        const campaign = await tryGet(() => deps.campaigns.get(userId, campaignHint));
        if (!campaign) r.conflicts.push({ field: 'campaign', requestedId: campaignHint, authoritativeId: null, reason: 'campaign is unavailable or not owned' });
        else if (deps.campaigns.listOpportunityIds && !(await deps.campaigns.listOpportunityIds(userId, campaign.id)).includes(opp.id)) {
          r.conflicts.push({ field: 'campaign', requestedId: campaignHint, authoritativeId: null, reason: 'opportunity is not in that campaign' });
        } else {
          r.refs.campaign = { id: campaign.id, revision: campaign.revision };
          r.projection.campaign = campaign;
          checkStale('campaign', campaign.revision);
        }
      }
      const goalHint = hintId(hints.goal) ?? route.goal;
      if (goalHint) await loadGoal(goalHint);
      else if (r.projection.campaign?.goalId) await loadGoal(r.projection.campaign.goalId);
      else if (deps.goals.getPrimary) await loadGoal((await deps.goals.getPrimary(userId))?.id ?? null);
      else r.missing.push('goal');
    }
  } else if (route.campaign) {
    const campaign = await loadCampaign(route.campaign);
    if (!campaign) r.unavailable = true;
    else {
      conflict('goal', hintId(hints.goal) ?? route.goal, campaign.goalId, 'campaign.goalId is authoritative');
      await loadGoal(campaign.goalId);
    }
  } else if (route.goal) {
    const goal = await tryGet(() => deps.goals.get(userId, route.goal!));
    if (!goal) { r.missing.push('goal'); r.unavailable = true; }
    else { r.refs.goal = { id: goal.id, revision: goal.revision }; r.projection.goal = goal; checkStale('goal', goal.revision); }
  } else {
    // Career-only (Today): the primary goal is context when it exists; its absence is valid.
    if (deps.goals.getPrimary) await loadGoal((await deps.goals.getPrimary(userId))?.id ?? null);
    else r.missing.push('goal');
  }

  if (route.conversation && deps.conversations) {
    const conv = await tryGet(() => deps.conversations!.get(userId, route.conversation!));
    if (conv) r.refs.conversation = { id: conv.id, revision: conv.revision };
    else r.missing.push('conversation');
  }

  const completeness: CareerContext['completeness'] = r.unavailable ? 'unavailable' : r.stale.length > 0 ? 'stale' : r.missing.length > 0 ? 'partial' : 'ready';
  return {
    refs: r.refs,
    source,
    completeness,
    missing: Array.from(new Set(r.missing)),
    conflicts: r.conflicts,
    projection: r.projection,
    ...(r.stale.length > 0 ? { stale: r.stale } : {}),
  };
}

// ---------------------------------------------------------------------------
// Cache keys and invalidation
// ---------------------------------------------------------------------------

const REF_ORDER: Array<keyof Omit<ContextRefs, 'schemaVersion'>> = ['career', 'goal', 'campaign', 'opportunity', 'application', 'document', 'conversation'];

/** user + every entity id@revision + projection version, in a fixed order. */
export function contextCacheKey(userId: string, refs: ContextRefs, projectionVersion: number = PROJECTION_VERSION): string {
  const parts = REF_ORDER.flatMap((k) => { const ref = refs[k]; return ref ? [`${k}:${ref.id}@${ref.revision}`] : []; });
  return `${userId}|${parts.join('|')}|v${projectionVersion}`;
}

export interface ContextChange {
  kind: 'fact' | 'goal' | 'opportunity' | 'document' | 'facts';
  id: string;
  revision: number | string;
}

export type Invalidation =
  | { target: 'analyses'; by: 'goal' | 'opportunity' | 'facts'; id: string; revision: number | string }
  | { target: 'actions'; inputKey: string; revision: number | string }
  | { target: 'artifacts'; by: 'fact'; id: string; revision: number | string }
  | { target: 'context'; field: ContextField | 'career' };

/**
 * Derived things to invalidate after a change: fit analyses keyed by the
 * changed input, actions whose `inputRevisions` recorded an older revision,
 * artifact drafts referencing a changed fact, and cached context projections.
 */
export function invalidationFor(change: ContextChange): Invalidation[] {
  switch (change.kind) {
    case 'goal':
      return [
        { target: 'analyses', by: 'goal', id: change.id, revision: change.revision },
        { target: 'actions', inputKey: `goal:${change.id}`, revision: change.revision },
        { target: 'context', field: 'goal' },
      ];
    case 'opportunity':
      return [
        { target: 'analyses', by: 'opportunity', id: change.id, revision: change.revision },
        { target: 'actions', inputKey: `opportunity:${change.id}`, revision: change.revision },
        { target: 'context', field: 'opportunity' },
      ];
    case 'fact':
      return [
        { target: 'artifacts', by: 'fact', id: change.id, revision: change.revision },
        { target: 'actions', inputKey: `fact:${change.id}`, revision: change.revision },
        { target: 'context', field: 'career' },
      ];
    case 'facts':
      return [
        { target: 'analyses', by: 'facts', id: change.id, revision: change.revision },
        { target: 'context', field: 'career' },
      ];
    case 'document':
      return [
        { target: 'actions', inputKey: `document:${change.id}`, revision: change.revision },
        { target: 'context', field: 'document' },
      ];
    default:
      return [];
  }
}

/** Actions whose recorded input revision differs from the changed one. */
export function actionsAffectedBy<T extends { inputRevisions: Record<string, number | string> }>(actions: T[], change: ContextChange): T[] {
  const key = change.kind === 'facts' ? 'facts' : `${change.kind}:${change.id}`;
  return actions.filter((a) => key in a.inputRevisions && String(a.inputRevisions[key]) !== String(change.revision));
}
