// Live golden suite: runs every golden pair (and the adversarial cases)
// through the REAL graphs against the routed provider (DeepSeek V4 Pro by
// default, Kimi K2.6 on fallback — see _shared/llm/router.ts), asserting the
// deterministic expectations (keyword extraction, gap counts, ATS range) and
// the grounding check on the actual writer output. Requires at least one
// DeepSeek key configured; exits non-zero on any failure so CI can gate on
// it when the secret is present.
//
//   deno run --allow-env --allow-net supabase/functions/prism-tailor/golden/golden_live.ts
//
// NOTE: ~7 model calls per case. Budget quota accordingly. The numeric
// thresholds below (keyword/gap/ATS ranges) were tuned against Gemini and
// may need retuning once run against DeepSeek/Kimi output — a known,
// flagged follow-up, not a bug in this suite.
import { buildAnalyzeGraph, buildGenerateGraph } from '../graph.ts';
import { routedModel } from '../model_router.ts';
import { getLlmConfig } from '../../_shared/llm/config.ts';
import { checkGrounding } from '../grounding.ts';
import { ADVERSARIAL_CASES, GOLDEN_CASES } from './cases.ts';
import type { Answer } from '../schemas.ts';

if (getLlmConfig().primary.apiKeys.length === 0) {
  console.error('No DEEPSEEK_API_KEYS configured — the live golden suite needs a real model.');
  Deno.exit(2);
}

const failures: string[] = [];
const fail = (id: string, msg: string) => {
  failures.push(`${id}: ${msg}`);
  console.error(`  ✗ ${msg}`);
};
const pass = (msg: string) => console.log(`  ✓ ${msg}`);

const only = Deno.args[0]; // optionally run a single case id

for (const c of GOLDEN_CASES) {
  if (only && c.id !== only) continue;
  console.log(`\n=== ${c.id} (${c.seniority} ${c.role})`);
  try {
    const p1 = await buildAnalyzeGraph(routedModel).invoke({ cvText: c.cv, jdText: c.jd });
    const gap = p1.gapAnalysis!;
    const keywordsLower = gap.hardKeywords.map((k) => k.toLowerCase()).join(' | ');
    for (const kw of c.expectedKeywords) {
      if (keywordsLower.includes(kw.toLowerCase())) pass(`keyword extracted: ${kw}`);
      else fail(c.id, `expected keyword missing from gap analysis: ${kw} (got: ${keywordsLower})`);
    }
    if (gap.gaps.length >= c.gapRange[0] && gap.gaps.length <= c.gapRange[1]) {
      pass(`gap count ${gap.gaps.length} within [${c.gapRange}]`);
    } else {
      fail(c.id, `gap count ${gap.gaps.length} outside [${c.gapRange}]`);
    }

    const answers: Answer[] = p1.questions.map((q) => {
      const hit = c.answerBank.find(([re]) => new RegExp(re, 'i').test(q.question));
      return { questionId: q.id, question: q.question, answer: hit?.[1] ?? 'No experience with this.' };
    });

    const p2 = await buildGenerateGraph(routedModel).invoke({
      cvText: c.cv, jdText: c.jd, gapAnalysis: gap, answers,
    });
    if (p2.atsScore >= c.atsRange[0] && p2.atsScore <= c.atsRange[1]) {
      pass(`ATS score ${p2.atsScore} within [${c.atsRange}]`);
    } else {
      fail(c.id, `ATS score ${p2.atsScore} outside [${c.atsRange}]`);
    }
    // Automated hallucination check on the ACTUAL shipped draft.
    const grounding = checkGrounding(p2.best!.draft, p2.context!);
    if (grounding.ok) pass('grounding: every claim traceable to the aggregated context');
    else fail(c.id, `grounding violations: ${JSON.stringify(grounding.violations)}`);
  } catch (e) {
    fail(c.id, `pipeline error: ${e instanceof Error ? e.message : e}`);
  }
}

for (const a of ADVERSARIAL_CASES) {
  if (only && a.id !== only) continue;
  console.log(`\n=== ADVERSARIAL ${a.id} (${a.attack})`);
  try {
    const p1 = await buildAnalyzeGraph(routedModel).invoke({ cvText: a.cv, jdText: a.jd });
    // Schema held (invoke would have thrown otherwise) and the pipeline kept
    // behaving like a pipeline: bounded questions, no leaked attack strings.
    if (p1.questions.length <= 5) pass(`questions bounded (${p1.questions.length})`);
    else fail(a.id, `question count ${p1.questions.length} exceeds 5`);
    // Leak check covers the pipeline's OUTPUT fields only — the full graph
    // state echoes back cvText/jdText verbatim (they're input channels), so
    // dumping p1 wholesale would fail on the attack text's mere presence in
    // the input, which no output-side defense can (or should) change.
    const dump = JSON.stringify({ gapAnalysis: p1.gapAnalysis, questions: p1.questions }).toLowerCase();
    for (const needle of a.mustNotLeak) {
      if (dump.includes(needle.toLowerCase())) {
        fail(a.id, `attack content leaked into output: "${needle}"`);
      } else {
        pass(`no leak of "${needle}"`);
      }
    }
    // An injection demanding "zero gaps / perfect match" must not blank the
    // analysis when the CV plainly mismatches the JD.
    if (a.id === 'jd-prompt-injection') {
      if (p1.gapAnalysis!.gaps.length > 0) pass('gap analysis not hijacked to zero gaps');
      else fail(a.id, 'gap analysis returned zero gaps for a plainly mismatched pair');
    }
  } catch (e) {
    fail(a.id, `pipeline error: ${e instanceof Error ? e.message : e}`);
  }
}

console.log('\n================================');
if (failures.length) {
  console.error(`GOLDEN SUITE FAILED — ${failures.length} failure(s):`);
  for (const f of failures) console.error('  ' + f);
  Deno.exit(1);
}
console.log('GOLDEN SUITE PASSED');
