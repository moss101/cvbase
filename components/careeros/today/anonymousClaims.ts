import type { JobApplication } from '../../../types';
import { claimAnonymousDraft, clearAnonymousDraft, listAnonymousDrafts, type DraftPayload } from '../../../lib/builder/draftCache';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import type { StoredResume } from '../../../services/repos/mappers';
import type { Opportunity } from '../../../services/careerOs/types';

/**
 * Anonymous work on this device that a signed-in account may claim
 * (REQ-24): CV drafts from the anonymous builder cache and tracker rows from
 * the anonymous Smart Studio. Claiming is explicit, previewed and never
 * automatic; nothing is deleted from the device until the account owns it.
 */

export const SMART_STUDIO_JOBS_KEY = 'smart-studio-jobs-v1';
/** The sample rows SmartStudio seeds for an anonymous session (ids '1', '2', '3'). */
export const SAMPLE_JOB_IDS: ReadonlySet<string> = new Set(['1', '2', '3']);

export interface DraftPreview {
    docKey: string;
    payload: DraftPayload;
    title: string;
    jobTitle: string;
    experienceCount: number;
    skillCount: number;
}

export function listClaimableDrafts(userId: string): DraftPreview[] {
    const out: DraftPreview[] = [];
    for (const summary of listAnonymousDrafts()) {
        if (summary.blank) continue;
        const claim = claimAnonymousDraft(userId, summary.docKey);
        const data = claim.draft?.formData;
        if (!claim.draft || !data) continue;
        const name = `${data.contact?.firstName ?? ''} ${data.contact?.lastName ?? ''}`.trim();
        out.push({
            docKey: summary.docKey,
            payload: claim.draft,
            title: name || data.contact?.jobTitle || '',
            jobTitle: data.contact?.jobTitle ?? '',
            experienceCount: Array.isArray(data.experience) ? data.experience.length : 0,
            skillCount: Array.isArray(data.skills) ? data.skills.length : 0,
        });
    }
    return out;
}

/** Anonymous tracker rows worth claiming: user-entered, not the seeded samples. */
export function listClaimableJobs(): JobApplication[] {
    try {
        const raw = localStorage.getItem(SMART_STUDIO_JOBS_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((row): row is JobApplication =>
            !!row && typeof row === 'object' && typeof (row as JobApplication).id === 'string' && !SAMPLE_JOB_IDS.has((row as JobApplication).id)
            && typeof (row as JobApplication).jobTitle === 'string' && typeof (row as JobApplication).company === 'string');
    } catch {
        return [];
    }
}

/** Remove claimed rows from the device copy, keeping anything else. */
export function forgetClaimedJobs(ids: string[]): void {
    try {
        const raw = localStorage.getItem(SMART_STUDIO_JOBS_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const remaining = parsed.filter((row) => !(row && typeof row === 'object' && ids.includes((row as JobApplication).id)));
        if (remaining.length === 0) localStorage.removeItem(SMART_STUDIO_JOBS_KEY);
        else localStorage.setItem(SMART_STUDIO_JOBS_KEY, JSON.stringify(remaining));
    } catch { /* storage unavailable */ }
}

export interface DuplicateCheck {
    /** A resume with the same title (case-insensitive) already exists. */
    sameTitle: StoredResume | null;
    primary: StoredResume | null;
}

export function findDuplicate(existing: StoredResume[], draft: DraftPreview): DuplicateCheck {
    const title = draft.title.trim().toLowerCase();
    const sameTitle = title ? existing.find((r) => r.title.trim().toLowerCase() === title) ?? null : null;
    return { sameTitle, primary: existing.find((r) => r.isPrimary) ?? null };
}

export type ClaimMode = 'keep_both' | 'replace_primary' | 'discard';

const DEFAULT_SETTINGS = { themeColor: '#008080', fontSize: 'medium' as const, fontFamily: 'Arial, sans-serif' };

/** Persist the draft into the account (or discard it) and forget the device copy only afterwards. */
export async function claimDraft(userId: string, draft: DraftPreview, mode: ClaimMode, primary: StoredResume | null): Promise<StoredResume | null> {
    if (mode === 'discard') {
        clearAnonymousDraft(draft.docKey);
        return null;
    }
    const data = draft.payload.formData;
    if (!data) throw new Error('draft_empty');
    const fields: Partial<StoredResume> = {
        title: draft.title || 'Claimed draft',
        data,
        settings: draft.payload.settings ?? DEFAULT_SETTINGS,
        templateId: draft.payload.templateId ?? 'default',
        visibleSections: draft.payload.visibleSections ?? [],
        origin: { kind: 'manual', source: 'anonymous_claim' },
    };
    let saved: StoredResume;
    if (mode === 'replace_primary') {
        saved = await resumeRepo.upsertPrimary(userId, { ...fields, id: primary?.id, isPrimary: true } as StoredResume);
    } else {
        saved = await resumeRepo.create(userId, { ...fields, isPrimary: false });
    }
    clearAnonymousDraft(draft.docKey);
    return saved;
}

/** Tracker rows become manual opportunities (source and captured time recorded). */
export async function claimJobs(userId: string, jobs: JobApplication[]): Promise<Opportunity[]> {
    const created: Opportunity[] = [];
    const claimedIds: string[] = [];
    for (const job of jobs) {
        const opportunity = await opportunityRepo.create(userId, {
            title: job.jobTitle,
            company: job.company,
            sourceKind: 'manual',
            sourceUrl: job.jobUrl || null,
            capturedContent: '',
            capturedAt: job.dateApplied && !Number.isNaN(Date.parse(job.dateApplied)) ? new Date(job.dateApplied).toISOString() : new Date().toISOString(),
            status: 'saved',
            listingStatus: 'unknown',
        });
        created.push(opportunity);
        claimedIds.push(job.id);
    }
    forgetClaimedJobs(claimedIds);
    return created;
}
