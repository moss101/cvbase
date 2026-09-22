/**
 * Pure decision logic for usePersistence — no React, no timers, no storage —
 * so the document identity rules, the two-device conflict decision and the
 * error classification are unit-testable without rendering the hook.
 */
import type { ResumeData, ResumeSettings, SectionId, TemplateId } from '../../types';
import type { StoredResume } from '../../services/repos/mappers';
import { draftDocKey, draftScope } from './draftCache';

/**
 * What the builder knows about the document it was asked to open:
 * - `loading`: hydration in progress (or failed and awaiting retry) — the
 *   local draft is shown but nothing is pushed to the cloud.
 * - `ready`: bound to a cloud row (or the local flow, signed out).
 * - `unavailable`: the requested id is missing or not owned by this account.
 *   Never silently replaced by the primary CV.
 * - `conflict`: a `ConflictInfo` is staged and awaits the user's choice.
 */
export type DocumentState = 'loading' | 'ready' | 'unavailable' | 'conflict';

export interface DocumentIdentity {
    scope: string;
    docKey: string;
    /** `${scope}:${docKey}` — the cache identity of the document in memory. */
    key: string;
}

export function resolveDocumentIdentity(userId: string | null | undefined, initialResumeId: string | null | undefined): DocumentIdentity {
    const scope = draftScope(userId);
    const docKey = draftDocKey(initialResumeId);
    return { scope, docKey, key: `${scope}:${docKey}` };
}

export interface CloudHydrationPayload {
    resumeId: string | null;
    formData: ResumeData;
    visibleSections: SectionId[];
    settings: ResumeSettings;
    templateId?: TemplateId;
}

export function toHydrationPayload(cloud: StoredResume): CloudHydrationPayload {
    return {
        resumeId: cloud.id ?? null,
        formData: cloud.data,
        visibleSections: cloud.visibleSections,
        settings: cloud.settings,
        templateId: cloud.templateId as TemplateId | undefined,
    };
}

export interface DocumentSnapshot {
    formData: ResumeData;
    visibleSections: SectionId[];
    settings: ResumeSettings;
    templateId: TemplateId | string | undefined;
}

/** Stable serialisation used to tell "changed since last persisted" apart
 *  from "re-rendered with the same content". */
export function serializeSnapshot(s: DocumentSnapshot): string {
    return JSON.stringify([s.formData, s.visibleSections, s.settings, s.templateId ?? null]);
}

export type HydrationDecision = 'hydrate' | 'conflict';

/**
 * Two-device rule: stage a conflict only when the cloud row changed after
 * this device's last sync point AND this device holds a draft whose content
 * differs from the cloud. A draft identical to the cloud (or no draft) means
 * nothing can be lost, so the cloud version is applied silently.
 */
export function decideHydration(args: {
    cloudUpdatedAt: string | undefined;
    syncedAt: string | null;
    localData: ResumeData | null;
    cloudData: ResumeData;
}): HydrationDecision {
    const { cloudUpdatedAt, syncedAt, localData, cloudData } = args;
    if (!cloudUpdatedAt || !syncedAt || !localData) return 'hydrate';
    if (cloudUpdatedAt <= syncedAt) return 'hydrate';
    return JSON.stringify(localData) === JSON.stringify(cloudData) ? 'hydrate' : 'conflict';
}

const codeOf = (err: unknown): string | undefined =>
    err && typeof err === 'object' ? (err as { code?: unknown }).code as string | undefined : undefined;

export const isConflictError = (err: unknown): boolean => codeOf(err) === 'conflict';
export const isNotFoundError = (err: unknown): boolean => codeOf(err) === 'not_found';
