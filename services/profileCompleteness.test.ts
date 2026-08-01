import { describe, expect, it } from 'vitest';
import {
    isProfileComplete,
    MISSING_PROFILE_FIELDS,
    REQUIRED_PROFILE_FIELDS,
} from './profileCompleteness';
import type { UserProfile } from './profileMapping';

const complete = {
    firstName: 'Jane',
    lastName: 'Sterling',
    phone: '+1 415 555 0189',
    jobTitle: 'Systems Architect',
    industry: 'Technology & Software Development',
    experienceYears: '10',
} as unknown as UserProfile;

describe('profile completeness', () => {
    it('treats a fully filled profile as complete', () => {
        expect(MISSING_PROFILE_FIELDS(complete)).toEqual([]);
        expect(isProfileComplete(complete)).toBe(true);
    });

    it('treats a missing profile row as entirely incomplete', () => {
        // The very first sign-in has no row at all — the gate must still fire.
        expect(MISSING_PROFILE_FIELDS(null)).toHaveLength(REQUIRED_PROFILE_FIELDS.length);
        expect(isProfileComplete(null)).toBe(false);
    });

    it('names exactly the fields that are blank', () => {
        const partial = { ...complete, phone: '', industry: '   ' } as UserProfile;
        expect(MISSING_PROFILE_FIELDS(partial)).toEqual(['Phone number', 'Industry']);
        expect(isProfileComplete(partial)).toBe(false);
    });

    it('counts whitespace-only and null values as blank', () => {
        // A field wiped in the DB comes back null, not ''.
        const blanked = { ...complete, jobTitle: null, lastName: '\t' } as unknown as UserProfile;
        expect(MISSING_PROFILE_FIELDS(blanked)).toContain('Target job title');
        expect(MISSING_PROFILE_FIELDS(blanked)).toContain('Last name');
    });

    it('ignores optional fields entirely', () => {
        const withoutOptional = { ...complete, linkedin: '', bio: '' } as UserProfile;
        expect(isProfileComplete(withoutOptional)).toBe(true);
    });
});
