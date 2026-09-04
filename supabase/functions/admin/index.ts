import { getUser, serviceClient } from '../_shared/auth.ts';
import { handleOptions } from '../_shared/cors.ts';
import { fail, HttpError, ok } from '../_shared/respond.ts';
import { aggregateLlmCalls, type LlmCallRow } from './llmStats.ts';
import { maskKey, maskProviderRow } from './mask.ts';
import { isProviderId } from './providerId.ts';
import { pageParams, parseAdminRoute, userSearchFilter } from './routes.ts';

/**
 * Admin API — the only server-side surface the admin panel talks to.
 *
 * Every route runs behind `requireAdmin`, which re-reads `profiles.is_admin`
 * with the service-role client on each request. The browser's own JWT is never
 * trusted for the admin decision: a claim can be stale after a demotion, and
 * anything a client can send it can forge.
 *
 * Provider API keys travel in one direction only. `llm_providers` has no RLS
 * policies, so PostgREST cannot read it at all; this function reads it with the
 * service role and returns masked previews. A key can be written and replaced
 * from the panel, but never read back.
 *
 * The ops routes (`ops/*`, `users/<id>/usage`) are read-only. They return
 * operational metadata — counts, latencies, statuses — and never user content:
 * no CV text, no JD text, no prompts. Reads of user data are audited too, so
 * the trail shows who looked at whom, not only who changed what.
 */

/** Responses carry GET as well as the shared POST-only default. */
const ADMIN_CORS = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface AdminActor {
  id: string;
  email: string;
}

async function requireAdmin(req: Request): Promise<AdminActor> {
  const user = await getUser(req); // 401 if the JWT is missing or invalid
  const svc = serviceClient();
  const { data, error } = await svc
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new HttpError(500, 'admin_check_failed');
  // Same 403 whether the user exists and is not an admin, or has no profile —
  // an admin-panel probe should not be able to enumerate accounts.
  if (!data?.is_admin) throw new HttpError(403, 'not_admin');

  return { id: user.id, email: data.email ?? user.email ?? '' };
}

