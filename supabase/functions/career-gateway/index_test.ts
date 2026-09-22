import { assert, assertEquals, assertMatch, assertStringIncludes } from 'jsr:@std/assert';
import type { User } from 'jsr:@supabase/supabase-js@2';
import { HttpError } from '../_shared/respond.ts';
import { LlmAllProvidersFailedError, ProviderError } from '../_shared/llm/errors.ts';
import { type GatewayDeps, handleGatewayRequest } from './index.ts';
import { FakeDb, installStartApplicationRpc, seedCareer, USER_A, USER_B } from './fakedb_test.ts';
import { TOOLS } from './tools.ts';
import { CONFIRMATION_TTL_MS, INTERRUPTED_AFTER_MS } from './policy.ts';

// The real gateway pipeline against an in-memory database, a scripted model
// and faked entitlement — no Supabase, no LLM. Every test asserts on the
// receipt row as well as the HTTP response, because the receipt is what the
// client (and a retry) trusts.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Calls {
  meter: string[];
  release: string[];
  rateLimit: string[];
  flag: string[];
  llm: string[];
}

function setup(over: Partial<GatewayDeps> = {}, opts: { user?: string; llm?: (prompt: string) => Promise<unknown> } = {}) {
  let now = Date.parse('2026-09-21T10:00:00Z');
  const db = new FakeDb(() => now);
  installStartApplicationRpc(db);
  const fixtures = seedCareer(db, USER_A);
  const calls: Calls = { meter: [], release: [], rateLimit: [], flag: [], llm: [] };
  const userId = opts.user ?? USER_A;
  const deps: Partial<GatewayDeps> = {
    getUser: () => Promise.resolve({ id: userId } as unknown as User),
    serviceClient: () => db,
    userClient: () => db.asUser(userId),
    checkAndMeter: (_u, kind) => { calls.meter.push(kind); return Promise.resolve(); },
    releaseUsage: (_u, kind) => { calls.release.push(kind); return Promise.resolve(); },
    enforceRateLimit: (_s, _u, bucket) => { calls.rateLimit.push(bucket); return Promise.resolve({}); },
    requireCareerOs: (_s, u) => { calls.flag.push(u); return Promise.resolve(); },
    llm: async (prompt) => {
      calls.llm.push(prompt);
      const data = opts.llm ? await opts.llm(prompt) : { text: 'draft', citedFactIds: [], newAssertions: [] };
      return { data, tokens: 42 };
    },
    now: () => now,
    ...over,
  };
  const call = async (body: unknown, headers: Record<string, string> = {}) => {
    const res = await handleGatewayRequest(
      new Request('http://localhost/career-gateway', {
        method: 'POST', headers: { 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
      deps,
    );
    return { status: res.status, json: await res.json() as Record<string, unknown>, res };
  };
  return { db, deps, calls, call, fixtures, advance: (ms: number) => { now += ms; }, key: (p: string) => `${p}:${crypto.randomUUID()}` };
}

const run = (json: Record<string, unknown>) => json.run as Record<string, unknown>;

Deno.test('unknown tool is 400 unknown_tool and writes no receipt', async () => {
  const t = setup();
  const r = await t.call({ tool: 'drop_everything', input: {}, idempotencyKey: t.key('k') });
  assertEquals(r.status, 400);
  assertEquals(r.json.error, 'unknown_tool');
  assertEquals(t.db.rows('action_runs').length, 0);
  const sqlish = await t.call({ tool: "record_outcome; select * from auth.users", input: {}, idempotencyKey: t.key('k') });
  assertEquals(sqlish.json.error, 'unknown_tool');
});

Deno.test('pipeline order: 405, then auth, then body/zod, then flag, then rate limit', async () => {
  const t = setup();
  const get = await handleGatewayRequest(new Request('http://localhost/x', { method: 'GET' }), t.deps);
  assertEquals(get.status, 405);
  const opt = await handleGatewayRequest(new Request('http://localhost/x', { method: 'OPTIONS' }), t.deps);
  assertEquals(opt.status, 200);

  const bad = await t.call({ tool: 'inspect_context', idempotencyKey: 'short' });
  assertEquals(bad.status, 400);
  assertEquals(bad.json.error, 'invalid_request');
  assertEquals(t.calls.flag, []);

  const gated = setup({ requireCareerOs: () => Promise.reject(new HttpError(403, 'feature_disabled', { feature: 'career_os' })) });
  const g = await gated.call({ tool: 'inspect_context', input: {}, idempotencyKey: gated.key('k') });
  assertEquals(g.status, 403);
  assertEquals(g.json.error, 'feature_disabled');
  assertEquals(gated.calls.rateLimit, []);

  const ok = await t.call({ tool: 'inspect_context', input: {}, idempotencyKey: t.key('k') });
  assertEquals(ok.status, 200);
  assertEquals(t.calls.rateLimit, ['career-gateway']);
  assertMatch(ok.res.headers.get('x-request-id')!, UUID_RE);
});

Deno.test('wrong-owner ids resolve to not_found without leaking existence; the receipt records the failure', async () => {
  const other = new FakeDb();
  const t = setup({}, { user: USER_B });
  seedCareer(t.db, USER_B); // B has its own records; A's fixtures still exist in the same db
  const foreignOpportunity = t.fixtures.opportunity.id as string; // owned by A
  const r = await t.call({ tool: 'start_application', input: { opportunityId: foreignOpportunity }, idempotencyKey: 'own:1234567' });
  assertEquals(r.status, 404);
  assertEquals(r.json.error, 'not_found');
  assertEquals((r.json as { entity?: string }).entity, 'opportunity');
  const receipt = run(r.json);
  assertEquals(receipt.status, 'failed');
  assertEquals(receipt.failure_code, 'not_found');
  assertEquals(receipt.retryable, false);
  // Nothing was created for either user.
  assertEquals(t.db.rows('job_applications').filter((a) => a.opportunity_id === foreignOpportunity).length, 1);
  assertEquals(other.rows('job_applications').length, 0);

  const inspect = await t.call({ tool: 'inspect_context', input: { applicationId: t.fixtures.application.id }, idempotencyKey: 'own:2345678' });
  assertEquals(inspect.status, 404);
  const compare = await t.call({
    tool: 'compare_opportunities', input: { opportunityIds: [foreignOpportunity, crypto.randomUUID()] }, idempotencyKey: 'own:3456789',
  });
  assertEquals(compare.json.error, 'not_found');
});

Deno.test('identity comes from the JWT: a userId/url/sql smuggled into the input is dropped by the schema', async () => {
  const t = setup();
  const r = await t.call({
    tool: 'start_application',
    input: { opportunityId: t.fixtures.opportunity.id, userId: USER_B, user_id: USER_B, url: 'https://evil.example', sql: 'drop table' },
    idempotencyKey: t.key('start'),
  });
  assertEquals(r.status, 200);
  const app = (r.json.result as { application: Record<string, unknown> }).application;
  assertEquals(t.db.get('job_applications', app.id as string)?.user_id, USER_A);
  assertEquals(run(r.json).user_id, USER_A);
  assertEquals(run(r.json).input_summary, { opportunityId: t.fixtures.opportunity.id, campaignId: null });
});

Deno.test('duplicate idempotency key returns the same completed receipt and does not re-run the handler', async () => {
  const t = setup();
  const original = TOOLS.start_application.handler;
  let handlerCalls = 0;
  TOOLS.start_application.handler = (ctx, input, pre) => { handlerCalls++; return original(ctx, input, pre); };
  try {
    const key = t.key('start');
    const a = await t.call({ tool: 'start_application', input: { opportunityId: t.fixtures.opportunity.id }, idempotencyKey: key });
    const b = await t.call({ tool: 'start_application', input: { opportunityId: t.fixtures.opportunity.id }, idempotencyKey: key });
    assertEquals(a.status, 200);
    assertEquals(b.status, 200);
    assertEquals(run(a.json).id, run(b.json).id);
    assertEquals(run(b.json).status, 'completed');
    assertEquals(handlerCalls, 1);
    assertEquals((a.json.result as { application: { id: string } }).application.id, (b.json.result as { application: { id: string } }).application.id);
    assertEquals(t.db.rows('action_runs').length, 1);
    // the domain event fired once, with no text
    const events = t.db.rows('career_events');
    assertEquals(events.length, 1);
    assertEquals(events[0].event_name, 'coach_action_executed');
    assertEquals((events[0].payload as { tool: string; charged: boolean }).tool, 'start_application');
    assertEquals((events[0].payload as { charged: boolean }).charged, false);
    // reusing the key for a different tool is rejected
    const reuse = await t.call({ tool: 'inspect_context', input: {}, idempotencyKey: key });
    assertEquals(reuse.status, 400);
    assertEquals((reuse.json as { reason?: string }).reason, 'idempotency_key_reused');
  } finally {
    TOOLS.start_application.handler = original;
  }
});

Deno.test('stale contextRevisions → 409 stale_context with current revisions; receipt failed non-retryable', async () => {
  const t = setup();
  const r = await t.call({
    tool: 'start_application', input: { opportunityId: t.fixtures.opportunity.id }, idempotencyKey: t.key('stale'),
    contextRevisions: { opportunity: 99 },
  });
  assertEquals(r.status, 409);
  assertEquals(r.json.error, 'stale_context');
  assertEquals((r.json as { current: Record<string, number> }).current.opportunity, 1);
  assertEquals(run(r.json).status, 'failed');
  assertEquals(run(r.json).retryable, false);
});

Deno.test('create_plan: diff confirmation bound to the content; changed content and expired tokens are rejected', async () => {
  const t = setup();
  const key = t.key('plan');
  const actions = [{
    actionType: 'PREPARE_INTERVIEW', title: 'Prepare for Acme', reason: 'Interview themes not covered',
    contextRefs: { application: { id: t.fixtures.application.id } }, destination: { space: 'applications', id: t.fixtures.application.id, section: 'interview' },
  }];
  const first = await t.call({ tool: 'create_plan', input: { actions }, idempotencyKey: key });
  assertEquals(first.status, 200);
  const conf = first.json.confirmationRequired as { token: string; contentHash: string; summary: string; expiresAt: string };
  assert(conf.token.length === 64);
  assertStringIncludes(conf.summary, 'PREPARE_INTERVIEW: Prepare for Acme');
  assertEquals(run(first.json).status, 'waiting_confirmation');
  assertEquals(t.db.rows('career_actions').length, 0);
  // the token never travels inside the run object
  assertEquals((run(first.json).confirmation as { token?: string }).token, undefined);

  // changed proposal with the old token → mismatch, nothing written
  const changed = await t.call({
    tool: 'create_plan', input: { actions: [{ ...actions[0], title: 'Prepare for Acme (edited)' }] }, idempotencyKey: key,
    confirmation: { token: conf.token, contentHash: conf.contentHash },
  });
  assertEquals(changed.status, 409);
  assertEquals(changed.json.error, 'confirmation_mismatch');
  assertEquals(t.db.rows('career_actions').length, 0);

  // burnt token: the next call re-proposes with a fresh token
  const second = await t.call({ tool: 'create_plan', input: { actions }, idempotencyKey: key });
  const conf2 = second.json.confirmationRequired as { token: string; contentHash: string };
  assert(conf2.token !== conf.token);
  assertEquals(conf2.contentHash, conf.contentHash);

  // expired token
  t.advance(CONFIRMATION_TTL_MS + 1);
  const expired = await t.call({ tool: 'create_plan', input: { actions }, idempotencyKey: key, confirmation: { token: conf2.token, contentHash: conf2.contentHash } });
  assertEquals(expired.status, 409);
  assertEquals(expired.json.error, 'confirmation_expired');

  // fresh proposal, confirmed → actions inserted once, receipt completed
  const third = await t.call({ tool: 'create_plan', input: { actions }, idempotencyKey: key });
  const conf3 = third.json.confirmationRequired as { token: string; contentHash: string };
  const done = await t.call({ tool: 'create_plan', input: { actions }, idempotencyKey: key, confirmation: { token: conf3.token, contentHash: conf3.contentHash } });
  assertEquals(done.status, 200);
  assertEquals(run(done.json).status, 'completed');
  const created = (done.json.result as { actions: Array<Record<string, unknown>> }).actions;
  assertEquals(created.length, 1);
  assertEquals(created[0].source, 'coach');
  assertEquals(created[0].status, 'READY');
  assertMatch(created[0].dedupe_key as string, /^coach:PREPARE_INTERVIEW:[0-9a-f-]{36}:[0-9a-f]{8}$/);
  // replay returns the same actions without re-inserting
  const replay = await t.call({ tool: 'create_plan', input: { actions }, idempotencyKey: key });
  assertEquals(replay.status, 200);
  assertEquals(t.db.rows('career_actions').length, 1);
  assertEquals((replay.json.result as { actions: unknown[] }).actions.length, 1);
});

Deno.test('record_outcome: explicit confirmation, then outcome row + stage/status derived', async () => {
  const t = setup();
  const key = t.key('outcome');
  const input = { applicationId: t.fixtures.application.id, kind: 'rejected', observedAt: '2026-09-20T09:00:00Z', note: 'Position filled internally' };
  const ask = await t.call({ tool: 'record_outcome', input, idempotencyKey: key });
  const conf = ask.json.confirmationRequired as { token: string; contentHash: string; summary: string; destination: string; policy: string };
  assertEquals(conf.policy, 'explicit');
  assertStringIncludes(conf.summary, 'rejected');
  assertStringIncludes(conf.summary, 'preparing → closed (rejected)');
  assertEquals(conf.destination, `application:${t.fixtures.application.id}`);
  // note text never lands in the receipt summary
  assertEquals(run(ask.json).input_summary, { applicationId: t.fixtures.application.id, kind: 'rejected', observedAt: '2026-09-20T09:00:00Z', noteLength: 26 });

  const done = await t.call({ tool: 'record_outcome', input, idempotencyKey: key, confirmation: conf });
  assertEquals(done.status, 200);
  const result = done.json.result as { outcome: Record<string, unknown>; application: Record<string, unknown> };
  assertEquals(result.outcome.kind, 'rejected');
  assertEquals(result.outcome.source, 'user_reported');
  assertEquals(result.application.stage, 'closed');
  assertEquals(result.application.closedReason, 'rejected');
  assertEquals(t.db.get('job_applications', t.fixtures.application.id as string)?.status, 'rejected');
  assertEquals(t.db.rows('application_outcomes').length, 1);
});

Deno.test('save_artifact: creating needs no confirmation; replacing different text needs a diff confirmation', async () => {
  const t = setup();
  const appId = t.fixtures.application.id;
  const created = await t.call({
    tool: 'save_artifact', input: { applicationId: appId, kind: 'cover_letter', title: 'Draft', content: { text: 'Dear team, I build streaming pipelines.' } },
    idempotencyKey: t.key('save'),
  });
  assertEquals(created.status, 200);
  assertEquals(run(created.json).status, 'completed');
  const artifact = (created.json.result as { artifact: Record<string, unknown> }).artifact;
  assertEquals(artifact.source, 'user');
  assertEquals(artifact.status, 'draft');
  assertEquals(run(created.json).input_summary, { applicationId: appId, kind: 'cover_letter', artifactId: null, textLength: 39 });

  const key = t.key('save');
  const replace = await t.call({
    tool: 'save_artifact', input: { applicationId: appId, kind: 'cover_letter', content: { text: 'Dear team, I build batch pipelines.' } },
    idempotencyKey: key,
  });
  assertEquals(replace.status, 200);
  const conf = replace.json.confirmationRequired as { token: string; contentHash: string; summary: string; policy: string };
  assertEquals(conf.policy, 'diff');
  assertStringIncludes(conf.summary, '39 → 35 chars');
  assertStringIncludes(conf.summary, '"streaming pipelines." → "batch pipelines."');
  assertEquals(t.db.get('application_artifacts', artifact.id as string)?.plain_text, 'Dear team, I build streaming pipelines.');

  const done = await t.call({
    tool: 'save_artifact', input: { applicationId: appId, kind: 'cover_letter', content: { text: 'Dear team, I build batch pipelines.' } },
    idempotencyKey: key, confirmation: conf,
  });
  assertEquals(done.status, 200);
  assertEquals((done.json.result as { replaced: boolean }).replaced, true);
  assertEquals(t.db.get('application_artifacts', artifact.id as string)?.plain_text, 'Dear team, I build batch pipelines.');
  assertEquals(t.db.rows('application_artifacts').length, 1);
});

Deno.test('generate_artifact: charged once, citations filtered to provided facts, newAssertions returned but not saved', async () => {
  const t = setup({}, {
    llm: () => Promise.resolve({
      text: 'I rebuilt the Kafka ingestion path and cut latency 40%.\x00',
      citedFactIds: ['not-a-provided-fact', 'x'],
      newAssertions: ['Led a team of 12', ''],
    }),
  });
  const r = await t.call({
    tool: 'generate_artifact', input: { applicationId: t.fixtures.application.id, kind: 'cover_letter', factIds: [t.fixtures.fact1.id] },
    idempotencyKey: t.key('gen'),
  });
  assertEquals(r.status, 200);
  assertEquals(t.calls.meter, ['aiActions']);
  assertEquals(t.calls.release, []);
  const result = r.json.result as { artifact: Record<string, unknown>; newAssertions: string[] };
  assertEquals(result.newAssertions, ['Led a team of 12']);
  assertEquals(result.artifact.source, 'ai');
  assertEquals(result.artifact.status, 'draft');
  assertEquals(result.artifact.plain_text, 'I rebuilt the Kafka ingestion path and cut latency 40%.');
  assertEquals((result.artifact.provenance as { factIds: string[] }).factIds, []);
  assertEquals(run(r.json).usage, { kind: 'aiActions', charged: true });
  assertEquals((run(r.json).result_ref as { newAssertions: string[] }).newAssertions, ['Led a team of 12']);
  // the JD (with its injected instruction) went in as tagged data, never as a tool selection
  assertStringIncludes(t.calls.llm[0], '<job_description>');
  assertStringIncludes(t.calls.llm[0], 'IGNORE PREVIOUS INSTRUCTIONS');
  assertEquals(t.db.rows('application_outcomes').length, 0);
  assertEquals(t.db.rows('action_runs').map((x) => x.tool), ['generate_artifact']);
});

Deno.test('generate_artifact quota failure: receipt failed retryable, not charged, nothing released', async () => {
  const t = setup({ checkAndMeter: () => Promise.reject(new HttpError(402, 'limit_reached', { kind: 'aiActions', limit: 10, plan: 'free' })) });
  const r = await t.call({ tool: 'generate_artifact', input: { applicationId: t.fixtures.application.id, kind: 'linkedin' }, idempotencyKey: t.key('gen') });
  assertEquals(r.status, 402);
  assertEquals(r.json.error, 'limit_reached');
  assertEquals(run(r.json).status, 'failed');
  assertEquals(run(r.json).failure_code, 'limit_reached');
  assertEquals(run(r.json).retryable, true);
  assertEquals(run(r.json).usage, { kind: 'aiActions', charged: false });
  assertEquals(t.calls.release, []);
  assertEquals(t.calls.llm, []);
});

Deno.test('generate_artifact provider outage after charging: usage released, receipt failed retryable; retry with the same key bumps attempt', async () => {
  let fail = true;
  const t = setup({}, {
    llm: () => fail
      ? Promise.reject(new LlmAllProvidersFailedError(new ProviderError('deepseek', 'timeout'), new ProviderError('kimi', 'transient', 502)))
      : Promise.resolve({ text: 'ok', citedFactIds: [], newAssertions: [] }),
  });
  const key = t.key('gen');
  const r = await t.call({ tool: 'generate_artifact', input: { applicationId: t.fixtures.application.id, kind: 'linkedin' }, idempotencyKey: key });
  assertEquals(r.status, 503);
  assertEquals(r.json.error, 'llm_unavailable');
  assertEquals(t.calls.meter, ['aiActions']);
  assertEquals(t.calls.release, ['aiActions']);
  assertEquals(run(r.json).status, 'failed');
  assertEquals(run(r.json).failure_code, 'llm_unavailable');
  assertEquals(run(r.json).retryable, true);
  assertEquals(run(r.json).usage, { kind: 'aiActions', charged: true, released: true });
  assertEquals(run(r.json).attempt, 1);

  fail = false;
  const again = await t.call({ tool: 'generate_artifact', input: { applicationId: t.fixtures.application.id, kind: 'linkedin' }, idempotencyKey: key });
  assertEquals(again.status, 200);
  assertEquals(run(again.json).attempt, 2);
  assertEquals(run(again.json).status, 'completed');
  assertEquals(t.calls.meter, ['aiActions', 'aiActions']);
  assertEquals(t.db.rows('action_runs').length, 1);
});

Deno.test('handler throw and timeout both leave a failed receipt with a sanitised failure_code', async () => {
  const t = setup();
  const original = TOOLS.resume_application.handler;
  TOOLS.resume_application.handler = () => Promise.reject(new TypeError('boom with secrets'));
  try {
    const r = await t.call({ tool: 'resume_application', input: { applicationId: t.fixtures.application.id }, idempotencyKey: t.key('r') });
    assertEquals(r.status, 500);
    assertEquals(r.json.error, 'internal_error');
    assertEquals('detail' in r.json, false);
    assertEquals(run(r.json).status, 'failed');
    assertEquals(run(r.json).failure_code, 'internal_error');
    assertEquals(run(r.json).retryable, true);
  } finally {
    TOOLS.resume_application.handler = original;
  }
  const originalTimeout = TOOLS.resume_application.timeoutMs;
  TOOLS.resume_application.handler = () => new Promise((resolve) => setTimeout(() => resolve({}), 50));
  TOOLS.resume_application.timeoutMs = 5;
  try {
    const r = await t.call({ tool: 'resume_application', input: { applicationId: t.fixtures.application.id }, idempotencyKey: t.key('r') });
    assertEquals(r.status, 504);
    assertEquals(r.json.error, 'timeout');
    assertEquals(run(r.json).failure_code, 'timeout');
    assertEquals(run(r.json).retryable, true);
    await new Promise((resolve) => setTimeout(resolve, 60)); // let the slow handler settle
  } finally {
    TOOLS.resume_application.handler = original;
    TOOLS.resume_application.timeoutMs = originalTimeout;
  }
});

Deno.test('an interrupted running receipt (worker died) becomes retryable and the same key retries as attempt 2', async () => {
  const t = setup();
  const key = t.key('int');
  const stuck = t.db.seed('action_runs', {
    user_id: USER_A, tool: 'resume_application', status: 'running', idempotency_key: key, attempt: 1, request_id: 'old',
    actor: 'user', context_revisions: {}, input_summary: {}, result_ref: null, retryable: false, failure_code: null, confirmation: null,
    usage: {}, started_at: new Date(Date.parse('2026-09-21T10:00:00Z') - INTERRUPTED_AFTER_MS - 1000).toISOString(), finished_at: null,
  });
  const r = await t.call({ tool: 'resume_application', input: { applicationId: t.fixtures.application.id }, idempotencyKey: key });
  assertEquals(r.status, 200);
  assertEquals(run(r.json).id, stuck.id);
  assertEquals(run(r.json).attempt, 2);
  assertEquals(run(r.json).status, 'completed');
  // a still-fresh running receipt for a completing tool is reported as in progress
  const fresh = t.key('fresh');
  t.db.seed('action_runs', {
    user_id: USER_A, tool: 'resume_application', status: 'running', idempotency_key: fresh, attempt: 1, request_id: 'x', actor: 'user',
    context_revisions: {}, input_summary: {}, result_ref: null, retryable: false, failure_code: null, confirmation: null, usage: {},
    started_at: t.db.nowIso(), finished_at: null,
  });
  const busy = await t.call({ tool: 'resume_application', input: { applicationId: t.fixtures.application.id }, idempotencyKey: fresh });
  assertEquals(busy.status, 409);
  assertEquals(busy.json.error, 'run_in_progress');
});

Deno.test('request_tailoring stays running, is reconciled from prism_runs, and report_result refuses a missing/incomplete result', async () => {
  const t = setup();
  const key = t.key('tailor');
  const input = { applicationId: t.fixtures.application.id, sourceResumeId: t.fixtures.resume.id, sourceResumeRevision: 3 };
  const r = await t.call({ tool: 'request_tailoring', input, idempotencyKey: key });
  assertEquals(r.status, 200);
  assertEquals(run(r.json).status, 'running');
  const result = r.json.result as { prismIdempotencyKey: string; applicationId: string; sourceResumeId: string };
  assertEquals(result.prismIdempotencyKey, key);
  assertEquals(result.applicationId, input.applicationId);
  const runId = run(r.json).id as string;

  // stale resume revision
  const stale = await t.call({ tool: 'request_tailoring', input: { ...input, sourceResumeRevision: 2 }, idempotencyKey: t.key('tailor') });
  assertEquals(stale.status, 409);
  assertEquals(stale.json.error, 'stale_context');

  // polling the same key while PRISM has not finished returns the running receipt + binding fields
  const poll = await t.call({ tool: 'request_tailoring', input, idempotencyKey: key });
  assertEquals(poll.status, 200);
  assertEquals(run(poll.json).status, 'running');
  assertEquals((poll.json.result as { prismIdempotencyKey: string }).prismIdempotencyKey, key);

  // report_result: prism run not yet completed → result_not_found, receipt untouched
  const prism = t.db.seed('prism_runs', { user_id: USER_A, status: 'generating', resume_id: null, idempotency_key: key, application_id: input.applicationId, error_code: null });
  const early = await t.call({ tool: 'report_result', input: { runId, result: { kind: 'prism', id: prism.id } }, idempotencyKey: t.key('report') });
  assertEquals(early.status, 404);
  assertEquals(early.json.error, 'result_not_found');
  assertEquals(t.db.get('action_runs', runId)?.status, 'running');
  const missing = await t.call({ tool: 'report_result', input: { runId, result: { kind: 'artifact', id: crypto.randomUUID() } }, idempotencyKey: t.key('report') });
  assertEquals(missing.json.error, 'result_not_found');

  // PRISM completes → reconcile on the next gateway touch completes the receipt with the resume ref
  Object.assign(prism, { status: 'completed', resume_id: crypto.randomUUID() });
  const done = await t.call({ tool: 'request_tailoring', input, idempotencyKey: key });
  assertEquals(run(done.json).status, 'completed');
  assertEquals((run(done.json).result_ref as { type: string; runId: string; resumeId: string }).type, 'prism');
  assertEquals((run(done.json).result_ref as { runId: string }).runId, prism.id);
  assertEquals((done.json.result as { resumeId: string }).resumeId, prism.resume_id);

  // report_result on an already completed receipt with the same result is idempotent
  const report = await t.call({ tool: 'report_result', input: { runId, result: { kind: 'prism', id: prism.id } }, idempotencyKey: t.key('report') });
  assertEquals(report.status, 200);
  assertEquals((report.json.result as { run: { status: string } }).run.status, 'completed');

  // a failed PRISM run marks the receipt failed + retryable
  const key2 = t.key('tailor');
  const r2 = await t.call({ tool: 'request_tailoring', input, idempotencyKey: key2 });
  t.db.seed('prism_runs', { user_id: USER_A, status: 'failed', resume_id: null, idempotency_key: key2, application_id: input.applicationId, error_code: 'cost_cap_exceeded' });
  const failed = await t.call({ tool: 'request_tailoring', input, idempotencyKey: key2 });
  assertEquals(run(failed.json).status, 'running', 'a failed retryable receipt is retried in the same call and re-opened');
  assertEquals(run(failed.json).attempt, 2);
  assertEquals(run(r2.json).id, run(failed.json).id);
  // the retry hands PRISM a derived key so the failed prism_runs row cannot collide
  assertEquals((failed.json.result as { prismIdempotencyKey: string }).prismIdempotencyKey, `${key2}#2`);
});

Deno.test('cancel_run marks an active receipt cancelled; completed side effects stay visible', async () => {
  const t = setup();
  const key = t.key('tailor');
  const r = await t.call({
    tool: 'request_tailoring', input: { applicationId: t.fixtures.application.id, sourceResumeId: t.fixtures.resume.id, sourceResumeRevision: 3 }, idempotencyKey: key,
  });
  const runId = run(r.json).id as string;
  const cancel = await t.call({ tool: 'cancel_run', input: { runId }, idempotencyKey: t.key('cancel') });
  assertEquals(cancel.status, 200);
  assertEquals(run(cancel.json).status, 'cancelled');
  assertEquals(t.db.rows('action_runs').filter((x) => x.tool === 'cancel_run').length, 0, 'cancel writes no receipt of its own');
  // replaying the cancelled key returns the receipt, no re-execution
  const replay = await t.call({
    tool: 'request_tailoring', input: { applicationId: t.fixtures.application.id, sourceResumeId: t.fixtures.resume.id, sourceResumeRevision: 3 }, idempotencyKey: key,
  });
  assertEquals(run(replay.json).status, 'cancelled');
  assertEquals('result' in replay.json, false);
  // a completed receipt cannot be cancelled and a foreign run id is not found
  const done = await t.call({ tool: 'inspect_context', input: {}, idempotencyKey: t.key('i') });
  const c2 = await t.call({ tool: 'cancel_run', input: { runId: run(done.json).id }, idempotencyKey: t.key('cancel') });
  assertEquals(run(c2.json).status, 'completed');
  const c3 = await t.call({ tool: 'cancel_run', input: { runId: crypto.randomUUID() }, idempotencyKey: t.key('cancel') });
  assertEquals(c3.status, 404);
});

Deno.test('prepare_interview derives themes from requirements and story candidates from facts; idempotent per application', async () => {
  const t = setup();
  const a = await t.call({
    tool: 'prepare_interview', input: { applicationId: t.fixtures.application.id, timeZone: 'Europe/Berlin', interviewType: 'technical' }, idempotencyKey: t.key('prep'),
  });
  assertEquals(a.status, 200);
  const session = (a.json.result as { session: Record<string, unknown>; created: boolean }).session;
  assertEquals((a.json.result as { created: boolean }).created, true);
  assertEquals(session.themes, [
    { id: 'theme:r1', theme: 'Kafka streaming', covered: false, sourceRequirementId: 'r1' },
    { id: 'theme:r2', theme: 'Airflow orchestration', covered: false, sourceRequirementId: 'r2' },
  ]);
  assertEquals((session.story_fact_ids as string[]).sort(), [t.fixtures.fact1.id, t.fixtures.fact2.id].sort());
  assertEquals(session.time_zone, 'Europe/Berlin');
  const b = await t.call({ tool: 'prepare_interview', input: { applicationId: t.fixtures.application.id, scheduledAt: '2026-10-01T09:00:00+02:00' }, idempotencyKey: t.key('prep') });
  assertEquals((b.json.result as { created: boolean }).created, false);
  assertEquals((b.json.result as { session: { id: string } }).session.id, session.id);
  assertEquals(t.db.rows('interview_sessions').length, 1);
  const badTz = await t.call({ tool: 'prepare_interview', input: { applicationId: t.fixtures.application.id, timeZone: 'Mars/Olympus' }, idempotencyKey: t.key('prep') });
  assertEquals(badTz.status, 400);
});

Deno.test('read tools: compare_opportunities builds a deterministic coverage table; explain_priorities orders by band', async () => {
  const t = setup();
  const second = t.db.seed('opportunities', {
    user_id: USER_A, title: 'Platform Engineer', company: 'Initech', status: 'saved', listing_status: 'open', captured_content: '',
    comp_min: 90000, comp_max: 110000, comp_currency: 'EUR', comp_period: 'year',
    requirements: [{ id: 'q1', text: 'Kafka streaming', kind: 'must' }, { id: 'q2', text: 'Terraform', kind: 'must' }],
  });
  t.db.seed('opportunity_analyses', {
    user_id: USER_A, opportunity_id: second.id, goal_id: null, opportunity_revision: 1, computed_at: '2026-09-20T00:00:00Z', stale: false, ats_score: 71,
    qualification: { supported: [{ requirementId: 'q1', text: 'Kafka streaming' }], missing: [{ requirementId: 'q2', text: 'Terraform' }] }, direction: {},
  });
  const r = await t.call({ tool: 'compare_opportunities', input: { opportunityIds: [t.fixtures.opportunity.id, second.id] }, idempotencyKey: t.key('cmp') });
  assertEquals(r.status, 200);
  const result = r.json.result as { opportunities: Array<Record<string, unknown>>; coverage: { rows: Array<{ text: string; states: Record<string, string> }>; totals: Array<Record<string, unknown>> } };
  assertEquals(result.opportunities[0].compensation, 'unknown');
  assertEquals(result.opportunities[1].compensation, { min: 90000, max: 110000, currency: 'EUR', period: 'year' });
  assertEquals(result.coverage.rows.map((x) => x.text), ['Airflow orchestration', 'Kafka streaming', 'Terraform']);
  assertEquals(result.coverage.rows[1].states, { [t.fixtures.opportunity.id as string]: 'not_analyzed', [second.id as string]: 'supported' });
  assertEquals(result.coverage.rows[2].states[t.fixtures.opportunity.id as string], 'not_required');

  t.db.seed('career_actions', { user_id: USER_A, action_type: 'TAILOR_CV', title: 'Later', reason: 'r', priority_band: 'later', status: 'READY', dedupe_key: 'a', evidence_refs: [], context_refs: {}, destination: {}, source: 'rule', created_at: '2026-09-01T00:00:00Z' });
  t.db.seed('career_actions', { user_id: USER_A, action_type: 'REVIEW_OPPORTUNITY', title: 'Now', reason: 'urgent', priority_band: 'now', status: 'PROPOSED', dedupe_key: 'b', evidence_refs: [], context_refs: {}, destination: {}, source: 'rule', created_at: '2026-09-02T00:00:00Z' });
  t.db.seed('career_actions', { user_id: USER_A, action_type: 'SET_GOAL', title: 'Dismissed', reason: '', priority_band: 'now', status: 'DISMISSED', dedupe_key: 'c', evidence_refs: [], context_refs: {}, destination: {}, source: 'rule' });
  t.db.seed('career_actions', { user_id: USER_B, action_type: 'SET_GOAL', title: 'Other user', reason: '', priority_band: 'now', status: 'READY', dedupe_key: 'd', evidence_refs: [], context_refs: {}, destination: {}, source: 'rule' });
  const p = await t.call({ tool: 'explain_priorities', input: {}, idempotencyKey: t.key('p') });
  const actions = (p.json.result as { actions: Array<{ title: string; reason: string }> }).actions;
  assertEquals(actions.map((a) => a.title), ['Now', 'Later']);
  assertEquals(actions[0].reason, 'urgent');
});

Deno.test('resume_application and review_evidence project owned state only', async () => {
  const t = setup();
  const appId = t.fixtures.application.id as string;
  const artifact = t.db.seed('application_artifacts', {
    user_id: USER_A, application_id: appId, kind: 'cover_letter', title: 'CL', content: { text: 'x' }, plain_text: 'x', source: 'ai', status: 'draft',
    stale: false, provenance: { factIds: [t.fixtures.fact1.id] },
  });
  t.db.seed('career_fact_references', { user_id: USER_A, fact_id: t.fixtures.fact1.id, fact_revision: 1, artifact_kind: 'application_artifact', artifact_id: artifact.id, artifact_section: 'cover_letter' });
  Object.assign(t.fixtures.fact1, { revision: 2 }); // the fact moved on → the reference is stale
  const r = await t.call({ tool: 'resume_application', input: { applicationId: appId }, idempotencyKey: t.key('res') });
  const result = r.json.result as { artifacts: Array<Record<string, unknown>>; prism: unknown[]; interviews: unknown[]; opportunity: { title: string } };
  assertEquals(result.artifacts.length, 1);
  assertEquals(result.artifacts[0].length, 1);
  assertEquals('plain_text' in result.artifacts[0], false);
  assertEquals(result.opportunity.title, 'Data Engineer');
  const ev = await t.call({ tool: 'review_evidence', input: { applicationId: appId }, idempotencyKey: t.key('ev') });
  const facts = (ev.json.result as { facts: Array<Record<string, unknown>> }).facts;
  assertEquals(facts.length, 1);
  assertEquals(facts[0].referenceCount, 1);
  assertEquals((facts[0].staleReferences as unknown[]).length, 1);
  const foreign = await t.call({ tool: 'review_evidence', input: { factIds: [crypto.randomUUID()] }, idempotencyKey: t.key('ev') });
  assertEquals(foreign.status, 404);
});
