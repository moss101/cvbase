/**
 * The resume builder's persistence pipeline, extracted from ResumeBuilder:
 *
 * - Always: a debounced localStorage cache (instant, works signed-out),
 *   scoped to the account and document (see lib/builder/draftCache.ts) so
 *   one account's draft never shows up under another and two open
 *   documents never overwrite each other's cache.
 * - Signed-in: one-time cloud hydration on mount/user-change, then a
 *   debounced push to Postgres on every edit, with a real `saveState`
 *   ('idle' | 'saving' | 'saved' | 'error') driven by the actual save
 *   promise instead of a timer that always claimed success.
 * - Document identity is explicit (`documentState`): a requested resume id
 *   that is missing or not owned is reported as `unavailable` — never
 *   silently swapped for the primary CV — and nothing is hydrated or
 *   autosaved for it. The `initialResumeId == null` path (primary / local
 *   flow) behaves as before.
 * - Optimistic concurrency: every cloud save carries the revision this
 *   device last read; a stale revision comes back as a `ConflictError` and is
 *   staged as a `ConflictInfo` (with the current cloud row) instead of
 *   overwriting. Hydration stages the same when the cloud row changed on
 *   another device after this device's last sync point and the local draft
 *   differs. `resolveConflict('useCloud' | 'keepMine')` settles it; "keep
 *   mine" re-saves once without the precondition and adopts the new revision.
 * - Account switch: when `userId` changes, the bound resume id, document
 *   state, staged conflict, known revision and pending autosave are all
 *   dropped, and the in-memory document is replaced by the new scope's own
 *   cached draft (or a blank one) before any cloud row can be created from
 *   it. A signed-in account never inherits the device's anonymous draft by
 *   itself: that is the explicit `claimAnonymousDraft` flow.
 * - A `beforeunload` guard (web only — Capacitor apps don't navigate away in
 *   the same sense) while a cloud write is outstanding or has failed.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import * as resumeRepo from '../../services/repos/resumeRepo';
import type { ResumeData, ResumeSettings, SectionId, TemplateId } from '../../types';
import type { StoredResume } from '../../services/repos/mappers';
import { INITIAL_STATE } from '../../constants';
import { captureException } from '../monitoring';
import {
    PRIMARY_DOC,
    claimAnonymousDraft as readAnonymousClaim,
    clearAnonymousDraft,
    hasDraft,
    isBlankResumeData,
    readDraftPayload,
    readSyncedAt,
    readTemplateHint,
    writeDraftPayload,
    writeSyncedAt,
    type DraftPayload,
} from './draftCache';
import {
    decideHydration,
    isConflictError,
    isNotFoundError,
    resolveDocumentIdentity,
    serializeSnapshot,
    toHydrationPayload,
    type CloudHydrationPayload,
    type DocumentState,
} from './persistenceLogic';

export type { CloudHydrationPayload, DocumentState } from './persistenceLogic';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Staged instead of silently clobbering whatever the user has open here:
 * either the cloud row looks newer than this device's last sync point
 * (`newer-in-cloud`, found at hydration) or a save was rejected because
 * another device saved first (`stale-revision`).
 */
export interface ConflictInfo {
    cloud: StoredResume;
    reason: 'newer-in-cloud' | 'stale-revision';
}

export interface AnonymousDraftStatus {
    /** A non-blank anonymous draft is cached on this device and differs
     *  from what the account holds. */
    available: boolean;
    /** The account already has content of its own here (ask before replacing). */
    hasDuplicate: boolean;
}

interface UsePersistenceArgs {
    userId: string | null | undefined;
    initialResumeId?: string | null;
    /** False while the auth session is still being restored, so a deep link
     *  to a specific resume reads as `loading` rather than `unavailable`
     *  until we know whether there is an account. Defaults to true. */
    authResolved?: boolean;
    formData: ResumeData;
    visibleSections: SectionId[];
    settings: ResumeSettings;
    selectedTemplate: TemplateId;
    /** Called with document data ready to apply — on cloud hydration, when a
     *  staged conflict is resolved with "Use cloud version", when the scope
     *  changes (account switch / sign-out) and when an anonymous draft is
     *  claimed. The caller owns merging with app defaults and resetting undo
     *  history. */
    onHydrate: (payload: CloudHydrationPayload) => void;
    /** localStorage cache debounce. Defaults to 300ms. */
    localDebounceMs?: number;
    /** Cloud push debounce. Defaults to 600ms. */
    cloudDebounceMs?: number;
}