/** Append-only trail. Callers must pass already-redacted details. */
async function audit(
  actor: AdminActor,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await serviceClient().from('admin_audit_log').insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch {
    // A failed audit write must not fail the operation it describes.
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function listProviders() {
  const svc = serviceClient();
  const { data, error } = await svc
    .from('llm_providers')
    .select('id, provider_id, dialect, display_name, base_url, model_full, model_lite, api_keys, enabled, role, updated_at')
    .order('provider_id');
  if (error) throw new HttpError(500, 'providers_read_failed');

  // Replace the key array with counts + masked previews before it leaves here.
  return (data ?? []).map(maskProviderRow);
}

/** `provider_id` must be a member of the `ProviderId` union the router knows. */
function requireProviderId(raw: unknown): string {
  const providerId = String(raw ?? '').trim();
  if (!providerId) throw new HttpError(400, 'provider_id_required');
  if (!isProviderId(providerId)) throw new HttpError(400, 'invalid_provider_id');
  return providerId;
}

async function upsertProvider(actor: AdminActor, body: Record<string, unknown>) {
  const providerId = requireProviderId(body.provider_id);

  const patch: Record<string, unknown> = {
    provider_id: providerId,
    dialect: body.dialect === 'anthropic' ? 'anthropic' : 'openai',
    display_name: String(body.display_name ?? ''),
    base_url: String(body.base_url ?? ''),
    model_full: String(body.model_full ?? ''),
    model_lite: String(body.model_lite ?? ''),
    enabled: body.enabled !== false,
    role: ['primary', 'fallback', 'off'].includes(String(body.role)) ? String(body.role) : 'off',
  };

  // Keys are only touched when the caller explicitly sends them, so saving the
  // form without retyping keys does not wipe the stored ones.
  const sentKeys = body.api_keys;
  if (Array.isArray(sentKeys)) {
    patch.api_keys = sentKeys.map((k) => String(k).trim()).filter(Boolean);
  }

  const svc = serviceClient();
  const { data, error } = await svc
    .from('llm_providers')
    .upsert(patch, { onConflict: 'provider_id' })
    .select('id, provider_id')
    .maybeSingle();

  if (error) {
    // The one-primary / one-fallback partial unique indexes surface here.
    if (error.code === '23505') throw new HttpError(409, 'role_already_assigned');
    throw new HttpError(500, 'provider_write_failed');
  }

  await audit(actor, 'llm_provider.upsert', 'llm_provider', providerId, {
    role: patch.role,
    enabled: patch.enabled,
    model_full: patch.model_full,
    // Count only — never the keys themselves.
    keys_replaced: Array.isArray(sentKeys) ? (patch.api_keys as string[]).length : null,
  });

  return data;
}

async function deleteProvider(actor: AdminActor, rawProviderId: unknown) {
  const providerId = requireProviderId(rawProviderId);
  const { error } = await serviceClient()
    .from('llm_providers')
    .delete()
    .eq('provider_id', providerId);
  if (error) throw new HttpError(500, 'provider_delete_failed');
  await audit(actor, 'llm_provider.delete', 'llm_provider', providerId);
  return { deleted: providerId };
}

const USER_COLUMNS = 'id, email, first_name, last_name, is_admin, created_at';

async function listUsers(actor: AdminActor, q: string, limit: number, offset: number) {
  const svc = serviceClient();
  const filter = userSearchFilter(q);
  let query = svc
    .from('profiles')
    .select(USER_COLUMNS, { count: 'exact' });
  if (filter?.column === 'id') query = query.eq('id', filter.value);
  else if (filter) query = query.ilike('email', filter.pattern);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new HttpError(500, 'users_read_failed');

  // Reads of the user list are audited: who searched for what, and how much
  // came back. The query is an id or an email prefix, never a secret.
  await audit(actor, 'users.list', 'profiles', '', {
    q: filter ? q.trim().slice(0, 120) : '',
    match: filter?.column ?? null,
    limit,
    offset,
    returned: data?.length ?? 0,
  });
  return { users: data ?? [], total: count ?? 0 };
}

/**
 * One user's footprint: plan, monthly counters, resume count, PRISM run and
 * AI-call tallies. Everything here is a number or a status — the CV/JD text
 * that PRISM runs carry is never selected.
 */
async function getUserUsage(actor: AdminActor, userId: string) {
  const svc = serviceClient();
  const since30d = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const [profile, subscription, counters, resumes, runs, aiLogs] = await Promise.all([
    svc.from('profiles').select(USER_COLUMNS).eq('id', userId).maybeSingle(),
    svc
      .from('subscriptions')
      .select('plan_id, status, cycle, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .maybeSingle(),
    svc
      .from('usage_counters')
      .select('month, ats_scans, ai_actions')
      .eq('user_id', userId)
      .order('month', { ascending: false })
      .limit(6),
    svc.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    svc
      .from('prism_runs')
      .select('status, tokens_used, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    svc
      .from('ai_logs')
      .select('function, status')
      .eq('user_id', userId)
      .gte('created_at', since30d)
      .limit(1000),
  ]);

  if (profile.error) throw new HttpError(500, 'users_read_failed');
  if (!profile.data) throw new HttpError(404, 'user_not_found');

  const runRows = (runs.data ?? []) as { status: string; tokens_used: number | null; created_at: string }[];
  const prism = { total: runRows.length, completed: 0, failed: 0, tokens: 0, last_at: runRows[0]?.created_at ?? null };
  for (const r of runRows) {
    if (r.status === 'completed' || r.status === 'review') prism.completed += 1;
    if (r.status === 'failed') prism.failed += 1;
    prism.tokens += Number(r.tokens_used) || 0;
  }

  const byFunction = new Map<string, { calls: number; errors: number }>();
  for (const row of (aiLogs.data ?? []) as { function: string; status: string | null }[]) {
    const b = byFunction.get(row.function) ?? { calls: 0, errors: 0 };
    b.calls += 1;
    if (row.status && row.status !== 'ok' && row.status !== 'success') b.errors += 1;
    byFunction.set(row.function, b);
  }

  await audit(actor, 'users.usage', 'profiles', userId);

  return {
    user: profile.data,
    subscription: subscription.data ?? null,
    usage: counters.data ?? [],
    resumes: resumes.count ?? 0,
    prism,
    ai_calls_30d: [...byFunction.entries()]
      .map(([fn, b]) => ({ function: fn, ...b }))
      .sort((a, b) => b.calls - a.calls),
  };
}

// ---------------------------------------------------------------------------
// Ops — read-only operational views.
// ---------------------------------------------------------------------------

async function listAlerts(limit: number) {
  const { data, error } = await serviceClient()
    .from('ops_alerts')
    .select('id, kind, observed, threshold, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new HttpError(500, 'alerts_read_failed');
  return data ?? [];
}

/** Rows in the 24h window are capped; past the cap the aggregate is a sample. */
const LLM_WINDOW_ROWS = 5000;
const LLM_RECENT_ROWS = 50;

async function getLlmCalls() {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { data, error } = await serviceClient()
    .from('llm_call_logs')
    .select('id, provider, model, status, latency_ms, tokens, used_fallback, fallback_reason, key_slot, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(LLM_WINDOW_ROWS);
  if (error) throw new HttpError(500, 'llm_calls_read_failed');

  const rows = (data ?? []) as (LlmCallRow & { id: string })[];
  return {
    window_hours: 24,
    since,
    sampled: rows.length,
    truncated: rows.length >= LLM_WINDOW_ROWS,
    providers: aggregateLlmCalls(rows),
    recent: rows.slice(0, LLM_RECENT_ROWS),
  };
}

async function listPrismRuns(limit: number) {
  const svc = serviceClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [runs, total, failed] = await Promise.all([
    svc
      .from('prism_runs')
      // Metadata only — jd_text / cv_text / result are personal content.
      .select('id, user_id, status, template_id, tokens_used, error_code, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    svc.from('prism_runs').select('id', { count: 'exact', head: true }).gte('updated_at', since),
    svc
      .from('prism_runs')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', since)
      .eq('status', 'failed'),
  ]);
  if (runs.error) throw new HttpError(500, 'prism_runs_read_failed');
  return {
    runs: runs.data ?? [],
    last_24h: { total: total.count ?? 0, failed: failed.count ?? 0 },
  };
}

async function getStats() {
  const svc = serviceClient();
  const countOf = async (table: string) => {
    const { count } = await svc.from(table).select('*', { count: 'exact', head: true });
    return count ?? 0;
  };
  const [users, admins, providers] = await Promise.all([
    countOf('profiles'),
    svc
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true)
      .then((r: { count: number | null }) => r.count ?? 0),
    countOf('llm_providers'),
  ]);
  return { users, admins, providers };
}

async function listAudit(limit: number) {
  const { data, error } = await serviceClient()
    .from('admin_audit_log')
    .select('id, actor_email, action, target_type, target_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new HttpError(500, 'audit_read_failed');
  return data ?? [];
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const actor = await requireAdmin(req);
    const url = new URL(req.url);
    const route = parseAdminRoute(req.method, url.pathname);
    if (!route) throw new HttpError(404, 'unknown_admin_route');

    const params = url.searchParams;
    const body = req.method === 'POST'
      ? ((await req.json().catch(() => ({}))) as Record<string, unknown>)
      : {};

    const data = await (async () => {
      switch (route.kind) {
        case 'stats':
          return getStats();
        case 'providers.list':
          return listProviders();
        case 'providers.upsert':
          return upsertProvider(actor, body);
        case 'providers.delete':
          return deleteProvider(actor, body.provider_id);
        case 'users.list': {
          const { limit, offset } = pageParams(params, { limit: 50, max: 200 });
          return listUsers(actor, params.get('q') ?? '', limit, offset);
        }
        case 'users.usage':
          return getUserUsage(actor, route.userId);
        case 'audit.list':
          return listAudit(pageParams(params, { limit: 100, max: 500 }).limit);
        case 'ops.alerts':
          return listAlerts(pageParams(params, { limit: 50, max: 200 }).limit);
        case 'ops.llmCalls':
          return getLlmCalls();
        case 'ops.prismRuns':
          return listPrismRuns(pageParams(params, { limit: 50, max: 200 }).limit);
      }
    })();

    return ok(data, { headers: ADMIN_CORS });
  } catch (err) {
    return fail(err, { headers: ADMIN_CORS });
  }
});

export { maskKey };
