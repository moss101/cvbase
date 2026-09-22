import { assert, assertEquals } from 'jsr:@std/assert';
import type { User } from 'jsr:@supabase/supabase-js@2';
import {
  ACTIVE_RUN_WINDOW_MS,
  CHECKPOINT_DEGRADED_LABEL,
  handlePrismRequest,
  type PrismDeps,
} from './handler.ts';
import { FakeSvc, type Row } from './fakeSvc_test.ts';
import { CRIT_PASS, DRAFT1, QUESTIONS, scriptedModel } from './fixtures_test.ts';
import { LlmAllProvidersFailedError, ProviderError } from '../_shared/llm/errors.ts';
import type { ModelFn } from './model.ts';

// prism-tailor request pipeline with every network dependency faked: the
// scripted model (fixtures_test.ts) drives the real graphs, the in-memory
// service client (fakeSvc_test.ts) stands in for Postgres, and `calls`
// records metering so a test can assert "same key → not charged twice".

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const APP_ID = '33333333-3333-4333-8333-333333333333';
const FOREIGN_APP_ID = '44444444-4444-4444-8444-444444444444';
const RESUME_ID = '55555555-5555-4555-8555-555555555555';
const OUT_RESUME_ID = '66666666-6666-4666-8666-666666666666';
const USER = { id: USER_ID, email: 'a@example.com' } as unknown as User;

const CV_TEXT = 'Avery Chen — Data Platform Engineer at Streamline GmbH since 2022. '.repeat(3);
const JD_TEXT = 'Senior Data Platform Engineer: Kafka, Kubernetes, Terraform, streaming pipelines. '.repeat(3);

interface Calls { meter: string[]; release: string[]; logs: string[] }

function fixture(opts: { model?: ModelFn; now?: () => number; seed?: Record<string, Row[]> } = {}) {
  const now = opts.now ?? (() => Date.now());
  const svc = new FakeSvc({
    feature_flags: [{ flag: 'prism', enabled: true, rollout_pct: 100 }],
    job_applications: [
      { id: APP_ID, user_id: USER_ID, company: 'Acme', role: 'RN', status: 'wishlist', revision: 1, current_resume_id: null, prism_run_id: null },
      { id: FOREIGN_APP_ID, user_id: OTHER_ID, company: 'Other', role: 'MD', status: 'wishlist', revision: 1 },
    ],
    resumes: [
      { id: RESUME_ID, user_id: USER_ID, title: 'Main', revision: 3, application_id: null, origin: null },
      { id: OUT_RESUME_ID, user_id: USER_ID, title: 'Tailored', revision: 1, application_id: null, origin: null },
    ],
    ...(opts.seed ?? {}),
  }, now);
  const calls: Calls = { meter: [], release: [], logs: [] };
  const deps: Partial<PrismDeps> = {
    getUser: () => Promise.resolve(USER),
    serviceClient: () => svc as unknown as ReturnType<PrismDeps['serviceClient']>,
    checkAndMeter: (_u, kind) => { calls.meter.push(kind); return Promise.resolve(); },
    releaseUsage: (_u, kind) => { calls.release.push(kind); return Promise.resolve(); },
    model: opts.model ?? scriptedModel({ drafts: [DRAFT1], critiques: [CRIT_PASS] }),
    logAi: (_u, meta) => { calls.logs.push(`${meta.function}:${meta.status}`); return Promise.resolve(); },
    now,
  };
  return { svc, calls, deps };
}

function post(body: unknown): Request {
  return new Request('http://localhost/prism-tailor', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
    body: JSON.stringify(body),
  });
}

async function events(res: Response): Promise<Record<string, unknown>[]> {
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('content-type'), 'application/x-ndjson');
  const text = await res.text();
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const done = (evs: Record<string, unknown>[]) => evs.find((e) => e.type === 'done')?.result as Record<string, unknown> | undefined;
const stages = (evs: Record<string, unknown>[]) => evs.filter((e) => e.type === 'stage').map((e) => e.stage);
const run = (svc: FakeSvc, id: string) => svc.rows('prism_runs').find((r) => r.id === id)!;

