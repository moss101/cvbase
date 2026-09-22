import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import type { User } from 'jsr:@supabase/supabase-js@2';
import type { HandlerDeps } from '../_shared/handler.ts';
import { HttpError } from '../_shared/respond.ts';
import { LlmAllProvidersFailedError, ProviderError } from '../_shared/llm/errors.ts';
import { FakeDb, seedCareer, USER_A, USER_B } from '../career-gateway/fakedb_test.ts';
import { buildInterviewHandler, computeReadiness, type InterviewDeps } from './index.ts';

// ai-interview against the in-memory database with a scripted model. The
// metering assertions matter most: a model call costs exactly one action,
// an abstention costs nothing, and an outage refunds.

type Script = (prompt: string) => Promise<unknown>;

function setup(script: Script, over: Partial<HandlerDeps & InterviewDeps> = {}) {
  const db = new FakeDb(() => Date.parse('2026-09-21T10:00:00Z'));
  const fixtures = seedCareer(db, USER_A);
  const calls = { meter: [] as string[], release: [] as string[], prompts: [] as string[] };
  const session = db.seed('interview_sessions', {
    user_id: USER_A, application_id: fixtures.application.id, scheduled_at: null, time_zone: 'Europe/Berlin', interview_type: 'technical',
    themes: [{ id: 'theme:r1', theme: 'Kafka streaming', covered: false, sourceRequirementId: 'r1' }, { id: 'theme:r2', theme: 'Airflow orchestration', covered: false, sourceRequirementId: 'r2' }],
    story_fact_ids: [fixtures.fact1.id], practice: [], readiness: {}, status: 'planned', self_reported_result: null, recruiter_feedback: null,
  });
  const deps: Partial<HandlerDeps & InterviewDeps> = {
    getUser: () => Promise.resolve({ id: USER_A } as unknown as User),
    serviceClient: () => db as unknown as ReturnType<HandlerDeps['serviceClient']>,
    checkAndMeter: (_u, kind) => { calls.meter.push(kind); return Promise.resolve(); },
    releaseUsage: (_u, kind) => { calls.release.push(kind); return Promise.resolve(); },
    requireFeature: () => Promise.resolve(),
    enforceRateLimit: () => Promise.resolve({}),
    logAi: () => Promise.resolve(),
    requireCareerOs: () => Promise.resolve(),
    llm: async (prompt) => { calls.prompts.push(prompt); return { data: await script(prompt), tokens: 7 }; },
    ...over,
  };
  const handler = buildInterviewHandler(deps);
  const call = async (body: unknown) => {
    const res = await handler(new Request('http://localhost/ai-interview', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    return { status: res.status, json: await res.json() as Record<string, unknown> };
  };
  const setAnswer = (itemId: string, answer: string) => {
    const s = db.get('interview_sessions', session.id as string)!;
    const practice = s.practice as Array<Record<string, unknown>>;
    const item = practice.find((p) => p.id === itemId)!;
    item.answer = answer;
    item.answeredAt = '2026-09-21T09:00:00Z';
  };
  return { db, calls, call, fixtures, session, setAnswer };
}

Deno.test('questions: metered once, ≤ 8 items, theme/fact tags filtered, idempotent by question text', async () => {
  const t = setup(() => Promise.resolve({
    questions: [
      { question: 'Tell me about a time you tuned a Kafka pipeline.', themeId: 'theme:r1', factIds: [USER_A, 'zzz'] },
      { question: 'How do you schedule backfills in Airflow?', themeId: 'theme:nope', factIds: [] },
      { question: '  Tell me about a time you tuned a Kafka pipeline. ', themeId: 'theme:r1', factIds: [] },
      ...Array.from({ length: 7 }, (_, i) => ({ question: `Extra question ${i}?`, themeId: 'theme:r2', factIds: [] })),
    ],
  }));
  // make the first fact citable
  const r = await t.call({ sessionId: t.session.id, mode: 'questions' });
  assertEquals(r.status, 200);
  assertEquals(t.calls.meter, ['aiActions']);
  assertEquals(t.calls.release, []);
  const session = r.json.session as Record<string, unknown>;
  const practice = session.practice as Array<Record<string, unknown>>;
  assertEquals(r.json.added, 8, '9 unique questions after the duplicate is removed, capped at MAX_QUESTIONS');
  assertEquals(practice.length, 8);
  assertEquals(practice[0].themeId, 'theme:r1');
  assertEquals(practice[0].factIds, []); // neither id is a provided fact
  assertEquals(practice[1].themeId, ''); // unknown theme id is dropped, question kept
  assertEquals(practice[0].answer, '');
  assertEquals(practice[0].feedback, null);
  assertEquals(session.status, 'prepared');
  assertEquals((session.readiness as { themesTotal: number; themesCovered: number; practiceTotal: number }).themesTotal, 2);
  assertEquals((session.readiness as { themesCovered: number }).themesCovered, 0);
  assertStringIncludes(t.calls.prompts[0], '<job_description>');
  assertStringIncludes(t.calls.prompts[0], 'IGNORE PREVIOUS INSTRUCTIONS');
  assert(t.db.rows('career_events').some((e) => e.event_name === 'interview_preparation_started'));

  // second run: the same 9 unique questions → only the one the cap excluded is appended, still one charge per call
  const again = await t.call({ sessionId: t.session.id, mode: 'questions' });
  assertEquals(again.json.added, 1);
  assertEquals(((again.json.session as Record<string, unknown>).practice as unknown[]).length, 9);
  const third = await t.call({ sessionId: t.session.id, mode: 'questions' });
  assertEquals(third.json.added, 0);
  assertEquals(t.calls.meter, ['aiActions', 'aiActions', 'aiActions']);
});

Deno.test('questions: fact ids that ARE provided survive; a provider outage refunds the action', async () => {
  const t = setup(() => Promise.resolve({ questions: [{ question: 'Walk me through the 40% latency cut.', themeId: 'theme:r1', factIds: [] }] }));
  const scripted = t;
  const withFact = setup((p) => {
    const id = /"id":"([0-9a-f-]{36})","kind":"achievement"/.exec(p)?.[1];
    return Promise.resolve({ questions: [{ question: 'Walk me through the latency cut.', themeId: 'theme:r1', factIds: [id] }] });
  });
  const r = await withFact.call({ sessionId: withFact.session.id, mode: 'questions' });
  const practice = (r.json.session as Record<string, unknown>).practice as Array<Record<string, unknown>>;
  assertEquals(practice[0].factIds, [withFact.fixtures.fact1.id]);
  assertEquals(scripted.calls.meter, []);

  const down = setup(() => Promise.reject(new LlmAllProvidersFailedError(new ProviderError('deepseek', 'timeout'), new ProviderError('kimi', 'transient', 502))));
  const d = await down.call({ sessionId: down.session.id, mode: 'questions' });
  assertEquals(d.status, 503);
  assertEquals(d.json.error, 'llm_unavailable');
  assertEquals(down.calls.meter, ['aiActions']);
  assertEquals(down.calls.release, ['aiActions']);
  assertEquals((down.db.get('interview_sessions', down.session.id as string)!.practice as unknown[]).length, 0);
});

Deno.test('feedback: abstains without metering on a short answer or when no facts exist; persists the abstention', async () => {
  const t = setup(() => Promise.resolve({ strengths: ['x'], gaps: [], citations: [] }));
  const s = t.db.get('interview_sessions', t.session.id as string)!;
  s.practice = [{ id: 'q:1', question: 'Q1?', themeId: 'theme:r1', factIds: [], answer: '', feedback: null, answeredAt: null }];
  const unanswered = await t.call({ sessionId: t.session.id, mode: 'feedback', practiceItemId: 'q:1' });
  assertEquals(unanswered.status, 400);
  assertEquals((unanswered.json as { reason?: string }).reason, 'answer_required');

  t.setAnswer('q:1', 'I used Kafka.');
  const short = await t.call({ sessionId: t.session.id, mode: 'feedback', practiceItemId: 'q:1' });
  assertEquals(short.status, 200);
  assertEquals(short.json.feedback, { strengths: [], gaps: [], citations: [], abstained: true, reason: 'answer_too_short' });
  assertEquals(short.json.charged, false);
  assertEquals(t.calls.meter, []);
  assertEquals(t.calls.prompts, []);
  const stored = (t.db.get('interview_sessions', t.session.id as string)!.practice as Array<{ feedback: { abstained: boolean } }>)[0].feedback;
  assertEquals(stored.abstained, true);

  const noFacts = setup(() => Promise.resolve({ strengths: ['x'], gaps: [], citations: [] }));
  for (const f of noFacts.db.rows('career_facts')) f.status = 'deleted';
  const ns = noFacts.db.get('interview_sessions', noFacts.session.id as string)!;
  ns.practice = [{ id: 'q:2', question: 'Q2?', themeId: 'theme:r1', factIds: [], answer: 'A long enough answer about Kafka tuning work.', feedback: null, answeredAt: null }];
  const nf = await noFacts.call({ sessionId: noFacts.session.id, mode: 'feedback', practiceItemId: 'q:2' });
  assertEquals((nf.json.feedback as { reason: string }).reason, 'no_facts');
  assertEquals(noFacts.calls.meter, []);

  const missing = await t.call({ sessionId: t.session.id, mode: 'feedback', practiceItemId: 'q:404' });
  assertEquals(missing.status, 404);
  const noItem = await t.call({ sessionId: t.session.id, mode: 'feedback' });
  assertEquals(noItem.status, 400);
});

Deno.test('feedback: metered once, citations filtered to provided facts, readiness marks the theme covered, no scoring fields', async () => {
  const t = setup((p) => {
    const id = /"id":"([0-9a-f-]{36})","kind":"achievement"/.exec(p)?.[1];
    return Promise.resolve({
      strengths: ['Names a concrete latency result (fact)', '', 'a', 'b', 'c', 'd'],
      gaps: ['Does not say what you personally changed'],
      citations: [id, 'not-a-fact', id],
      confidence: 0.9, tone: 'nervous', personality: 'introvert',
    });
  });
  const s = t.db.get('interview_sessions', t.session.id as string)!;
  s.practice = [{ id: 'q:1', question: 'Q1?', themeId: 'theme:r1', factIds: [], answer: 'We rebuilt the Kafka ingestion path and p95 latency dropped from 12s to 7s.', feedback: null, answeredAt: null }];
  const r = await t.call({ sessionId: t.session.id, mode: 'feedback', practiceItemId: 'q:1' });
  assertEquals(r.status, 200);
  assertEquals(t.calls.meter, ['aiActions']);
  assertEquals(t.calls.release, []);
  const feedback = r.json.feedback as Record<string, unknown>;
  assertEquals(Object.keys(feedback).sort(), ['abstained', 'citations', 'gaps', 'strengths']);
  assertEquals(feedback.citations, [t.fixtures.fact1.id]);
  assertEquals((feedback.strengths as string[]).length, 4);
  assertStringIncludes(t.calls.prompts[0], '<candidate_answers>');
  const readiness = (r.json.session as Record<string, unknown>).readiness as { themesCovered: number; remainingThemes: string[]; practiceWithFeedback: number };
  assertEquals(readiness.themesCovered, 1);
  assertEquals(readiness.remainingThemes, ['theme:r2']);
  assertEquals(readiness.practiceWithFeedback, 1);
  assert(t.db.rows('career_events').some((e) => e.event_name === 'interview_practice_completed'));
  // bad output after charging is refunded
  const bad = setup(() => Promise.resolve({ nope: true }));
  const bs = bad.db.get('interview_sessions', bad.session.id as string)!;
  bs.practice = [{ id: 'q:1', question: 'Q?', themeId: 'theme:r1', factIds: [], answer: 'A sufficiently long practice answer here.', feedback: null, answeredAt: null }];
  const b = await bad.call({ sessionId: bad.session.id, mode: 'feedback', practiceItemId: 'q:1' });
  assertEquals(b.status, 502);
  assertEquals(bad.calls.release, ['aiActions']);
});

Deno.test('ownership and quota: foreign session is not_found; a quota failure is 402 before any model call', async () => {
  const t = setup(() => Promise.resolve({ questions: [] }));
  const foreign = t.db.seed('interview_sessions', { user_id: USER_B, application_id: crypto.randomUUID(), themes: [], story_fact_ids: [], practice: [], readiness: {}, status: 'planned', interview_type: 'unknown' });
  const r = await t.call({ sessionId: foreign.id, mode: 'questions' });
  assertEquals(r.status, 404);
  assertEquals(t.calls.meter, []);
  const capped = setup(() => Promise.resolve({ questions: [] }), { checkAndMeter: () => Promise.reject(new HttpError(402, 'limit_reached', { kind: 'aiActions' })) });
  const c = await capped.call({ sessionId: capped.session.id, mode: 'questions' });
  assertEquals(c.status, 402);
  assertEquals(capped.calls.prompts, []);
  assertEquals(capped.calls.release, []);
});

Deno.test('computeReadiness is a checklist over themes and practice, never a score', () => {
  const themes = [{ id: 'a', theme: 'A' }, { id: 'b', theme: 'B' }];
  const practice = [
    { id: '1', question: 'q', themeId: 'a', factIds: [], answer: 'x', feedback: { strengths: [], gaps: [], citations: [], abstained: false }, answeredAt: null },
    { id: '2', question: 'q', themeId: 'b', factIds: [], answer: 'x', feedback: { strengths: [], gaps: [], citations: [], abstained: true }, answeredAt: null },
    { id: '3', question: 'q', themeId: 'b', factIds: [], answer: '', feedback: null, answeredAt: null },
  ];
  assertEquals(computeReadiness(themes, practice, 't'), {
    themesTotal: 2, themesCovered: 1, remainingThemes: ['b'], practiceTotal: 3, practiceAnswered: 2, practiceWithFeedback: 1, computedAt: 't',
  });
});
