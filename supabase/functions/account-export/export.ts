import { corsHeaders } from '../_shared/cors.ts';
import { HttpError } from '../_shared/respond.ts';
import { CAREER_OS_TABLES, PRISM_RUN_COLUMNS } from '../_shared/careerTables.ts';
import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2';

// account-export: a single JSON document of everything the signed-in user
// owns (GDPR/CCPA "copy of my data"). Read-only; service role is used so the
// owner-read-only tables (subscriptions, usage_counters) and the private
// headshots bucket can be read in one pass without widening any RLS policy.
//
// Deliberately excluded: Stripe identifiers (stripe_customer_id /
// stripe_subscription_id), PRISM run bodies (jd/cv text, checkpoints, drafts,
// results — metadata only), ai_logs and other operator-only tables.
//
// Version 2 adds every Career OS table (_shared/careerTables.ts) and the
// PRISM application-binding columns. The assembly is separated from the
// request handler so it runs against a fake service client in tests.

export const EXPORT_FORMAT = 'cvbase-account-export';
export const EXPORT_VERSION = 2;

const HEADSHOT_BUCKET = 'headshots';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const SUBSCRIPTION_COLUMNS =
  'plan_id,cycle,status,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at';

type Row = Record<string, unknown>;
// deno-lint-ignore no-explicit-any
type Svc = SupabaseClient | any;

async function ownedRows(
  svc: Svc,
  table: string,
  columns: string,
  userId: string,
  orderBy = 'created_at',
): Promise<Row[]> {
  const { data, error } = await svc.from(table).select(columns).eq('user_id', userId)
    .order(orderBy, { ascending: true });
  if (error) throw new HttpError(500, 'export_failed', { table });
  return (data ?? []) as unknown as Row[];
}

async function ownedRow(svc: Svc, table: string, columns: string, userId: string): Promise<Row | null> {
  const { data, error } = await svc.from(table).select(columns).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'export_failed', { table });
  return (data ?? null) as Row | null;
}

/** Every object under headshots/{uid}/ — the table rows plus anything the
 *  bucket holds that predates the headshots index table. */
async function headshotPaths(svc: Svc, userId: string, indexed: Row[]): Promise<string[]> {
  const paths = new Set<string>(indexed.map((r) => String(r.storage_path)));
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await svc.storage.from(HEADSHOT_BUCKET)
      .list(userId, { limit: pageSize, offset });
    if (error) throw new HttpError(500, 'export_failed', { table: 'storage.headshots' });
    for (const obj of data ?? []) {
      if (obj.id) paths.add(`${userId}/${obj.name}`); // id is null for folder placeholders
    }
    if (!data || data.length < pageSize) break;
  }
  return [...paths];
}

export interface ExportDocument {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  account: Record<string, unknown>;
  [section: string]: unknown;
}

/** Section keys the document always carries (legacy first, then Career OS). */
export const EXPORT_SECTIONS: readonly string[] = [
  'profile', 'resumes', 'resumeVersions', 'jobApplications', 'subscription', 'usageCounters',
  'prismRuns', 'prismLineFlags', 'atsReports', 'headshots',
  ...CAREER_OS_TABLES.map((t) => t.section),
];

export async function assembleExport(svc: Svc, user: User, now: Date = new Date()): Promise<ExportDocument> {
  const uid = user.id;

  const [
    profileRes,
    resumes,
    resumeVersions,
    jobApplications,
    subscriptionRes,
    usageCounters,
    prismRuns,
    prismLineFlags,
    atsReports,
    headshotRows,
    careerSections,
  ] = await Promise.all([
    svc.from('profiles').select('*').eq('id', uid).maybeSingle(),
    ownedRows(svc, 'resumes', '*', uid),
    ownedRows(svc, 'resume_versions', '*', uid),
    ownedRows(svc, 'job_applications', '*', uid),
    svc.from('subscriptions').select(SUBSCRIPTION_COLUMNS).eq('user_id', uid).maybeSingle(),
    ownedRows(svc, 'usage_counters', '*', uid, 'month'),
    ownedRows(svc, 'prism_runs', PRISM_RUN_COLUMNS, uid),
    ownedRows(svc, 'prism_line_flags', '*', uid),
    ownedRows(svc, 'ats_reports', '*', uid),
    ownedRows(svc, 'headshots', '*', uid),
    Promise.all(CAREER_OS_TABLES.map(async (t) => [
      t.section,
      t.single ? await ownedRow(svc, t.table, t.columns, uid) : await ownedRows(svc, t.table, t.columns, uid),
    ] as const)),
  ]);
  if (profileRes.error) throw new HttpError(500, 'export_failed', { table: 'profiles' });
  if (subscriptionRes.error) throw new HttpError(500, 'export_failed', { table: 'subscriptions' });

  const paths = await headshotPaths(svc, uid, headshotRows);
  let headshots: { storagePath: string; createdAt: string | null; signedUrl: string | null; expiresInSeconds: number }[] = [];
  if (paths.length > 0) {
    const { data: signed, error } = await svc.storage.from(HEADSHOT_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error) throw new HttpError(500, 'export_failed', { table: 'storage.headshots' });
    const byPath = new Map<string | null, string>(
      (signed ?? []).map((s: { path: string | null; signedUrl: string }) => [s.path, s.signedUrl]),
    );
    const createdAtByPath = new Map(headshotRows.map((r) => [String(r.storage_path), r.created_at as string | null]));
    headshots = paths.map((p) => ({
      storagePath: p,
      createdAt: createdAtByPath.get(p) ?? null,
      signedUrl: byPath.get(p) ?? null,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    }));
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    account: {
      id: uid,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      providers: user.app_metadata?.providers ?? [],
    },
    profile: profileRes.data ?? null,
    resumes,
    resumeVersions,
    jobApplications,
    subscription: subscriptionRes.data ?? null,
    usageCounters,
    prismRuns,
    prismLineFlags,
    atsReports,
    headshots,
    ...Object.fromEntries(careerSections),
  };
}

/** The download response: JSON attachment named by export date. */
export function exportResponse(body: ExportDocument): Response {
  const date = body.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cvbase-export-${date}.json"`,
      'Access-Control-Expose-Headers': 'Content-Disposition',
      'Cache-Control': 'no-store',
    },
  });
}
