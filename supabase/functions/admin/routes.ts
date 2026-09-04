/**
 * Admin route table — pure, so it can be unit-tested without Deno.serve.
 *
 * The gateway hands us the full pathname (`/admin/users/<id>/usage`); we strip
 * the function name and match what is left against a fixed list. Anything not
 * listed is a 404 — there is deliberately no wildcard or pass-through.
 */

export type AdminRoute =
  | { kind: 'stats' }
  | { kind: 'providers.list' }
  | { kind: 'providers.upsert' }
  | { kind: 'providers.delete' }
  | { kind: 'users.list' }
  | { kind: 'users.usage'; userId: string }
  | { kind: 'audit.list' }
  | { kind: 'ops.alerts' }
  | { kind: 'ops.llmCalls' }
  | { kind: 'ops.prismRuns' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Everything after `/admin`, without leading or trailing slashes. */
export function stripFunctionPrefix(pathname: string): string {
  return pathname.replace(/^\/admin(?=\/|$)/, '').replace(/^\/+/, '').replace(/\/+$/, '');
}

export function parseAdminRoute(method: string, pathname: string): AdminRoute | null {
  const route = stripFunctionPrefix(pathname);
  const key = `${method.toUpperCase()} ${route}`;

  switch (key) {
    case 'GET stats':
      return { kind: 'stats' };
    case 'GET providers':
      return { kind: 'providers.list' };
    case 'POST providers':
      return { kind: 'providers.upsert' };
    case 'POST providers/delete':
      return { kind: 'providers.delete' };
    case 'GET users':
      return { kind: 'users.list' };
    case 'GET audit':
      return { kind: 'audit.list' };
    case 'GET ops/alerts':
      return { kind: 'ops.alerts' };
    case 'GET ops/llm-calls':
      return { kind: 'ops.llmCalls' };
    case 'GET ops/prism-runs':
      return { kind: 'ops.prismRuns' };
  }

  // users/<uuid>/usage — the only parameterised route.
  const segments = route.split('/');
  if (
    method.toUpperCase() === 'GET' &&
    segments.length === 3 &&
    segments[0] === 'users' &&
    segments[2] === 'usage' &&
    isUuid(segments[1])
  ) {
    return { kind: 'users.usage', userId: segments[1].toLowerCase() };
  }

  return null;
}

/** Clamp a `?limit=` / `?offset=` pair into a safe page window. */
export function pageParams(
  params: URLSearchParams,
  defaults: { limit: number; max: number },
): { limit: number; offset: number } {
  const rawLimit = Number(params.get('limit'));
  const rawOffset = Number(params.get('offset'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), defaults.max)
    : defaults.limit;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  return { limit, offset };
}

/**
 * Turn a free-text user search into a PostgREST filter. A UUID matches the id
 * exactly; anything else is an email prefix match. `%`, `_` and `\` are
 * escaped so a query cannot widen itself into a wildcard, and `*` (which
 * PostgREST rewrites to `%` before Postgres sees it) is dropped for the same
 * reason. The pattern is capped so a pasted blob cannot become a long scan.
 */
export function userSearchFilter(
  q: string,
): { column: 'id'; value: string } | { column: 'email'; pattern: string } | null {
  const trimmed = q.trim().slice(0, 120);
  if (!trimmed) return null;
  if (isUuid(trimmed)) return { column: 'id', value: trimmed.toLowerCase() };
  const escaped = trimmed.replace(/\*/g, '').replace(/[\\%_]/g, (c) => `\\${c}`);
  if (!escaped) return null;
  return { column: 'email', pattern: `${escaped}%` };
}
