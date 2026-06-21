import { describe, it, expect, afterEach, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('supabase client', () => {
  it('constructs a client with auth configured from client env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'local-anon-key');
    const { getSupabase } = await import('../supabase');
    const client = getSupabase();
    expect(client).toBeTruthy();
    expect(typeof client.auth.getSession).toBe('function');
    expect(typeof client.from).toBe('function');
  });

  it('returns the same memoized instance', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'local-anon-key');
    const { getSupabase } = await import('../supabase');
    expect(getSupabase()).toBe(getSupabase());
  });
});
