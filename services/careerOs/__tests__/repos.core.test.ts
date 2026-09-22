import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueue, has, lastQuery, query, reset, state, tables } from './supabaseMock';

vi.mock('../../supabase', async () => {
  const m = await import('./supabaseMock');
  return { getSupabase: () => m.mockClient() };
});

import * as profileRepo from '../careerProfileRepo';
import * as factRepo from '../factRepo';
import * as goalRepo from '../goalRepo';
import * as opportunityRepo from '../opportunityRepo';
import * as campaignRepo from '../campaignRepo';
import { ConflictError, NotFoundError } from '../types';
import { factToRow, goalToRow, opportunityToRow } from '../mappers';
import { fact, goal, opportunity, rows, uuidFor } from './fixtures';

const ID = (label: string) => uuidFor(label);

beforeEach(reset);

describe('careerProfileRepo', () => {
  it('get scopes to the owner and returns null for no row', async () => {
    enqueue({ data: null, error: null });
    expect(await profileRepo.get('u1')).toBeNull();
    expect(tables()).toEqual(['career_profiles']);
    expect(has(query(0), 'eq', 'user_id', 'u1')).toBe(true);
    expect(has(query(0), 'maybeSingle')).toBe(true);
  });
  it('ensure creates the aggregate row idempotently then re-reads it', async () => {
    enqueue({ data: null, error: null }, { data: null, error: null }, { data: { user_id: 'u1', revision: 1 }, error: null });
    const p = await profileRepo.ensure('u1');
    expect(p.userId).toBe('u1');
    expect(tables()).toEqual(['career_profiles', 'career_profiles', 'career_profiles']);
    expect(has(query(1), 'upsert', { user_id: 'u1' }, { onConflict: 'user_id', ignoreDuplicates: true })).toBe(true);
  });
  it('updateOnboarding sends the revision precondition and throws ConflictError on zero rows', async () => {
    enqueue({ data: [{ user_id: 'u1', onboarding: { step: 'goal' }, revision: 3 }], error: null });
    const p = await profileRepo.updateOnboarding('u1', { step: 'goal' }, 2);
    expect(p.revision).toBe(3);
    expect(has(query(0), 'update', { onboarding: { step: 'goal' } })).toBe(true);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'revision', 2)).toBe(true);
    enqueue({ data: [], error: null });
    await expect(profileRepo.setFactsRevision('u1', 'abc', 2)).rejects.toBeInstanceOf(ConflictError);
  });
  it('runMigration and reconcileLegacy call the SECURITY DEFINER functions with the user', async () => {
    enqueue({ data: { version: 1, opportunities: 2, facts: 5, skipped: 1 }, error: null });
    expect(await profileRepo.runMigration('u1')).toEqual({ version: 1, opportunities: 2, facts: 5, skipped: 1 });
    expect(state.rpcs[0]).toEqual({ name: 'career_os_migrate_user', args: { p_user: 'u1' } });
    enqueue({ data: 4, error: null });
    expect(await profileRepo.reconcileLegacy('u1')).toBe(4);
    expect(state.rpcs[1].name).toBe('career_os_reconcile_legacy');
    enqueue({ data: null, error: new Error('not_authorized') });
    await expect(profileRepo.runMigration('u2')).rejects.toThrow('not_authorized');
  });
});

