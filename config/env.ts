/// <reference types="vite/client" />
/**
 * Client-safe environment access.
 *
 * Only four values are ever exposed to the browser bundle (the Sentry DSN is
 * a public write-only key by design). All real secrets
 * (service role key, Stripe secret, Gemini key) live exclusively in Supabase
 * Edge Function secrets and are NEVER read here. Vite statically replaces the
 * `import.meta.env.VITE_*` member expressions below at build time (see the
 * `define` block in vite.config.ts).
 */

export interface ClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Optional until W4 (billing). */
  stripePublishableKey: string;
  /** Optional. Error monitoring stays off when blank (see lib/monitoring.ts). */
  sentryDsn: string;
}

/**
 * Resolve one client var.
 * - Browser: `viteValue` is the literal Vite injected at build time.
 * - Node/tests: Vite injects nothing, so fall back to `process.env` (which
 *   `vi.stubEnv` populates) — guarded, since `process` is undefined in-browser.
 */
function coalesce(viteValue: unknown, key: string): string {
  if (typeof viteValue === 'string' && viteValue !== '') return viteValue;
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    return process.env[key] as string;
  }
  return typeof viteValue === 'string' ? viteValue : '';
}

let cached: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (cached) return cached;

  const supabaseUrl = coalesce(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
  const supabaseAnonKey = coalesce(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');
  const stripePublishableKey = coalesce(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    'VITE_STRIPE_PUBLISHABLE_KEY',
  );
  const sentryDsn = coalesce(import.meta.env.VITE_SENTRY_DSN, 'VITE_SENTRY_DSN');

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Missing required client env: ${missing.join(', ')}. ` +
        'Populate .env.cvbase.local (see .env.example).',
    );
  }

  cached = { supabaseUrl, supabaseAnonKey, stripePublishableKey, sentryDsn };
  return cached;
}

/** Test-only: clear the memoized env between cases. */
export function __resetClientEnvCache(): void {
  cached = null;
}