const analyzeBody = (extra: Record<string, unknown> = {}) =>
  ({ phase: 'analyze', jdText: JD_TEXT, cvText: CV_TEXT, templateId: 'classic', ...extra });

Deno.test('standalone analyze (today\'s payload): metered once, run row created, stages + done streamed', async () => {
  const { svc, calls, deps } = fixture();
  const evs = await events(await handlePrismRequest(post(analyzeBody()), deps));

  assertEquals(stages(evs), ['gap_analyst', 'wizard_creator']);
  const result = done(evs)!;
  assertEquals((result.questions as unknown[]).length, 3);
  assertEquals(calls.meter, ['aiActions']);
  assertEquals(calls.release, []);
  const rows = svc.rows('prism_runs');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].status, 'awaiting_answers');
  assertEquals(rows[0].application_id, null);
  assertEquals(rows[0].idempotency_key, null);
  assertEquals(rows[0].id, result.runId);
});

Deno.test('IDEMPOTENT analyze: the same key replays the run — no second meter, no second row, no model calls', async () => {
  const model = scriptedModel({ drafts: [], critiques: [] });
  const { svc, calls, deps } = fixture({ model });
  const body = analyzeBody({ idempotencyKey: 'tailor:app-1:rev-3', applicationId: APP_ID, sourceResumeId: RESUME_ID, sourceResumeRevision: 3 });

  const first = done(await events(await handlePrismRequest(post(body), deps)))!;
  const modelCallsAfterFirst = model.calls.length;
  const second = done(await events(await handlePrismRequest(post(body), deps)))!;

  assertEquals(second.runId, first.runId);
  assertEquals(second.questions, first.questions);
  assertEquals(calls.meter, ['aiActions'], 'charged exactly once per logical tailoring');
  assertEquals(svc.rows('prism_runs').length, 1);
  assertEquals(model.calls.length, modelCallsAfterFirst, 'replay runs no agent');
  const row = run(svc, String(first.runId));
  assertEquals(row.application_id, APP_ID);
  assertEquals(row.source_resume_id, RESUME_ID);
  assertEquals(row.source_resume_revision, 3);
  assertEquals(row.idempotency_key, 'tailor:app-1:rev-3');
  // The application now knows its run.
  const app = svc.rows('job_applications').find((a) => a.id === APP_ID)!;
  assertEquals(app.prism_run_id, first.runId);
});

Deno.test('IDEMPOTENT analyze: key of a run still analyzing inside the active window → 409 run_in_progress', async () => {
  const { svc, calls, deps } = fixture();
  svc.rows('prism_runs').push({
    id: '77777777-7777-4777-8777-777777777777', user_id: USER_ID, status: 'analyzing',
    idempotency_key: 'k1', updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
  });
  const res = await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k1' })), deps);
  assertEquals(res.status, 409);
  const json = await res.json();
  assertEquals(json.error, 'run_in_progress');
  assertEquals(json.runId, '77777777-7777-4777-8777-777777777777');
  assertEquals(calls.meter, []);
});