describe('factRepo', () => {
  it('list defaults to active facts of the owner with optional kind/review filters', async () => {
    enqueue({ data: [factToRow(fact(), 'u1')], error: null });
    const facts = await factRepo.list('u1', { kind: ['skill', 'experience'], reviewState: 'candidate' });
    expect(facts).toHaveLength(1);
    const q = query(0)!;
    expect(q.table).toBe('career_facts');
    expect(has(q, 'eq', 'user_id', 'u1') && has(q, 'eq', 'status', 'active')).toBe(true);
    expect(has(q, 'in', 'kind', ['skill', 'experience']) && has(q, 'eq', 'review_state', 'candidate')).toBe(true);
    enqueue({ data: [], error: null });
    await factRepo.list('u1', { status: 'any' });
    expect(has(query(1), 'eq', 'status', 'active')).toBe(false);
  });
  it('get throws NotFoundError for a missing or foreign row and never falls back', async () => {
    enqueue({ data: null, error: null });
    await expect(factRepo.get('u1', ID('f-other'))).rejects.toBeInstanceOf(NotFoundError);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'id', ID('f-other'))).toBe(true);
  });
  it('a malformed id is NotFound before any query (no PostgREST 400, no existence leak)', async () => {
    await expect(factRepo.get('u1', 'not-a-real-id')).rejects.toMatchObject({ code: 'not_found', entity: 'career_fact', id: 'not-a-real-id' });
    await expect(factRepo.update('u1', 'not-a-real-id', { title: 'x' }, 1)).rejects.toBeInstanceOf(NotFoundError);
    await expect(factRepo.resolveConflict('u1', 'nope', ID('fa'))).rejects.toBeInstanceOf(NotFoundError);
    expect(await factRepo.listForFact('u1', 'nope')).toEqual([]);
    expect(tables()).toEqual([]);
  });
  it('createMany upserts on the fingerprint with ignoreDuplicates and returns only inserted rows', async () => {
    enqueue({ data: [factToRow(fact({ id: ID('f1') }), 'u1')], error: null });
    const created = await factRepo.createMany('u1', [fact(), fact({ title: 'Other' })].map(({ id: _i, revision: _r, createdAt: _c, updatedAt: _u, ...f }) => f));
    expect(created).toHaveLength(1);
    const args = query(0)!.calls.find(([n]) => n === 'upsert')![1];
    expect((args[0] as unknown[]).length).toBe(2);
    expect((args[0] as Array<Record<string, unknown>>)[0].user_id).toBe('u1');
    expect(args[1]).toEqual({ onConflict: 'user_id,source_fingerprint', ignoreDuplicates: true });
    expect(await factRepo.createMany('u1', [])).toEqual([]);
  });
  it('confirm/withdraw/softDelete carry the revision precondition and surface conflicts', async () => {
    enqueue({ data: [factToRow(fact({ confirmationState: 'user_confirmed' }), 'u1')], error: null });
    const f = await factRepo.confirm('u1', ID('f1'), 1);
    expect(f.confirmationState).toBe('user_confirmed');
    expect(has(query(0), 'update', { confirmation_state: 'user_confirmed', review_state: 'reviewed' })).toBe(true);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'id', ID('f1')) && has(query(0), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: [], error: null });
    await expect(factRepo.withdraw('u1', ID('f1'), 1)).rejects.toMatchObject({ code: 'conflict', entity: 'career_fact', id: ID('f1'), expectedRevision: 1 });
    enqueue({ data: [factToRow(fact({ status: 'deleted', narrative: '' }), 'u1')], error: null });
    await factRepo.softDelete('u1', ID('f1'), 2);
    expect(has(query(2), 'update', { status: 'deleted', narrative: '' })).toBe(true);
    const sent = query(2)!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('source_fingerprint');
  });
  it('verify refuses without method/source/time and never sends verified otherwise', async () => {
    await expect(factRepo.verify('u1', ID('f1'), 1, { method: 'doc', source: '', verifiedAt: 'x' })).rejects.toThrow('verification_requires_method_source_time');
    expect(tables()).toEqual([]);
    enqueue({ data: [factToRow(fact(), 'u1')], error: null });
    await factRepo.verify('u1', ID('f1'), 1, { method: 'doc', source: 'HR', verifiedAt: '2026-01-01' });
    expect(has(query(0), 'update', { confirmation_state: 'verified', verification: { method: 'doc', source: 'HR', verifiedAt: '2026-01-01' }, review_state: 'reviewed' })).toBe(true);
  });
  it('resolveConflict keeps the winner, withdraws the rest with their own revisions', async () => {
    const a = factToRow(fact({ id: ID('fa'), conflictGroup: ID('cg'), reviewState: 'conflict' }), 'u1');
    const b = factToRow(fact({ id: ID('fb'), conflictGroup: ID('cg'), reviewState: 'conflict', narrative: 'other' }), 'u1');
    enqueue({ data: [{ ...a, id: ID('fa'), revision: 2 }, { ...b, id: ID('fb'), revision: 5 }], error: null });
    enqueue({ data: [{ ...a, id: ID('fa'), revision: 3, conflict_group: null, review_state: 'reviewed' }], error: null });
    enqueue({ data: [{ ...b, id: ID('fb'), revision: 6, status: 'withdrawn' }], error: null });
    const r = await factRepo.resolveConflict('u1', ID('cg'), ID('fa'));
    expect(r.winner.reviewState).toBe('reviewed');
    expect(r.withdrawn.map((w) => w.id)).toEqual([ID('fb')]);
    expect(has(query(0), 'eq', 'conflict_group', ID('cg'))).toBe(true);
    expect(has(query(1), 'eq', 'id', ID('fa')) && has(query(1), 'eq', 'revision', 2)).toBe(true);
    expect(has(query(2), 'eq', 'id', ID('fb')) && has(query(2), 'eq', 'revision', 5) && has(query(2), 'update', { status: 'withdrawn', review_state: 'reviewed' })).toBe(true);
    enqueue({ data: [{ ...a, id: ID('fa') }], error: null });
    await expect(factRepo.resolveConflict('u1', ID('cg'), ID('not-a-member'))).rejects.toBeInstanceOf(NotFoundError);
  });
  it('references: addReferences is idempotent on the edge key; staleReferences compares fact revisions', async () => {
    enqueue({ data: [{ id: ID('ref1'), fact_id: ID('f1'), fact_revision: 1, artifact_kind: 'resume', artifact_id: ID('r1'), artifact_section: 'experience' }], error: null });
    await factRepo.addReferences('u1', [{ factId: ID('f1'), factRevision: 1, artifactKind: 'resume', artifactId: ID('r1'), artifactSection: 'experience' }]);
    const args = query(0)!.calls.find(([n]) => n === 'upsert')![1];
    expect(args[1]).toEqual({ onConflict: 'fact_id,artifact_kind,artifact_id,artifact_section', ignoreDuplicates: true });
    enqueue({ data: [
      { id: ID('ref1'), fact_id: ID('f1'), fact_revision: 1, artifact_kind: 'resume', artifact_id: ID('r1'), artifact_section: '' },
      { id: ID('ref2'), fact_id: ID('f2'), fact_revision: 4, artifact_kind: 'application_artifact', artifact_id: 'art1', artifact_section: '' },
    ], error: null });
    enqueue({ data: [{ id: ID('f1'), revision: 3 }, { id: ID('f2'), revision: 4 }], error: null });
    const stale = await factRepo.staleReferences('u1');
    expect(stale.map((s) => [s.id, s.factRevision, s.currentRevision])).toEqual([[ID('ref1'), 1, 3]]);
    expect(has(query(1), 'eq', 'user_id', 'u1') && has(query(2), 'eq', 'user_id', 'u1')).toBe(true);
    expect(has(query(2), 'in', 'id', [ID('f1'), ID('f2')])).toBe(true);
  });
});

