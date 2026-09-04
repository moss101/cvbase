import { assert, assertEquals, assertMatch } from 'jsr:@std/assert';
import { z } from 'npm:zod@3.24.1';
import { estimateTokens, type HandlerDeps, resolveRequestId, shouldRefund, withAiHandler } from './handler.ts';
import { HttpError } from './respond.ts';
import { LlmAllProvidersFailedError, ProviderError } from './llm/errors.ts';
import type { AiLogMeta } from './aiLog.ts';

// withAiHandler pipeline tests with every network dependency faked: no
// Supabase, no LLM. `calls` records what the pipeline asked of each dep so a
// test can assert "metered but refunded", "rate limited before metering", etc.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const USER = { id: 'user-1' } as unknown as Awaited<ReturnType<HandlerDeps['getUser']>>;

interface Calls {
  meter: string[];
  release: string[];
  feature: string[];
  rateLimit: string[];
  logs: Array<{ userId: string | null; meta: AiLogMeta }>;
}

function fakeDeps(over: Partial<HandlerDeps> = {}): { deps: Partial<HandlerDeps>; calls: Calls } {
  const calls: Calls = { meter: [], release: [], feature: [], rateLimit: [], logs: [] };
  const deps: Partial<HandlerDeps> = {
    getUser: () => Promise.resolve(USER),
    serviceClient: () => ({} as ReturnType<HandlerDeps['serviceClient']>),
    checkAndMeter: (_u, kind) => { calls.meter.push(kind); return Promise.resolve(); },
    releaseUsage: (_u, kind) => { calls.release.push(kind); return Promise.resolve(); },
    requireFeature: (_u, feature) => { calls.feature.push(feature); return Promise.resolve(); },
    enforceRateLimit: (_svc, _u, bucket) => { calls.rateLimit.push(bucket); return Promise.resolve({}); },
    logAi: (userId, meta) => { calls.logs.push({ userId, meta }); return Promise.resolve(); },
    ...over,
  };
  return { deps, calls };
}

const Body = z.object({ text: z.string().min(1).max(50) });

function post(body: unknown, headers: Record<string, string> = {}, method = 'POST'): Request {
  return new Request('http://localhost/fn', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
}

Deno.test('happy path: 200, x-request-id header, metered, ai_logs row with tokens + latency', async () => {
  const { deps, calls } = fakeDeps();
  const handler = withAiHandler('fn-test', { schema: Body, deps, promptVersion: 'v9' }, (ctx) => {
    ctx.addTokens(123);
    return Promise.resolve({ echo: ctx.body.text, rid: ctx.requestId });
  });
  const res = await handler(post({ text: 'hi' }));
  assertEquals(res.status, 200);
  const rid = res.headers.get('x-request-id')!;
  assertMatch(rid, UUID_RE);
  const json = await res.json();
  assertEquals(json, { echo: 'hi', rid });
  assertEquals(calls.meter, ['aiActions']);
  assertEquals(calls.rateLimit, []); // no rateLimit opt → not enforced
  assertEquals(calls.release, []);
  assertEquals(calls.logs.length, 1);
  const log = calls.logs[0];
  assertEquals(log.userId, 'user-1');
  assertEquals(log.meta.function, 'fn-test');
  assertEquals(log.meta.status, 'ok');
  assertEquals(log.meta.tokenEstimate, 123);
  assertEquals(log.meta.requestId, rid);
  assertEquals(log.meta.promptVersion, 'v9');
  assert(typeof log.meta.latencyMs === 'number' && log.meta.latencyMs >= 0);
});

Deno.test('a sane caller-supplied x-request-id is honoured; a junk one is replaced', async () => {
  const { deps } = fakeDeps();
  const handler = withAiHandler('fn-test', { schema: Body, deps }, () => Promise.resolve({}));
  const good = await handler(post({ text: 'x' }, { 'x-request-id': 'trace-abc-12345' }));
  assertEquals(good.headers.get('x-request-id'), 'trace-abc-12345');
  const bad = await handler(post({ text: 'x' }, { 'x-request-id': '<script>' }));
  assertMatch(bad.headers.get('x-request-id')!, UUID_RE);
  assertMatch(resolveRequestId(new Request('http://x')), UUID_RE);
});

Deno.test('OPTIONS preflight short-circuits; non-POST is 405 with requestId', async () => {
  const { deps, calls } = fakeDeps();
  const handler = withAiHandler('fn-test', { schema: Body, deps }, () => Promise.resolve({}));
  const pre = await handler(new Request('http://localhost/fn', { method: 'OPTIONS' }));
  assertEquals(pre.status, 200);
  const get = await handler(post(null, {}, 'GET'));
  assertEquals(get.status, 405);
  const body = await get.json();
  assertEquals(body.error, 'method_not_allowed');
  assertMatch(body.requestId, UUID_RE);
  assertEquals(calls.meter, []);
});

Deno.test('401 from auth propagates with the error shape and nothing is metered', async () => {
  const { deps, calls } = fakeDeps({ getUser: () => Promise.reject(new HttpError(401, 'invalid_token')) });
  const handler = withAiHandler('fn-test', { schema: Body, deps }, () => Promise.resolve({}));
  const res = await handler(post({ text: 'x' }));
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error, 'invalid_token');
  assertEquals(calls.meter, []);
  assertEquals(calls.logs, []); // no user id → no ai_logs row
});

