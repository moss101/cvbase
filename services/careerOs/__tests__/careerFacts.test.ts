import { describe, expect, it } from 'vitest';
import {
  candidateFactsFromProfile, candidateFactsFromResume, factFingerprint, factLabel, factsRevision, fingerprintInput,
  identityKey, impactOfChange, periodsDisjoint, reconcileCandidates,
} from '../careerFacts';
import { fingerprint, fnv1a64Hex, stripHtml } from '../util';
import type { ResumeData } from '../../../types';
import { fact } from './fixtures';

const resume = (data: Partial<ResumeData>): { id: string; revision?: number; data: ResumeData } => ({
  id: 'r1', revision: 4,
  data: {
    contact: {} as ResumeData['contact'], summary: { professionalSummary: '' }, experience: [], projects: [], education: [], skills: [],
    certifications: [], languages: [], awards: [], trainings: [], publications: [], volunteer: [], custom: [], ...data,
  },
});

describe('candidateFactsFromResume', () => {
  it('produces unconfirmed candidates with provenance and keeps the rich narrative', () => {
    const facts = candidateFactsFromResume(resume({
      experience: [{ id: 'e1', jobTitle: 'Senior Nurse', company: 'St Mary', location: 'London', startDate: '2019-01', endDate: '', description: '<p>Led a <b>ward</b></p>' }],
      skills: ['React', '', 'Wound care'],
      education: [{ id: 'ed1', school: 'KCL', degree: 'BSc Nursing', location: '', startDate: '2012', endDate: '2015', description: '' }],
      summary: { professionalSummary: 'Ten years in acute care.' },
    }));
    const exp = facts.find((f) => f.kind === 'experience')!;
    expect(exp).toMatchObject({
      title: 'Senior Nurse', organization: 'St Mary', narrative: '<p>Led a <b>ward</b></p>', confirmationState: 'inferred', reviewState: 'candidate',
      sourceKind: 'resume_import', sourceRef: { resumeId: 'r1', resumeRevision: 4, section: 'experience' }, legacyId: 'e1', status: 'active', verification: null,
    });
    expect(exp.sourceFingerprint).toBe(factFingerprint('experience', ['senior nurse', 'st mary', '2019-01']));
    expect(facts.filter((f) => f.kind === 'skill').map((f) => [f.title, f.sortOrder])).toEqual([['React', 1], ['Wound care', 3]]);
    expect(facts.find((f) => f.kind === 'summary')).toMatchObject({ title: 'Professional summary', narrative: 'Ten years in acute care.', sourceFingerprint: factFingerprint('summary', ['r1']) });
    expect(facts.find((f) => f.kind === 'education')).toMatchObject({ title: 'BSc Nursing', organization: 'KCL', sourceFingerprint: factFingerprint('education', ['bsc nursing', 'kcl']) });
    expect(facts.every((f) => f.confirmationState !== 'verified')).toBe(true);
    expect(facts.every((f) => f.extractionConfidence === null)).toBe(true);
  });
  it('covers every section, skips empty rows and tolerates a sparse ResumeData', () => {
    const facts = candidateFactsFromResume(resume({
      projects: [{ id: 'p1', name: 'Rota app', technologies: 'React', link: 'https://x', startDate: '', endDate: '', description: '' }, { id: 'p2', name: '  ', technologies: '', link: '', startDate: '', endDate: '', description: '' }],
      certifications: [{ id: 'c1', name: 'NMC', number: '123', expiryDate: '2027', description: '' }],
      languages: [{ id: 'l1', language: 'Spanish', proficiency: 'B2' }],
      awards: [{ id: 'aw1', title: 'Nurse of the year', issuer: 'Trust', date: '2022', description: '' }],
      trainings: [{ id: 't1', course: 'ALS', institution: 'RC', date: '2021', description: '' }],
      publications: [{ id: 'pb1', title: 'Paper', publisher: 'BMJ', date: '2020', link: '', description: '' }],
      volunteer: [{ id: 'v1', organization: 'Red Cross', role: 'First aider', startDate: '2018', endDate: '2019', location: '', description: '' }],
      custom: [{ id: 'cu1', title: 'Talks', subtitle: 'Keynote', date: '2023', description: '' }],
    }));
    expect(facts.map((f) => f.kind)).toEqual(['project', 'certification', 'language', 'award', 'training', 'publication', 'volunteer', 'custom']);
    expect(facts[0].payload).toEqual({ technologies: 'React', link: 'https://x' });
    expect(facts[1]).toMatchObject({ endDate: '2027', payload: { number: '123' } });
    expect(candidateFactsFromResume({ id: 'r2', data: {} as ResumeData })).toEqual([]);
  });
  it('fingerprints use the SQL normalisation string but an FNV hash, never md5', () => {
    expect(fingerprintInput('skill', ['react'])).toBe('skill|react');
    const fp = factFingerprint('skill', ['react']);
    expect(fp).toHaveLength(32);
    expect(fp).toBe(fingerprint('skill|react'));
    expect(fp).not.toBe('7c5ce2d0d4d6f5b4e5d5b3fd8c3c1b6c'); // not md5('skill|react')
    expect(fnv1a64Hex('a')).toBe('af63dc4c8601ec8c');
    expect(factFingerprint('skill', ['React'])).not.toBe(fp); // callers lower-case exactly like SQL
  });
});