Deno.test('IDEMPOTENT analyze: review/completed runs replay their outcome without metering', async () => {
  const { svc, calls, deps } = fixture();
  const stored = { runId: 'r-review', resume: { contact: {} }, atsScore: 88, unresolvedIssues: [] };
  svc.rows('prism_runs').push(
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: USER_ID, status: 'review', idempotency_key: 'k-review', result: stored, updated_at: '2026-01-01T00:00:00Z' },
    { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_id: USER_ID, status: 'completed', idempotency_key: 'k-done', resume_id: OUT_RESUME_ID, updated_at: '2026-01-01T00:00:00Z' },
  );
  const review = done(await events(await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-review' })), deps)))!;
  assertEquals(review, stored);
  const completed = done(await events(await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-done' })), deps)))!;
  assertEquals(completed, { runId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', resumeId: OUT_RESUME_ID });
  assertEquals(calls.meter, []);
  assertEquals(svc.rows('prism_runs').length, 2);
});

Deno.test('IDEMPOTENT analyze: a FAILED run with the same key is re-run on the same row for free', async () => {
  const model = scriptedModel({ drafts: [], critiques: [] });
  const { svc, calls, deps } = fixture({ model });
  const failedId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  svc.rows('prism_runs').push({
    id: failedId, user_id: USER_ID, status: 'failed', error_code: 'internal_error', idempotency_key: 'k-failed',
    questions: null, gap_analysis: null, checkpoint: { usage: { kind: 'aiActions', charged: true, released: false } },
    updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
  });
  const evs = await events(await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-failed' })), deps));
  const result = done(evs)!;
  assertEquals(result.runId, failedId);
  assertEquals(stages(evs), ['gap_analyst', 'wizard_creator']);
  assertEquals(calls.meter, [], 'retry of a failed run is not charged');
  assertEquals(svc.rows('prism_runs').length, 1);
  assertEquals(run(svc, failedId).status, 'awaiting_answers');
  assertEquals(run(svc, failedId).error_code, null);
});

Deno.test('IDEMPOTENT analyze: a stale (crashed) analyzing row outside the window resumes from its checkpointed gap analysis', async () => {
  const model = scriptedModel({ drafts: [], critiques: [] });
  const t0 = Date.parse('2026-09-20T10:00:00Z');
  const { svc, calls, deps } = fixture({ model, now: () => t0 });
  const staleId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const { GAP } = await import('./fixtures_test.ts');
  svc.rows('prism_runs').push({
    id: staleId, user_id: USER_ID, status: 'analyzing', idempotency_key: 'k-stale', questions: null, gap_analysis: GAP,
    checkpoint: {}, updated_at: new Date(t0 - ACTIVE_RUN_WINDOW_MS - 1000).toISOString(), created_at: '2026-09-20T09:00:00Z',
  });
  const evs = await events(await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-stale' })), deps));
  assertEquals(done(evs)!.runId, staleId);
  assertEquals(model.calls, ['wizard_creator'], 'gap analyst skipped: resumed past the checkpoint');
  assertEquals(calls.meter, []);
});

Deno.test('OWNERSHIP: a foreign application id is 404 application_not_found before anything is metered or created', async () => {
  const { svc, calls, deps } = fixture();
  const res = await handlePrismRequest(post(analyzeBody({ applicationId: FOREIGN_APP_ID })), deps);
  assertEquals(res.status, 404);
  assertEquals((await res.json()).error, 'application_not_found');
  assertEquals(calls.meter, []);
  assertEquals(svc.rows('prism_runs').length, 0);

  const missing = await handlePrismRequest(post(analyzeBody({ sourceResumeId: '99999999-9999-4999-8999-999999999999' })), deps);
  assertEquals(missing.status, 404);
  assertEquals((await missing.json()).error, 'resume_not_found');
});

Deno.test('QUOTA: a 402 from metering creates no run row', async () => {
  const { svc, deps } = fixture();
  const { HttpError } = await import('../_shared/respond.ts');
  deps.checkAndMeter = () => Promise.reject(new HttpError(402, 'limit_reached', { upgrade: true }));
  const res = await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-quota' })), deps);
  assertEquals(res.status, 402);
  assertEquals((await res.json()).error, 'limit_reached');
  assertEquals(svc.rows('prism_runs').length, 0);
});

async function analyzedRun(fx: ReturnType<typeof fixture>, extra: Record<string, unknown> = {}): Promise<string> {
  const evs = await events(await handlePrismRequest(post(analyzeBody(extra)), fx.deps));
  return String(done(evs)!.runId);
}
const answers = QUESTIONS.questions.map((q) => ({ questionId: q.id, question: q.question, answer: 'Yes, in production for two years.' }));

Deno.test('GENERATE: a changed source revision answers in-band source_stale (run untouched) until acknowledged', async () => {
  const fx = fixture();
  const runId = await analyzedRun(fx, { applicationId: APP_ID, sourceResumeId: RESUME_ID, sourceResumeRevision: 3, idempotencyKey: 'k-stale-src' });
  // The user edited the source CV since analyze: revision 3 → 4.
  fx.svc.rows('resumes').find((r) => r.id === RESUME_ID)!.revision = 4;

  const stale = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  assertEquals(stale, [{ type: 'error', error: 'source_stale', extra: { currentRevision: 4 } }]);
  assertEquals(run(fx.svc, runId).status, 'awaiting_answers', 'not a failure: the run stays resumable');
  assertEquals(run(fx.svc, runId).error_code ?? null, null);

  const evs = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers, acknowledgeStale: true }), fx.deps));
  assertEquals(stages(evs), ['aggregator', 'writer', 'critic', 'parser']);
  assert(done(evs)!.resume, 'acknowledged: generation proceeds');
  assertEquals(run(fx.svc, runId).status, 'review');
  assertEquals(fx.calls.meter, ['aiActions'], 'generate is unmetered');
});

Deno.test('GENERATE: a bound run whose application vanished is 404 application_not_found', async () => {
  const fx = fixture();
  const runId = await analyzedRun(fx, { applicationId: APP_ID });
  fx.svc.tables.job_applications = fx.svc.rows('job_applications').filter((a) => a.id !== APP_ID);
  const res = await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps);
  assertEquals(res.status, 404);
  assertEquals((await res.json()).error, 'application_not_found');
});

Deno.test('GENERATE: unchanged standalone contract — resumes an awaiting_answers run to review', async () => {
  const fx = fixture();
  const runId = await analyzedRun(fx);
  const evs = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  const result = done(evs)!;
  assertEquals(result.runId, runId);
  assertEquals(result.atsScore, 88);
  assertEquals(run(fx.svc, runId).status, 'review');
});

async function reviewedRun(fx: ReturnType<typeof fixture>, extra: Record<string, unknown> = {}): Promise<string> {
  const runId = await analyzedRun(fx, extra);
  await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  assertEquals(run(fx.svc, runId).status, 'review');
  return runId;
}

Deno.test('FINALIZE with an application: links application + resume FIRST, then completes; a second finalize is 200 ok', async () => {
  const fx = fixture();
  const runId = await reviewedRun(fx, { applicationId: APP_ID, sourceResumeId: RESUME_ID, sourceResumeRevision: 3, idempotencyKey: 'k-fin' });
  fx.svc.ops.length = 0;

  const res = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID, applicationId: APP_ID }), fx.deps);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { runId, status: 'completed', applicationId: APP_ID, resumeId: OUT_RESUME_ID });

  const writes = fx.svc.ops.filter((o) => o.startsWith('update:'));
  assertEquals(writes.indexOf('update:prism_runs') > writes.indexOf('update:job_applications'), true, 'links before completion');
  assertEquals(writes.indexOf('update:prism_runs') > writes.indexOf('update:resumes'), true, 'links before completion');
  const app = fx.svc.rows('job_applications').find((a) => a.id === APP_ID)!;
  assertEquals(app.current_resume_id, OUT_RESUME_ID);
  assertEquals(app.prism_run_id, runId);
  const resume = fx.svc.rows('resumes').find((r) => r.id === OUT_RESUME_ID)!;
  assertEquals(resume.application_id, APP_ID);
  assertEquals(resume.origin, { kind: 'prism', runId, sourceResumeId: RESUME_ID, sourceRevision: 3 });
  const row = run(fx.svc, runId);
  assertEquals(row.status, 'completed');
  assertEquals(row.resume_id, OUT_RESUME_ID);
  assertEquals(row.jd_text, null);
  assertEquals(row.cv_text, null);
  assertEquals(row.result, null);

  // Retry after a lost response: same resume → success, not run_not_reviewable.
  const again = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID, applicationId: APP_ID }), fx.deps);
  assertEquals(again.status, 200);
  assertEquals((await again.json()).status, 'completed');
  // …but a different resume for a completed run is still refused.
  const other = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: RESUME_ID }), fx.deps);
  assertEquals(other.status, 409);
  assertEquals((await other.json()).error, 'run_not_reviewable');
  assertEquals(fx.calls.meter, ['aiActions'], 'finalize is unmetered');
});

