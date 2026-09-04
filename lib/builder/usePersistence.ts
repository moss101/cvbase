/**
 * The resume builder's persistence pipeline, extracted from ResumeBuilder:
 *
 * - Always: a debounced localStorage cache (instant, works signed-out).
 * - Signed-in: one-time cloud hydration on mount/user-change, then a
 *   debounced push to Postgres on every edit, with a real `saveState`
 *   ('idle' | 'saving' | 'saved' | 'error') driven by the actual save
 *   promise instead of a timer that always claimed success.
 * - A `beforeunload` guard (web only — Capacitor apps don't navigate away in
 *   the same sense) while a cloud write is outstanding or has failed.
 * - Best-effort conflict detection: if the cloud row was updated on another
 *   device after this device's last known sync point, hydration stages a
 *   `ConflictInfo` instead of silently overwriting local edits, and the
 *   caller can resolve it via `resolveConflict('useCloud' | 'keepMine')`.
 *
 * See the `ConflictInfo` doc comment below for a caveat: this needs
 * `updated_at` on `StoredResume`, which `services/repos/resumeRepo.ts` /
 * `mappers.ts` (owned elsewhere) do not currently surface.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import * as resumeRepo from '../../services/repos/resumeRepo';
import type { ResumeData, ResumeSettings, SectionId, TemplateId } from '../../types';
import type { StoredResume } from '../../services/repos/mappers';
import { captureException } from '../monitoring';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const LS_KEYS = {
    data: 'cvbase-resume-data',
    visibleSections: 'cvbase-visible-sections',
    settings: 'cvbase-settings',
    template: 'cvbase-selected-template',
} as const;

const lastSyncedKey = (resumeId: string | null): string => `cvbase-last-synced:${resumeId ?? 'primary'}`;

export interface CloudHydrationPayload {
    resumeId: string | null;
    formData: ResumeData;
    visibleSections: SectionId[];
    settings: ResumeSettings;
    templateId?: TemplateId;
}

/**
 * Staged when the cloud row looks like it changed on another device since
 * this device's last known sync point, instead of silently clobbering
 * whatever the user has open here.
 *
 * Caveat: `resumeRepo.get`/`getPrimary` (owned elsewhere, read-only here)
 * return a `StoredResume` that does not include the row's `updated_at` —
 * `rowToResume` in `services/repos/mappers.ts` drops it. Without a real
 * timestamp this path can never actually trigger (hydration always proceeds
 * immediately, matching the previous behaviour exactly) — it activates the
 * moment `updatedAt` is added to `StoredResume` / `rowToResume`, no other
 * change needed here.
 */
export interface ConflictInfo {
    cloud: StoredResume;
}

interface UsePersistenceArgs {
    userId: string | null | undefined;
    initialResumeId?: string | null;
    formData: ResumeData;
    visibleSections: SectionId[];
    settings: ResumeSettings;
    selectedTemplate: TemplateId;
    /** Called with cloud data ready to apply — on normal hydration and when
     *  a staged conflict is resolved with "Use cloud version". The caller
     *  owns merging with app defaults and resetting undo history. */
    onHydrate: (payload: CloudHydrationPayload) => void;
    /** localStorage cache debounce. Defaults to 300ms. */
    localDebounceMs?: number;
    /** Cloud push debounce. Defaults to 600ms. */
    cloudDebounceMs?: number;
}

interface UsePersistenceResult {
    resumeId: string | null;
    cloudLoaded: boolean;
    saveState: SaveState;
    /** Re-attempt the last cloud save after an error. */
    retry: () => void;
    conflict: ConflictInfo | null;
    resolveConflict: (choice: 'useCloud' | 'keepMine') => void;
}

