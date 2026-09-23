// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobApplication } from '../../../types';

// Chainable PostgREST stand-in whose answer can depend on the recorded calls,
// so one record's write can be made to fail while the others succeed.
type Call = [string, unknown[]];
type Result = { data?: unknown; error?: unknown };
const state: { resolve: (table: string, calls: Call[]) => Result; calls: Call[][]; tables: string[] } = {
  resolve: () => ({ data: null, error: null }), calls: [], tables: [],
};
function makeBuilder(table: string) {
  const calls: Call[] = [];
  state.calls.push(calls);
  const builder: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => { calls.push([name, args]); return builder; };
  for (const m of ['select', 'eq', 'order', 'limit', 'delete', 'update', 'upsert', 'insert']) builder[m] = chain(m);
  builder.maybeSingle = () => { calls.push(['maybeSingle', []]); return Promise.resolve(state.resolve(table, calls)); };
  builder.single = () => { calls.push(['single', []]); return Promise.resolve(state.resolve(table, calls)); };
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(state.resolve(table, calls)).then(resolve, reject);
  return builder;
}
vi.mock('../../supabase', () => ({
  getSupabase: () => ({ from: (table: string) => { state.tables.push(table); return makeBuilder(table); } }),
}));

import * as trackerRepo from '../trackerRepo';
import { ConflictError, NotFoundError } from '../../careerOs/types';
import { installLocalStorage } from '../../../lib/builder/__tests__/localStorageStub';

installLocalStorage();

const job = (id: string, over: Partial<JobApplication> = {}): JobApplication => ({
  id, jobTitle: `Role ${id}`, company: `Co ${id}`, status: 'wishlist', ...over,
});

/** Answer every write with its own row, except the ids listed in `failIds`. */
const okExcept = (failIds: string[]) => (_table: string, calls: Call[]): Result => {
  const upserted = calls.find(([n]) => n === 'upsert')?.[1][0] as Record<string, unknown> | undefined;
  const deletedId = calls.find(([n, a]) => n === 'eq' && a[0] === 'id')?.[1][1] as string | undefined;
  const id = (upserted?.id as string | undefined) ?? deletedId;
  if (id && failIds.includes(id)) return { data: null, error: new Error(`fail ${id}`) };
  return { data: upserted ?? null, error: null };
};

/** Every write attempted in this test, as `upsert:<id>` / `remove:<id>`. */
const writes = () => state.calls.map((calls) => {
  const upserted = calls.find(([n]) => n === 'upsert')?.[1][0] as Record<string, unknown> | undefined;
  if (upserted) return `upsert:${upserted.id}`;
  if (calls.some(([n]) => n === 'delete')) return `remove:${calls.find(([n, a]) => n === 'eq' && a[0] === 'id')?.[1][1]}`;
  if (calls.some(([n]) => n === 'update')) return `update:${calls.find(([n, a]) => n === 'eq' && a[0] === 'id')?.[1][1]}`;
  return calls.some(([n]) => n === 'select') ? 'read' : 'other';
});

