import { describe, expect, it } from 'vitest';
import {
  FIT_ENGINE_VERSION, buildAnalysis, directionFit, extractRequirements, extractTerms, hiddenByConstraint, isAnalysisStale,
  qualificationFit,
} from '../careerFit';
import { factsRevision } from '../careerFacts';
import { analysis, fact, goal, opportunity } from './fixtures';

const JD = `Senior Nurse (ICU)
About us
We are a large teaching hospital in London.

Requirements
- Registered Nurse with current NMC registration (required)
- 3+ years of ICU experience
- Experience with Epic EHR
- Ability to lead a team of junior nurses

Nice to have
- ALS certification preferred
- Spanish is a plus

Responsibilities
- Deliver care to critically ill patients
- Mentor junior staff

Benefits
- 27 days annual leave
`;

describe('extractRequirements', () => {
  it('extracts requirement-like lines with stable ids and must/nice/unknown kinds, capped and deduplicated', () => {
    const reqs = extractRequirements(JD);
    expect(reqs.map((r) => [r.text, r.kind])).toEqual([
      ['Registered Nurse with current NMC registration (required)', 'must'],
      ['3+ years of ICU experience', 'must'],
      ['Experience with Epic EHR', 'must'],
      ['Ability to lead a team of junior nurses', 'must'],
      ['ALS certification preferred', 'nice'],
      ['Spanish is a plus', 'nice'],
    ]);
    expect(reqs.every((r) => /^req_[0-9a-f]{12}$/.test(r.id))).toBe(true);
    expect(extractRequirements(JD)[0].id).toBe(reqs[0].id);
    expect(extractRequirements('')).toEqual([]);
    const huge = Array.from({ length: 60 }, (_, i) => `- Must have skill number ${i} experience`).join('\n');
    expect(extractRequirements(`Requirements\n${huge}`)).toHaveLength(40);
    expect(extractRequirements('Requirements\n- Python\n- Python\n')).toHaveLength(0); // too short to be a requirement line
    expect(extractRequirements('- Must have strong Python experience\n- Bonus: Kubernetes knowledge')[1].kind).toBe('nice');
    expect(extractRequirements('- Knowledge of Kubernetes helpful')[0].kind).toBe('unknown');
  });
  it('extractTerms combines taxonomy skills with meaningful free tokens', () => {
    const t = extractTerms('Experience with React and TypeScript in a clinical setting');
    expect(t.skills).toEqual(expect.arrayContaining(['react', 'typescript']));
    expect(t.tokens).toContain('clinical');
    expect(extractTerms('Registered nurses, ICU').tokens).toEqual(['register', 'nurse', 'icu']);
    expect(t.tokens).not.toContain('experience');
    expect(extractTerms('and the')).toEqual({ skills: [], tokens: [] });
  });
});

