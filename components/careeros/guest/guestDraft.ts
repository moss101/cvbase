import type { ResumeData } from '../../../types';
import { ANON_SCOPE, PRIMARY_DOC, hasDraft, isBlankResumeData, readDraftPayload } from '../../../lib/builder/draftCache';

/**
 * The CV a signed-out visitor is building on this device (the builder's
 * anonymous primary draft), or null when there is none or it is still blank.
 * Guests' tools read it exactly as the old dashboard did; nothing leaves the
 * device until they sign in and choose to claim it.
 */
export function readGuestDraft(): ResumeData | null {
    try {
        if (!hasDraft(ANON_SCOPE, PRIMARY_DOC)) return null;
        const { formData: data } = readDraftPayload(ANON_SCOPE, PRIMARY_DOC);
        return data && !isBlankResumeData(data) ? data : null;
    } catch {
        return null;
    }
}

export function guestDraftLabel(data: ResumeData | null): { name: string; title: string } | null {
    if (!data) return null;
    const c = (data as { contact?: { firstName?: string; lastName?: string; jobTitle?: string } }).contact ?? {};
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
    return { name, title: (c.jobTitle ?? '').trim() };
}