beforeEach(() => {
  state.resolve = () => ({ data: null, error: null });
  state.calls = [];
  state.tables = [];
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('trackerRepo.diffJobs (pure)', () => {
  it('emits one upsert per added or changed row and one remove per dropped row', () => {
    const prev = [job('a'), job('b', { status: 'applied' }), job('c')];
    const next = [job('a'), job('b', { status: 'interview' }), job('d')];
    expect(trackerRepo.diffJobs(prev, next)).toEqual([
      { kind: 'upsert', job: job('b', { status: 'interview' }) },
      { kind: 'upsert', job: job('d') },
      { kind: 'remove', id: 'c' },
    ]);
  });
  it('emits nothing when nothing changed', () => {
    expect(trackerRepo.diffJobs([job('a')], [job('a')])).toEqual([]);
  });
  it('mergeOps keeps one op per record with the newest intent winning', () => {
    const merged = trackerRepo.mergeOps(
      [{ kind: 'upsert', job: job('a') }, { kind: 'upsert', job: job('b') }],
      [{ kind: 'remove', id: 'a' }],
    );
    expect(merged).toEqual([{ kind: 'upsert', job: job('b') }, { kind: 'remove', id: 'a' }]);
  });
  it('applyOpsLocally projects queued intent onto a list', () => {
    const out = trackerRepo.applyOpsLocally([job('a'), job('b')], [
      { kind: 'remove', id: 'a' }, { kind: 'upsert', job: job('b', { status: 'offer' }) }, { kind: 'upsert', job: job('c') },
    ]);
    expect(out.map((j) => `${j.id}:${j.status}`)).toEqual(['b:offer', 'c:wishlist']);
  });
});

describe('trackerRepo.syncJobs (per-record writes + pending queue)', () => {
  it('writes only the changed records', async () => {
    state.resolve = okExcept([]);
    const prev = [job('a'), job('b')];
    const next = [job('a'), job('b', { notes: 'called back' }), job('c')];
    const { failed } = await trackerRepo.syncJobs('u1', prev, next);
    expect(failed).toEqual([]);
    expect(writes().sort()).toEqual(['upsert:b', 'upsert:c']);
    expect(localStorage.getItem(trackerRepo.pendingKey('u1'))).toBeNull();
  });
  it('queues the record that failed, keeps the others, and retries it on the next save', async () => {
    state.resolve = okExcept(['b']);
    const { failed, error } = await trackerRepo.syncJobs('u1', [], [job('a'), job('b')]);
    expect(failed).toEqual([{ kind: 'upsert', job: job('b') }]);
    expect(error).toBeInstanceOf(Error);
    expect(writes().sort()).toEqual(['upsert:a', 'upsert:b']);
    expect(trackerRepo.readPending('u1')).toEqual([{ kind: 'upsert', job: job('b') }]);

    // Next save: an unrelated change plus the queued record go out together.
    state.calls = [];
    state.resolve = okExcept([]);
    const again = await trackerRepo.syncJobs('u1', [job('a'), job('b')], [job('a', { status: 'applied' }), job('b')]);
    expect(again.failed).toEqual([]);
    expect(writes().sort()).toEqual(['upsert:a', 'upsert:b']);
    expect(localStorage.getItem(trackerRepo.pendingKey('u1'))).toBeNull();
  });
  it('a later removal supersedes a queued upsert of the same record', async () => {
    state.resolve = okExcept(['b']);
    await trackerRepo.syncJobs('u1', [], [job('b')]);
    state.calls = [];
    state.resolve = okExcept([]);
    await trackerRepo.syncJobs('u1', [job('b')], []);
    expect(writes()).toEqual(['remove:b']);
    expect(trackerRepo.readPending('u1')).toEqual([]);
  });
  it('flushPending retries the queue on load and keeps what still fails, per user', async () => {
    trackerRepo.writePending('u1', [{ kind: 'upsert', job: job('a') }, { kind: 'remove', id: 'z' }]);
    trackerRepo.writePending('u2', [{ kind: 'upsert', job: job('q') }]);
    state.resolve = okExcept(['z']);
    const { failed } = await trackerRepo.flushPending('u1');
    expect(failed).toEqual([{ kind: 'remove', id: 'z' }]);
    expect(writes().sort()).toEqual(['remove:z', 'upsert:a']);
    expect(trackerRepo.readPending('u1')).toEqual([{ kind: 'remove', id: 'z' }]);
    expect(trackerRepo.readPending('u2')).toEqual([{ kind: 'upsert', job: job('q') }]);
  });
  it('ignores a corrupt queue instead of throwing', () => {
    localStorage.setItem(trackerRepo.pendingKey('u1'), '{not json');
    expect(trackerRepo.readPending('u1')).toEqual([]);
    localStorage.setItem(trackerRepo.pendingKey('u1'), JSON.stringify([{ kind: 'nope' }, null, { kind: 'remove', id: 'x' }]));
    expect(trackerRepo.readPending('u1')).toEqual([{ kind: 'remove', id: 'x' }]);
  });
});

describe('trackerRepo.importLocalJobs', () => {
  const samples: JobApplication[] = [
    { id: '1', jobTitle: 'Senior Systems Coordinator', company: 'Stripe', status: 'applied' },
    { id: '2', jobTitle: 'Business Systems Specialist', company: 'Google Cloud Corp', status: 'interview' },
    { id: '3', jobTitle: 'Solutions Architect', company: 'Salesforce', status: 'offer' },
  ];
  it('never imports the hard-coded sample rows', async () => {
    state.resolve = okExcept([]);
    const result = await trackerRepo.importLocalJobs('u1', samples, () => 'new');
    expect(result.imported).toEqual([]);
    expect(writes()).toEqual([]);
    expect(samples.every(trackerRepo.isDefaultSampleJob)).toBe(true);
    // A user-created row that merely shares an id with a sample is not a sample.
    expect(trackerRepo.isDefaultSampleJob({ id: '1', company: 'My Own Co' })).toBe(false);
  });
  it('imports user rows under new ids and is idempotent through the id map', async () => {
    state.resolve = okExcept([]);
    const ids = ['c-1', 'c-2'];
    const local = [...samples, job('local-a'), job('local-b')];
    const first = await trackerRepo.importLocalJobs('u1', local, () => ids.shift() ?? 'x');
    expect(first.imported.map((j) => j.id)).toEqual(['c-1', 'c-2']);
    expect(writes().sort()).toEqual(['upsert:c-1', 'upsert:c-2']);
    expect(trackerRepo.readImportMap('u1')).toEqual({ 'local-a': 'c-1', 'local-b': 'c-2' });

    state.calls = [];
    const second = await trackerRepo.importLocalJobs('u1', local, () => 'never');
    expect(second.imported).toEqual([]);
    expect(writes()).toEqual([]);
  });
  it('queues rows the cloud rejected under their mapped id so a retry cannot duplicate them', async () => {
    state.resolve = okExcept(['c-2']);
    const ids = ['c-1', 'c-2'];
    const result = await trackerRepo.importLocalJobs('u1', [job('local-a'), job('local-b')], () => ids.shift() ?? 'x');
    expect(result.failed).toEqual([{ kind: 'upsert', job: job('local-b', { id: 'c-2' }) }]);
    expect(trackerRepo.readPending('u1')).toEqual([{ kind: 'upsert', job: job('local-b', { id: 'c-2' }) }]);
    expect(trackerRepo.readImportMap('u1')).toEqual({ 'local-a': 'c-1', 'local-b': 'c-2' });
    // The retry goes through the queue, not through a second import.
    state.calls = [];
    state.resolve = okExcept([]);
    await trackerRepo.flushPending('u1');
    expect(writes()).toEqual(['upsert:c-2']);
    const again = await trackerRepo.importLocalJobs('u1', [job('local-a'), job('local-b')], () => 'never');
    expect(again.imported).toEqual([]);
  });
});

describe('trackerRepo.update / get', () => {
  it('update sends the revision precondition and reports a stale one as ConflictError', async () => {
    state.resolve = () => ({ data: [{ id: 'j1', revision: 3, updated_at: 't' }], error: null });
    const saved = await trackerRepo.update('u1', 'j1', { status: 'offer' }, 2);
    expect(saved).toEqual({ id: 'j1', revision: 3, updatedAt: 't' });
    const calls = state.calls[0];
    expect(calls[0][0]).toBe('update');
    expect((calls[0][1][0] as Record<string, unknown>).status).toBe('offer');
    expect(calls.some(([n, a]) => n === 'eq' && a[0] === 'revision' && a[1] === 2)).toBe(true);
    expect(calls.some(([n, a]) => n === 'select' && a[0] === 'id,revision,updated_at')).toBe(true);

    state.resolve = () => ({ data: [], error: null });
    const err = await trackerRepo.update('u1', 'j1', { status: 'offer' }, 2).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err).toMatchObject({ entity: 'job_application', id: 'j1', expectedRevision: 2 });
    const gone = await trackerRepo.update('u1', 'j1', { status: 'offer' }).catch((e) => e);
    expect(gone).toBeInstanceOf(NotFoundError);
  });
  it('get returns the owner-scoped row with the legacy JobApplication fields only', async () => {
    state.resolve = () => ({
      data: { id: 'j1', role: 'RN', company: 'Acme', status: 'applied', url: 'http://x', match_score: 80, stage: 'submitted', revision: 4 },
      error: null,
    });
    const j = await trackerRepo.get('u1', 'j1');
    expect(j).toEqual({ id: 'j1', jobTitle: 'RN', company: 'Acme', status: 'applied', jobUrl: 'http://x', matchScore: 80, dateApplied: undefined, notes: undefined });
    const calls = state.calls[0];
    expect(calls.some(([n, a]) => n === 'eq' && a[0] === 'user_id' && a[1] === 'u1')).toBe(true);
    state.resolve = () => ({ data: null, error: null });
    expect(await trackerRepo.get('u1', 'missing')).toBeNull();
  });
});
