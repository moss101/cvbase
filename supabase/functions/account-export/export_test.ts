import { assert, assertEquals, assertRejects } from 'jsr:@std/assert';
import type { User } from 'jsr:@supabase/supabase-js@2';
import {
  CAREER_OS_MIGRATION,
  CAREER_OS_TABLES,
  cascadesFromAuthUsers,
  createdTables,
  PRISM_RUN_COLUMNS,
  tableBody,
} from '../_shared/careerTables.ts';
import { assembleExport, EXPORT_SECTIONS, EXPORT_VERSION, exportResponse } from './export.ts';
import { HttpError } from '../_shared/respond.ts';

// Lifecycle coverage (COS-007). Two things must never drift apart:
//   1. the Career OS tables the foundation migration creates, and
//   2. the tables account-export enumerates / account-delete relies on
//      cascading from auth.users.
// Both are asserted by parsing the migration SQL itself, so adding a table
// without exporting it fails here, not in an audit. Reading the file needs
// `deno test --allow-read`; without it only these two tests fail (loudly).

const here = new URL('.', import.meta.url);
const readMigration = () => Deno.readTextFile(new URL(`../../../${CAREER_OS_MIGRATION}`, here));

Deno.test('coverage: every `create table public.…` in the foundation migration is in CAREER_OS_TABLES (and nothing extra)', async () => {
  const migrationSql = await readMigration();
  const created = createdTables(migrationSql);
  assert(created.length >= 20, `parser found only ${created.length} tables`);
  const listed = CAREER_OS_TABLES.map((t) => t.table);
  assertEquals([...created].sort(), [...listed].sort());
  // No duplicate sections, and every section is a stable camelCase key.
  assertEquals(new Set(CAREER_OS_TABLES.map((t) => t.section)).size, CAREER_OS_TABLES.length);
  for (const t of CAREER_OS_TABLES) assert(/^[a-z][A-Za-z]+$/.test(t.section), t.section);
});

Deno.test('delete-cascade audit: every new table\'s user_id references auth.users (id) on delete cascade', async () => {
  const migrationSql = await readMigration();
  for (const table of createdTables(migrationSql)) {
    const body = tableBody(migrationSql, table);
    assert(body, `no create table body for ${table}`);
    assert(cascadesFromAuthUsers(body), `${table} does not cascade from auth.users`);
  }
  // The parser is not vacuous: a body without the clause is rejected.
  assert(!cascadesFromAuthUsers('id uuid primary key,\n  user_id uuid not null,\n'));
  assert(cascadesFromAuthUsers('  user_id uuid primary key references auth.users (id) on delete cascade,'));
});

Deno.test('PRISM export columns carry the binding but never the run bodies', () => {
  for (const col of ['application_id', 'source_resume_id', 'source_resume_revision', 'idempotency_key', 'resume_id']) {
    assert(PRISM_RUN_COLUMNS.split(',').includes(col), col);
  }
  for (const col of ['jd_text', 'cv_text', 'checkpoint', 'gap_analysis', 'questions', 'answers', 'result']) {
    assert(!PRISM_RUN_COLUMNS.split(',').includes(col), `${col} must not be exported`);
  }
});

// ---- assembly with a fake service client -------------------------------------

type Row = Record<string, unknown>;
interface FakeOpts {
  rows?: Record<string, Row[]>;
  single?: Record<string, Row | null>;
  failTable?: string;
  storage?: { objects?: Array<{ id: string | null; name: string }>; signFail?: boolean };
}

/** Records the (table, columns) each select asked for; answers canned rows. */
function fakeSvc(opts: FakeOpts = {}) {
  const selects: Array<{ table: string; columns: string; filters: Array<[string, unknown]> }> = [];
  const from = (table: string) => {
    const q = { table, columns: '', filters: [] as Array<[string, unknown]> };
    selects.push(q);
    const result = () =>
      opts.failTable === table
        ? { data: null, error: { message: 'boom' } }
        : { data: opts.rows?.[table] ?? [], error: null };
    const builder: Record<string, unknown> = {
      select: (columns: string) => { q.columns = columns; return builder; },
      eq: (k: string, v: unknown) => { q.filters.push([k, v]); return builder; },
      order: () => builder,
      maybeSingle: () =>
        Promise.resolve(opts.failTable === table
          ? { data: null, error: { message: 'boom' } }
          : { data: opts.single?.[table] ?? null, error: null }),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej),
    };
    return builder;
  };
  const storage = {
    from: (_bucket: string) => ({
      list: () => Promise.resolve({ data: opts.storage?.objects ?? [], error: null }),
      createSignedUrls: (paths: string[]) =>
        Promise.resolve(opts.storage?.signFail
          ? { data: null, error: { message: 'sign' } }
          : { data: paths.map((p) => ({ path: p, signedUrl: `https://signed.test/${p}` })), error: null }),
    }),
  };
  return { svc: { from, storage }, selects };
}

const USER = {
  id: 'u1', email: 'a@example.com', created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-09-20T00:00:00Z',
  app_metadata: { providers: ['email'] },
} as unknown as User;

