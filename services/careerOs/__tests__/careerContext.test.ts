import { describe, expect, it } from 'vitest';
import { actionsAffectedBy, contextCacheKey, invalidationFor, resolveContext, type ContextDeps } from '../careerContext';
import { NotFoundError, type ApplicationRecord, type CareerGoal, type Campaign, type CareerProfile, type Opportunity } from '../types';
import { application, campaign, goal, opportunity } from './fixtures';

/**
 * Two users, two applications each with their own opportunity/campaign/goal.
 * Every read is owner-scoped: asking for another user's id throws NotFound
 * exactly like the repositories do, so nothing can bleed across accounts.
 */
function makeDeps() {
  const store = {
    profiles: new Map<string, CareerProfile>([
      ['u1', { userId: 'u1', headline: '', onboarding: {}, migrationVersion: 1, migratedAt: null, factsRevision: 'fr1', revision: 2 }],
      ['u2', { userId: 'u2', headline: '', onboarding: {}, migrationVersion: 1, migratedAt: null, factsRevision: 'fr2', revision: 5 }],
    ]),
    goals: new Map<string, CareerGoal & { owner: string }>([
      ['g1', { ...goal({ id: 'g1', revision: 3 }), owner: 'u1' }],
      ['g2', { ...goal({ id: 'g2', revision: 1, title: 'Other goal' }), owner: 'u2' }],
    ]),
    campaigns: new Map<string, Campaign & { owner: string }>([
      ['c1', { ...campaign({ id: 'c1', goalId: 'g1' }), owner: 'u1' }],
      ['c2', { ...campaign({ id: 'c2', goalId: 'g2' }), owner: 'u2' }],
    ]),
    opportunities: new Map<string, Opportunity & { owner: string }>([
      ['o1', { ...opportunity({ id: 'o1', revision: 2 }), owner: 'u1' }],
      ['o1b', { ...opportunity({ id: 'o1b', title: 'Second role' }), owner: 'u1' }],
      ['o2', { ...opportunity({ id: 'o2' }), owner: 'u2' }],
    ]),
    applications: new Map<string, ApplicationRecord & { owner: string }>([
      ['a1', { ...application({ id: 'a1', opportunityId: 'o1', campaignId: 'c1', goalId: 'g1', goalRevision: 2, goalSnapshot: goal({ id: 'g1', revision: 2, title: 'Decision-time title' }), revision: 4 }), owner: 'u1' }],
      ['a1b', { ...application({ id: 'a1b', opportunityId: 'o1b', campaignId: null, goalId: null }), owner: 'u1' }],
      ['a2', { ...application({ id: 'a2', opportunityId: 'o2', campaignId: 'c2', goalId: 'g2' }), owner: 'u2' }],
    ]),
    documents: new Map<string, { id: string; title: string; revision: number; applicationId: string | null; owner: string }>([
      ['d1', { id: 'd1', title: 'CV for a1', revision: 7, applicationId: 'a1', owner: 'u1' }],
      ['d2', { id: 'd2', title: 'CV u2', revision: 1, applicationId: 'a2', owner: 'u2' }],
    ]),
    memberships: new Map<string, string[]>([['c1', ['o1']], ['c2', ['o2']]]),
  };
  const owned = <T extends { owner: string }>(map: Map<string, T>, entity: string) => async (userId: string, id: string): Promise<T> => {
    const row = map.get(id);
    if (!row || row.owner !== userId) throw new NotFoundError(entity, id);
    return row;
  };
  const deps: ContextDeps = {
    profile: { get: async (userId) => store.profiles.get(userId) ?? null },
    goals: {
      get: owned(store.goals, 'career_goal'),
      getPrimary: async (userId) => Array.from(store.goals.values()).find((g) => g.owner === userId && g.isPrimary) ?? null,
    },
    campaigns: { get: owned(store.campaigns, 'campaign'), listOpportunityIds: async (_u, id) => store.memberships.get(id) ?? [] },
    opportunities: { get: owned(store.opportunities, 'opportunity') },
    applications: { get: owned(store.applications, 'application') },
    documents: { get: async (userId, id) => { const d = store.documents.get(id); return d && d.owner === userId ? d : null; } },
  };
  return { deps, store };
}

