import { describe, it, expect } from 'vitest';
import { AVAILABLE_TEMPLATES } from '../constants';

/**
 * Go-live guard for the advertised "75+ templates" claim. The compile side is
 * covered by types: AVAILABLE_TEMPLATES ids are TemplateId (no typos) and both
 * templateMaps are Record<TemplateId, ...> (every template has a renderer). This
 * covers the runtime gallery shape so the count/labels can't silently rot.
 */
describe('template gallery (AVAILABLE_TEMPLATES)', () => {
    it('advertises at least 75 templates', () => {
        expect(AVAILABLE_TEMPLATES.length).toBeGreaterThanOrEqual(75);
    });

    it('has unique template ids', () => {
        const ids = AVAILABLE_TEMPLATES.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every entry has a non-empty id, name and category', () => {
        for (const t of AVAILABLE_TEMPLATES) {
            expect(t.id, JSON.stringify(t)).toBeTruthy();
            expect(t.name.trim().length, t.id).toBeGreaterThan(0);
            expect(t.category.trim().length, t.id).toBeGreaterThan(0);
        }
    });

    it('groups into a small set of human categories', () => {
        const cats = new Set(AVAILABLE_TEMPLATES.map((t) => t.category));
        // Gallery filters key off these; keep the set tight and meaningful.
        expect(cats.size).toBeGreaterThanOrEqual(2);
        expect(cats.size).toBeLessThanOrEqual(8);
    });
});