describe('candidateFactsFromProfile', () => {
  it('maps the specialised legacy fields to user_confirmed profile_field facts', () => {
    const facts = candidateFactsFromProfile({
      userId: 'u1', email: 'x@y', firstName: 'A', lastName: 'B', phone: '', jobTitle: 'Charge Nurse', industry: 'Healthcare', experienceYears: '10',
      bio: '', careSpecialties: ['ICU', 'A&E'], certifications: [], availability: '', licensedState: 'CA',
    });
    expect(facts.map((f) => [f.title, f.payload.field, f.payload.value])).toEqual([
      ['Current title', 'jobTitle', 'Charge Nurse'], ['Industry', 'industry', 'Healthcare'], ['Care specialties', 'careSpecialties', ['ICU', 'A&E']], ['Licensed state', 'licensedState', 'CA'],
    ]);
    expect(facts.every((f) => f.kind === 'profile_field' && f.confirmationState === 'user_confirmed' && f.reviewState === 'reviewed' && f.sourceKind === 'profile' && f.sourceRef.profile === true)).toBe(true);
    expect(facts[0].sourceFingerprint).toBe(factFingerprint('profile_field', ['job_title']));
  });
});

describe('reconcileCandidates', () => {
  const candidates = () => candidateFactsFromResume(resume({
    experience: [{ id: 'e1', jobTitle: 'Senior Nurse', company: 'St Mary', location: '', startDate: '2019-01', endDate: '2023-06', description: '<p>Led a ward</p>' }],
    skills: ['React', 'react'],
  }));
  it('same claim + same content is a duplicate mapped to the existing id, even a deleted tombstone', () => {
    const existing = [fact({ id: 'f-exp', title: 'senior nurse', organization: 'ST MARY', startDate: '2019-01', endDate: '2023-06', narrative: 'Led a ward', status: 'deleted' })];
    const r = reconcileCandidates(existing, candidates());
    expect(r.duplicates.map((d) => [d.candidate.kind, d.existingId])).toEqual([['experience', 'f-exp']]);
    expect(r.new.map((c) => c.title)).toEqual(['React']);
    expect(r.withinImport.map((c) => c.title)).toEqual(['react']);
    expect(r.conflicts).toEqual([]);
  });
  it('same claim with different dates/narrative is a conflict sharing a group, never merged', () => {
    const existing = [fact({ id: 'f-exp', title: 'Senior Nurse', organization: 'St Mary', startDate: '2018-06', endDate: '2023-06', narrative: 'Ran the ward', revision: 3 })];
    const r = reconcileCandidates(existing, candidates());
    expect(r.conflicts).toHaveLength(1);
    const c = r.conflicts[0];
    expect(c.existingId).toBe('f-exp');
    expect(c.existingRevision).toBe(3);
    expect(c.conflictGroup).toMatch(/^[0-9a-f-]{36}$/);
    expect(c.candidate.conflictGroup).toBe(c.conflictGroup);
    expect(c.candidate.reviewState).toBe('conflict');
    expect(c.candidate.narrative).toBe('<p>Led a ward</p>');
    expect(r.duplicates).toEqual([]);
  });
  it('reuses an existing conflict group and matches by fingerprint when narratives differ', () => {
    const cands = candidates();
    const exp = cands.find((c) => c.kind === 'experience')!;
    const existing = [fact({ id: 'f-exp', title: 'Different title', organization: 'Elsewhere', sourceFingerprint: exp.sourceFingerprint, conflictGroup: 'existing-group', narrative: 'other' })];
    const r = reconcileCandidates(existing, cands);
    expect(r.conflicts[0]).toMatchObject({ existingId: 'f-exp', conflictGroup: 'existing-group' });
  });
  it('a distinct non-overlapping stint at the same employer is new, and unknown dates are shown for review', () => {
    const first = fact({ id: 'f-old', title: 'Senior Nurse', organization: 'St Mary', startDate: '2012-01', endDate: '2015-12', narrative: 'earlier stint' });
    const r = reconcileCandidates([first], candidates());
    expect(r.new.map((c) => c.kind)).toEqual(['experience', 'skill']);
    expect(r.conflicts).toEqual([]);
    expect(periodsDisjoint({ startDate: '2012', endDate: '2015' }, { startDate: '2019-01', endDate: '' })).toBe(true);
    expect(periodsDisjoint({ startDate: '', endDate: '2015' }, { startDate: '2019-01', endDate: '' })).toBe(false);
    expect(periodsDisjoint({ startDate: '2012', endDate: 'Present' }, { startDate: '2019-01', endDate: '2020' })).toBe(false);
    const undated = fact({ id: 'f-undated', title: 'Senior Nurse', organization: 'St Mary', startDate: '', endDate: '', narrative: 'x' });
    expect(reconcileCandidates([undated], candidates()).conflicts).toHaveLength(1);
  });
  it('honours a withdrawn counterpart with different content by treating the candidate as a duplicate', () => {
    const withdrawn = fact({ id: 'f-w', title: 'Senior Nurse', organization: 'St Mary', startDate: '2019-01', endDate: '2023-06', narrative: 'other', status: 'withdrawn' });
    const r = reconcileCandidates([withdrawn], candidates());
    expect(r.duplicates.map((d) => d.existingId)).toEqual(['f-w']);
    expect(r.conflicts).toEqual([]);
  });
  it('identityKey ignores case, whitespace and the source hash', () => {
    expect(identityKey({ kind: 'skill', title: '  React ', organization: '' })).toBe('skill|react|');
    expect(identityKey(fact({ title: 'A', organization: 'B' }))).toBe(identityKey({ kind: 'experience', title: 'a', organization: 'b' }));
  });
});