describe('resolveContext', () => {
  it('resolves an application with its persisted opportunity, campaign and decision-time goal snapshot', async () => {
    const { deps } = makeDeps();
    const ctx = await resolveContext('u1', { application: 'a1' }, {}, deps);
    expect(ctx.completeness).toBe('ready');
    expect(ctx.refs).toEqual({ schemaVersion: 1, career: { id: 'u1', revision: 2 }, application: { id: 'a1', revision: 4 }, opportunity: { id: 'o1', revision: 2 }, campaign: { id: 'c1', revision: 1 }, goal: { id: 'g1', revision: 2 } });
    expect(ctx.projection.goal?.title).toBe('Decision-time title'); // snapshot, not the current revision 3
    expect(ctx.projection.application?.id).toBe('a1');
    expect(ctx.conflicts).toEqual([]);
    expect(ctx.missing).toEqual([]);
    expect(ctx.source).toBe('route');
  });
  it('two users, two applications: identity never bleeds across accounts', async () => {
    const { deps } = makeDeps();
    const mine = await resolveContext('u2', { application: 'a2' }, {}, deps);
    expect(mine.completeness).toBe('ready');
    expect(mine.refs.career).toEqual({ id: 'u2', revision: 5 });
    expect(mine.projection.opportunity?.id).toBe('o2');
    const theirs = await resolveContext('u2', { application: 'a1' }, {}, deps);
    expect(theirs.completeness).toBe('unavailable');
    expect(theirs.missing).toEqual(['application']);
    expect(theirs.projection.application).toBeNull();
    expect(theirs.projection.opportunity).toBeNull();
    // A hint pointing at another user's goal is reported, never applied.
    const hinted = await resolveContext('u1', { opportunity: 'o1' }, { goal: 'g2' }, deps);
    expect(hinted.projection.goal).toBeNull();
    expect(hinted.missing).toContain('goal');
  });
  it('a hint that contradicts the persisted relation is a conflict and the authoritative relation is kept', async () => {
    const { deps } = makeDeps();
    const ctx = await resolveContext('u1', { application: 'a1' }, { opportunity: 'o1b', campaign: 'c1', goal: 'g2' }, deps, 'selection');
    expect(ctx.completeness).toBe('ready');
    expect(ctx.projection.opportunity?.id).toBe('o1');
    expect(ctx.conflicts).toEqual([
      { field: 'opportunity', requestedId: 'o1b', authoritativeId: 'o1', reason: 'application.opportunityId is authoritative' },
      { field: 'goal', requestedId: 'g2', authoritativeId: 'g1', reason: 'application keeps its decision-time goal' },
    ]);
    expect(ctx.source).toBe('selection');
  });
  it('missing related objects make the context partial with typed names', async () => {
    const { deps } = makeDeps();
    const ctx = await resolveContext('u1', { application: 'a1b' }, {}, deps);
    expect(ctx.completeness).toBe('partial');
    expect(ctx.missing).toEqual(['campaign', 'goal']);
    expect(ctx.projection.opportunity?.id).toBe('o1b');
    expect(ctx.refs.campaign).toBeUndefined();
  });
  it('a supplied revision older than the persisted one marks the context stale (fresh data returned)', async () => {
    const { deps } = makeDeps();
    const ctx = await resolveContext('u1', { application: 'a1' }, { application: { id: 'a1', revision: 3 } }, deps);
    expect(ctx.completeness).toBe('stale');
    expect(ctx.stale).toEqual(['application']);
    expect(ctx.projection.application?.revision).toBe(4);
    const fresh = await resolveContext('u1', { application: 'a1' }, { application: { id: 'a1', revision: 4 } }, deps);
    expect(fresh.completeness).toBe('ready');
    expect(fresh.stale).toBeUndefined();
  });
  it('a document resolves through its originating application; a contradicting application hint is a conflict', async () => {
    const { deps } = makeDeps();
    const ctx = await resolveContext('u1', { document: 'd1' }, { application: 'a1b' }, deps);
    expect(ctx.refs.document).toEqual({ id: 'd1', revision: 7 });
    expect(ctx.projection.application?.id).toBe('a1');
    expect(ctx.conflicts[0]).toMatchObject({ field: 'application', requestedId: 'a1b', authoritativeId: 'a1' });
    const foreign = await resolveContext('u1', { document: 'd2' }, {}, deps);
    expect(foreign.completeness).toBe('unavailable');
    expect(foreign.missing).toEqual(['document']);
  });
  it('opportunity routes validate campaign membership and fall back to the primary goal', async () => {
    const { deps } = makeDeps();
    const ok = await resolveContext('u1', { opportunity: 'o1', campaign: 'c1' }, {}, deps);
    expect(ok.completeness).toBe('ready');
    expect(ok.projection.campaign?.id).toBe('c1');
    expect(ok.projection.goal?.id).toBe('g1');
    const notMember = await resolveContext('u1', { opportunity: 'o1b', campaign: 'c1' }, {}, deps);
    expect(notMember.conflicts[0]).toMatchObject({ field: 'campaign', requestedId: 'c1', authoritativeId: null, reason: 'opportunity is not in that campaign' });
    expect(notMember.projection.campaign).toBeNull();
    expect(notMember.projection.goal?.id).toBe('g1'); // primary goal
    const missing = await resolveContext('u1', { opportunity: 'nope' }, {}, deps);
    expect(missing.completeness).toBe('unavailable');
  });
  it('campaign and goal routes; the career-only route (Today) tolerates a missing primary goal', async () => {
    const { deps, store } = makeDeps();
    const c = await resolveContext('u1', { campaign: 'c1' }, { goal: 'g2' }, deps);
    expect(c.projection.goal?.id).toBe('g1');
    expect(c.conflicts[0]).toMatchObject({ field: 'goal', requestedId: 'g2', authoritativeId: 'g1' });
    const g = await resolveContext('u1', { goal: 'g1' }, {}, deps);
    expect(g.completeness).toBe('ready');
    expect(g.refs.goal).toEqual({ id: 'g1', revision: 3 });
    const today = await resolveContext('u1', {}, {}, deps);
    expect(today.completeness).toBe('ready');
    store.goals.get('g1')!.isPrimary = false;
    const noGoal = await resolveContext('u1', {}, {}, deps);
    expect(noGoal.completeness).toBe('partial');
    expect(noGoal.missing).toEqual(['goal']);
    expect(noGoal.projection.goal).toBeNull();
  });
  it('a user without a career profile still resolves with career revision 0', async () => {
    const { deps } = makeDeps();
    const ctx = await resolveContext('u3', {}, {}, deps);
    expect(ctx.refs.career).toEqual({ id: 'u3', revision: 0 });
    expect(ctx.completeness).toBe('partial');
  });
});

