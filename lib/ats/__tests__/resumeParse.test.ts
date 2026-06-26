import { describe, it, expect } from 'vitest';
import { parseResumeText, extractDateRanges, mergedYears } from '../resumeParse.ts';

describe('lib/ats/resumeParse', () => {
    it('extractDateRanges parses bounded and current ranges', () => {
        const bounded = extractDateRanges('Worked Jan 2018 - Dec 2020 on things.');
        expect(bounded).toHaveLength(1);
        expect(bounded[0].isCurrent).toBe(false);

        const current = extractDateRanges('Mar 2021 - Present');
        expect(current).toHaveLength(1);
        expect(current[0].isCurrent).toBe(true);
    });

    it('mergedYears merges overlapping ranges instead of double-counting', () => {
        const ranges = [
            { start: new Date('2018-01-01'), end: new Date('2022-01-01'), isCurrent: false },
            { start: new Date('2020-01-01'), end: new Date('2024-01-01'), isCurrent: false },
        ];
        // 2018 -> 2024 spanned once is ~6 years, not 4 + 4.
        expect(mergedYears(ranges)).toBeCloseTo(6, 0);
    });

    it('mergedYears sums disjoint ranges', () => {
        const ranges = [
            { start: new Date('2010-01-01'), end: new Date('2012-01-01'), isCurrent: false },
            { start: new Date('2015-01-01'), end: new Date('2017-01-01'), isCurrent: false },
        ];
        expect(mergedYears(ranges)).toBeCloseTo(4, 0);
    });

    it('mergedYears returns 0 for no ranges', () => {
        expect(mergedYears([])).toBe(0);
    });

    it('parseResumeText extracts contact, sections, skills and a degree', () => {
        const text = [
            'Jane Doe',
            'jane@example.com · (555) 123-4567',
            'Professional Summary',
            'Senior engineer with six years of experience.',
            'Experience',
            'Senior Engineer | Acme | Jan 2018 - Present',
            '- Built React and Node.js services used by thousands.',
            'Education',
            'Bachelor of Science in Computer Science, MIT',
            'Skills',
            'React, Node.js, TypeScript, SQL',
        ].join('\n');

        const r = parseResumeText(text);
        expect(r.contact.email).toBe('jane@example.com');
        expect((r.contact.name || '').toLowerCase()).toContain('jane');
        expect(r.sections.some((s) => s.kind === 'experience')).toBe(true);
        expect(r.sections.some((s) => s.kind === 'skills')).toBe(true);
        expect(r.degrees).toContain("Bachelor's");
        expect(r.declaredSkills.length).toBeGreaterThan(0);
        expect(r.totalExperienceYears).toBeGreaterThan(0);
        expect(r.bullets.length).toBeGreaterThan(0);
    });
});