describe('factsRevision, factLabel, impactOfChange', () => {
  it('factsRevision is order-independent, ignores inactive facts and is empty without facts', () => {
    const a = fact({ id: 'f1', revision: 2 }); const b = fact({ id: 'f2', revision: 1 });
    expect(factsRevision([a, b])).toBe(factsRevision([b, a]));
    expect(factsRevision([a, b])).not.toBe(factsRevision([a, { ...b, revision: 2 }]));
    expect(factsRevision([a, fact({ id: 'f3', status: 'withdrawn' })])).toBe(factsRevision([a]));
    expect(factsRevision([])).toBe('');
    expect(factsRevision([a])).toMatch(/^[0-9a-f]{16}$/);
  });
  it('factLabel renders citation labels per kind', () => {
    expect(factLabel(fact())).toBe('Senior Nurse at St Mary Hospital (2019-01–2023-06)');
    expect(factLabel(fact({ endDate: '' }))).toBe('Senior Nurse at St Mary Hospital (2019-01–present)');
    expect(factLabel(fact({ kind: 'skill', title: 'React', organization: '', startDate: '', endDate: '' }))).toBe('Skill: React');
    expect(factLabel(fact({ kind: 'education', title: 'BSc', organization: 'KCL', startDate: '2012', endDate: '2015' }))).toBe('BSc, KCL (2012–2015)');
    expect(factLabel(fact({ kind: 'profile_field', title: 'Care specialties', payload: { value: ['ICU', 'A&E'] } }))).toBe('Care specialties: ICU, A&E');
    expect(factLabel(fact({ kind: 'language', title: 'Spanish', payload: { proficiency: 'B2' } }))).toBe('Language: Spanish (B2)');
    expect(factLabel(fact({ kind: 'summary' }))).toBe('Professional summary');
  });
  it('impactOfChange groups referencing artifacts by kind without duplicates', () => {
    const refs = [
      { id: '1', factId: 'f1', factRevision: 1, artifactKind: 'resume' as const, artifactId: 'r1', artifactSection: 'experience', createdAt: '' },
      { id: '2', factId: 'f1', factRevision: 1, artifactKind: 'resume' as const, artifactId: 'r1', artifactSection: 'summary', createdAt: '' },
      { id: '3', factId: 'f1', factRevision: 1, artifactKind: 'application_artifact' as const, artifactId: 'art1', artifactSection: '', createdAt: '' },
      { id: '4', factId: 'f2', factRevision: 1, artifactKind: 'resume' as const, artifactId: 'r2', artifactSection: '', createdAt: '' },
    ];
    expect(impactOfChange({ id: 'f1' }, refs)).toEqual({ factId: 'f1', total: 2, byKind: { resume: ['r1'], application_artifact: ['art1'] } });
    expect(impactOfChange({ id: 'f9' }, refs)).toEqual({ factId: 'f9', total: 0, byKind: {} });
  });
  it('stripHtml handles block boundaries and entities', () => {
    expect(stripHtml('<p>Led &amp; <b>ran</b></p><ul><li>one</li><li>two</li></ul>')).toBe('Led & ran\none\ntwo');
    expect(stripHtml('')).toBe('');
  });
});
