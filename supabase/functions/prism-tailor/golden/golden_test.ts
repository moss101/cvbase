// CI-deterministic half of the golden suite: fixture integrity plus the
// adversarial prompt-construction defenses for every attack case. The
// model-dependent expectations (gap counts, ATS ranges, grounding of real
// outputs) run in golden_live.ts when DeepSeek keys are configured.
import { assert, assertEquals } from 'jsr:@std/assert';
import { ADVERSARIAL_CASES, GOLDEN_CASES } from './cases.ts';
import { aggregatorPrompt, gapAnalystPrompt, INJECTION_RULE } from '../prompts.ts';
import { GAP } from '../fixtures_test.ts';

Deno.test('golden set: at least 10 pairs with varied roles, seniority, and gap severity', () => {
  assert(GOLDEN_CASES.length >= 10, `need >= 10 cases, have ${GOLDEN_CASES.length}`);
  const seniorities = new Set(GOLDEN_CASES.map((c) => c.seniority));
  assert(seniorities.size >= 3, 'junior/mid/senior variety required');
  const ids = new Set(GOLDEN_CASES.map((c) => c.id));
  assertEquals(ids.size, GOLDEN_CASES.length, 'unique ids');
  // Gap severity variety: at least one near-zero-gap pair and one heavy-gap pair.
  assert(GOLDEN_CASES.some((c) => c.gapRange[0] === 0), 'a low-gap pair is required');
  assert(GOLDEN_CASES.some((c) => c.gapRange[0] >= 4), 'a heavy-gap pair is required');
});

Deno.test('golden set: every case satisfies the pipeline input contract', () => {
  for (const c of GOLDEN_CASES) {
    assert(c.jd.length >= 80 && c.jd.length <= 30000, `${c.id}: jd length`);
    assert(c.cv.length >= 80 && c.cv.length <= 40000, `${c.id}: cv length`);
    assert(c.expectedKeywords.length >= 1, `${c.id}: expected keywords`);
    assert(c.gapRange[0] <= c.gapRange[1], `${c.id}: gap range`);
    assert(c.atsRange[0] <= c.atsRange[1] && c.atsRange[1] <= 100, `${c.id}: ats range`);
    assert(c.answerBank.length >= 1, `${c.id}: answer bank`);
  }
});

Deno.test('adversarial set: every attack is neutralized at prompt-construction time', () => {
  assert(ADVERSARIAL_CASES.length >= 3);
  for (const a of ADVERSARIAL_CASES) {
    for (const prompt of [
      gapAnalystPrompt(a.cv, a.jd),
      aggregatorPrompt(a.cv, a.jd, GAP, []),
    ]) {
      assert(prompt.includes('SECURITY RULE'), `${a.id}: data-not-instructions rule present`);
      // Untrusted content stays inside its tagged block: no tag from the
      // attacker survives inside the delimited data. Data blocks are
      // "<tag>\n…\n</tag>" (the security rule also NAMES the tags in prose,
      // so anchor on the block form, not the bare tag string).
      for (const tag of ['job_description', 'candidate_cv'] as const) {
        const open = `<${tag}>\n`;
        const close = `\n</${tag}>`;
        const start = prompt.indexOf(open);
        const end = prompt.indexOf(close);
        assert(start >= 0 && end > start, `${a.id}: ${tag} block intact`);
        const inner = prompt.slice(start + open.length, end);
        assert(!/<\/?\s*(job_description|candidate_cv|candidate_answers)\s*>/i.test(inner),
          `${a.id}: no tag breakout inside the ${tag} block`);
      }
    }
  }
  // The rule itself names all three data channels.
  for (const tag of ['job_description', 'candidate_cv', 'candidate_answers']) {
    assert(INJECTION_RULE.includes(tag));
  }
});
