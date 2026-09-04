import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { fail, HttpError } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// account-export: a single JSON document of everything the signed-in user
// owns (GDPR/CCPA "copy of my data"). Read-only; service role is used so the
// owner-read-only tables (subscriptions, usage_counters) and the private
// headshots bucket can be read in one pass without widening any RLS policy.
//
// Deliberately excluded: Stripe identifiers (stripe_customer_id /
// stripe_subscription_id), PRISM run bodies (jd/cv text, checkpoints, drafts,
// results — metadata only), ai_logs and other operator-only tables.

const HEADSHOT_BUCKET = 'headshots';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const SUBSCRIPTION_COLUMNS =
  'plan_id,cycle,status,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at';
const PRISM_RUN_COLUMNS =
  'id,status,template_id,resume_id,error_code,tokens_used,schema_version,prompt_version,created_at,updated_at';

type Row = Record<string, unknown>;

async function ownedRows(
  svc: SupabaseClient,
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

/** Every object under headshots/{uid}/ — the table rows plus anything the
 *  bucket holds that predates the headshots index table. */
async function headshotPaths(svc: SupabaseClient, userId: string, indexed: Row[]): Promise<string[]> {
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

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const svc = serviceClient();
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
    ]);
    if (profileRes.error) throw new HttpError(500, 'export_failed', { table: 'profiles' });
    if (subscriptionRes.error) throw new HttpError(500, 'export_failed', { table: 'subscriptions' });

    const paths = await headshotPaths(svc, uid, headshotRows);
    let headshots: { storagePath: string; createdAt: string | null; signedUrl: string | null; expiresInSeconds: number }[] = [];
    if (paths.length > 0) {
      const { data: signed, error } = await svc.storage.from(HEADSHOT_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (error) throw new HttpError(500, 'export_failed', { table: 'storage.headshots' });
      const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      const createdAtByPath = new Map(headshotRows.map((r) => [String(r.storage_path), r.created_at as string | null]));
      headshots = paths.map((p) => ({
        storagePath: p,
        createdAt: createdAtByPath.get(p) ?? null,
        signedUrl: byPath.get(p) ?? null,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      }));
    }

    const exportedAt = new Date();
    const body = {
      format: 'cvbase-account-export',
      version: 1,
      exportedAt: exportedAt.toISOString(),
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
    };

    const date = exportedAt.toISOString().slice(0, 10);
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
  } catch (err) {
    return fail(err);
  }
});