interface UsePersistenceResult {
    resumeId: string | null;
    cloudLoaded: boolean;
    documentState: DocumentState;
    /** The id that was asked for, when `documentState` is 'unavailable'. */
    unavailableResumeId: string | null;
    saveState: SaveState;
    /** Re-attempt the last cloud save after an error (or the hydration, if
     *  that is what failed). */
    retry: () => void;
    conflict: ConflictInfo | null;
    resolveConflict: (choice: 'useCloud' | 'keepMine') => void;
    anonymousDraft: AnonymousDraftStatus;
    /** Apply the device's anonymous draft to the open document (explicit
     *  claim). The normal autosave then pushes it to the cloud. */
    claimAnonymousDraft: () => void;
    /** Forget the device's anonymous draft without applying it. */
    dismissAnonymousDraft: () => void;
}

const NO_ANON_DRAFT: AnonymousDraftStatus = { available: false, hasDuplicate: false };

/** The document a scope starts from when it has no cloud row to show yet:
 *  its own cached draft, else a blank one. `templateHint` already prefers
 *  the "use this template" key for the primary document (draftCache). */
const seedFromDraft = (local: DraftPayload, templateHint: string | null): CloudHydrationPayload => ({
    resumeId: null,
    formData: { ...INITIAL_STATE, ...(local.formData ?? {}) },
    visibleSections: local.visibleSections ?? [],
    settings: local.settings ?? ({} as ResumeSettings),
    templateId: (templateHint ?? local.templateId ?? 'default') as TemplateId,
});

