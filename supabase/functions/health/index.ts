import { serviceClient } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getLlmConfigFromDb } from '../_shared/llm/config.ts';
import { buildHealthReport, countConfiguredProviders } from './status.ts';

/**
 * Health probe — the one unauthenticated function.
 *
 * `GET /health` answers `{ ok, version, db, llm, ts }` with 200 when the
 * database responds and 503 when it does not. It is meant for an uptime
 * monitor and the admin panel's Health card, so it carries nothing an
 * attacker could use: no table names, no error messages, no key material,
 * only a provider *count*. `verify_jwt` is off for this function in
 * `supabase/config.toml`; deploy with `--no-verify-jwt` if deploying by hand.
 */

const VERSION = Deno.env.get('APP_VERSION')?.trim() || 'unversioned';
const DB_TIMEOUT_MS = 3_000;

const headers = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

async function probeDb(): Promise<boolean> {
  try {
    const { error } = await serviceClient()
      .from('feature_flags')
      .select('flag', { count: 'exact', head: true })
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    return !error;
  } catch {
    return false;
  }
}

async function countLlmProviders(): Promise<number> {
  try {
    const cfg = await getLlmConfigFromDb(serviceClient());
    return countConfiguredProviders([cfg.primary, cfg.fallback]);
  } catch {
    return 0;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  }

  const [dbOk, llmConfigured] = await Promise.all([probeDb(), countLlmProviders()]);
  const { status, body } = buildHealthReport({ dbOk, llmConfigured, version: VERSION });
  return new Response(req.method === 'HEAD' ? null : JSON.stringify(body), { status, headers });
});
