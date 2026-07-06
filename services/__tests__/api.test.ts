import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) },
  }),
}));
vi.mock('../../config/env', () => ({
  getClientEnv: () => ({ supabaseUrl: 'http://local.test', supabaseAnonKey: 'anon' }),
}));

import { streamFn } from '../api';

function ndjsonResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe('streamFn', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses NDJSON events across arbitrary chunk boundaries', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      ndjsonResponse(['{"type":"stage","label":"a"}\n{"type":"st', 'age","label":"b"}\n{"type":"done"}\n'])));
    const events: Record<string, unknown>[] = [];
    await streamFn('prism-tailor', {}, (e) => events.push(e));
    expect(events.map((e) => e.label ?? e.type)).toEqual(['a', 'b', 'done']);
  });

  it('flushes a valid final line that lacks a trailing newline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      ndjsonResponse(['{"type":"stage","label":"a"}\n', '{"type":"done","result":{"runId":"r1"}}'])));
    const events: Record<string, unknown>[] = [];
    await streamFn('prism-tailor', {}, (e) => events.push(e));
    expect(events.at(-1)).toEqual({ type: 'done', result: { runId: 'r1' } });
  });

  it('silently skips a truncated (malformed) final line', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      ndjsonResponse(['{"type":"stage","label":"a"}\n{"type":"done","resu'])));
    const events: Record<string, unknown>[] = [];
    await streamFn('prism-tailor', {}, (e) => events.push(e));
    expect(events).toEqual([{ type: 'stage', label: 'a' }]);
  });
});
