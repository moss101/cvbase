import { assert, assertEquals, assertRejects } from 'jsr:@std/assert';
import { z } from 'npm:zod@3.24.1';
import { HttpError } from '../_shared/respond.ts';
import { runAgent, type ModelFn } from './model.ts';
import { WizardQuestionsSchema } from './schemas.ts';
import { QUESTIONS } from './fixtures_test.ts';

const Shape = z.object({ name: z.string(), score: z.number() });

function sequence(responses: unknown[]): ModelFn & { prompts: string[] } {
  const queue = [...responses];
  const prompts: string[] = [];
  const impl = (prompt: string) => {
    prompts.push(prompt);
    return Promise.resolve({ value: queue.shift(), tokens: 100 });
  };
  return Object.assign(impl as ModelFn, { prompts });
}

Deno.test('runAgent: valid structured output passes through untouched, with token count', async () => {
  const model = sequence([{ name: 'ok', score: 9 }]);
  const out = await runAgent(model, 'test', 'prompt', Shape);
  assertEquals(out.data, { name: 'ok', score: 9 });
  assertEquals(out.tokens, 100);
  assertEquals(model.prompts.length, 1);
});

Deno.test('runAgent: invalid output triggers ONE repair re-prompt carrying the validation errors', async () => {
  const model = sequence([{ name: 'bad', score: 'NaN' }, { name: 'fixed', score: 5 }]);
  const out = await runAgent(model, 'test', 'prompt', Shape);
  assertEquals(out.data.name, 'fixed');
  assertEquals(out.tokens, 200, 'repair pass tokens are counted too');
  assertEquals(model.prompts.length, 2);
  assert(model.prompts[1].includes('failed schema validation'));
  assert(model.prompts[1].includes('score'));
});

Deno.test('runAgent: still-invalid output fails loud with 502 bad_ai_output, never passes through', async () => {
  const model = sequence([{ nope: 1 }, 'not even an object']);
  const err = await assertRejects(() => runAgent(model, 'writer', 'prompt', Shape), HttpError);
  assertEquals((err as HttpError).status, 502);
  assertEquals((err as HttpError).code, 'bad_ai_output');
  assertEquals(model.prompts.length, 2);
});

Deno.test('runAgent: enforces question-count bounds (3-5) via the zod schema', async () => {
  const twoQuestions = { questions: QUESTIONS.questions.slice(0, 2) };
  const model = sequence([twoQuestions, QUESTIONS]);
  const out = await runAgent(model, 'wizard_creator', 'prompt', WizardQuestionsSchema);
  assertEquals(out.data.questions.length, 3);
  assertEquals(model.prompts.length, 2);
});