describe('contextCacheKey and invalidation', () => {
  it('cache keys include user, every ref id@revision and the projection version in a fixed order', () => {
    const key = contextCacheKey('u1', { schemaVersion: 1, career: { id: 'u1', revision: 2 }, application: { id: 'a1', revision: 4 }, goal: { id: 'g1', revision: 2 } }, 1);
    expect(key).toBe('u1|career:u1@2|goal:g1@2|application:a1@4|v1');
    expect(contextCacheKey('u2', { schemaVersion: 1, career: { id: 'u2', revision: 2 } })).not.toBe(contextCacheKey('u1', { schemaVersion: 1, career: { id: 'u1', revision: 2 } }));
    expect(contextCacheKey('u1', { schemaVersion: 1, career: { id: 'u1', revision: 3 } })).not.toBe(contextCacheKey('u1', { schemaVersion: 1, career: { id: 'u1', revision: 2 } }));
  });
  it('a goal revision invalidates its analyses, dependent actions and the goal context', () => {
    expect(invalidationFor({ kind: 'goal', id: 'g1', revision: 4 })).toEqual([
      { target: 'analyses', by: 'goal', id: 'g1', revision: 4 },
      { target: 'actions', inputKey: 'goal:g1', revision: 4 },
      { target: 'context', field: 'goal' },
    ]);
    expect(invalidationFor({ kind: 'fact', id: 'f1', revision: 2 }).map((i) => i.target)).toEqual(['artifacts', 'actions', 'context']);
    expect(invalidationFor({ kind: 'facts', id: 'u1', revision: 'fr2' })[0]).toEqual({ target: 'analyses', by: 'facts', id: 'u1', revision: 'fr2' });
    expect(invalidationFor({ kind: 'opportunity', id: 'o1', revision: 3 })[0]).toEqual({ target: 'analyses', by: 'opportunity', id: 'o1', revision: 3 });
    expect(invalidationFor({ kind: 'document', id: 'd1', revision: 8 }).map((i) => i.target)).toEqual(['actions', 'context']);
  });
  it('actionsAffectedBy returns only actions that recorded an older revision of the changed input', () => {
    const actions: Array<{ id: string; inputRevisions: Record<string, number | string> }> = [
      { id: 'x', inputRevisions: { 'goal:g1': 3, 'application:a1': 1 } },
      { id: 'y', inputRevisions: { 'goal:g1': 4 } },
      { id: 'z', inputRevisions: { 'application:a1': 1 } },
    ];
    expect(actionsAffectedBy(actions, { kind: 'goal', id: 'g1', revision: 4 }).map((a) => a.id)).toEqual(['x']);
    expect(actionsAffectedBy(actions, { kind: 'goal', id: 'g9', revision: 1 })).toEqual([]);
  });
});