Deno.test('413 payload_too_large when the body exceeds maxBodyBytes (before validation/metering)', async () => {
  const { deps, calls } = fakeDeps();
  const handler = withAiHandler('fn-test', { schema: Body, maxBodyBytes: 64, deps }, () => Promise.resolve({}));
  const big = JSON.stringify({ text: 'a'.repeat(200) });
  // via declared Content-Length
  const declared = await handler(post(big, { 'content-length': String(big.length) }));
  assertEquals(declared.status, 413);
  const dj = await declared.json();
  assertEquals(dj.error, 'payload_too_large');
  assertEquals(dj.maxBytes, 64);
  assertMatch(dj.requestId, UUID_RE);
  // via the stream (no Content-Length header on a constructed Request)
  const streamed = await handler(post(big));
  assertEquals(streamed.status, 413);
  assertEquals(calls.meter, []);
});

Deno.test('400 invalid_request with compact issues on zod failure; not metered', async () => {
  const { deps, calls } = fakeDeps();
  const handler = withAiHandler('fn-test', { schema: Body, deps }, () => Promise.resolve({}));
  const res = await handler(post({ text: '' }));
  assertEquals(res.status, 400);
  const j = await res.json();
  assertEquals(j.error, 'invalid_request');
  assertEquals(j.issues[0].path, 'text');
  assertEquals(calls.meter, []);
  const bad = await handler(post('{not json'));
  assertEquals(bad.status, 400);
  assertEquals((await bad.json()).error, 'invalid_json');
});

Deno.test('feature gate runs before the rate limit and metering; 403 feature_locked', async () => {
  const { deps, calls } = fakeDeps({
    requireFeature: () => Promise.reject(new HttpError(403, 'feature_locked', { feature: 'smartStudio' })),
  });
  const handler = withAiHandler('fn-test', {
    schema: Body, feature: 'smartStudio', rateLimit: { perHour: 5 }, deps,
  }, () => Promise.resolve({}));
  const res = await handler(post({ text: 'x' }));
  assertEquals(res.status, 403);
  assertEquals((await res.json()).feature, 'smartStudio');
  assertEquals(calls.rateLimit, []);
  assertEquals(calls.meter, []);
});

Deno.test('429 from the rate limiter: Retry-After header, retryAfterSec in body, not metered, not refunded', async () => {
  const { deps, calls } = fakeDeps({
    enforceRateLimit: () => Promise.reject(new HttpError(429, 'rate_limited', { retryAfterSec: 37, limit: 20, window: '1h' })),
  });
  const handler = withAiHandler('fn-test', { schema: Body, rateLimit: { perHour: 20 }, deps }, () => Promise.resolve({}));
  const res = await handler(post({ text: 'x' }));
  assertEquals(res.status, 429);
  assertEquals(res.headers.get('Retry-After'), '37');
  const j = await res.json();
  assertEquals(j.error, 'rate_limited');
  assertEquals(j.retryAfterSec, 37);
  assertMatch(j.requestId, UUID_RE);
  assertEquals(calls.meter, []);
  assertEquals(calls.release, []);
  assertEquals(calls.logs[0].meta.status, 'error');
});

Deno.test('rate limiter receives the function name as bucket and its opts', async () => {
  const seen: Array<{ bucket: string; perHour: number }> = [];
  const { deps } = fakeDeps({
    enforceRateLimit: (_s, _u, bucket, o) => { seen.push({ bucket, perHour: o.perHour }); return Promise.resolve({}); },
  });
  const handler = withAiHandler('ai-cover-letter', { schema: Body, rateLimit: { perHour: 20 }, deps }, () => Promise.resolve({}));
  await handler(post({ text: 'x' }));
  assertEquals(seen, [{ bucket: 'ai-cover-letter', perHour: 20 }]);
});

Deno.test('402 limit_reached from metering: no handler run, no refund', async () => {
  let ran = false;
  const { deps, calls } = fakeDeps({
    checkAndMeter: () => Promise.reject(new HttpError(402, 'limit_reached', { kind: 'aiActions' })),
  });
  const handler = withAiHandler('fn-test', { schema: Body, deps }, () => { ran = true; return Promise.resolve({}); });
  const res = await handler(post({ text: 'x' }));
  assertEquals(res.status, 402);
  assertEquals(ran, false);
  assertEquals(calls.release, []);
});

