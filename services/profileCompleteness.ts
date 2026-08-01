import type { UserProfile } from './profileMapping';

/**
 * What "all the details" means for a first-time user.
 *
 * Kept in one place because two things depend on agreeing exactly: the gate
 * that keeps a new account on the profile page, and the banner that tells them
 * what is still missing. If those disagree the user gets stuck on a page that
 * looks finished.
 *
 * The list is deliberately the fields a generated CV cannot do without —
 * everything else on the profile page stays optional, so the gate never becomes
 * busywork. Widening it is a one-line change here.
 */
export const REQUIRED_PROFILE_FIELDS = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'phone', label: 'Phone number' },
    { key: 'jobTitle', label: 'Target job title' },
    { key: 'industry', label: 'Industry' },
    { key: 'experienceYears', label: 'Years of experience' },
] as const satisfies readonly { key: keyof UserProfile; label: string }[];

const isBlank = (value: unknown): boolean =>
    value === null || value === undefined || String(value).trim() === '';

/** Labels of the required fields still unfilled. Empty means complete. */
export const MISSING_PROFILE_FIELDS = (profile: UserProfile | null): string[] => {
    // No profile row yet is the very first sign-in — everything is missing.
    if (!profile) return REQUIRED_PROFILE_FIELDS.map((f) => f.label);
    return REQUIRED_PROFILE_FIELDS.filter((f) => isBlank(profile[f.key])).map((f) => f.label);
};

export const isProfileComplete = (profile: UserProfile | null): boolean =>
    MISSING_PROFILE_FIELDS(profile).length === 0;