describe('goalRepo', () => {
  it('create never claims primary implicitly; update strips is_primary', async () => {
    enqueue({ data: goalToRow(goal({ isPrimary: false }), 'u1'), error: null });
    const { id: _i, revision: _r, createdAt: _c, updatedAt: _u, ...input } = goal({ isPrimary: true });
    await goalRepo.create('u1', input);
    const row = query(0)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row.is_primary).toBe(false);
    expect(row.user_id).toBe('u1');
    enqueue({ data: [goalToRow(goal(), 'u1')], error: null });
    await goalRepo.update('u1', ID('g1'), { title: 'New', isPrimary: true }, 1);
    const sent = query(1)!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(sent).toEqual({ title: 'New' });
    expect(has(query(1), 'eq', 'revision', 1)).toBe(true);
  });
  it('setPrimary clears the other primary first, then sets with the revision precondition', async () => {
    enqueue({ data: null, error: null }, { data: [goalToRow(goal({ id: ID('g2'), isPrimary: true }), 'u1')], error: null });
    const g = await goalRepo.setPrimary('u1', ID('g2'), 4);
    expect(g.isPrimary).toBe(true);
    expect(has(query(0), 'update', { is_primary: false }) && has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'is_primary', true) && has(query(0), 'neq', 'id', ID('g2'))).toBe(true);
    expect(has(query(1), 'update', { is_primary: true, status: 'active' }) && has(query(1), 'eq', 'id', ID('g2')) && has(query(1), 'eq', 'revision', 4)).toBe(true);
  });
  it('setPrimary re-reads on a unique violation race instead of guessing', async () => {
    enqueue({ data: null, error: null }, { data: null, error: { code: '23505', message: 'duplicate' } }, { data: goalToRow(goal({ id: ID('g2'), isPrimary: true }), 'u1'), error: null });
    expect((await goalRepo.setPrimary('u1', ID('g2'), 1)).isPrimary).toBe(true);
    enqueue({ data: null, error: null }, { data: null, error: { code: '23505', message: 'duplicate' } }, { data: goalToRow(goal({ id: ID('g2'), isPrimary: false }), 'u1'), error: null });
    await expect(goalRepo.setPrimary('u1', ID('g2'), 1)).rejects.toBeInstanceOf(ConflictError);
    enqueue({ data: null, error: null }, { data: [], error: null });
    await expect(goalRepo.setPrimary('u1', ID('g2'), 1)).rejects.toBeInstanceOf(ConflictError);
  });
  it('getPrimary returns null when no primary exists; listRevisions reads the snapshot table', async () => {
    enqueue({ data: null, error: null });
    expect(await goalRepo.getPrimary('u1')).toBeNull();
    expect(has(query(0), 'eq', 'is_primary', true) && has(query(0), 'eq', 'status', 'active')).toBe(true);
    enqueue({ data: [{ goal_id: ID('g1'), revision: 1, created_at: 't', snapshot: { id: ID('g1'), title: 'v1' } }, { goal_id: ID('g1'), revision: 2, created_at: 't2', snapshot: { id: ID('g1'), title: 'v2' } }], error: null });
    const revs = await goalRepo.listRevisions('u1', ID('g1'));
    expect(revs.map((r) => [r.revision, r.title])).toEqual([[1, 'v1'], [2, 'v2']]);
    expect(query(1)!.table).toBe('career_goal_revisions');
    expect(has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'goal_id', ID('g1'))).toBe(true);
  });
});