Deno.test('FINALIZE: the run\'s own binding is used when the body omits applicationId; a conflicting one is 409', async () => {
  const fx = fixture();
  const runId = await reviewedRun(fx, { applicationId: APP_ID });
  const conflict = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID, applicationId: FOREIGN_APP_ID }), fx.deps);
  assertEquals(conflict.status, 409);
  assertEquals((await conflict.json()).error, 'application_mismatch');
  assertEquals(run(fx.svc, runId).status, 'review');

  const res = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID }), fx.deps);
  assertEquals((await res.json()).applicationId, APP_ID);
  assertEquals(fx.svc.rows('resumes').find((r) => r.id === OUT_RESUME_ID)!.application_id, APP_ID);
});

Deno.test('FINALIZE: a link failure leaves the run in review and answers 500 finalize_link_failed retryable; the retry completes', async () => {
  const fx = fixture();
  const runId = await reviewedRun(fx, { applicationId: APP_ID });
  fx.svc.failNext({ table: 'resumes', op: 'update', times: 1 });

  const res = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID, applicationId: APP_ID }), fx.deps);
  assertEquals(res.status, 500);
  const json = await res.json();
  assertEquals(json.error, 'finalize_link_failed');
  assertEquals(json.retryable, true);
  assertEquals(run(fx.svc, runId).status, 'review', 'run not marked completed when linking failed');
  assert(run(fx.svc, runId).result, 'result kept for the retry');

  const retry = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID, applicationId: APP_ID }), fx.deps);
  assertEquals(retry.status, 200);
  assertEquals(run(fx.svc, runId).status, 'completed');
  assertEquals(fx.svc.rows('resumes').find((r) => r.id === OUT_RESUME_ID)!.application_id, APP_ID);
});

