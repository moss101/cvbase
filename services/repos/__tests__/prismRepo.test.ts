// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Chainable stand-in for the PostgREST builder (see accountLifecycle.test.ts):
// every filter returns the builder, terminals resolve `state.result`, and
// calls are recorded so tests can assert the exact scoping a repo applied.
type Call = [string, unknown[]];
function makeBuilder(result: { data?: unknown; error?: unknown }, calls: Call[]) {
  const builder: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => { calls.push([name, args]); return builder; };
  for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit', 'delete', 'insert']) builder[m] = chain(m);
  builder.maybeSingle = () => { calls.push(['maybeSingle', []]); return Promise.resolve(result); };
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

const state: { result: { data?: unknown; error?: unknown }; calls: Call[]; tables: string[] } = {
  result: { data: null, error: null }, calls: [], tables: [],
};
vi.mock('../../supabase', () => ({
  getSupabase: () => ({
    from: (table: string) => { state.tables.push(table); return makeBuilder(state.result, state.calls); },
  }),
}));

import { getResumable, getResumableForApplication } from '../prismRepo';

beforeEach(() => { state.result = { data: null, error: null }; state.calls = []; state.tables = []; });

const has = (name: string, ...args: unknown[]) =>
  state.calls.some(([n, a]) => n === name && JSON.stringify(a) === JSON.stringify(args));

const ROW = {
  id: 'run-1', status: 'review', template_id: 'modern', questions: [], answers: [], result: null,
  error_code: null, updated_at: '2026-09-20T10:00:00Z',
  application_id: 'app-1', source_resume_id: 'res-1', source_resume_revision: 3, idempotency_key: 'k',
};

describe('prismRepo resumable runs', () => {
  it('getResumable (standalone wizard) is owner-scoped and EXCLUDES runs bound to an application', async () => {
    state.result = { data: null, error: null };
    expect(await getResumable('u1')).toBeNull();
    expect(state.tables).toEqual(['prism_runs']);
    expect(has('eq', 'user_id', 'u1')).toBe(true);
    expect(has('is', 'application_id', null)).toBe(true);
    expect(has('in', 'status', ['awaiting_answers', 'review', 'failed'])).toBe(true);
    expect(has('order', 'updated_at', { ascending: false })).toBe(true);
    expect(has('limit', 1)).toBe(true);
  });

  it('getResumableForApplication scopes by owner AND application id, never a bare owner query', async () => {
    state.result = { data: ROW, error: null };
    const run = await getResumableForApplication('u1', 'app-1');
    expect(has('eq', 'user_id', 'u1')).toBe(true);
    expect(has('eq', 'application_id', 'app-1')).toBe(true);
    expect(has('is', 'application_id', null)).toBe(false);
    expect(has('in', 'status', ['awaiting_answers', 'review', 'failed'])).toBe(true);
    expect(run).toEqual({
      id: 'run-1', status: 'review', templateId: 'modern', questions: [], answers: [], result: null,
      errorCode: null, updatedAt: '2026-09-20T10:00:00Z',
      applicationId: 'app-1', sourceResumeId: 'res-1', sourceResumeRevision: 3, idempotencyKey: 'k',
    });
  });

  it('maps a legacy row without binding columns to nulls', async () => {
    state.result = { data: { id: 'run-0', status: 'failed', updated_at: 'x' }, error: null };
    const run = await getResumable('u1');
    expect(run).toMatchObject({ id: 'run-0', status: 'failed', templateId: 'classic', applicationId: null, sourceResumeId: null, sourceResumeRevision: null, idempotencyKey: null });
  });

  it('surfaces query errors', async () => {
    state.result = { data: null, error: new Error('rls') };
    await expect(getResumableForApplication('u1', 'app-1')).rejects.toThrow('rls');
  });
});