describe('qualificationFit', () => {
  const reqs = extractRequirements(JD);
  const byText = <T extends { text: string }>(fitList: T[], part: string): T | undefined => fitList.find((r) => r.text.includes(part));
  it('supports with confirmed facts, partial with inferred or incomplete coverage, missing otherwise, unknown without terms', () => {
    const facts = [
      fact({ id: 'f-icu', title: 'ICU Staff Nurse', organization: 'St Mary', narrative: '<p>Five years in the intensive care unit; NMC registered.</p>', confirmationState: 'user_confirmed' }),
      fact({ id: 'f-epic', kind: 'skill', title: 'Epic EHR', organization: '', confirmationState: 'inferred', reviewState: 'candidate' }),
      fact({ id: 'f-lead', kind: 'achievement', title: 'Lead nurse for a team of eight', confirmationState: 'verified', verification: { method: 'reference', source: 'manager', verifiedAt: '2026-01-01' } }),
      fact({ id: 'f-gone', kind: 'skill', title: 'ALS certification', status: 'withdrawn' }),
    ];
    const fit = qualificationFit([...reqs, { id: 'r-empty', text: '?? --', kind: 'unknown' }], facts);
    expect(byText(fit.supported, 'ICU')).toBeDefined();
    expect(byText(fit.supported, 'ICU')!.evidence[0]).toEqual({ factId: 'f-icu', label: 'ICU Staff Nurse at St Mary (2019-01–2023-06)', confirmationState: 'user_confirmed' });
    expect(byText(fit.supported, 'lead a team')!.evidence[0].factId).toBe('f-lead');
    const epic = byText(fit.partial, 'Epic')!;
    expect(epic.state).toBe('partial');
    expect(epic.note).toContain('unconfirmed');
    expect(epic.evidence[0].confirmationState).toBe('inferred');
    expect(byText(fit.missing, 'Spanish')).toBeDefined();
    expect(byText(fit.missing, 'ALS')).toBeDefined(); // withdrawn facts do not count
    expect(fit.unknown.map((u) => u.requirementId)).toEqual(['r-empty']);
    expect(fit.unknown[0].note).toBe('No checkable terms in this requirement.');
    const total = fit.supported.length + fit.partial.length + fit.missing.length + fit.unknown.length;
    expect(total).toBe(reqs.length + 1);
  });
  it('confirming the fact moves the requirement from partial to supported; no probability anywhere', () => {
    const inferred = fact({ id: 'f-epic', kind: 'skill', title: 'Epic EHR', confirmationState: 'inferred' });
    const before = qualificationFit(reqs, [inferred]);
    expect(byText(before.partial, 'Epic')).toBeDefined();
    const after = qualificationFit(reqs, [{ ...inferred, confirmationState: 'user_confirmed' }]);
    expect(byText(after.supported, 'Epic')).toBeDefined();
    expect(JSON.stringify(after)).not.toMatch(/probab|likelihood|score/i);
  });
  it('partial when only some key terms match', () => {
    const fit = qualificationFit([{ id: 'r', text: 'Experience with React and Kubernetes', kind: 'must' }], [fact({ kind: 'skill', title: 'React', confirmationState: 'user_confirmed' })]);
    expect(fit.partial[0].note).toBe('Only react matched.');
  });
});