describe('opportunityRepo', () => {
  it('list applies the view as a status filter and hides merged rows', async () => {
    enqueue({ data: [], error: null });
    await opportunityRepo.list('u1', 'for_you');
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'is', 'merged_into_id', null) && has(query(0), 'in', 'status', ['saved', 'watching'])).toBe(true);
    enqueue({ data: [], error: null });
    await opportunityRepo.list('u1', 'archived', { includeMerged: true });
    expect(has(query(1), 'eq', 'status', 'archived')).toBe(true);
    expect(has(query(1), 'is', 'merged_into_id', null)).toBe(false);
  });
  it('create fingerprints the captured content; update recomputes it when content changes', async () => {
    enqueue({ data: opportunityToRow(opportunity(), 'u1'), error: null });
    await opportunityRepo.create('u1', { title: 'RN', company: 'Acme', capturedContent: 'Senior  nurse\nrole' });
    const row = query(0)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row.content_fingerprint).toBe(opportunityRepo.contentFingerprint('senior nurse role'));
    expect(row.content_fingerprint).toHaveLength(32);
    enqueue({ data: [opportunityToRow(opportunity(), 'u1')], error: null });
    await opportunityRepo.update('u1', ID('o1'), { capturedContent: 'changed' }, 2);
    const sent = query(1)!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(sent.content_fingerprint).toBe(opportunityRepo.contentFingerprint('changed'));
    expect(has(query(1), 'eq', 'revision', 2)).toBe(true);
    expect(opportunityRepo.contentFingerprint('   ')).toBeNull();
  });
  it('setStatus records the not-interested reason only for that status', async () => {
    enqueue({ data: [opportunityToRow(opportunity({ status: 'not_interested' }), 'u1')], error: null });
    await opportunityRepo.setStatus('u1', ID('o1'), 'not_interested', 1, 'too far');
    expect(has(query(0), 'update', { status: 'not_interested', not_interested_reason: 'too far' })).toBe(true);
    enqueue({ data: [], error: null });
    await expect(opportunityRepo.setStatus('u1', ID('o1'), 'watching', 1)).rejects.toBeInstanceOf(ConflictError);
  });
  it('findDuplicates separates exact fingerprint matches from title+company candidates', async () => {
    enqueue({ data: [rows.opportunity(opportunity({ id: ID('o2'), contentFingerprint: 'fp' }))], error: null });
    enqueue({ data: [rows.opportunity(opportunity({ id: ID('o2') })), rows.opportunity(opportunity({ id: ID('o3'), title: 'Senior  Nurse' }))], error: null });
    const r = await opportunityRepo.findDuplicates('u1', { fingerprint: 'fp', title: 'senior nurse', company: 'ACME Health', excludeId: ID('o1') });
    expect(r.exact.map((o) => o.id)).toEqual([ID('o2')]);
    expect(r.possible.map((o) => o.id)).toEqual([ID('o3')]);
    expect(has(query(0), 'eq', 'content_fingerprint', 'fp') && has(query(0), 'eq', 'user_id', 'u1')).toBe(true);
    expect(has(query(1), 'ilike', 'title', 'senior nurse') && has(query(1), 'ilike', 'company', 'acme health')).toBe(true);
  });
  it('merge moves memberships/applications/analyses, records undo, and unmerge reverses it', async () => {
    const source = opportunityToRow(opportunity({ id: ID('o1') }), 'u1');
    const target = opportunityToRow(opportunity({ id: ID('o2') }), 'u1');
    enqueue(
      { data: { ...source, id: ID('o1'), revision: 2 }, error: null },
      { data: { ...target, id: ID('o2'), revision: 1 }, error: null },
      { data: [{ campaign_id: ID('c1') }, { campaign_id: ID('c2') }], error: null }, // source memberships
      { data: [{ campaign_id: ID('c2') }], error: null }, // target memberships
      { data: [{ id: ID('a1') }], error: null }, // applications
      { data: [{ id: ID('an1') }], error: null }, // analyses
      { data: null, error: null }, // upsert added memberships
      { data: null, error: null }, // delete source memberships
      { data: null, error: null }, // move applications
      { data: null, error: null }, // move analyses
      { data: [{ ...source, id: ID('o1'), revision: 3, merged_into_id: ID('o2'), merge_undo: { targetId: ID('o2') } }], error: null },
    );
    const r = await opportunityRepo.merge('u1', ID('o1'), ID('o2'));
    expect(r.source.mergedIntoId).toBe(ID('o2'));
    const t = tables();
    expect(t).toEqual(['opportunities', 'opportunities', 'campaign_opportunities', 'campaign_opportunities', 'job_applications', 'opportunity_analyses', 'campaign_opportunities', 'campaign_opportunities', 'job_applications', 'opportunity_analyses', 'opportunities']);
    expect(has(query(6), 'upsert', [{ campaign_id: ID('c1'), opportunity_id: ID('o2'), user_id: 'u1' }], { onConflict: 'campaign_id,opportunity_id', ignoreDuplicates: true })).toBe(true);
    expect(has(query(7), 'delete') && has(query(7), 'eq', 'opportunity_id', ID('o1')) && has(query(7), 'eq', 'user_id', 'u1')).toBe(true);
    expect(has(query(8), 'update', { opportunity_id: ID('o2') }) && has(query(8), 'in', 'id', [ID('a1')])).toBe(true);
    expect(has(query(9), 'update', { opportunity_id: ID('o2'), stale: true }) && has(query(9), 'in', 'id', [ID('an1')])).toBe(true);
    const final = query(10)!.calls.find(([n]) => n === 'update')![1][0] as { merged_into_id: string; merge_undo: opportunityRepo.MergeUndo };
    expect(final.merged_into_id).toBe(ID('o2'));
    expect(final.merge_undo).toMatchObject({ targetId: ID('o2'), campaignIds: [ID('c1'), ID('c2')], addedToTarget: [ID('c1')], applicationIds: [ID('a1')], analysisIds: [ID('an1')] });
    expect(has(query(10), 'eq', 'revision', 2)).toBe(true);

    reset();
    enqueue(
      { data: { ...source, id: ID('o1'), revision: 3, merged_into_id: ID('o2'), merge_undo: final.merge_undo }, error: null },
      { data: null, error: null }, { data: null, error: null }, { data: null, error: null }, { data: null, error: null },
      { data: [{ ...source, id: ID('o1'), revision: 4 }], error: null },
    );
    const back = await opportunityRepo.unmerge('u1', ID('o1'));
    expect(back.mergedIntoId).toBeNull();
    expect(tables()).toEqual(['opportunities', 'job_applications', 'opportunity_analyses', 'campaign_opportunities', 'campaign_opportunities', 'opportunities']);
    expect(has(query(1), 'update', { opportunity_id: ID('o1') }) && has(query(1), 'in', 'id', [ID('a1')])).toBe(true);
    expect(has(query(3), 'delete') && has(query(3), 'eq', 'opportunity_id', ID('o2')) && has(query(3), 'in', 'campaign_id', [ID('c1')])).toBe(true);
    expect(has(query(4), 'upsert', [{ campaign_id: ID('c1'), opportunity_id: ID('o1'), user_id: 'u1' }, { campaign_id: ID('c2'), opportunity_id: ID('o1'), user_id: 'u1' }], { onConflict: 'campaign_id,opportunity_id', ignoreDuplicates: true })).toBe(true);
    expect(has(query(5), 'update', { merged_into_id: null, merge_undo: null }) && has(query(5), 'eq', 'revision', 3)).toBe(true);
  });
  it('merge refuses self-merge, already merged sources, and foreign targets', async () => {
    await expect(opportunityRepo.merge('u1', ID('o1'), ID('o1'))).rejects.toThrow('merge_same_opportunity');
    enqueue({ data: opportunityToRow(opportunity({ id: ID('o1'), mergedIntoId: ID('o9') }), 'u1'), error: null }, { data: opportunityToRow(opportunity({ id: ID('o2') }), 'u1'), error: null });
    await expect(opportunityRepo.merge('u1', ID('o1'), ID('o2'))).rejects.toThrow('opportunity_already_merged');
    reset();
    enqueue({ data: opportunityToRow(opportunity({ id: ID('o1') }), 'u1'), error: null }, { data: null, error: null });
    await expect(opportunityRepo.merge('u1', ID('o1'), ID('o-foreign'))).rejects.toBeInstanceOf(NotFoundError);
    enqueue({ data: opportunityToRow(opportunity({ id: ID('o1') }), 'u1'), error: null });
    await expect(opportunityRepo.unmerge('u1', ID('o1'))).rejects.toThrow('opportunity_not_merged');
  });
});

