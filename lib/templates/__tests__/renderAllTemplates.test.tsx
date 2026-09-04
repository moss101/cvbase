// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ResumeData, ResumeSettings, SectionId, TemplateId } from '../../../types';
import { exampleData } from '../../../exampleData';
import { templateLoaders } from '../../../components/templates/TemplatePreviewRegistry';
import { BODY_SECTIONS, orderedSections } from '../sectionOrder';

/**
 * Every template must render its body sections through `orderedSections`:
 * no template may throw with `sectionOrder` undefined or shuffled, each
 * rendered section carries `data-section="<SectionId>"`, and the DOM order of
 * those markers follows `sectionOrder` within each column (a section never
 * moves between columns, so we only assert relative order of the sections
 * that share a parent). The `id="resume-preview..."` export hook must survive.
 */

const ALL_SECTIONS: SectionId[] = [
    'contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications',
    'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom',
];
const SETTINGS: ResumeSettings = { themeColor: '#008080', fontSize: 'medium', fontFamily: 'Arial, sans-serif' };
const SHUFFLED: SectionId[] = [
    'custom', 'skills', 'volunteer', 'education', 'publications', 'summary',
    'trainings', 'projects', 'awards', 'experience', 'languages', 'certifications',
];

const ids = Object.keys(templateLoaders) as (TemplateId | 'default')[];

async function render(id: TemplateId | 'default', formData: ResumeData) {
    const mod = await templateLoaders[id]();
    const Component = mod.default;
    return renderToStaticMarkup(
        <Component formData={formData} isCardPreview={false} visibleSections={ALL_SECTIONS} settings={SETTINGS} />,
    );
}

/** Parses the markup and returns the ordered data-section ids of every
 *  "run": consecutive `[data-section]` siblings. A run ends at any sibling
 *  that is not a section (a column wrapper, a divider, the contact block), so
 *  a template's fixed layout groups are respected while the order inside each
 *  group must follow `sectionOrder`. */
function sectionRuns(html: string): SectionId[][] {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const parents = new Set<Element>();
    doc.querySelectorAll('[data-section]').forEach((el) => parents.add(el.parentElement!));
    const runs: SectionId[][] = [];
    for (const parent of parents) {
        let current: SectionId[] = [];
        for (const child of Array.from(parent.children)) {
            const id = child.getAttribute('data-section') as SectionId | null;
            if (id) current.push(id);
            else if (current.length) { runs.push(current); current = []; }
        }
        if (current.length) runs.push(current);
    }
    return runs;
}

describe('every template renders through orderedSections', () => {
    it('registers a loader for every template', () => {
        expect(ids.length).toBeGreaterThanOrEqual(75);
    });

    for (const id of ids) {
        it(`${id}: renders with sectionOrder undefined and shuffled`, async () => {
            const base = { ...exampleData, sectionOrder: undefined } as ResumeData;
            const html = await render(id, base);
            expect(html).toMatch(/id="resume-preview/);

            const all = sectionRuns(html).flat();
            const found = new Set(all);
            // Core sections always render from example data.
            for (const core of ['summary', 'experience', 'education'] as SectionId[]) {
                expect(found.has(core), `${id} lacks data-section="${core}"`).toBe(true);
            }
            for (const s of found) expect(BODY_SECTIONS).toContain(s);
            // No section rendered twice.
            expect(new Set(all).size, `${id} renders a section twice: ${all.join(',')}`).toBe(all.length);

            const shuffledHtml = await render(id, { ...exampleData, sectionOrder: SHUFFLED } as ResumeData);
            const shuffledRuns = sectionRuns(shuffledHtml);
            expect(new Set(shuffledRuns.flat())).toEqual(found);
            // Within each run the order must follow SHUFFLED.
            for (const run of shuffledRuns) {
                const expected = orderedSections({ sectionOrder: SHUFFLED }, ALL_SECTIONS, run);
                expect(run, `${id}: run order does not follow sectionOrder`).toEqual(expected);
            }
        });
    }
});
