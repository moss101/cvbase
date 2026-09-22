import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueue, has, query, reset, tables } from './supabaseMock';

vi.mock('../../supabase', async () => {
  const m = await import('./supabaseMock');
  return { getSupabase: () => m.mockClient() };
});

import * as actionRepo from '../actionRepo';
import * as eventRepo from '../eventRepo';
import * as notificationRepo from '../notificationRepo';
import * as preferencesRepo from '../preferencesRepo';
import * as scenarioRepo from '../scenarioRepo';
import * as insightRepo from '../insightRepo';
import * as migrationRepo from '../migrationRepo';
import { computeCandidateActions, dedupeKeyFor } from '../careerActions';
import { ConflictError, NotFoundError } from '../types';
import { action, application, rows, uuidFor } from './fixtures';

const ID = uuidFor;
const A1 = ID('a1'); const ACT1 = ID('act1'); const N1 = ID('n1'); const S1 = ID('s1'); const I1 = ID('i1');
const NOW = new Date('2026-09-20T12:00:00.000Z');

beforeEach(reset);

describe('actionRepo', () => {
  it('listEligible asks for READY/PROPOSED, not snoozed past now, not expired — and re-checks client-side', async () => {
    const rowsBack = [
      rows.action(action({ id: ACT1, status: 'READY' })),
      rows.action(action({ id: ID('act2'), status: 'READY', expiresAt: '2026-09-19T00:00:00.000Z' })), // clock-skew leak
      rows.action(action({ id: ID('act3'), status: 'READY', snoozedUntil: '2026-09-25T00:00:00.000Z' })),
    ];
    enqueue({ data: rowsBack, error: null });
    const eligible = await actionRepo.listEligible('u1', NOW);
    expect(eligible.map((a) => a.id)).toEqual([ACT1]);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'in', 'status', ['READY', 'PROPOSED'])).toBe(true);
    expect(has(query(0), 'or', `snoozed_until.is.null,snoozed_until.lte.${NOW.toISOString()}`)).toBe(true);
    expect(has(query(0), 'or', `expires_at.is.null,expires_at.gt.${NOW.toISOString()}`)).toBe(true);
  });
  it('upsertByDedupeKey inserts new keys, leaves identical keys (incl. DISMISSED), resurfaces with a reason, expires stale siblings', async () => {
    const candidates = computeCandidateActions({
      now: NOW, goal: null, facts: [], opportunities: [], interviews: [], analyses: [], prismRuns: [], artifacts: [],
      applications: [
        application({ id: A1, stage: 'preparing', currentResumeId: null }),
        application({ id: ID('a2'), stage: 'submitted', followUpAt: '2026-09-21', submittedAt: '2026-09-01T00:00:00.000Z' }),
      ],
    });
    const tailor = candidates.find((c) => c.actionType === 'TAILOR_CV')!;
    const follow = candidates.find((c) => c.actionType === 'FOLLOW_UP_APPLICATION')!;
    const setGoal = candidates.find((c) => c.actionType === 'SET_GOAL')!;
    const existing = [
      rows.action(action({ id: ACT1, actionType: 'TAILOR_CV', dedupeKey: tailor.dedupeKey, status: 'DISMISSED', dismissedAt: '2026-09-10T00:00:00.000Z' })),
      rows.action(action({
        id: ID('act2'), actionType: 'FOLLOW_UP_APPLICATION', status: 'DISMISSED', dismissedAt: '2026-09-10T00:00:00.000Z',
        dedupeKey: dedupeKeyFor('FOLLOW_UP_APPLICATION', ID('a2'), { [`application:${ID('a2')}.followUpAt`]: '2026-09-15', [`application:${ID('a2')}.stage`]: 'submitted' }),
        inputRevisions: { [`application:${ID('a2')}.followUpAt`]: '2026-09-15', [`application:${ID('a2')}.stage`]: 'submitted' },
      })),
      rows.action(action({ id: ID('act3'), actionType: 'SET_GOAL', status: 'READY', dedupeKey: 'SET_GOAL:career:oldhash' })),
    ];
    enqueue({ data: existing, error: null });
    enqueue({ data: rows.action(action({ id: ID('new-follow'), actionType: 'FOLLOW_UP_APPLICATION', dedupeKey: follow.dedupeKey, resurfacedReason: 'x' })), error: null });
    enqueue({ data: rows.action(action({ id: ID('new-goal'), actionType: 'SET_GOAL', dedupeKey: setGoal.dedupeKey })), error: null });
    enqueue({ data: [{ id: ID('act3') }], error: null });
    const result = await actionRepo.upsertByDedupeKey('u1', [tailor, follow, setGoal]);
    expect(result.unchanged).toBe(1); // dismissed TAILOR_CV with the same key stays dismissed
    expect(result.resurfaced.map((a) => a.id)).toEqual([ID('new-follow')]);
    expect(result.inserted.map((a) => a.id)).toEqual([ID('new-goal')]);
    expect(result.expired).toEqual([ID('act3')]);
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'source', 'rule')).toBe(true);
    const inserted = query(1)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(inserted.status).toBe('READY');
    expect(inserted.dedupe_key).toBe(follow.dedupeKey);
    expect(inserted.rule_version).toBe('rules-1.0.0');
    expect(String(inserted.resurfaced_reason)).toContain('2026-09-15 → 2026-09-21');
    expect(inserted).not.toHaveProperty('ranking');
    expect(inserted).not.toHaveProperty('materialInputs');
    const plain = query(2)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(plain.resurfaced_reason).toBeNull();
    expect(has(query(3), 'update', { status: 'EXPIRED' }) && has(query(3), 'in', 'id', [ID('act3')]) && has(query(3), 'in', 'status', ['READY', 'PROPOSED'])).toBe(true);
  });
  it('upsertByDedupeKey refreshes the wording of a live row with the same key, never a finished one', async () => {
    const candidates = computeCandidateActions({
      now: NOW, goal: null, facts: [], opportunities: [], interviews: [], analyses: [], prismRuns: [], artifacts: [],
      applications: [application({ id: A1, stage: 'preparing', currentResumeId: null })],
    });
    const tailor = candidates.find((c) => c.actionType === 'TAILOR_CV')!;
    const setGoal = candidates.find((c) => c.actionType === 'SET_GOAL')!;
    enqueue({
      data: [
        rows.action(action({ id: ACT1, actionType: 'TAILOR_CV', dedupeKey: tailor.dedupeKey, status: 'READY', reason: 'old wording 2026-09-25T08:30:00+00:00', revision: 3 })),
        rows.action(action({ id: ID('act2'), actionType: 'SET_GOAL', dedupeKey: setGoal.dedupeKey, status: 'COMPLETED', reason: 'old wording' })),
      ],
      error: null,
    });
    enqueue({ data: [rows.action(action({ id: ACT1, revision: 4 }))], error: null });
    const result = await actionRepo.upsertByDedupeKey('u1', [tailor, setGoal]);
    expect(result.unchanged).toBe(2);
    expect(result.refreshed).toEqual([ACT1]);
    expect(has(query(1), 'update', { title: tailor.title, reason: tailor.reason, evidence_refs: tailor.evidenceRefs })).toBe(true);
    expect(has(query(1), 'eq', 'revision', 3) && has(query(1), 'eq', 'id', ACT1)).toBe(true);
    expect(query(2)).toBeUndefined(); // the completed row is history and is not rewritten
  });
  it('transitions validate the lifecycle table and carry the revision precondition', async () => {
    enqueue({ data: rows.action(action({ id: ACT1, status: 'READY' })), error: null }, { data: [rows.action(action({ id: ACT1, status: 'IN_PROGRESS', revision: 2 }))], error: null });
    expect((await actionRepo.start('u1', ACT1, 1)).status).toBe('IN_PROGRESS');
    expect(has(query(1), 'update', { status: 'IN_PROGRESS', last_error: null }) && has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'id', ACT1) && has(query(1), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: rows.action(action({ id: ACT1, status: 'COMPLETED' })), error: null });
    await expect(actionRepo.start('u1', ACT1, 2)).rejects.toThrow('invalid_transition:COMPLETED->IN_PROGRESS');
    enqueue({ data: rows.action(action({ id: ACT1, status: 'READY' })), error: null });
    await expect(actionRepo.complete('u1', ACT1, 1, { resultRef: { runId: 'r' }, completionSource: 'durable_receipt' })).rejects.toThrow('invalid_transition:READY->COMPLETED');
    enqueue({ data: rows.action(action({ id: ACT1, status: 'READY' })), error: null }, { data: [rows.action(action({ id: ACT1, status: 'COMPLETED' }))], error: null });
    await actionRepo.complete('u1', ACT1, 1, { resultRef: null, completionSource: 'user_reported' });
    const sent = query(5)!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(sent).toMatchObject({ status: 'COMPLETED', completion_source: 'user_reported', result_ref: null });
    expect(typeof sent.completed_at).toBe('string');
    enqueue({ data: rows.action(action({ id: ACT1, status: 'IN_PROGRESS' })), error: null }, { data: [], error: null });
    await expect(actionRepo.fail('u1', ACT1, 3, { code: 'quota', retryable: true })).rejects.toBeInstanceOf(ConflictError);
    enqueue({ data: null, error: null });
    await expect(actionRepo.dismiss('u1', ID('nope'), 1)).rejects.toBeInstanceOf(NotFoundError);
  });
  it('snooze defers without changing status and rejects bad dates or non-eligible actions', async () => {
    enqueue({ data: rows.action(action({ id: ACT1, status: 'READY' })), error: null }, { data: [rows.action(action({ id: ACT1, snoozedUntil: '2026-09-25T00:00:00.000Z' }))], error: null });
    const a = await actionRepo.snooze('u1', ACT1, 1, '2026-09-25T00:00:00.000Z');
    expect(a.status).toBe('READY');
    expect(has(query(1), 'update', { snoozed_until: '2026-09-25T00:00:00.000Z' }) && has(query(1), 'eq', 'revision', 1)).toBe(true);
    await expect(actionRepo.snooze('u1', ACT1, 1, 'someday')).rejects.toThrow('invalid_snooze_until');
    enqueue({ data: rows.action(action({ id: ACT1, status: 'COMPLETED' })), error: null });
    await expect(actionRepo.snooze('u1', ACT1, 1, '2026-09-25T00:00:00.000Z')).rejects.toThrow('invalid_transition:COMPLETED->snooze');
  });
  it('recordUserReported inserts a COMPLETED action with source user_reported', async () => {
    enqueue({ data: rows.action(action({ id: ACT1, source: 'user_reported', status: 'COMPLETED', completionSource: 'user_reported' })), error: null });
    const a = await actionRepo.recordUserReported('u1', { actionType: 'FOLLOW_UP_APPLICATION', title: 'Called the recruiter', subjectId: A1, completedAt: '2026-09-20T10:00:00.000Z' });
    expect(a.completionSource).toBe('user_reported');
    const row = query(0)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: 'u1', action_type: 'FOLLOW_UP_APPLICATION', source: 'user_reported', status: 'COMPLETED', completion_source: 'user_reported', completed_at: '2026-09-20T10:00:00.000Z', dedupe_key: `FOLLOW_UP_APPLICATION:${A1}:user_reported:2026-09-20T10:00:00.000Z` });
  });
});