describe('campaignRepo', () => {
  it('lifecycle updates carry the revision precondition', async () => {
    enqueue({ data: [{ id: ID('c1'), status: 'paused', revision: 2 }], error: null });
    expect((await campaignRepo.pause('u1', ID('c1'), 1)).status).toBe('paused');
    expect(has(query(0), 'update', { status: 'paused' }) && has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'id', ID('c1')) && has(query(0), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: [{ id: ID('c1'), status: 'closed', closed_reason: 'done', revision: 3 }], error: null });
    expect((await campaignRepo.close('u1', ID('c1'), 2, 'done')).closedReason).toBe('done');
    enqueue({ data: [{ id: ID('c1'), status: 'active', revision: 4 }], error: null });
    await campaignRepo.reopen('u1', ID('c1'), 3);
    expect(has(query(2), 'update', { status: 'active', closed_reason: null })).toBe(true);
    enqueue({ data: [], error: null });
    await expect(campaignRepo.pause('u1', ID('c1'), 9)).rejects.toBeInstanceOf(ConflictError);
  });
  it('memberships are idempotent adds and owner-scoped removes', async () => {
    await campaignRepo.addOpportunity('u1', ID('c1'), ID('o1'));
    expect(has(query(0), 'upsert', { campaign_id: ID('c1'), opportunity_id: ID('o1'), user_id: 'u1' }, { onConflict: 'campaign_id,opportunity_id', ignoreDuplicates: true })).toBe(true);
    await campaignRepo.removeOpportunity('u1', ID('c1'), ID('o1'));
    expect(has(query(1), 'delete') && has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'campaign_id', ID('c1')) && has(query(1), 'eq', 'opportunity_id', ID('o1'))).toBe(true);
    enqueue({ data: [{ opportunity_id: ID('o1') }, { opportunity_id: ID('o2') }], error: null });
    expect(await campaignRepo.listOpportunityIds('u1', ID('c1'))).toEqual([ID('o1'), ID('o2')]);
  });
  it('assignApplication only touches job_applications.campaign_id with a revision check', async () => {
    enqueue({ data: [{ id: ID('a1'), campaign_id: ID('c1'), status: 'wishlist', stage: 'preparing', revision: 2 }], error: null });
    const app = await campaignRepo.assignApplication('u1', ID('a1'), ID('c1'), 1);
    expect(app.campaignId).toBe(ID('c1'));
    expect(lastQuery()!.table).toBe('job_applications');
    expect(has(lastQuery(), 'update', { campaign_id: ID('c1') }) && has(lastQuery(), 'eq', 'user_id', 'u1') && has(lastQuery(), 'eq', 'id', ID('a1')) && has(lastQuery(), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: [{ id: ID('a1'), campaign_id: null, status: 'wishlist', revision: 3 }], error: null });
    expect((await campaignRepo.assignApplication('u1', ID('a1'), null, 2)).campaignId).toBeNull();
  });
});
