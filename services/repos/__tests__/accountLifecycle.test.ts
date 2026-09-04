// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A minimal chainable stand-in for the PostgREST query builder: every filter
// method returns the builder, and the builder resolves to `result`. Calls are
// recorded so tests can assert the exact filters a repo applied.
type Call = [string, unknown[]];
function makeBuilder(result: { data?: unknown; error?: unknown }, calls: Call[]) {
  const builder: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => { calls.push([name, args]); return builder; };
  for (const m of ['select', 'eq', 'order', 'limit', 'delete']) builder[m] = chain(m);
  builder.maybeSingle = () => { calls.push(['maybeSingle', []]); return Promise.resolve(result); };
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

const state: { result: { data?: unknown; error?: unknown }; calls: Call[]; tables: string[]; signed: { data?: unknown; error?: unknown } } = {
  result: { data: [], error: null }, calls: [], tables: [], signed: { data: { signedUrl: 'https://signed.test/x' }, error: null },
};
const createSignedUrl = vi.fn(async () => state.signed);

vi.mock('../../supabase', () => ({
  getSupabase: () => ({
    from: (table: string) => { state.tables.push(table); return makeBuilder(state.result, state.calls); },
    storage: { from: (bucket: string) => { state.tables.push(`storage:${bucket}`); return { createSignedUrl }; } },
  }),
}));
const callFn = vi.fn();
vi.mock('../../api', () => ({ callFn: (...args: unknown[]) => callFn(...args) }));

import * as atsReportRepo from '../atsReportRepo';
import * as headshotRepo from '../headshotRepo';
import { deleteAccount, exportAccount, exportFilename } from '../accountRepo';

beforeEach(() => { state.result = { data: [], error: null }; state.calls = []; state.tables = []; callFn.mockReset(); createSignedUrl.mockClear(); });
afterEach(() => vi.restoreAllMocks());

const has = (name: string, ...args: unknown[]) =>
  state.calls.some(([n, a]) => n === name && JSON.stringify(a) === JSON.stringify(args));

describe('atsReportRepo', () => {
  it('listRecent scopes to the owner, newest first, capped at N, without the report body', async () => {
    state.result = { data: [{ id: 'a', resume_id: null, job_description: 'Senior RN\nRemote', score: 82, created_at: '2026-09-01T00:00:00Z' }], error: null };
    const rows = await atsReportRepo.listRecent('u1', 5);
    expect(state.tables).toEqual(['ats_reports']);
    expect(has('eq', 'user_id', 'u1')).toBe(true);
    expect(has('order', 'created_at', { ascending: false })).toBe(true);
    expect(has('limit', 5)).toBe(true);
    expect(state.calls.find(([n]) => n === 'select')?.[1][0]).not.toContain('report');
    expect(rows).toEqual([{ id: 'a', resumeId: null, jobDescription: 'Senior RN\nRemote', score: 82, createdAt: '2026-09-01T00:00:00Z' }]);
  });
  it('getById unwraps the { job, report } payload ats-analyze stores', async () => {
    state.result = { data: { id: 'a', user_id: 'u1', score: 40, created_at: 'x', report: { job: { title: 'RN' }, report: { atsScore: 40 } } }, error: null };
    const stored = await atsReportRepo.getById('u1', 'a');
    expect(has('eq', 'user_id', 'u1') && has('eq', 'id', 'a')).toBe(true);
    expect(stored?.report).toEqual({ atsScore: 40 });
    expect(stored?.job).toEqual({ title: 'RN' });
  });
  it('getById accepts a bare AtsReport body and returns null for no row', async () => {
    state.result = { data: { id: 'a', score: 40, created_at: 'x', report: { atsScore: 40 } }, error: null };
    expect((await atsReportRepo.getById('u1', 'a'))?.report).toEqual({ atsScore: 40 });
    expect((await atsReportRepo.getById('u1', 'a'))?.job).toBeNull();
    state.result = { data: null, error: null };
    expect(await atsReportRepo.getById('u1', 'missing')).toBeNull();
  });
  it('remove deletes only the owner-scoped row and surfaces errors', async () => {
    await atsReportRepo.remove('u1', 'a');
    expect(state.calls[0][0]).toBe('delete');
    expect(has('eq', 'user_id', 'u1') && has('eq', 'id', 'a')).toBe(true);
    state.result = { data: null, error: new Error('rls') };
    await expect(atsReportRepo.remove('u1', 'a')).rejects.toThrow('rls');
  });
  it('jdHeadline takes the first non-empty line and truncates', () => {
    expect(atsReportRepo.jdHeadline('\n\n  Staff Nurse (ICU)  \nLondon')).toBe('Staff Nurse (ICU)');
    expect(atsReportRepo.jdHeadline(null)).toBe('');
    expect(atsReportRepo.jdHeadline('x'.repeat(100), 10)).toBe('xxxxxxxxx…');
  });
});

describe('headshotRepo', () => {
  it('list returns the owner rows newest first', async () => {
    state.result = { data: [{ id: 'h1', storage_path: 'u1/a.png', created_at: 't' }], error: null };
    expect(await headshotRepo.list('u1')).toEqual([{ id: 'h1', storagePath: 'u1/a.png', createdAt: 't' }]);
    expect(state.tables).toEqual(['headshots']);
    expect(has('eq', 'user_id', 'u1') && has('order', 'created_at', { ascending: false })).toBe(true);
  });
  it('signedUrl signs the path in the private headshots bucket with the default TTL', async () => {
    expect(await headshotRepo.signedUrl('u1/a.png')).toBe('https://signed.test/x');
    expect(state.tables).toEqual(['storage:headshots']);
    expect(createSignedUrl).toHaveBeenCalledWith('u1/a.png', headshotRepo.HEADSHOT_URL_TTL_SECONDS);
    state.signed = { data: null, error: new Error('nope') };
    await expect(headshotRepo.signedUrl('u1/a.png')).rejects.toThrow('nope');
    state.signed = { data: { signedUrl: 'https://signed.test/x' }, error: null };
  });
});

describe('accountRepo', () => {
  it('exportAccount calls account-export and offers the dated JSON file for download', async () => {
    callFn.mockResolvedValue({ format: 'cvbase-account-export', version: 1, exportedAt: '2026-09-02T10:00:00Z', resumes: [] });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    const filename = await exportAccount();
    expect(callFn).toHaveBeenCalledWith('account-export', {});
    expect(filename).toBe('cvbase-export-2026-09-02.json');
    expect(click).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
  it('exportFilename falls back to today for an unparsable date', () => {
    expect(exportFilename('not a date')).toMatch(/^cvbase-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
  it('deleteAccount posts the trimmed confirmation email and propagates the coded error', async () => {
    callFn.mockResolvedValue({ deleted: true });
    await deleteAccount('  Me@Example.com ');
    expect(callFn).toHaveBeenCalledWith('account-delete', { confirm: 'Me@Example.com' });
    callFn.mockRejectedValue(Object.assign(new Error('confirm_mismatch'), { code: 'confirm_mismatch', status: 400 }));
    await expect(deleteAccount('other@example.com')).rejects.toMatchObject({ code: 'confirm_mismatch' });
  });
});
