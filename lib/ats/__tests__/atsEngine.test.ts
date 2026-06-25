import { describe, it, expect } from 'vitest';
import { extractSkills, parseResumeText, runFullAnalysis } from '../index.ts';

describe('lib/ats (shared engine)', () => {
  it('extractSkills finds known skills in free text', () => {
    const skills = extractSkills('Senior engineer experienced with React, Python and SQL.');
    const matched = skills.map((s) => s.matched.toLowerCase());
    expect(matched.some((m) => m.includes('react'))).toBe(true);
    expect(matched.some((m) => m.includes('python'))).toBe(true);
  });

  it('runFullAnalysis produces a scored AtsReport with a match score when a JD is given', () => {
    const resumeText = [
      'Jane Doe',
      'jane@example.com',
      'Professional Summary',
      'Senior software engineer with 6 years building React and Node.js apps.',
      'Experience',
      'Senior Engineer | Acme | Jan 2019 - Present',
      '- Built React dashboards and Node.js services used by thousands of users.',
      'Skills',
      'React, Node.js, TypeScript, SQL',
    ].join('\n');
    // The engine only scores a match for a substantial JD (>= 80 chars).
    const jd = [
      'We are hiring a Senior Software Engineer to build React and TypeScript web',
      'applications backed by Node.js services. Strong SQL skills and experience',
      'shipping production systems at scale are required.',
    ].join(' ');

    const { report } = runFullAnalysis(parseResumeText(resumeText), jd);

    expect(typeof report.atsScore).toBe('number');
    expect(report.atsScore).toBeGreaterThanOrEqual(0);
    expect(report.atsScore).toBeLessThanOrEqual(100);
    expect(report.matchScore).not.toBeNull();
    // Resume and JD share React/Node/TypeScript, so at least one keyword matches.
    expect(report.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('runFullAnalysis leaves matchScore null when no JD is provided', () => {
    const { report } = runFullAnalysis(parseResumeText('Jane Doe\nSkills\nReact, SQL'), null);
    expect(report.matchScore).toBeNull();
  });

  it('every report carries the truthfulness disclaimer', () => {
    const { report } = runFullAnalysis(parseResumeText('Jane Doe\nSkills\nReact, SQL'), null);
    expect(report.disclaimer).toMatch(/does not guarantee interviews/i);
    expect(report.disclaimer).toMatch(/truthful/i);
  });

  it('caps the match score and flags keyword stuffing when a term is spammed', () => {
    const jd = [
      'We are hiring a Senior React Engineer. Strong React skills are required',
      'to build production React applications with TypeScript and Node.js at scale.',
    ].join(' ');

    // Same role, but "React" is spammed dozens of times to game the ATS.
    const stuffed = [
      'Jane Doe',
      'jane@example.com',
      'Professional Summary',
      'React React React React React React React React React React engineer.',
      'Experience',
      'Senior Engineer | Acme | Jan 2019 - Present',
      '- React React React React React React React React React React React React.',
      '- React React React React React React React React React React React React.',
      'Skills',
      'React, React, React, React, React, React, React, React, React, React, TypeScript, Node.js',
    ].join('\n');

    const { report } = runFullAnalysis(parseResumeText(stuffed), jd);
    expect(report.keywordStuffing).not.toBeNull();
    expect(report.keywordStuffing!.terms.some((t) => /react/i.test(t))).toBe(true);
    expect(report.matchScore).not.toBeNull();
    expect(report.matchScore!).toBeLessThanOrEqual(report.keywordStuffing!.cap);
    // The stuffing is surfaced to the user as a failing/ warning format check.
    expect(report.formatChecks.some((f) => f.id === 'stuffing')).toBe(true);
    expect(report.recommendations.some((r) => /stuff/i.test(r.title) || /repeat/i.test(r.title))).toBe(true);
  });

  it('does not flag a normally written resume as keyword stuffing', () => {
    const resumeText = [
      'Jane Doe',
      'jane@example.com',
      'Professional Summary',
      'Senior software engineer with 6 years building React and Node.js apps.',
      'Experience',
      'Senior Engineer | Acme | Jan 2019 - Present',
      '- Built React dashboards and Node.js services used by thousands of users.',
      '- Led a team that shipped a TypeScript design system and SQL reporting layer.',
      'Skills',
      'React, Node.js, TypeScript, SQL',
    ].join('\n');
    const jd = [
      'We are hiring a Senior Software Engineer to build React and TypeScript web',
      'applications backed by Node.js services. Strong SQL skills required.',
    ].join(' ');

    const { report } = runFullAnalysis(parseResumeText(resumeText), jd);
    expect(report.keywordStuffing).toBeNull();
    expect(report.formatChecks.some((f) => f.id === 'stuffing')).toBe(false);
  });
});
