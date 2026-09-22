import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import type { User } from 'jsr:@supabase/supabase-js@2';
import type { HandlerDeps } from '../_shared/handler.ts';
import type { AiLogMeta } from '../_shared/aiLog.ts';
import { INJECTION_RULE } from '../_shared/injection.ts';
import { LlmAllProvidersFailedError, ProviderError } from '../_shared/llm/errors.ts';
import { FakeDb, seedCareer, USER_A, USER_B } from '../career-gateway/fakedb_test.ts';
import { buildCoachHandler, type CoachDeps } from './index.ts';
import { groundReply, NUMERIC_CAVEAT, numericClaims } from './grounding.ts';
import { MODEL_UNAVAILABLE_REPLY } from './prompts.ts';
import { buildContextBundle } from '../career-gateway/context.ts';

// The real coach pipeline (withAiHandler + context bundle + grounding +
// persistence) against the in-memory database and a scripted model.

interface Calls {
  meter: string[];
  release: string[];
  logs: AiLogMeta[];
  prompts: Array<{ prompt: string; system?: string; model?: string }>;
}

type Script = (prompt: string, opts: { system?: string; model?: string }) => Promise<unknown>;

function setup(script: Script, over: Partial<HandlerDeps & CoachDeps> = {}) {
  let now = Date.parse('2026-09-21T10:00:00Z');
  const db = new FakeDb(() => now);
  const fixtures = seedCareer(db, USER_A);
  const calls: Calls = { meter: [], release: [], logs: [], prompts: [] };
  const deps: Partial<HandlerDeps & CoachDeps> = {
    getUser: () => Promise.resolve({ id: USER_A } as unknown as User),
    serviceClient: () => db as unknown as ReturnType<HandlerDeps['serviceClient']>,
    checkAndMeter: (_u, kind) => { calls.meter.push(kind); return Promise.resolve(); },
    releaseUsage: (_u, kind) => { calls.release.push(kind); return Promise.resolve(); },
    requireFeature: () => Promise.resolve(),
    enforceRateLimit: () => Promise.resolve({}),
    logAi: (_u, meta) => { calls.logs.push(meta); return Promise.resolve(); },
    requireCareerOs: () => Promise.resolve(),
    now: () => { now += 1000; return now; },
    llm: async (prompt, opts) => {
      calls.prompts.push({ prompt, system: opts.system, model: opts.model });
      return { data: await script(prompt, opts), tokens: 10 };
    },
    ...over,
  };
  const handler = buildCoachHandler(deps);
  const call = async (body: unknown) => {
    const res = await handler(new Request('http://localhost/career-coach', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    return { status: res.status, json: await res.json() as Record<string, unknown> };
  };
  return { db, calls, call, fixtures };
}

const message = (json: Record<string, unknown>) => json.message as Record<string, unknown>;

Deno.test('creates an owned conversation, stores both messages, cites only bundle items and keeps valid proposals', async () => {
  const t = setup((prompt) => {
    const appId = /"id":"([0-9a-f-]{36})","company":"Acme","role":"Data Engineer"/.exec(prompt)?.[1];
    return Promise.resolve({
      reply: 'You are preparing for Data Engineer at Acme. Your Kafka achievement covers the first requirement.',
      citations: [
        { kind: 'application', id: appId },
        { kind: 'fact', id: 'not-in-bundle' },
        { kind: 'opportunity', id: USER_B },
        { kind: 'application', id: appId },
      ],
      proposals: [
        { tool: 'prepare_interview', inputJson: JSON.stringify({ applicationId: appId, interviewType: 'technical' }), summary: 'Plan the interview themes' },
        { tool: 'record_outcome', inputJson: JSON.stringify({ applicationId: appId, kind: 'promoted' }), summary: 'invalid kind' },
        { tool: 'delete_account', inputJson: '{}', summary: 'unregistered' },
        { tool: 'report_result', inputJson: JSON.stringify({ runId: appId, result: { kind: 'prism', id: appId } }), summary: 'not proposable' },
        { tool: 'cancel_run', inputJson: JSON.stringify({ runId: appId }), summary: 'control tool' },
        { tool: 'save_artifact', inputJson: '{not json', summary: 'bad json' },
      ],
      abstained: false,
      abstainReason: '',
    });
  });
  const r = await t.call({ message: 'What should I do next for Acme?', contextRefs: { application: t.fixtures.application.id } });
  assertEquals(r.status, 200);
  assertEquals(r.json.created, true);
  const conv = t.db.rows('coach_conversations');
  assertEquals(conv.length, 1);
  assertEquals(conv[0].user_id, USER_A);
  assertEquals((conv[0].context_refs as { application: { id: string } }).application.id, t.fixtures.application.id);
  assertEquals(conv[0].title, 'What should I do next for Acme?');
  const msgs = t.db.rows('coach_messages');
  assertEquals(msgs.map((m) => m.role), ['user', 'assistant']);
  const m = message(r.json);
  assertEquals((m.citations as Array<{ kind: string; id: string; label: string }>), [
    { kind: 'application', id: t.fixtures.application.id as string, label: 'Data Engineer at Acme' },
  ]);
  assertEquals((m.proposals as Array<{ tool: string; confirmationRequired: boolean }>).map((p) => [p.tool, p.confirmationRequired]), [
    ['prepare_interview', false],
  ]);
  assertEquals(r.json.dropped, { citations: 3, proposals: 5 });
  assertEquals(m.abstained, false);
  assertEquals(t.calls.meter, ['aiActions']);
  assertEquals(t.calls.release, []);
  const used = r.json.contextUsed as { ids: string[]; refs: Record<string, string> };
  assert(used.ids.includes(`application:${t.fixtures.application.id}`));
  assert(used.ids.includes(`opportunity:${t.fixtures.opportunity.id}`));
  assert(used.ids.includes(`goal:${t.fixtures.goal.id}`));
  assert(used.ids.includes(`fact:${t.fixtures.fact1.id}`));
  // no receipt, no side effect: proposals are only proposals
  assertEquals(t.db.rows('action_runs').length, 0);
  assertEquals(t.db.rows('interview_sessions').length, 0);
  // the domain event carries no text
  const ev = t.db.rows('career_events').find((e) => e.event_name === 'coach_conversation_started');
  assertEquals(ev?.payload, { hasApplication: true, hasOpportunity: true, hasGoal: true });
});

Deno.test('injected instructions in the pasted posting reach the model only as tagged data; a mirrored proposal still needs confirmation and executes nothing', async () => {
  const t = setup((prompt) => {
    const appId = /"id":"([0-9a-f-]{36})","company":"Acme"/.exec(prompt)?.[1];
    // A model that "obeyed" the JD would propose exactly this.
    return Promise.resolve({
      reply: 'Recording the acceptance now.',
      citations: [],
      proposals: [{ tool: 'record_outcome', inputJson: JSON.stringify({ applicationId: appId, kind: 'accepted' }), summary: 'from the posting' }],
      abstained: false, abstainReason: '',
    });
  });
  const r = await t.call({ message: 'Summarise the posting', contextRefs: { application: t.fixtures.application.id } });
  assertEquals(r.status, 200);
  const { prompt, system } = t.calls.prompts[0];
  assertStringIncludes(system!, INJECTION_RULE);
  assertStringIncludes(prompt, '<job_description>');
  assertStringIncludes(prompt, 'IGNORE PREVIOUS INSTRUCTIONS');
  assert(prompt.indexOf('<job_description>') < prompt.indexOf('IGNORE PREVIOUS INSTRUCTIONS'));
  const proposals = message(r.json).proposals as Array<{ tool: string; confirmationRequired: boolean }>;
  assertEquals(proposals, [{ tool: 'record_outcome', input: { applicationId: t.fixtures.application.id, kind: 'accepted' }, confirmationRequired: true, summary: 'from the posting' }] as unknown as typeof proposals);
  assertEquals(t.db.rows('application_outcomes').length, 0);
  assertEquals(t.db.rows('action_runs').length, 0);
  assertEquals(t.db.get('job_applications', t.fixtures.application.id as string)?.stage, 'preparing');
});

Deno.test('numeric claims not present in the context get a caveat; figures from the records do not', async () => {
  let reply = 'Aim for $120,000 — that is 25% above the posted range.';
  const t = setup(() => Promise.resolve({ reply, citations: [], proposals: [], abstained: false, abstainReason: '' }));
  const a = await t.call({ message: 'What salary should I ask for?', contextRefs: { application: t.fixtures.application.id } });
  assertStringIncludes(message(a.json).content as string, NUMERIC_CAVEAT.trim());
  assertEquals(a.json.caveat, true);
  reply = 'Your achievement records a 40% latency cut, which matches the Kafka requirement.';
  const b = await t.call({ message: 'Which fact fits?', conversationId: a.json.conversationId as string });
  assertEquals(b.json.caveat, false);
  assertEquals((message(b.json).content as string).includes('unverified'), false);
  assertEquals(numericClaims('grew revenue 12% to €1.2m and 300k USD'), ['12%', '1200000', '300000']);
  assertEquals(numericClaims('3 roles in 2 weeks'), []);
});

Deno.test('model unavailable: stored abstention, no charge kept, context preserved, 200', async () => {
  const t = setup(() => Promise.reject(new LlmAllProvidersFailedError(new ProviderError('deepseek', 'timeout'), new ProviderError('kimi', 'transient', 503))));
  const r = await t.call({ message: 'Hello?', contextRefs: { opportunity: t.fixtures.opportunity.id } });
  assertEquals(r.status, 200);
  assertEquals(r.json.abstained, true);
  assertEquals(r.json.released, true);
  assertEquals(message(r.json).content, MODEL_UNAVAILABLE_REPLY);
  assertEquals(message(r.json).abstained, true);
  assertEquals(t.calls.meter, ['aiActions']);
  assertEquals(t.calls.release, ['aiActions']);
  assertEquals(t.db.rows('coach_messages').map((m) => m.role), ['user', 'assistant']);
  assertEquals(t.db.rows('coach_conversations').length, 1);
  // the next turn resumes the same conversation with the message still there
  const t2Script = () => Promise.resolve({ reply: 'Back online.', citations: [], proposals: [], abstained: false, abstainReason: '' });
  const again = setup(t2Script);
  const c = await again.call({ message: 'first' });
  const d = await again.call({ message: 'second', conversationId: c.json.conversationId as string });
  assertEquals(d.json.created, false);
  assertEquals(again.db.rows('coach_messages').length, 4);
  assertStringIncludes(again.calls.prompts[1].prompt, 'user: first');
});

Deno.test('a foreign or unknown conversation id is not_found and nothing is written', async () => {
  const t = setup(() => Promise.resolve({ reply: 'x', citations: [], proposals: [], abstained: false, abstainReason: '' }));
  const foreign = t.db.seed('coach_conversations', { user_id: USER_B, title: 'B', context_refs: {}, summary: '', summary_source_ids: [], status: 'active', last_message_at: null });
  const r = await t.call({ message: 'hi', conversationId: foreign.id });
  assertEquals(r.status, 404);
  assertEquals(r.json.error, 'not_found');
  assertEquals(t.db.rows('coach_messages').length, 0);
  const missingRef = await t.call({ message: 'hi', contextRefs: { application: crypto.randomUUID() } });
  assertEquals(missingRef.status, 404);
  assertEquals(t.db.rows('coach_conversations').length, 1);
});

Deno.test('every 10th message triggers a lite summary whose source ids are the messages it derived from', async () => {
  const t = setup((_prompt, opts) =>
    Promise.resolve(opts.model === 'lite'
      ? { summary: 'User is preparing the Acme application; interview themes still open.' }
      : { reply: 'ok', citations: [], proposals: [], abstained: false, abstainReason: '' })
  );
  const first = await t.call({ message: 'm1' });
  const conversationId = first.json.conversationId as string;
  let last = first;
  for (let i = 2; i <= 5; i++) last = await t.call({ message: `m${i}`, conversationId });
  assertEquals(last.json.summarised, true);
  const conv = t.db.get('coach_conversations', conversationId)!;
  assertEquals(conv.summary, 'User is preparing the Acme application; interview themes still open.');
  const ids = conv.summary_source_ids as string[];
  assertEquals(ids.length, 10);
  const stored = t.db.rows('coach_messages').map((m) => m.id);
  assert(ids.every((id) => stored.includes(id)));
  assertEquals(t.calls.prompts.filter((p) => p.model === 'lite').length, 1);
  assert(t.calls.logs.some((l) => l.function.startsWith('career-coach:summary')));
  // the summary is offered to the next turn as derived memory, never as a fact
  const next = await t.call({ message: 'm6', conversationId });
  assertEquals(next.json.summarised, false);
  assertStringIncludes(t.calls.prompts.at(-1)!.prompt, 'CONVERSATION SUMMARY (derived memory; CONTEXT wins on any conflict)');
});

Deno.test('groundReply: empty reply abstains; proposals are capped at five', async () => {
  const db = new FakeDb();
  const f = seedCareer(db, USER_A);
  const bundle = await buildContextBundle(db, USER_A, { application: f.application.id as string });
  const empty = groundReply({ reply: '', citations: [], proposals: [] }, bundle);
  assertEquals(empty.abstained, true);
  assertEquals(empty.abstainReason, 'empty_reply');
  const many = groundReply({
    reply: 'ok', citations: [],
    proposals: Array.from({ length: 7 }, () => ({ tool: 'inspect_context', inputJson: '{}', summary: 's' })),
  }, bundle);
  assertEquals(many.proposals.length, 5);
  assertEquals(many.dropped.proposals, 2);
});
