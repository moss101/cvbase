import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Chainable stand-in for the PostgREST query builder (see accountLifecycle
// test): every filter records itself and the builder resolves to whatever
// `state.resolve` returns for the recorded calls, so a test can answer
// "zero rows" for a stale revision and a row for a fresh one.
type Call = [string, unknown[]];
type Result = { data?: unknown; error?: unknown };
const state: { resolve: (table: string, calls: Call[]) => Result; calls: Call[]; tables: string[] } = {
  resolve: () => ({ data: null, error: null }), calls: [], tables: [],
};
function makeBuilder(table: string, calls: Call[]) {
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
  getSupabase: () => ({
    from: (table: string) => { state.tables.push(table); return makeBuilder(table, state.calls); },
  }),
}));

import * as resumeRepo from '../resumeRepo';
import { rowToResume, resumeToRow } from '../mappers';
import { ConflictError, NotFoundError } from '../../careerOs/types';
import type { ResumeData, ResumeSettings } from '../../../types';

beforeEach(() => { state.resolve = () => ({ data: null, error: null }); state.calls = []; state.tables = []; });
afterEach(() => vi.restoreAllMocks());

const has = (name: string, ...args: unknown[]) =>
  state.calls.some(([n, a]) => n === name && JSON.stringify(a) === JSON.stringify(args));

describe('mappers: revision fields', () => {
  it('rowToResume surfaces updated_at, revision, application_id and origin', () => {
    const r = rowToResume({
      id: 'r1', title: 'Dev CV', data: {}, settings: {}, template_id: 'harvard', visible_sections: [], is_primary: false,
      updated_at: '2026-09-20T10:00:00Z', revision: 7, application_id: 'app-1', origin: { kind: 'prism', runId: 'run-1' },
    });
    expect(r.updatedAt).toBe('2026-09-20T10:00:00Z');
    expect(r.revision).toBe(7);
    expect(r.applicationId).toBe('app-1');
    expect(r.origin).toEqual({ kind: 'prism', runId: 'run-1' });
  });
  it('rowToResume tolerates rows from before the migration', () => {
    const r = rowToResume({ id: 'r1', data: {}, settings: {} });
    expect(r.updatedAt).toBeUndefined();
    expect(r.revision).toBeUndefined();
    expect(r.applicationId).toBeNull();
    expect(r.origin).toBeNull();
  });
  it('resumeToRow never writes revision/updated_at, and writes application_id/origin only when defined', () => {
    const row = resumeToRow({
      title: 'X', data: {} as ResumeData, settings: {} as ResumeSettings,
      revision: 9, updatedAt: '2026-01-01T00:00:00Z',
    }, 'u1');
    expect('revision' in row).toBe(false);
    expect('updated_at' in row).toBe(false);
    expect('application_id' in row).toBe(false);
    expect('origin' in row).toBe(false);
    const linked = resumeToRow({ applicationId: 'app-1', origin: { kind: 'copy', sourceResumeId: 'r0' } }, 'u1');
    expect(linked.application_id).toBe('app-1');
    expect(linked.origin).toEqual({ kind: 'copy', sourceResumeId: 'r0' });
    expect(resumeToRow({ applicationId: null }, 'u1').application_id).toBeNull();
  });
});

describe('resumeRepo.saveById', () => {
  it('adds the revision precondition and selects the new revision', async () => {
    state.resolve = () => ({ data: [{ id: 'r1', revision: 4, updated_at: '2026-09-20T10:00:01Z' }], error: null });
    const saved = await resumeRepo.saveById('u1', 'r1', { title: 'T' }, 3);
    expect(state.tables).toEqual(['resumes']);
    expect(state.calls[0][0]).toBe('update');
    const patch = state.calls[0][1][0] as Record<string, unknown>;
    expect(patch.title).toBe('T');
    expect('id' in patch).toBe(false);
    expect('revision' in patch).toBe(false);
    expect(has('eq', 'user_id', 'u1') && has('eq', 'id', 'r1') && has('eq', 'revision', 3)).toBe(true);
    expect(has('select', 'id,revision,updated_at')).toBe(true);
    expect(saved).toEqual({ id: 'r1', revision: 4, updatedAt: '2026-09-20T10:00:01Z' });
  });
  it('throws ConflictError when the stale revision matches zero rows', async () => {
    state.resolve = () => ({ data: [], error: null });
    const err = await resumeRepo.saveById('u1', 'r1', { title: 'T' }, 3).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err).toMatchObject({ code: 'conflict', entity: 'resume', id: 'r1', expectedRevision: 3 });
  });
  it('omits the precondition when no revision is known and reports a vanished row as NotFoundError', async () => {
    state.resolve = () => ({ data: [{ id: 'r1', revision: 1, updated_at: 'x' }], error: null });
    await resumeRepo.saveById('u1', 'r1', { title: 'T' });
    expect(state.calls.some(([n, a]) => n === 'eq' && a[0] === 'revision')).toBe(false);
    state.calls = [];
    state.resolve = () => ({ data: [], error: null });
    const err = await resumeRepo.saveById('u1', 'gone', { title: 'T' }).catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toMatchObject({ code: 'not_found', id: 'gone' });
  });
  it('propagates a database error', async () => {
    state.resolve = () => ({ data: null, error: new Error('rls') });
    await expect(resumeRepo.saveById('u1', 'r1', { title: 'T' }, 1)).rejects.toThrow('rls');
  });
});

describe('resumeRepo.get', () => {
  it('returns null for a missing/unowned id instead of another row', async () => {
    state.resolve = () => ({ data: null, error: null });
    expect(await resumeRepo.get('u1', 'nope')).toBeNull();
    expect(has('eq', 'user_id', 'u1') && has('eq', 'id', 'nope')).toBe(true);
  });
  it('maps revision and updated_at through', async () => {
    state.resolve = () => ({ data: { id: 'r1', data: {}, settings: {}, revision: 2, updated_at: 't' }, error: null });
    const r = await resumeRepo.get('u1', 'r1');
    expect(r?.revision).toBe(2);
    expect(r?.updatedAt).toBe('t');
  });
});