describe('directionFit', () => {
  it('is unavailable without a goal — never guessed', () => {
    const d = directionFit(opportunity(), null);
    expect(d).toEqual({ factors: [], constraints: [], missing: ['goal'], unavailableReason: 'No goal is set, so direction fit cannot be evaluated.' });
  });
  it('missing pay stays unknown with "Pay not stated"; currency/period mismatches are unknown too', () => {
    const g = goal({ compMin: 45000, compCurrency: 'GBP', compPeriod: 'year' });
    const noPay = directionFit(opportunity({ compMin: null, compMax: null }), g);
    expect(noPay.factors.find((f) => f.key === 'compensation')).toMatchObject({ verdict: 'unknown', detail: 'Pay not stated.' });
    expect(noPay.missing).toContain('compensation');
    const otherCurrency = directionFit(opportunity({ compMin: 60000, compMax: 70000, compCurrency: 'USD', compPeriod: 'year' }), g);
    expect(otherCurrency.factors.find((f) => f.key === 'compensation')).toMatchObject({ verdict: 'unknown', detail: 'Listing pays in USD; goal is in GBP.' });
    const otherPeriod = directionFit(opportunity({ compMin: 30, compMax: 35, compCurrency: 'GBP', compPeriod: 'hour' }), g);
    expect(otherPeriod.factors.find((f) => f.key === 'compensation')!.verdict).toBe('unknown');
    const aligned = directionFit(opportunity({ compMin: 40000, compMax: 50000, compCurrency: 'GBP', compPeriod: 'year' }), g);
    expect(aligned.factors.find((f) => f.key === 'compensation')).toMatchObject({ verdict: 'aligned', detail: 'Stated pay up to 50000 GBP/year meets your 45000.' });
    const low = directionFit(opportunity({ compMin: 30000, compMax: 40000, compCurrency: 'GBP', compPeriod: 'year' }), g);
    expect(low.factors.find((f) => f.key === 'compensation')!.verdict).toBe('tension');
    const noGoalPay = directionFit(opportunity({ compMin: 1, compMax: 2, compCurrency: 'GBP', compPeriod: 'year' }), goal());
    expect(noGoalPay.factors.find((f) => f.key === 'compensation')!.detail).toBe('Goal has no pay range.');
  });
  it('role, level, industry, location, remote and employer factors carry priority weights and honest unknowns', () => {
    const g = goal({ role: 'Senior Nurse', level: 'senior', industry: 'healthcare', location: 'London', remotePreference: 'hybrid', targetEmployers: ['NHS', 'Acme Health'], priorities: [{ key: 'location', weight: 0.9 }] });
    const d = directionFit(opportunity({ title: 'Senior Nurse', location: 'Manchester', remoteType: 'onsite', capturedContent: 'A healthcare provider', company: 'Acme Health' }), g);
    const by = (key: string) => d.factors.find((f) => f.key === key)!;
    expect(by('role').verdict).toBe('aligned');
    expect(by('level')).toMatchObject({ verdict: 'aligned', detail: 'Title indicates Senior.' });
    expect(by('industry').verdict).toBe('aligned');
    expect(by('location')).toMatchObject({ verdict: 'tension', weight: 0.9, detail: 'Manchester is not London.' });
    expect(by('flexibility')).toMatchObject({ verdict: 'tension', detail: 'Listing is onsite; you prefer hybrid.' });
    expect(by('employer').verdict).toBe('aligned');
    const sparse = directionFit(opportunity({ title: 'Ward Manager', company: 'Globex', location: '', remoteType: null, capturedContent: '' }), g);
    const sby = (key: string) => sparse.factors.find((f) => f.key === key)!;
    expect(sby('role').verdict).toBe('tension');
    expect(sby('level')).toMatchObject({ verdict: 'unknown', detail: 'Level not stated in the title.' });
    expect(sby('industry').verdict).toBe('unknown');
    expect(sby('location')).toMatchObject({ verdict: 'unknown', detail: 'Listing location not stated.' });
    expect(sby('flexibility').verdict).toBe('unknown');
    expect(sby('employer').verdict).toBe('tension');
    expect(sparse.missing).toEqual(['industry', 'location', 'remoteType', 'compensation']);
    const remote = directionFit(opportunity({ location: 'Anywhere', remoteType: 'remote' }), goal({ location: 'London', remotePreference: 'any' }));
    expect(remote.factors.find((f) => f.key === 'location')!.verdict).toBe('aligned');
    expect(remote.factors.find((f) => f.key === 'flexibility')!.verdict).toBe('aligned');
  });
  it('evaluates machine-checkable constraints; a broken HARD constraint hides with an inspectable reason', () => {
    const g = goal({ constraints: [
      { id: 'c-loc', kind: 'hard', text: 'London only', field: 'location', value: 'London' },
      { id: 'c-remote', kind: 'soft', text: 'Prefer remote', field: 'remote', value: 'remote' },
      { id: 'c-pay', kind: 'hard', text: 'At least 45k', field: 'compMin', value: 45000 },
      { id: 'c-emp', kind: 'soft', text: 'Not Acme', field: 'employer', value: 'Globex' },
      { id: 'c-level', kind: 'hard', text: 'Senior only', field: 'level', value: 'senior' },
      { id: 'c-ind', kind: 'soft', text: 'Healthcare', field: 'industry', value: 'healthcare' },
      { id: 'c-free', kind: 'hard', text: 'No night shifts' },
    ] });
    const d = directionFit(opportunity({ title: 'Junior Nurse', location: 'Leeds', remoteType: 'onsite', compMin: null, compMax: null, company: 'Acme Health', capturedContent: '' }), g);
    const verdicts = Object.fromEntries(d.constraints.map((c) => [c.constraintId, c.verdict]));
    expect(verdicts).toEqual({ 'c-loc': 'broken', 'c-remote': 'broken', 'c-pay': 'unknown', 'c-emp': 'broken', 'c-level': 'broken', 'c-ind': 'unknown', 'c-free': 'unknown' });
    expect(d.constraints.find((c) => c.constraintId === 'c-pay')!.detail).toBe('Pay not stated.');
    expect(d.constraints.find((c) => c.constraintId === 'c-free')!.detail).toBe('Not machine-checkable; review manually.');
    expect(hiddenByConstraint(d)).toEqual({ constraintId: 'c-loc', text: 'London only — Listing location "Leeds" is not "London".' });
    const softOnly = directionFit(opportunity({ location: 'London', remoteType: 'onsite', title: 'Senior Nurse', company: 'Globex', compMin: 50000, compMax: 55000, compCurrency: 'GBP', compPeriod: 'year', capturedContent: 'healthcare' }), g);
    expect(softOnly.constraints.map((c) => c.verdict)).toEqual(['met', 'broken', 'met', 'met', 'met', 'met', 'unknown']);
    expect(hiddenByConstraint(softOnly)).toBeNull(); // only a soft constraint is broken
    const remoteMet = directionFit(opportunity({ location: 'Leeds', remoteType: 'remote' }), goal({ constraints: [g.constraints[0]] }));
    expect(remoteMet.constraints[0]).toMatchObject({ verdict: 'met', detail: 'Remote role; location constraint does not bind.' });
  });
});