describe('eventRepo', () => {
  it('insert upserts on (user_id, dedupe_key) ignoring duplicates, or inserts plainly without a key', async () => {
    const base = { eventName: 'application_started' as const, schemaVersion: 1, subjectRefs: { application: A1 }, correlationId: 'c', source: 'client' as const, occurredAt: '2026-09-20T00:00:00.000Z', payload: { attempt: 1 } };
    await eventRepo.insert('u1', { ...base, dedupeKey: `application_started:${A1}` });
    const args = query(0)!.calls.find(([n]) => n === 'upsert')![1];
    expect(args[0]).toMatchObject({ user_id: 'u1', event_name: 'application_started', dedupe_key: `application_started:${A1}`, payload: { attempt: 1 } });
    expect(args[1]).toEqual({ onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
    await eventRepo.insert('u1', { ...base, dedupeKey: null });
    expect(query(1)!.calls.some(([n]) => n === 'insert')).toBe(true);
    expect(query(1)!.calls.some(([n]) => n === 'upsert')).toBe(false);
  });
  it('listRecent is owner-scoped, newest first, capped, optionally filtered to activity names', async () => {
    enqueue({ data: [{ id: 'e1', event_name: 'application_submitted', occurred_at: 't', subject_refs: { application: A1 }, payload: {} }], error: null });
    const events = await eventRepo.listRecent('u1', 500, ['application_submitted', 'career_goal_created']);
    expect(events[0].eventName).toBe('application_submitted');
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'in', 'event_name', ['application_submitted', 'career_goal_created']) && has(query(0), 'order', 'occurred_at', { ascending: false }) && has(query(0), 'limit', 100)).toBe(true);
  });
});