Deno.test('FINALIZE: standalone (no application) behaves as before — completes without touching resumes/job_applications', async () => {
  const fx = fixture();
  const runId = await reviewedRun(fx);
  fx.svc.ops.length = 0;
  const res = await handlePrismRequest(post({ phase: 'finalize', runId, resumeId: OUT_RESUME_ID }), fx.deps);
  assertEquals(await res.json(), { runId, status: 'completed', applicationId: null, resumeId: OUT_RESUME_ID });
  assertEquals(fx.svc.ops.filter((o) => o.startsWith('update:')), ['update:prism_runs']);
  // A resume that is not the caller's cannot be linked to their run.
  const runId2 = await reviewedRun(fx);
  const foreign = await handlePrismRequest(post({ phase: 'finalize', runId: runId2, resumeId: '99999999-9999-4999-8999-999999999999' }), fx.deps);
  assertEquals(foreign.status, 404);
  assertEquals((await foreign.json()).error, 'resume_not_found');
});

Deno.test('CHECKPOINT DEGRADED: a checkpoint write that rejects twice emits one in-band stage event and the run still completes', async () => {
  const fx = fixture();
  const runId = await analyzedRun(fx);
  fx.svc.failNext({ table: 'prism_runs', op: 'update', reject: true, when: (p) => 'checkpoint' in p });

  const evs = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  const degraded = evs.filter((e) => e.stage === 'checkpoint_degraded');
  assertEquals(degraded.length, 1, 'emitted once, not once per failed checkpoint');
  assertEquals(degraded[0].label, CHECKPOINT_DEGRADED_LABEL);
  assertEquals(stages(evs), ['aggregator', 'checkpoint_degraded', 'writer', 'critic', 'parser']);
  assert(done(evs)!.resume);
  const row = run(fx.svc, runId);
  assertEquals(row.status, 'review');
  assertEquals(row.error_code ?? null, null, 'error_code is only set if the run later fails');
  const attempts = fx.svc.ops.filter((o) => o === 'update:prism_runs').length;
  assert(attempts >= 6, `each failed checkpoint is retried once (saw ${attempts} update attempts)`);
});

Deno.test('CHECKPOINT DEGRADED: when the run later fails, error_code records checkpoint_degraded and the client learns it', async () => {
  const failing = Object.assign(
    ((prompt: string, schema: unknown, opts?: { model?: string }) =>
      prompt.includes('ATS compliance reviewer')
        ? Promise.reject(new Error('critic exploded'))
        : scriptedModel({ drafts: [DRAFT1], critiques: [] })(prompt, schema as never, opts)) as ModelFn,
    { calls: [] as string[], models: [] as string[] },
  );
  const fx = fixture({ model: failing });
  const runId = await analyzedRun(fx);
  fx.svc.failNext({ table: 'prism_runs', op: 'update', when: (p) => 'checkpoint' in p });

  const evs = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  const err = evs.find((e) => e.type === 'error')!;
  assertEquals(err.error, 'internal_error');
  assertEquals(err.extra, { checkpointDegraded: true });
  const row = run(fx.svc, runId);
  assertEquals(row.status, 'failed');
  assertEquals(row.error_code, 'checkpoint_degraded');
});