export function usePersistence({
    userId,
    initialResumeId,
    authResolved = true,
    formData,
    visibleSections,
    settings,
    selectedTemplate,
    onHydrate,
    localDebounceMs = 300,
    cloudDebounceMs = 600,
}: UsePersistenceArgs): UsePersistenceResult {
    const identity = resolveDocumentIdentity(userId, initialResumeId);

    const [resumeId, setResumeId] = useState<string | null>(null);
    const [cloudLoaded, setCloudLoaded] = useState(false);
    const [documentState, setDocumentState] = useState<DocumentState>(() =>
        (userId ? 'loading' : initialResumeId ? (authResolved ? 'unavailable' : 'loading') : 'ready'));
    const [unavailableResumeId, setUnavailableResumeId] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [conflict, setConflict] = useState<ConflictInfo | null>(null);
    const [anonymousDraft, setAnonymousDraft] = useState<AnonymousDraftStatus>(NO_ANON_DRAFT);

    /** True while there is a cloud write outstanding or failed — drives the
     *  beforeunload guard. */
    const dirtyRef = useRef(false);
    const savedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** The revision this device last read or wrote for the bound row; sent
     *  as the precondition of the next save. */
    const revisionRef = useRef<number | null>(null);
    /** Serialised snapshot of what the cloud row holds as far as this device
     *  knows, so a re-render with identical content (hydration itself, the
     *  post-load merge) does not cause a write that bumps the revision and
     *  trips the other device's conflict check. */
    const lastPersistedRef = useRef<string | null>(null);
    /** Cache identity of the document currently in memory. Starts as the
     *  mount-time identity — ResumeBuilder loads its initial state from that
     *  same scoped draft — and moves when the hook applies another scope's
     *  data. Guards every write so data is never cached or created under an
     *  identity it does not belong to. */
    const appliedKeyRef = useRef(identity.key);
    const conflictRef = useRef<ConflictInfo | null>(null);
    conflictRef.current = conflict;
    const documentStateRef = useRef<DocumentState>(documentState);
    documentStateRef.current = documentState;
    const hydrateRef = useRef<() => void>(() => {});
    const onHydrateRef = useRef(onHydrate);
    onHydrateRef.current = onHydrate;

    // Always-current snapshot so performCloudSave/retry (stable callbacks)
    // send the latest data without needing to be re-created on every edit.
    const latest = useRef({ formData, visibleSections, settings, selectedTemplate, resumeId, userId, identity });
    latest.current = { formData, visibleSections, settings, selectedTemplate, resumeId, userId, identity };

    // --- debounced local cache: always on, signed in or not ---------------------
    useEffect(() => {
        const timer = setTimeout(() => {
            // Skip when the in-memory document still belongs to a previous
            // scope (the hydration effect replaces it right after this render).
            if (appliedKeyRef.current !== identity.key) return;
            writeDraftPayload(identity.scope, identity.docKey, {
                formData, visibleSections, settings, templateId: selectedTemplate,
            });
        }, localDebounceMs);
        return () => clearTimeout(timer);
    }, [formData, visibleSections, settings, selectedTemplate, localDebounceMs, identity.key, identity.scope, identity.docKey]);

    /** Bind the in-memory document to a cloud row: apply its content, adopt
     *  its revision and record the sync point. */
    const bindToCloud = useCallback((cloud: StoredResume, scope: string, docKey: string) => {
        const payload = toHydrationPayload(cloud);
        onHydrateRef.current(payload);
        appliedKeyRef.current = `${scope}:${docKey}`;
        lastPersistedRef.current = serializeSnapshot({
            formData: payload.formData, visibleSections: payload.visibleSections,
            settings: payload.settings, templateId: payload.templateId,
        });
        revisionRef.current = cloud.revision ?? null;
        setResumeId(cloud.id ?? null);
        writeSyncedAt(scope, cloud.id ?? docKey, cloud.updatedAt ?? new Date().toISOString());
        dirtyRef.current = false;
        setConflict(null);
        setDocumentState('ready');
    }, []);

    // --- one-time cloud hydration -------------------------------------------------
    // Keyed on the user id (not the user object, which the auth context hands
    // out fresh on every token refresh) and the selected resume id, so this
    // never re-runs mid-edit and overwrites in-progress work with a stale
    // cloud snapshot. An account switch lands here too: everything bound to
    // the previous account is dropped before the new one is looked up.
    useEffect(() => {
        const { scope, docKey, key } = identity;
        let cancelled = false;

        setResumeId(null);
        setCloudLoaded(false);
        setConflict(null);
        setUnavailableResumeId(null);
        setSaveState('idle');
        setAnonymousDraft(NO_ANON_DRAFT);
        revisionRef.current = null;
        lastPersistedRef.current = null;
        dirtyRef.current = false;

        // Never carry another scope's in-memory document into this one: show
        // this scope's own cached draft (or a blank document) instead. This is
        // what keeps user A's CV out of user B's freshly created primary row,
        // and the anonymous draft out of a newly signed-in account.
        const local = readDraftPayload(scope, docKey);
        if (appliedKeyRef.current !== key) {
            const seed = seedFromDraft(local, readTemplateHint(scope, docKey));
            onHydrateRef.current(seed);
            appliedKeyRef.current = key;
            // `latest` only catches up when React re-renders the seeded
            // document; the primary-creation path below (and StrictMode's
            // immediate second run of this effect) must already see it.
            latest.current = {
                ...latest.current,
                formData: seed.formData, visibleSections: seed.visibleSections,
                settings: seed.settings, selectedTemplate: seed.templateId as TemplateId,
            };
        }

        if (!userId) {
            if (!initialResumeId) setDocumentState('ready');
            return;
        }

        // The device's anonymous draft is offered for an explicit claim on the
        // primary document only — never applied on its own.
        const claim = docKey === PRIMARY_DOC ? readAnonymousClaim(userId) : null;
        const offerAnonymousDraft = (cloudData: ResumeData | null) => {
            if (!claim?.draft?.formData) { setAnonymousDraft(NO_ANON_DRAFT); return; }
            const sameAsCloud = !!cloudData && JSON.stringify(claim.draft.formData) === JSON.stringify(cloudData);
            setAnonymousDraft(sameAsCloud ? NO_ANON_DRAFT : {
                available: true,
                hasDuplicate: claim.hasDuplicate || (!!cloudData && !isBlankResumeData(cloudData)),
            });
        };

        const stage = (cloud: StoredResume) => {
            const decision = decideHydration({
                cloudUpdatedAt: cloud.updatedAt,
                syncedAt: readSyncedAt(scope, cloud.id ?? docKey),
                localData: hasDraft(scope, docKey) ? local.formData : null,
                cloudData: cloud.data,
            });
            if (decision === 'conflict') {
                // Another device saved after this one last synced and the
                // local draft differs: let the user choose, do not overwrite.
                setResumeId(cloud.id ?? null);
                setConflict({ cloud, reason: 'newer-in-cloud' });
                setDocumentState('conflict');
            } else {
                bindToCloud(cloud, scope, docKey);
            }
            offerAnonymousDraft(cloud.data);
            setCloudLoaded(true);
        };

        const run = async () => {
            setDocumentState('loading');
            setSaveState('idle');
            try {
                if (initialResumeId) {
                    const cloud = await resumeRepo.get(userId, initialResumeId);
                    if (cancelled) return;
                    if (!cloud) {
                        // Missing or not ours. Say so; do not open something else.
                        setUnavailableResumeId(initialResumeId);
                        setDocumentState('unavailable');
                        return;
                    }
                    stage(cloud);
                    return;
                }

                const cloud = await resumeRepo.getPrimary(userId);
                if (cancelled) return;
                if (cloud) { stage(cloud); return; }

                // No primary yet: create it from this scope's own document
                // (its cached draft or a blank one — never another scope's).
                const source = latest.current;
                const created = await resumeRepo.upsertPrimary(userId, {
                    title: 'My Resume', data: source.formData, settings: source.settings,
                    visibleSections: source.visibleSections, templateId: source.selectedTemplate,
                    isPrimary: true,
                });
                if (cancelled) return;
                revisionRef.current = created.revision ?? null;
                lastPersistedRef.current = serializeSnapshot({
                    formData: source.formData, visibleSections: source.visibleSections,
                    settings: source.settings, templateId: source.selectedTemplate,
                });
                setResumeId(created.id ?? null);
                writeSyncedAt(scope, created.id ?? docKey, created.updatedAt ?? new Date().toISOString());
                setDocumentState('ready');
                offerAnonymousDraft(source.formData);
                setCloudLoaded(true);
            } catch (err) {
                if (cancelled) return;
                captureException(err, { context: 'resume-cloud-hydrate' });
                // Stay 'loading' (nothing is pushed for an unresolved document)
                // and surface it through the retryable error state.
                setSaveState('error');
            }
        };

        hydrateRef.current = () => { void run(); };
        void run();
        return () => { cancelled = true; hydrateRef.current = () => {}; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, initialResumeId]);

    // Signed out with a specific id requested: unavailable once we know there
    // is no session to look it up with (kept out of the hydration effect so a
    // transient auth `loading` flip never re-hydrates a signed-in editor).
    useEffect(() => {
        if (userId || !initialResumeId) return;
        setUnavailableResumeId(authResolved ? initialResumeId : null);
        setDocumentState(authResolved ? 'unavailable' : 'loading');
    }, [userId, initialResumeId, authResolved]);

    // --- cloud autosave -------------------------------------------------------------
    const performCloudSave = useCallback(async (opts?: { force?: boolean }) => {
        const {
            formData: data, visibleSections: vis, settings: st, selectedTemplate: tpl,
            resumeId: id, userId: uid, identity: { scope, docKey, key },
        } = latest.current;
        if (!uid) return;
        const snapshot = serializeSnapshot({ formData: data, visibleSections: vis, settings: st, templateId: tpl });
        if (!opts?.force && snapshot === lastPersistedRef.current) { dirtyRef.current = false; return; }
        // A save that completes after an account switch must not touch the
        // new account's bookkeeping.
        const stillCurrent = () => latest.current.identity.key === key;
        setSaveState('saving');
        try {
            let savedId = id;
            let syncedAt: string | null = null;
            if (id) {
                const expected = opts?.force ? undefined : (revisionRef.current ?? undefined);
                const saved = await resumeRepo.saveById(uid, id, { data, settings: st, visibleSections: vis, templateId: tpl }, expected);
                if (!stillCurrent()) return;
                if (saved.revision !== null) revisionRef.current = saved.revision;
                syncedAt = saved.updatedAt;
            } else {
                const created = await resumeRepo.upsertPrimary(uid, {
                    title: 'My Resume', data, settings: st, visibleSections: vis, templateId: tpl, isPrimary: true,
                });
                if (!stillCurrent()) return;
                savedId = created.id ?? null;
                revisionRef.current = created.revision ?? null;
                syncedAt = created.updatedAt ?? null;
                setResumeId(savedId);
            }
            lastPersistedRef.current = snapshot;
            dirtyRef.current = false;
            writeSyncedAt(scope, savedId ?? docKey, syncedAt ?? new Date().toISOString());
            setSaveState('saved');
            if (savedResetTimer.current) clearTimeout(savedResetTimer.current);
            savedResetTimer.current = setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
        } catch (err) {
            if (!stillCurrent()) return;
            if (isConflictError(err) && id) {
                // Another device saved first. Fetch what it wrote and let the
                // user review it; this device's edits stay in memory and in
                // the scoped draft until they choose.
                let cloud: StoredResume | null = null;
                try {
                    cloud = await resumeRepo.get(uid, id);
                } catch (fetchErr) {
                    captureException(fetchErr, { context: 'resume-cloud-conflict-fetch' });
                    setSaveState('error');
                    return;
                }
                if (!stillCurrent()) return;
                if (cloud) {
                    setConflict({ cloud, reason: 'stale-revision' });
                    setDocumentState('conflict');
                } else {
                    setUnavailableResumeId(id);
                    setDocumentState('unavailable');
                }
                setSaveState('idle');
                return;
            }
            if (isNotFoundError(err) && id) {
                // The row is gone (deleted elsewhere) or no longer ours.
                setUnavailableResumeId(id);
                setDocumentState('unavailable');
                setSaveState('idle');
                return;
            }
            captureException(err, { context: 'resume-cloud-save' });
            setSaveState('error');
        }
    }, []);

    useEffect(() => {
        if (!userId || !cloudLoaded || conflict || documentState !== 'ready') return;
        dirtyRef.current = true;
        const timer = setTimeout(() => { void performCloudSave(); }, cloudDebounceMs);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, visibleSections, settings, selectedTemplate, userId, cloudLoaded, conflict, documentState, cloudDebounceMs, performCloudSave]);

    const resolveConflict = useCallback((choice: 'useCloud' | 'keepMine') => {
        const current = conflictRef.current;
        if (!current) return;
        const { cloud } = current;
        const { scope, docKey } = latest.current.identity;
        if (choice === 'useCloud') {
            bindToCloud(cloud, scope, docKey);
            setSaveState('idle');
            return;
        }
        // Keep mine: push this device's document over the cloud row exactly
        // once without the revision precondition, then adopt the revision the
        // server hands back so the next save is checked again.
        setConflict(null);
        setDocumentState('ready');
        revisionRef.current = cloud.revision ?? revisionRef.current;
        void performCloudSave({ force: true });
    }, [bindToCloud, performCloudSave]);

    const retry = useCallback(() => {
        if (documentStateRef.current === 'loading') hydrateRef.current();
        else void performCloudSave();
    }, [performCloudSave]);

    // --- explicit anonymous-draft claim -------------------------------------------
    const claimAnonymousDraft = useCallback(() => {
        const { userId: uid, identity: { key } } = latest.current;
        if (!uid) return;
        const claim = readAnonymousClaim(uid);
        if (claim.draft?.formData) {
            onHydrateRef.current({
                resumeId: latest.current.resumeId,
                formData: claim.draft.formData,
                visibleSections: claim.draft.visibleSections ?? [],
                settings: claim.draft.settings ?? ({} as ResumeSettings),
                templateId: claim.draft.templateId ?? undefined,
            });
            appliedKeyRef.current = key;
            // The autosave effect sees the changed document and pushes it up.
        }
        clearAnonymousDraft();
        setAnonymousDraft(NO_ANON_DRAFT);
    }, []);

    const dismissAnonymousDraft = useCallback(() => {
        clearAnonymousDraft();
        setAnonymousDraft(NO_ANON_DRAFT);
    }, []);

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

    return {
        resumeId, cloudLoaded, documentState, unavailableResumeId, saveState, retry,
        conflict, resolveConflict, anonymousDraft, claimAnonymousDraft, dismissAnonymousDraft,
    };
}