describe('notificationRepo', () => {
  it('list hides dismissed by default; markRead/dismiss stamp owner rows and NotFound otherwise', async () => {
    enqueue({ data: [], error: null });
    await notificationRepo.list('u1', { unreadOnly: true });
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'is', 'read_at', null) && has(query(0), 'is', 'dismissed_at', null)).toBe(true);
    enqueue({ data: [{ id: N1, kind: 'information', title: 'T', read_at: 't' }], error: null });
    expect((await notificationRepo.markRead('u1', N1)).readAt).toBe('t');
    const sent = query(1)!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(typeof sent.read_at).toBe('string');
    expect(has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'id', N1)).toBe(true);
    enqueue({ data: [], error: null });
    await expect(notificationRepo.dismiss('u1', N1)).rejects.toBeInstanceOf(NotFoundError);
  });
  it('upsertByDedupeKey is idempotent and returns null when the key already existed', async () => {
    enqueue({ data: [{ id: N1, kind: 'action_required', title: 'Prep', dedupe_key: 'k' }], error: null });
    const n = await notificationRepo.upsertByDedupeKey('u1', { kind: 'action_required', title: 'Prep', body: '', actionId: ACT1, dedupeKey: 'k' });
    expect(n?.id).toBe(N1);
    const args = query(0)!.calls.find(([c]) => c === 'upsert')![1];
    expect(args[0]).toMatchObject({ user_id: 'u1', kind: 'action_required', action_id: ACT1, dedupe_key: 'k' });
    expect(args[1]).toEqual({ onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
    enqueue({ data: [], error: null });
    expect(await notificationRepo.upsertByDedupeKey('u1', { kind: 'information', title: 'x', body: '', actionId: null, dedupeKey: 'k' })).toBeNull();
  });
});

