import { assert, assertEquals } from 'jsr:@std/assert';
import { checkGrounding } from './grounding.ts';
import { buildGenerateGraph } from './graph.ts';
import { ANSWERS, CONTEXT, CRIT_PASS, DRAFT1, GAP, scriptedModel } from './fixtures_test.ts';

const CV_TEXT = 'Avery Chen — Data Platform Engineer at Streamline GmbH since 2022.';
const JD_TEXT = 'Senior Data Platform Engineer: Kafka, Kubernetes, Terraform.';

Deno.test('grounding: a faithful draft has zero violations', () => {
  const { ok, violations } = checkGrounding(DRAFT1, CONTEXT);
  assertEquals(violations, []);
  assert(ok);
});

Deno.test('grounding: catches an invented metric, employer, title, and skill', () => {
  const tainted = {
    ...DRAFT1,
    professionalSummary: 'Engineer who saved $2M in annual infrastructure spend.',
    experience: [
      {
        ...DRAFT1.experience[0],
        jobTitle: 'Head of Platform Engineering', // context says Data Platform Engineer
        bullets: ['Scaled Kafka to 900k events/sec across 12 regions'], // context says 50k, no regions
      },
      { ...DRAFT1.experience[0], company: 'Google' }, // never worked there
    ],
    skills: [...DRAFT1.skills, 'Rust'], // not in context
  };
  const { ok, violations } = checkGrounding(tainted, CONTEXT);
  assert(!ok);
  const kinds = violations.map((v) => v.kind);
  assert(kinds.includes('number'), 'invented $2M / 900k / 12 must be caught');
  assert(kinds.includes('title'), 'inflated title must be caught');
  assert(kinds.includes('company'), 'invented employer must be caught');
  assert(kinds.includes('skill'), 'unsourced skill must be caught');
});

Deno.test('grounding: value comparison bridges formatting ("2k" vs "2,000 per second")', () => {
  const ctx = {
    ...CONTEXT,
    workHistory: [{
      ...CONTEXT.workHistory[0],
      facts: ['Ran a Kafka cluster for webhook events at about 2k messages/sec'],
    }],
  };
  const draft = {
    ...DRAFT1,
    experience: [{
      ...DRAFT1.experience[0],
      bullets: ['Operated a Kafka cluster processing 2,000 messages per second'],
    }],
  };
  const { ok } = checkGrounding(draft, ctx);
  assert(ok, '2,000 must trace to "2k"');
});

Deno.test('grounding: a unit glued to a number in the source still licenses the spaced form ("200GB/day" vs "200 GB per day")', () => {
  const ctx = {
    ...CONTEXT,
    workHistory: [{
      ...CONTEXT.workHistory[0],
      facts: ['Python ETL 200GB/day into Redshift'],
    }],
  };
  const draft = {
    ...DRAFT1,
    experience: [{
      ...DRAFT1.experience[0],
      bullets: ['Built Python ETL pipelines processing 200 GB per day into Redshift'],
    }],
  };
  const { ok, violations } = checkGrounding(draft, ctx);
  assertEquals(violations, []);
  assert(ok, '200 must trace to "200GB/day"');
});

Deno.test('grounding: the years suggestedFix attaches only to the years-adjacent number, not other figures on the line', () => {
  const tainted = {
    ...DRAFT1,
    // 99 is years-adjacent (fabricated); 777 is a fabricated non-years figure on the same line.
    professionalSummary: 'Engineer with 99 years of experience processing 777 GB daily.',
  };
  const { violations } = checkGrounding(tainted, CONTEXT);
  const years = violations.find((v) => v.claim === '99');
  const gb = violations.find((v) => v.claim === '777');
  assert(years?.suggestedFix?.includes(String(CONTEXT.totalYearsExperience)), '99 gets the years fix');
  assertEquals(gb?.suggestedFix, undefined, '777 must not get a years suggestion');
});

Deno.test('grounding: a wrong years-of-experience claim gets a suggestedFix naming the correct figure', () => {
  const tainted = {
    ...DRAFT1,
    professionalSummary: `Data platform engineer with ${CONTEXT.totalYearsExperience + 10} years of experience.`,
  };
  const { violations } = checkGrounding(tainted, CONTEXT);
  const yearsViolation = violations.find((v) => v.kind === 'number' && v.where.startsWith('summary'));
  assert(yearsViolation, 'the fabricated years figure must be flagged');
  assert(yearsViolation!.suggestedFix?.includes(String(CONTEXT.totalYearsExperience)), 'fix must name the correct figure');
});

