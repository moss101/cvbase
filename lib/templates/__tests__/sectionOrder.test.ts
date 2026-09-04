import { describe, it, expect } from 'vitest';
import type { SectionId } from '../../../types';
import {
    BODY_SECTIONS,
    CORE_SECTIONS,
    OPTIONAL_SECTIONS,
    isSectionVisible,
    orderedSections,
    sectionLayout,
} from '../sectionOrder.ts';

const ALL_VISIBLE: SectionId[] = [
    'contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications',
    'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom',
];

describe('lib/templates/sectionOrder', () => {
    it('constants partition the body sections', () => {
        expect([...CORE_SECTIONS, ...OPTIONAL_SECTIONS].sort()).toEqual([...BODY_SECTIONS].sort());
        expect(BODY_SECTIONS).not.toContain('contact');
        expect(BODY_SECTIONS).not.toContain('customize');
        expect(BODY_SECTIONS).not.toContain('finalize');
    });

    it('falls back to the default order when sectionOrder is undefined', () => {
        expect(orderedSections({}, ALL_VISIBLE)).toEqual(BODY_SECTIONS);
        expect(orderedSections({ sectionOrder: undefined }, ALL_VISIBLE)).toEqual(BODY_SECTIONS);
        expect(orderedSections(undefined, ALL_VISIBLE)).toEqual(BODY_SECTIONS);
    });

    it('honours sectionOrder', () => {
        const order = orderedSections(
            { sectionOrder: ['skills', 'education', 'summary', 'experience'] },
            ['certifications'],
        );
        expect(order).toEqual(['skills', 'education', 'summary', 'experience', 'certifications']);
    });

    it('ignores unknown and duplicate ids and the non-body wizard steps', () => {
        const order = orderedSections(
            { sectionOrder: ['contact', 'skills', 'bogus', 'skills', 'customize', 'finalize', 'summary'] },
            [],
        );
        expect(order).toEqual(['skills', 'summary', 'experience', 'education']);
    });

    it('appends ids missing from sectionOrder in default order', () => {
        const order = orderedSections({ sectionOrder: ['projects'] }, ALL_VISIBLE);
        expect(order).toEqual([
            'projects', 'summary', 'experience', 'education', 'skills', 'certifications',
            'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom',
        ]);
    });

    it('always keeps core sections and gates optional ones on visibleSections', () => {
        expect(orderedSections({}, [])).toEqual(CORE_SECTIONS);
        expect(orderedSections({}, undefined)).toEqual(CORE_SECTIONS);
        expect(orderedSections({}, ['languages', 'awards'])).toEqual([
            'summary', 'experience', 'education', 'skills', 'languages', 'awards',
        ]);
    });

    it('restricts itself to the template-supplied default order (a column)', () => {
        const sidebar: SectionId[] = ['skills', 'languages', 'certifications'];
        expect(orderedSections({}, ALL_VISIBLE, sidebar)).toEqual(sidebar);
        expect(
            orderedSections({ sectionOrder: ['experience', 'certifications', 'skills'] }, ALL_VISIBLE, sidebar),
        ).toEqual(['certifications', 'skills', 'languages']);
        // Non-body ids passed as defaults are dropped rather than rendered.
        expect(orderedSections({}, ALL_VISIBLE, ['contact', 'skills', 'skills'])).toEqual(['skills']);
    });

    it('is a pure function of its inputs', () => {
        const formData = { sectionOrder: ['education', 'summary'] };
        const before = JSON.stringify(formData);
        orderedSections(formData, ALL_VISIBLE);
        expect(JSON.stringify(formData)).toBe(before);
    });

    it('tolerates garbage in sectionOrder', () => {
        const order = orderedSections({ sectionOrder: [null, 42, {}, 'skills'] as unknown as string[] }, []);
        expect(order).toEqual(['skills', 'summary', 'experience', 'education']);
    });

    it('isSectionVisible mirrors the filtering rule', () => {
        expect(isSectionVisible('summary', [])).toBe(true);
        expect(isSectionVisible('projects', [])).toBe(false);
        expect(isSectionVisible('projects', ['projects'])).toBe(true);
        expect(isSectionVisible('contact', ALL_VISIBLE)).toBe(false);
        expect(isSectionVisible('custom', undefined)).toBe(false);
    });

    it('sectionLayout merges consecutive run members and keeps others as sections', () => {
        const runs = sectionLayout(
            ['summary', 'awards', 'languages', 'experience', 'custom'],
            { runs: { optional: ['awards', 'languages', 'custom'] } },
        );
        expect(runs).toEqual([
            { kind: 'section', id: 'summary' },
            { kind: 'run', name: 'optional', ids: ['awards', 'languages'] },
            { kind: 'section', id: 'experience' },
            { kind: 'run', name: 'optional', ids: ['custom'] },
        ]);
        expect(sectionLayout([], { runs: { optional: ['awards'] } })).toEqual([]);
        expect(sectionLayout(['summary'], {})).toEqual([{ kind: 'section', id: 'summary' }]);
    });

    it('sectionLayout anchors a block at its first member and swallows the rest', () => {
        const runs = sectionLayout(
            ['summary', 'skills', 'experience', 'education', 'awards'],
            { blocks: { grid: ['education', 'skills'] }, runs: { optional: ['awards'] } },
        );
        expect(runs).toEqual([
            { kind: 'section', id: 'summary' },
            { kind: 'block', name: 'grid', ids: ['skills', 'education'] },
            { kind: 'section', id: 'experience' },
            { kind: 'run', name: 'optional', ids: ['awards'] },
        ]);
        // Default order keeps the block where the designer put it.
        expect(sectionLayout(['summary', 'experience', 'education', 'skills'], { blocks: { grid: ['education', 'skills'] } }))
            .toEqual([
                { kind: 'section', id: 'summary' },
                { kind: 'section', id: 'experience' },
                { kind: 'block', name: 'grid', ids: ['education', 'skills'] },
            ]);
    });
});
