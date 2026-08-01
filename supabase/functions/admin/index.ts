import { getUser, serviceClient } from '../_shared/auth.ts';
import { handleOptions } from '../_shared/cors.ts';
import { fail, HttpError, ok } from '../_shared/respond.ts';

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
 */

/** Shows enough of a key to recognise it, never enough to use it. */
function maskKey(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

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
  return (data ?? []).map((row) => {
    const keys: string[] = Array.isArray(row.api_keys) ? row.api_keys : [];
    const { api_keys: _dropped, ...rest } = row;
    return { ...rest, key_count: keys.length, key_previews: keys.map(maskKey) };
  });
}

async function upsertProvider(actor: AdminActor, body: Record<string, unknown>) {
  const providerId = String(body.provider_id ?? '').trim();
  if (!providerId) throw new HttpError(400, 'provider_id_required');

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

async function deleteProvider(actor: AdminActor, providerId: string) {
  if (!providerId) throw new HttpError(400, 'provider_id_required');
  const { error } = await serviceClient()
    .from('llm_providers')
    .delete()
    .eq('provider_id', providerId);
  if (error) throw new HttpError(500, 'provider_delete_failed');
  await audit(actor, 'llm_provider.delete', 'llm_provider', providerId);
  return { deleted: providerId };
}

async function listUsers(limit: number, offset: number) {
  const svc = serviceClient();
  const { data, error, count } = await svc
    .from('profiles')
    .select('id, email, first_name, last_name, is_admin, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new HttpError(500, 'users_read_failed');
  return { users: data ?? [], total: count ?? 0 };
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
    // Everything after /admin — the function name itself is stripped.
    const route = url.pathname.replace(/^\/admin\/?/, '').replace(/\/+$/, '');
    const body = req.method === 'POST'
      ? ((await req.json().catch(() => ({}))) as Record<string, unknown>)
      : {};

    switch (`${req.method} ${route}`) {
      case 'GET stats':
        return ok(await getStats());
      case 'GET providers':
        return ok(await listProviders());
      case 'POST providers':
        return ok(await upsertProvider(actor, body));
      case 'POST providers/delete':
        return ok(await deleteProvider(actor, String(body.provider_id ?? '')));
      case 'GET users':
        return ok(
          await listUsers(
            Math.min(Number(url.searchParams.get('limit')) || 50, 200),
            Number(url.searchParams.get('offset')) || 0,
          ),
        );
      case 'GET audit':
        return ok(await listAudit(Math.min(Number(url.searchParams.get('limit')) || 100, 500)));
      default:
        throw new HttpError(404, 'unknown_admin_route');
    }
  } catch (err) {
    return fail(err);
  }
});

export { maskKey };