Deno.test('assembly: every section key is present (legacy + all Career OS tables), version 2, owner-scoped selects', async () => {
  const rows: Record<string, Row[]> = {};
  for (const t of CAREER_OS_TABLES) if (!t.single) rows[t.table] = [{ id: `${t.table}-1`, user_id: 'u1' }];
  rows.resumes = [{ id: 'r1', user_id: 'u1', application_id: 'app1', origin: { kind: 'prism' } }];
  rows.prism_runs = [{ id: 'p1', status: 'completed', application_id: 'app1', idempotency_key: 'k' }];
  const { svc, selects } = fakeSvc({
    rows,
    single: {
      profiles: { id: 'u1', first_name: 'A' },
      subscriptions: { plan_id: 'pro', status: 'active' },
      career_profiles: { user_id: 'u1', headline: 'RN' },
      career_preferences: { user_id: 'u1', proactive_enabled: false },
    },
  });
  const doc = await assembleExport(svc, USER, new Date('2026-09-21T12:00:00Z'));

  assertEquals(doc.format, 'cvbase-account-export');
  assertEquals(doc.version, 2);
  assertEquals(EXPORT_VERSION, 2);
  assertEquals(doc.exportedAt, '2026-09-21T12:00:00.000Z');
  assertEquals(doc.account, {
    id: 'u1', email: 'a@example.com', createdAt: '2026-01-01T00:00:00Z', lastSignInAt: '2026-09-20T00:00:00Z', providers: ['email'],
  });
  for (const section of EXPORT_SECTIONS) assert(section in doc, `missing section ${section}`);
  // Legacy sections unchanged in shape.
  assertEquals(doc.profile, { id: 'u1', first_name: 'A' });
  assertEquals(doc.subscription, { plan_id: 'pro', status: 'active' });
  assertEquals((doc.resumes as Row[])[0].application_id, 'app1');
  assertEquals((doc.prismRuns as Row[])[0].idempotency_key, 'k');
  assertEquals(doc.headshots, []);
  // Career OS: one row per list table, an object for user-keyed tables.
  for (const t of CAREER_OS_TABLES) {
    if (t.single) assert(doc[t.section] && !Array.isArray(doc[t.section]), `${t.section} should be an object`);
    else assertEquals((doc[t.section] as Row[]).map((r) => r.id), [`${t.table}-1`]);
  }
  assertEquals(doc.careerProfile, { user_id: 'u1', headline: 'RN' });
  assertEquals(doc.careerPreferences, { user_id: 'u1', proactive_enabled: false });
  // Every Career OS read is scoped to the owner with the declared columns.
  for (const t of CAREER_OS_TABLES) {
    const q = selects.find((s) => s.table === t.table)!;
    assert(q, `no select on ${t.table}`);
    assertEquals(q.columns, t.columns);
    assert(q.filters.some(([k, v]) => k === 'user_id' && v === 'u1'), `${t.table} not owner-scoped`);
  }
  assertEquals(selects.find((s) => s.table === 'prism_runs')!.columns, PRISM_RUN_COLUMNS);
  // Stripe ids never appear in the subscription selection.
  assert(!selects.find((s) => s.table === 'subscriptions')!.columns.includes('stripe'));
});

Deno.test('assembly: an empty account still carries every section (null objects, empty lists)', async () => {
  const { svc } = fakeSvc();
  const doc = await assembleExport(svc, USER);
  for (const section of EXPORT_SECTIONS) assert(section in doc, section);
  assertEquals(doc.careerProfile, null);
  assertEquals(doc.careerPreferences, null);
  assertEquals(doc.careerFacts, []);
  assertEquals(doc.careerMigrations, []);
});

Deno.test('assembly: a failing Career OS table fails the whole export with the table named', async () => {
  const { svc } = fakeSvc({ failTable: 'career_facts' });
  const err = await assertRejects(() => assembleExport(svc, USER), HttpError);
  assertEquals(err.code, 'export_failed');
  assertEquals(err.extra, { table: 'career_facts' });
});

Deno.test('assembly: headshot objects get signed urls; the response is a dated JSON attachment', async () => {
  const { svc } = fakeSvc({
    rows: { headshots: [{ storage_path: 'u1/a.png', created_at: '2026-02-02T00:00:00Z' }] },
    storage: { objects: [{ id: 'obj', name: 'b.png' }, { id: null, name: '.emptyFolderPlaceholder' }] },
  });
  const doc = await assembleExport(svc, USER, new Date('2026-09-21T12:00:00Z'));
  assertEquals(doc.headshots, [
    { storagePath: 'u1/a.png', createdAt: '2026-02-02T00:00:00Z', signedUrl: 'https://signed.test/u1/a.png', expiresInSeconds: 3600 },
    { storagePath: 'u1/b.png', createdAt: null, signedUrl: 'https://signed.test/u1/b.png', expiresInSeconds: 3600 },
  ]);
  const res = exportResponse(doc);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('content-disposition'), 'attachment; filename="cvbase-export-2026-09-21.json"');
  assertEquals(res.headers.get('cache-control'), 'no-store');
  const parsed = await res.json();
  assertEquals(parsed.version, 2);
  assert('careerMigrations' in parsed);
});