Deno.test('grounding: a non-years number violation gets the generic fix, not a fabricated suggestion', () => {
  const tainted = {
    ...DRAFT1,
    professionalSummary: 'Engineer who saved $2M in annual infrastructure spend.',
  };
  const { violations } = checkGrounding(tainted, CONTEXT);
  const violation = violations.find((v) => v.kind === 'number');
  assert(violation, 'the fabricated $2M must be flagged');
  assertEquals(violation!.suggestedFix, undefined);
});

Deno.test('grounding: skill claims tolerate simple word-form variation (analyses vs analysis, model vs modeling)', () => {
  const ctx = {
    ...CONTEXT,
    workHistory: [{
      ...CONTEXT.workHistory[0],
      facts: ['Ran cohort analyses in pandas', 'Built a churn model as a side project'],
    }],
  };
  // experience: [] isolates the skill check from the unrelated numeric
  // claims baked into DRAFT1's bullets (which trace to CONTEXT's facts, not
  // this test's overridden ones).
  const draft = { ...DRAFT1, experience: [], skills: ['Cohort Analysis', 'Churn Modeling'] };
  const { ok, violations } = checkGrounding(draft, ctx);
  assertEquals(violations, []);
  assert(ok);
});

Deno.test('grounding: -ment/-ed word forms land on the same root ("Roadmap alignment" vs "aligned the roadmap")', () => {
  const ctx = {
    ...CONTEXT,
    workHistory: [{
      ...CONTEXT.workHistory[0],
      facts: ['Aligned the product roadmap with quarterly OKRs'],
    }],
  };
  const draft = { ...DRAFT1, experience: [], skills: ['Roadmap alignment'] };
  const { ok, violations } = checkGrounding(draft, ctx);
  assertEquals(violations, []);
  assert(ok, '"alignment" must trace to "aligned"');
});

Deno.test('grounding: parenthetical qualifiers on skills are ignored — the bare skill still needs evidence', () => {
  const ctx = {
    ...CONTEXT,
    workHistory: [{
      ...CONTEXT.workHistory[0],
      facts: ['Wrote Playwright end-to-end tests for the checkout flow'],
    }],
  };
  // Evidenced skill + stray qualifier → passes (qualifier is meta, not a concept).
  const okDraft = { ...DRAFT1, experience: [], skills: ['Playwright (exploring)'] };
  assert(checkGrounding(okDraft, ctx).ok, 'qualifier must not fail an evidenced skill');
  // Unevidenced skill + qualifier → still flagged; stripping is not a bypass.
  const badDraft = { ...DRAFT1, experience: [], skills: ['Contract testing (exploring)'] };
  assert(!checkGrounding(badDraft, ctx).ok, 'stripping the qualifier must not launder an unevidenced skill');
});

Deno.test('grounding: a skill with no real word overlap is still flagged — tolerance is not a blanket loosening', () => {
  const ctx = {
    ...CONTEXT,
    workHistory: [{
      ...CONTEXT.workHistory[0],
      facts: ['Ran cohort analyses in pandas'],
    }],
  };
  // The CV never mentions "experiment" or "design" — this must still fail,
  // the same way the live DeepSeek run caught the JD's "experiment design"
  // requirement bleeding into a candidate's skills with no CV evidence.
  const draft = { ...DRAFT1, experience: [], skills: ['Experiment Design'] };
  const { ok, violations } = checkGrounding(draft, ctx);
  assert(!ok);
  assertEquals(violations[0].kind, 'skill');
  assert(violations[0].suggestedFix?.includes('Experiment Design'));
});

Deno.test('GUARDRAIL REVERT DETECTOR: a writer that fabricates ships flagged, even when the LLM critic passes it', async () => {
  // Simulates loosening the writer's context restriction: the draft carries a
  // fabricated budget figure AND the (scripted) LLM critic happily passes it.
  // The deterministic grounding guard must still force a failing critique.
  const fabricated = {
    ...DRAFT1,
    experience: [{
      ...DRAFT1.experience[0],
      bullets: ['Managed a $3M annual cloud budget across 7 business units'],
    }],
  };
  const model = scriptedModel({ drafts: [fabricated, fabricated], critiques: [CRIT_PASS, CRIT_PASS] });
  const out = await buildGenerateGraph(model).invoke({
    cvText: CV_TEXT, jdText: JD_TEXT, gapAnalysis: GAP, answers: ANSWERS,
  });

  // The run still completes (ship-and-flag, never silent), but the fabricated
  // claims are surfaced as unresolved issues for the user's review screen.
  assert(out.resume, 'run ships');
  assert(out.unresolvedIssues.length >= 1, 'grounding violations must surface');
  assert(
    out.unresolvedIssues.some((i) => i.includes('Ungrounded number')),
    `expected ungrounded-number issue, got: ${JSON.stringify(out.unresolvedIssues)}`,
  );
});