Deno.test('CHECKPOINT: a single transient write failure is absorbed by the retry — no degraded event', async () => {
  const fx = fixture();
  const runId = await analyzedRun(fx);
  fx.svc.failNext({ table: 'prism_runs', op: 'update', times: 1, when: (p) => 'checkpoint' in p });
  const evs = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  assertEquals(stages(evs), ['aggregator', 'writer', 'critic', 'parser']);
  assertEquals(run(fx.svc, runId).status, 'review');
});

Deno.test('REFUND: an our-side provider outage refunds the charge, records it on the run, and the free retry re-reserves exactly once', async () => {
  const outage = Object.assign(
    (() => Promise.reject(new LlmAllProvidersFailedError(
      new ProviderError('deepseek', 'transient'), new ProviderError('kimi', 'transient'),
    ))) as ModelFn,
    { calls: [] as string[], models: [] as string[] },
  );
  const fx = fixture({ model: outage });
  const evs = await events(await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-outage' })), fx.deps));
  assertEquals(evs.at(-1)!.error, 'llm_unavailable');
  assertEquals(fx.calls.meter, ['aiActions']);
  assertEquals(fx.calls.release, ['aiActions'], 'refunded: the user got nothing and it was not their fault');
  const row = fx.svc.rows('prism_runs')[0];
  assertEquals(row.status, 'failed');
  assertEquals((row.checkpoint as Record<string, unknown>).usage, { kind: 'aiActions', charged: true, released: true });

  // Providers are back: the retry on the same key re-reserves the single charge.
  fx.deps.model = scriptedModel({ drafts: [], critiques: [] });
  const retry = await events(await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'k-outage' })), fx.deps));
  assertEquals(done(retry)!.runId, row.id);
  assertEquals(fx.calls.meter, ['aiActions', 'aiActions'], 'net one charge for the tailoring');
  assertEquals(fx.calls.release, ['aiActions']);
  assertEquals(fx.svc.rows('prism_runs').length, 1);
});

Deno.test('a user-side failure (cost cap) is not refunded and the run is still resumable for free', async () => {
  const fx = fixture();
  const runId = await analyzedRun(fx);
  const { TOKEN_BUDGET } = await import('./prompts.ts');
  run(fx.svc, runId).checkpoint = { usage: { kind: 'aiActions', charged: true, released: false }, tokensUsed: TOKEN_BUDGET };
  const evs = await events(await handlePrismRequest(post({ phase: 'generate', runId, answers }), fx.deps));
  assertEquals(evs.at(-1)!.error, 'cost_cap_exceeded');
  assertEquals(fx.calls.release, []);
  assertEquals(run(fx.svc, runId).status, 'failed');
  assertEquals(run(fx.svc, runId).error_code, 'cost_cap_exceeded');
});

Deno.test('gate: the feature flag still fails closed and a bad body is 400', async () => {
  const fx = fixture();
  fx.svc.tables.feature_flags = [{ flag: 'prism', enabled: false, rollout_pct: 100 }];
  const off = await handlePrismRequest(post(analyzeBody()), fx.deps);
  assertEquals(off.status, 403);
  assertEquals((await off.json()).error, 'feature_disabled');
  fx.svc.tables.feature_flags = [{ flag: 'prism', enabled: true, rollout_pct: 100 }];
  const bad = await handlePrismRequest(post(analyzeBody({ idempotencyKey: 'x'.repeat(129) })), fx.deps);
  assertEquals(bad.status, 400);
  const notUuid = await handlePrismRequest(post(analyzeBody({ applicationId: 'not-a-uuid' })), fx.deps);
  assertEquals(notUuid.status, 400);
});