describe('buildAnalysis and staleness', () => {
  const facts = [fact({ id: 'f1', revision: 2, kind: 'skill', title: 'Epic EHR', confirmationState: 'user_confirmed' })];
  const opp = opportunity({ id: 'o1', revision: 3, capturedContent: JD, compMin: null, compMax: null });
  const g = goal({ id: 'g1', revision: 5, constraints: [{ id: 'c1', kind: 'hard', text: 'London', field: 'location', value: 'London' }] });
  it('records every input revision, extracts requirements when none are stored, and never carries a hiring probability', () => {
    const a = buildAnalysis({ opportunity: opp, goal: g, facts, atsScore: 63.4, now: new Date('2026-09-20T00:00:00.000Z') });
    expect(a).toMatchObject({ opportunityId: 'o1', goalId: 'g1', applicationId: null, opportunityRevision: 3, goalRevision: 5, factsRevision: factsRevision(facts), engineVersion: FIT_ENGINE_VERSION, atsScore: 63.4, stale: false, computedAt: '2026-09-20T00:00:00.000Z' });
    expect(a.qualification.supported.map((r) => r.text)).toEqual(['Experience with Epic EHR']);
    expect(a.direction.factors.find((f) => f.key === 'compensation')!.detail).toBe('Pay not stated.');
    expect(a.hiddenByConstraint).toBeNull(); // location not stated → unknown, not broken
    expect(Object.keys(a)).not.toEqual(expect.arrayContaining(['probability', 'hiringProbability', 'matchScore']));
    const stored = buildAnalysis({ opportunity: { ...opp, requirements: [{ id: 'stored', text: 'Epic EHR', kind: 'must' }] }, goal: null, facts, atsScore: undefined });
    expect(stored.qualification.supported[0].requirementId).toBe('stored');
    expect(stored.goalId).toBeNull();
    expect(stored.atsScore).toBeNull();
    expect(stored.direction.unavailableReason).toBeDefined();
  });
  it('is stale after a goal revision, an opportunity revision, a facts change, a goal removal or an engine bump', () => {
    const a = buildAnalysis({ opportunity: opp, goal: g, facts });
    const current = { opportunity: { id: 'o1', revision: 3 }, goal: { id: 'g1', revision: 5 }, factsRevision: factsRevision(facts) };
    expect(isAnalysisStale(a, current)).toBe(false);
    expect(isAnalysisStale(a, { ...current, goal: { id: 'g1', revision: 6 } })).toBe(true);
    expect(isAnalysisStale(a, { ...current, opportunity: { id: 'o1', revision: 4 } })).toBe(true);
    expect(isAnalysisStale(a, { ...current, factsRevision: factsRevision([{ ...facts[0], revision: 3 }]) })).toBe(true);
    expect(isAnalysisStale(a, { ...current, goal: null })).toBe(true);
    expect(isAnalysisStale({ ...a, engineVersion: 'fit-0.9.0' }, current)).toBe(true);
    expect(isAnalysisStale({ ...a, stale: true }, current)).toBe(true);
    expect(isAnalysisStale(analysis({ goalId: null, goalRevision: null, opportunityRevision: 1, factsRevision: '' }), { opportunity: { id: 'o1', revision: 1 }, goal: null, factsRevision: '' })).toBe(false);
  });
});