export function usePersistence({
    userId,
    initialResumeId,
    formData,
    visibleSections,
    settings,
    selectedTemplate,
    onHydrate,
    localDebounceMs = 300,
    cloudDebounceMs = 600,
}: UsePersistenceArgs): UsePersistenceResult {
    const [resumeId, setResumeId] = useState<string | null>(null);
    const [cloudLoaded, setCloudLoaded] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [conflict, setConflict] = useState<ConflictInfo | null>(null);

    /** True while there is a cloud write outstanding or failed — drives the
     *  beforeunload guard. */
    const dirtyRef = useRef(false);
    const savedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Always-current snapshot so performCloudSave/retry (stable callbacks)
    // send the latest data without needing to be re-created on every edit.
    const latest = useRef({ formData, visibleSections, settings, selectedTemplate, resumeId, userId });
    latest.current = { formData, visibleSections, settings, selectedTemplate, resumeId, userId };

    // --- debounced local cache: always on, signed in or not ---------------------
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(LS_KEYS.data, JSON.stringify(formData));
                localStorage.setItem(LS_KEYS.visibleSections, JSON.stringify(visibleSections));
                localStorage.setItem(LS_KEYS.settings, JSON.stringify(settings));
                localStorage.setItem(LS_KEYS.template, selectedTemplate);
            } catch (err) {
                console.error('Could not save state to local storage', err);
            }
        }, localDebounceMs);
        return () => clearTimeout(timer);
    }, [formData, visibleSections, settings, selectedTemplate, localDebounceMs]);

    // --- one-time cloud hydration -------------------------------------------------
    // Keyed on the user id (not the user object, which the auth context hands
    // out fresh on every token refresh) and the selected resume id, so this
    // never re-runs mid-edit and overwrites in-progress work with a stale
    // cloud snapshot.
    useEffect(() => {
        if (!userId) { setCloudLoaded(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const cloud = initialResumeId
                    ? (await resumeRepo.get(userId, initialResumeId)) ?? (await resumeRepo.getPrimary(userId))
                    : await resumeRepo.getPrimary(userId);
                if (cancelled) return;

                if (cloud) {
                    setResumeId(cloud.id ?? null);
                    const cloudUpdatedAt = (cloud as unknown as { updatedAt?: string }).updatedAt;
                    const syncedAt = cloudUpdatedAt ? localStorage.getItem(lastSyncedKey(cloud.id ?? null)) : null;
                    const hasLocalSnapshot = !!localStorage.getItem(LS_KEYS.data);

                    if (cloudUpdatedAt && syncedAt && hasLocalSnapshot && cloudUpdatedAt > syncedAt) {
                        setConflict({ cloud });
                    } else {
                        onHydrate({
                            resumeId: cloud.id ?? null,
                            formData: cloud.data,
                            visibleSections: cloud.visibleSections,
                            settings: cloud.settings,
                            templateId: cloud.templateId as TemplateId | undefined,
                        });
                        try {
                            localStorage.setItem(lastSyncedKey(cloud.id ?? null), cloudUpdatedAt ?? new Date().toISOString());
                        } catch { /* best-effort */ }
                    }
                } else {
                    const created = await resumeRepo.upsertPrimary(userId, {
                        title: 'My Resume', data: latest.current.formData, settings: latest.current.settings,
                        visibleSections: latest.current.visibleSections, templateId: latest.current.selectedTemplate,
                        isPrimary: true,
                    });
                    if (!cancelled) setResumeId(created.id ?? null);
                }
            } catch (err) {
                captureException(err, { context: 'resume-cloud-hydrate' });
            } finally {
                if (!cancelled) setCloudLoaded(true);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, initialResumeId]);

    const resolveConflict = useCallback((choice: 'useCloud' | 'keepMine') => {
        setConflict((current) => {
            if (!current) return null;
            const { cloud } = current;
            const cloudUpdatedAt = (cloud as unknown as { updatedAt?: string }).updatedAt ?? new Date().toISOString();
            if (choice === 'useCloud') {
                onHydrate({
                    resumeId: cloud.id ?? null,
                    formData: cloud.data,
                    visibleSections: cloud.visibleSections,
                    settings: cloud.settings,
                    templateId: cloud.templateId as TemplateId | undefined,
                });
            }
            // Either choice resolves the divergence for this device: record the
            // sync point so the next load doesn't re-prompt. "Keep mine" relies
            // on the normal autosave effect below to push local state up next.
            try { localStorage.setItem(lastSyncedKey(cloud.id ?? null), cloudUpdatedAt); } catch { /* best-effort */ }
            return null;
        });
    }, [onHydrate]);

    // --- cloud autosave -------------------------------------------------------------
    const performCloudSave = useCallback(async () => {
        const { formData: data, visibleSections: vis, settings: st, selectedTemplate: tpl, resumeId: id, userId: uid } = latest.current;
        if (!uid) return;
        setSaveState('saving');
        try {
            if (id) {
                await resumeRepo.saveById(uid, id, { data, settings: st, visibleSections: vis, templateId: tpl });
            } else {
                const created = await resumeRepo.upsertPrimary(uid, {
                    title: 'My Resume', data, settings: st, visibleSections: vis, templateId: tpl, isPrimary: true,
                });
                setResumeId(created.id ?? null);
            }
            dirtyRef.current = false;
            try { localStorage.setItem(lastSyncedKey(id), new Date().toISOString()); } catch { /* best-effort */ }
            setSaveState('saved');
            if (savedResetTimer.current) clearTimeout(savedResetTimer.current);
            savedResetTimer.current = setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
        } catch (err) {
            captureException(err, { context: 'resume-cloud-save' });
            setSaveState('error');
        }
    }, []);

    useEffect(() => {
        if (!userId || !cloudLoaded || conflict) return;
        dirtyRef.current = true;
        const timer = setTimeout(() => { void performCloudSave(); }, cloudDebounceMs);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, visibleSections, settings, selectedTemplate, userId, cloudLoaded, conflict, cloudDebounceMs, performCloudSave]);

    const retry = useCallback(() => { void performCloudSave(); }, [performCloudSave]);

    // --- unsaved cloud-changes guard (web only) --------------------------------------
    useEffect(() => {
        if (!userId || Capacitor.isNativePlatform()) return;
        const handler = (event: BeforeUnloadEvent) => {
            if (dirtyRef.current) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [userId]);

    useEffect(() => () => { if (savedResetTimer.current) clearTimeout(savedResetTimer.current); }, []);

    return { resumeId, cloudLoaded, saveState, retry, conflict, resolveConflict };
}