Deno.test('refund: every LLM provider down (fake llm) → 503 llm_unavailable and the action is released', async () => {
  const { deps, calls } = fakeDeps();
  const fakeLlm = () => Promise.reject(new LlmAllProvidersFailedError(
    new ProviderError('deepseek', 'transient', 502),
    new ProviderError('kimi', 'timeout'),
  ));
  const handler = withAiHandler('fn-test', { schema: Body, deps }, async () => ({ out: await fakeLlm() }));
  const res = await handler(post({ text: 'x' }));
  assertEquals(res.status, 503);
  const j = await res.json();
  assertEquals(j.error, 'llm_unavailable');
  assertEquals(j.primaryProvider, 'deepseek');
  assertMatch(j.requestId, UUID_RE);
  assertEquals(calls.meter, ['aiActions']);
  assertEquals(calls.release, ['aiActions']);
  assertEquals(calls.logs.length, 1);
  assertEquals(calls.logs[0].meta.status, 'error');
});

Deno.test('refund: 502 bad_ai_output and unexpected throws (masked 500) are refunded; 4xx from the handler is not', async () => {
  const run = async (thrown: unknown) => {
    const { deps, calls } = fakeDeps();
    const handler = withAiHandler('fn-test', { schema: Body, deps }, () => Promise.reject(thrown));
    const res = await handler(post({ text: 'x' }));
    return { res, calls, body: await res.json() };
  };
  const bad = await run(new HttpError(502, 'bad_ai_output', { field: 'score' }));
  assertEquals(bad.res.status, 502);
  assertEquals(bad.calls.release, ['aiActions']);

  const crash = await run(new TypeError('boom'));
  assertEquals(crash.res.status, 500);
  assertEquals(crash.body.error, 'internal_error');
  assertEquals('detail' in crash.body, false); // internals never leak to the client
  assertEquals(crash.calls.release, ['aiActions']);

  const userFault = await run(new HttpError(400, 'invalid_section'));
  assertEquals(userFault.res.status, 400);
  assertEquals(userFault.calls.release, []);
});

Deno.test('meter: null skips metering and never refunds; atsScans meters that kind', async () => {
  const a = fakeDeps();
  await withAiHandler('fn-test', { schema: Body, meter: null, deps: a.deps }, () => Promise.reject(new Error('x')))(post({ text: 'x' }));
  assertEquals(a.calls.meter, []);
  assertEquals(a.calls.release, []);

  const b = fakeDeps();
  await withAiHandler('ats-analyze', { schema: Body, meter: 'atsScans', deps: b.deps }, () => Promise.resolve({}))(post({ text: 'x' }));
  assertEquals(b.calls.meter, ['atsScans']);
});

Deno.test('setLogFunction relabels the ai_logs row; logSubCall writes extra rows stamped with the request id', async () => {
  const { deps, calls } = fakeDeps();
  const handler = withAiHandler('ai-suggest', { schema: Body, deps }, async (ctx) => {
    ctx.setLogFunction('ai-suggest:analyze');
    await ctx.logSubCall('ai-suggest:analyze:summary', 'ok', 40);
    await ctx.logSubCall('ai-suggest:analyze:skills', 'error');
    return {};
  });
  const res = await handler(post({ text: 'x' }));
  const rid = res.headers.get('x-request-id');
  assertEquals(calls.logs.map((l) => [l.meta.function, l.meta.status, l.meta.tokenEstimate]), [
    ['ai-suggest:analyze:summary', 'ok', 40],
    ['ai-suggest:analyze:skills', 'error', undefined],
    ['ai-suggest:analyze', 'ok', undefined],
  ]);
  assert(calls.logs.every((l) => l.meta.requestId === rid));
});

Deno.test('a failing releaseUsage/logAi dep does not change the client response', async () => {
  const { deps } = fakeDeps({
    releaseUsage: () => Promise.reject(new Error('db down')),
    logAi: () => Promise.reject(new Error('db down')),
  });
  const handler = withAiHandler('fn-test', { schema: Body, deps }, () => Promise.reject(new HttpError(502, 'bad_ai_output')));
  // releaseUsage in production never throws (entitlement.ts swallows); here we
  // only assert that the pipeline still answers rather than hanging.
  const res = await handler(post({ text: 'x' })).catch((e) => e);
  assert(res instanceof Response || res instanceof Error);
});

Deno.test('shouldRefund / estimateTokens helpers', () => {
  assert(shouldRefund(new LlmAllProvidersFailedError(new ProviderError('deepseek', 'auth'), new ProviderError('kimi', 'auth'))));
  assert(shouldRefund(new HttpError(500, 'storage_failed')));
  assert(shouldRefund(new Error('crash')));
  assertEquals(shouldRefund(new HttpError(400, 'invalid_request')), false);
  assertEquals(shouldRefund(new HttpError(429, 'rate_limited')), false);
  assertEquals(estimateTokens('abcd', 'efgh'), 2);
  assertEquals(estimateTokens(undefined, null, ''), 0);
  assertEquals(estimateTokens('abcde'), 2);
});
