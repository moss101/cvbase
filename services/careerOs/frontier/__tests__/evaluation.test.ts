import { describe, expect, it } from 'vitest';
import { CASES, runEvaluation } from '../evaluation';

// The held-out rubric cases are the deterministic baseline for REQ-34/COS-040.
// Every case must pass; the report itself is written by scripts/career-os-eval.ts.
describe('held-out frontier evaluation', () => {
  const report = runEvaluation(new Date('2026-09-21T09:00:00Z'));

  it('covers every rubric dimension with at least two cases', () => {
    for (const dim of ['goal_fit', 'qualification_truth', 'prioritisation', 'scenario_tradeoff', 'uncertainty', 'adversarial'] as const) {
      expect(report.sampleCounts[dim], dim).toBeGreaterThanOrEqual(2);
    }
    expect(CASES.map((c) => c.id)).toEqual(Array.from(new Set(CASES.map((c) => c.id))));
  });

  for (const c of CASES) {
    it(`${c.id} — ${c.title}`, () => {
      const r = report.results.find((x) => x.id === c.id)!;
      expect(r.pass, r.detail).toBe(true);
    });
  }
});
