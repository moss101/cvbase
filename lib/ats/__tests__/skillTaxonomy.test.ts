import { describe, it, expect } from 'vitest';
import { extractSkills, normalizeSkillTerm, SKILL_CATEGORY_LABELS, HARD_CATEGORIES } from '../skillTaxonomy.ts';

describe('lib/ats/skillTaxonomy', () => {
    it('normalizeSkillTerm resolves names and aliases, case-insensitively', () => {
        expect(normalizeSkillTerm('React')?.name).toBe('React');
        expect(normalizeSkillTerm('reactjs')?.name).toBe('React');
        expect(normalizeSkillTerm('  PYTHON3 ')?.name).toBe('Python');
        expect(normalizeSkillTerm('structured query language')?.name).toBe('SQL');
    });

    it('normalizeSkillTerm returns null for unknown or empty terms', () => {
        expect(normalizeSkillTerm('definitely-not-a-skill')).toBeNull();
        expect(normalizeSkillTerm('')).toBeNull();
        expect(normalizeSkillTerm('   ')).toBeNull();
    });

    it('extractSkills finds canonical skills with occurrence counts', () => {
        const skills = extractSkills('React and React with some Python. React again.');
        const react = skills.find((s) => s.def.name === 'React');
        expect(react).toBeTruthy();
        expect(react!.count).toBe(3);
        expect(skills.some((s) => s.def.name === 'Python')).toBe(true);
    });

    it('extractSkills dedupes aliases of the same skill to one entry', () => {
        const skills = extractSkills('reactjs and react');
        const react = skills.filter((s) => s.def.name === 'React');
        expect(react).toHaveLength(1);
        expect(react[0].count).toBe(2);
    });

    it('extractSkills returns nothing for skill-free prose', () => {
        expect(extractSkills('the quick brown fox jumped over the lazy dog')).toHaveLength(0);
    });

    it('category metadata is internally consistent', () => {
        expect(SKILL_CATEGORY_LABELS.language).toBeTruthy();
        expect(HARD_CATEGORIES).toContain('language');
        expect(HARD_CATEGORIES).not.toContain('soft');
    });
});