describe('preferencesRepo', () => {
  it('ensure creates the row once; update stamps consent when proactive is switched on', async () => {
    enqueue({ data: null, error: null }, { data: null, error: null }, { data: { user_id: 'u1', revision: 1 }, error: null });
    const p = await preferencesRepo.ensure('u1');
    expect(p.proactiveEnabled).toBe(false);
    expect(has(query(1), 'upsert', { user_id: 'u1' }, { onConflict: 'user_id', ignoreDuplicates: true })).toBe(true);
    enqueue({ data: [{ user_id: 'u1', proactive_enabled: true, consent_at: 'c', revision: 2 }], error: null });
    await preferencesRepo.update('u1', { proactiveEnabled: true, dailyActionCap: 2 }, 1);
    const sent = query(3)!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(sent).toMatchObject({ proactive_enabled: true, daily_action_cap: 2 });
    expect(typeof sent.consent_at).toBe('string');
    expect(sent).not.toHaveProperty('user_id');
    expect(has(query(3), 'eq', 'user_id', 'u1') && has(query(3), 'eq', 'revision', 1)).toBe(true);
    enqueue({ data: [], error: null });
    await expect(preferencesRepo.update('u1', { timeZone: 'UTC' }, 1)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('scenarioRepo / insightRepo / migrationRepo', () => {
  it('scenario CRUD is owner-scoped with revision-checked updates', async () => {
    enqueue({ data: { id: S1, name: 'S', kind: 'goals', options: [], revision: 1 }, error: null });
    await scenarioRepo.create('u1', { name: 'S' });
    const row = query(0)!.calls.find(([n]) => n === 'insert')![1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: 'u1', name: 'S', kind: 'goals', options: [], assumptions: [], result: null });
    enqueue({ data: [], error: null });
    await expect(scenarioRepo.update('u1', S1, { name: 'T' }, 1)).rejects.toBeInstanceOf(ConflictError);
    enqueue({ data: null, error: null });
    await expect(scenarioRepo.get('u1', S1)).rejects.toBeInstanceOf(NotFoundError);
    await scenarioRepo.remove('u1', S1);
    expect(has(query(3), 'delete') && has(query(3), 'eq', 'user_id', 'u1') && has(query(3), 'eq', 'id', S1)).toBe(true);
    await scenarioRepo.remove('u1', 'not-a-uuid');
    expect(tables()).toHaveLength(4); // malformed id never reaches the database
  });
  it('insights list active by default and setStatus is owner-scoped', async () => {
    enqueue({ data: [], error: null });
    await insightRepo.list('u1');
    expect(has(query(0), 'eq', 'status', 'active') && has(query(0), 'eq', 'user_id', 'u1')).toBe(true);
    enqueue({ data: [{ id: I1, kind: 'k', statement: 's', status: 'revoked' }], error: null });
    expect((await insightRepo.setStatus('u1', I1, 'revoked')).status).toBe('revoked');
    expect(has(query(1), 'update', { status: 'revoked' }) && has(query(1), 'eq', 'user_id', 'u1') && has(query(1), 'eq', 'id', I1)).toBe(true);
    enqueue({ data: [], error: null });
    await expect(insightRepo.setStatus('u1', I1, 'stale')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('migration ledger reads are owner-scoped and mappedId only trusts done rows', async () => {
    enqueue({ data: [{ id: 'm', migration: 'career_os_v1', item_kind: 'job_application', old_id: A1, new_id: ID('o1'), status: 'done' }], error: null });
    const entries = await migrationRepo.list('u1', 'career_os_v1');
    expect(entries[0].newId).toBe(ID('o1'));
    expect(has(query(0), 'eq', 'user_id', 'u1') && has(query(0), 'eq', 'migration', 'career_os_v1')).toBe(true);
    enqueue({ data: { new_id: ID('o1'), status: 'skipped' }, error: null });
    expect(await migrationRepo.mappedId('u1', 'career_os_v1', 'job_application', A1)).toBeNull();
    enqueue({ data: { new_id: ID('o1'), status: 'done' }, error: null });
    expect(await migrationRepo.mappedId('u1', 'career_os_v1', 'job_application', A1)).toBe(ID('o1'));
  });
});

describe('actionRepo — stale rule rows of other types', () => {
  beforeEach(() => reset());
  it('expires a live rule action whose type no longer appears among the candidates', async () => {
    const stale = action({ id: 'x1', actionType: 'REVIEW_PROFILE', dedupeKey: 'REVIEW_PROFILE:career:abc', status: 'READY', source: 'rule' });
    enqueue({ data: [rows.action(stale)], error: null });
    enqueue({ data: [{ id: 'x1' }], error: null });
    const result = await actionRepo.upsertByDedupeKey('u1', []);
    expect(result.expired).toEqual(['x1']);
  });
});
