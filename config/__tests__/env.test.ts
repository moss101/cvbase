import { describe, it, expect, afterEach, vi } from 'vitest';
import { getClientEnv, __resetClientEnvCache } from '../env';

afterEach(() => {
  vi.unstubAllEnvs();
  __resetClientEnvCache();
});

describe('getClientEnv', () => {
  it('throws a clear error when required vars are missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(() => getClientEnv()).toThrow(/Missing required client env/);
  });

  it('returns the trio when set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x');
    const env = getClientEnv();
    expect(env.supabaseUrl).toBe('https://x.supabase.co');
    expect(env.supabaseAnonKey).toBe('anon-key');
    expect(env.stripePublishableKey).toBe('pk_test_x');
  });

  it('treats the Stripe publishable key as optional', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');
    expect(() => getClientEnv()).not.toThrow();
    expect(getClientEnv().stripePublishableKey).toBe('');
  });

  it('treats the Sentry DSN as optional and passes it through when set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_SENTRY_DSN', '');
    expect(() => getClientEnv()).not.toThrow();
    expect(getClientEnv().sentryDsn).toBe('');

    __resetClientEnvCache();
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.sentry.io/1');
    expect(getClientEnv().sentryDsn).toBe('https://abc@o1.ingest.sentry.io/1');
  });
});
