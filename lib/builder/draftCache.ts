/**
 * Account/document scoped localStorage cache for the resume builder's draft.
 *
 * The builder used to keep one draft under shared keys (`cvbase-resume-data`,
 * `cvbase-visible-sections`, `cvbase-settings`, `cvbase-selected-template`)
 * regardless of who was signed in or which document was open, so an
 * anonymous draft could be adopted by whichever account signed in next and
 * two documents overwrote each other's cache. Drafts now live under
 *
 *     cvbase:draft:{scope}:{docKey}:{field}
 *
 * where `scope` is the user id (or `anon`) and `docKey` the resume id (or
 * `primary` for the primary/local flow). The draft is a recoverable cache,
 * never an owner: the cloud row (or, signed out, the person's device) remains
 * the record of truth.
 *
 * Legacy adapter (non-destructive): the first time the `anon`/`primary`
 * draft is read and has no scoped value, the legacy key's value is copied
 * into it. Only that scope inherits: a signed-in account never picks up the
 * device's anonymous draft by itself — that is the explicit claim flow
 * (`claimAnonymousDraft`). Legacy keys are never deleted.
 *
 * Mirror write: Dashboard.tsx and components/ats/AtsAnalyzer.tsx (owned
 * elsewhere) still read `cvbase-resume-data` for the "continue where you
 * left off" card, Smart Studio's resume input and the ATS fallback, and
 * App.tsx's handleCreateNew writes `cvbase-selected-template` as the "use
 * this template" hint. So the primary document's draft (any scope) is also
 * written to the legacy keys, and `cvbase:draft:legacy-owner` records which
 * scope wrote it last so the adapter above never adopts a signed-in mirror
 * into the anonymous scope.
 *
 * Every localStorage access is try/catch wrapped: private windows, blocked
 * storage and quota errors degrade to "no draft", never to a crash.
 */
import type { ResumeData, ResumeSettings, SectionId, TemplateId } from '../../types';

export const ANON_SCOPE = 'anon';
export const PRIMARY_DOC = 'primary';

export type DraftField = 'data' | 'visibleSections' | 'settings' | 'template';
export const DRAFT_FIELDS: readonly DraftField[] = ['data', 'visibleSections', 'settings', 'template'];

export const LEGACY_KEYS: Record<DraftField, string> = {
    data: 'cvbase-resume-data',
    visibleSections: 'cvbase-visible-sections',
    settings: 'cvbase-settings',
    template: 'cvbase-selected-template',
};
const LEGACY_OWNER_KEY = 'cvbase:draft:legacy-owner';
const DRAFT_PREFIX = 'cvbase:draft:';

export const draftScope = (userId: string | null | undefined): string => userId || ANON_SCOPE;
export const draftDocKey = (resumeId: string | null | undefined): string => resumeId || PRIMARY_DOC;

export const draftKey = (scope: string, docKey: string, field: DraftField): string =>
    `${DRAFT_PREFIX}${scope}:${docKey}:${field}`;

/** This device's last known sync point with the cloud row, per account and
 *  document, used by usePersistence's two-device conflict detection. */
export const lastSyncedKey = (scope: string, docKey: string): string => `cvbase:last-synced:${scope}:${docKey}`;

const safeGet = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key: string, value: string): boolean => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
};
const safeRemove = (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* best-effort */ }
};

/** Raw stored value for one field, running the legacy adapter for the
 *  anonymous primary draft. Returns null when nothing is cached. */
export function readDraft(scope: string, docKey: string, field: DraftField): string | null {
    const key = draftKey(scope, docKey, field);
    const scoped = safeGet(key);
    if (scoped !== null) return scoped;
    if (scope !== ANON_SCOPE || docKey !== PRIMARY_DOC) return null;
    // Legacy adapter: adopt the shared key once, unless a signed-in mirror
    // wrote it since (an account's draft must not leak into the anonymous
    // scope on a shared device).
    const owner = safeGet(LEGACY_OWNER_KEY);
    if (owner !== null && owner !== ANON_SCOPE) return null;
    const legacy = safeGet(LEGACY_KEYS[field]);
    if (legacy === null) return null;
    safeSet(key, legacy);
    return legacy;
}

export function writeDraft(scope: string, docKey: string, field: DraftField, value: string): void {
    safeSet(draftKey(scope, docKey, field), value);
    if (docKey === PRIMARY_DOC) {
        // Mirror write for the legacy readers listed in the module comment.
        safeSet(LEGACY_KEYS[field], value);
        safeSet(LEGACY_OWNER_KEY, scope);
    }
}

export function removeDraft(scope: string, docKey: string): void {
    for (const field of DRAFT_FIELDS) safeRemove(draftKey(scope, docKey, field));
    safeRemove(lastSyncedKey(scope, docKey));
}

export function readSyncedAt(scope: string, docKey: string): string | null {
    return safeGet(lastSyncedKey(scope, docKey));
}

export function writeSyncedAt(scope: string, docKey: string, iso: string): void {
    safeSet(lastSyncedKey(scope, docKey), iso);
}

/** The parsed draft. A null field means nothing (valid) is cached for it. */
export interface DraftPayload {
    formData: ResumeData | null;
    visibleSections: SectionId[] | null;
    settings: ResumeSettings | null;
    templateId: TemplateId | null;
}

const parseJson = <T>(raw: string | null): T | null => {
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
};

export function readDraftPayload(scope: string, docKey: string): DraftPayload {
    const data = parseJson<ResumeData>(readDraft(scope, docKey, 'data'));
    const visible = parseJson<SectionId[]>(readDraft(scope, docKey, 'visibleSections'));
    const settings = parseJson<ResumeSettings>(readDraft(scope, docKey, 'settings'));
    const template = readDraft(scope, docKey, 'template');
    return {
        formData: data && typeof data === 'object' ? data : null,
        visibleSections: Array.isArray(visible) ? visible : null,
        settings: settings && typeof settings === 'object' ? settings : null,
        templateId: template ? template as TemplateId : null,
    };
}

export function writeDraftPayload(
    scope: string, docKey: string,
    payload: { formData: ResumeData; visibleSections: SectionId[]; settings: ResumeSettings; templateId: TemplateId },
): void {
    writeDraft(scope, docKey, 'data', JSON.stringify(payload.formData));
    writeDraft(scope, docKey, 'visibleSections', JSON.stringify(payload.visibleSections));
    writeDraft(scope, docKey, 'settings', JSON.stringify(payload.settings));
    writeDraft(scope, docKey, 'template', payload.templateId);
}

/** Whether a resume draft is cached for this document at all. */
export function hasDraft(scope: string, docKey: string): boolean {
    return readDraft(scope, docKey, 'data') !== null;
}

/**
 * Initial template for a document. `cvbase-selected-template` doubles as the
 * "use this template" hint App.tsx's handleCreateNew writes right before
 * opening a new (primary/local) document, so for the primary document the
 * legacy key wins over the scoped draft. A specific resume id only consults
 * its own draft — the cloud row's template overrides it on hydration anyway.
 */
export function readTemplateHint(scope: string, docKey: string): string | null {
    if (docKey === PRIMARY_DOC) {
        const hint = safeGet(LEGACY_KEYS.template);
        if (hint) return hint;
    }
    return readDraft(scope, docKey, 'template');
}

/** A draft with no user-entered content: INITIAL_STATE-shaped, ignoring the
 *  defaults that are never empty (`phoneCountryCode`, `sectionOrder`). */
export function isBlankResumeData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return true;
    const d = data as Record<string, unknown>;
    const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';
    const contact = (d.contact && typeof d.contact === 'object' ? d.contact : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(contact)) if (k !== 'phoneCountryCode' && hasText(v)) return false;
    const summary = (d.summary && typeof d.summary === 'object' ? d.summary : {}) as Record<string, unknown>;
    if (Object.values(summary).some(hasText)) return false;
    for (const [k, v] of Object.entries(d)) {
        if (k === 'contact' || k === 'summary' || k === 'sectionOrder') continue;
        if (Array.isArray(v) && v.length > 0) return false;
    }
    return true;
}

export interface AnonymousDraftSummary {
    docKey: string;
    blank: boolean;
}

/** Every anonymous draft cached on this device (scoped keys only — the
 *  legacy key is not consulted here because, before this cache existed, it
 *  was written by signed-in sessions too and cannot be attributed). */
export function listAnonymousDrafts(): AnonymousDraftSummary[] {
    const prefix = `${DRAFT_PREFIX}${ANON_SCOPE}:`;
    const out: AnonymousDraftSummary[] = [];
    try {
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(prefix) || !key.endsWith(':data')) continue;
            const docKey = key.slice(prefix.length, -':data'.length);
            if (!docKey) continue;
            out.push({ docKey, blank: isBlankResumeData(parseJson(safeGet(key))) });
        }
    } catch { /* storage unavailable */ }
    return out;
}

export interface AnonymousDraftClaim {
    /** The anonymous draft, or null when there is nothing worth claiming. */
    draft: DraftPayload | null;
    /** The account's own cached draft for the same document on this device. */
    existing: DraftPayload | null;
    /** The account already has content of its own here — the UI must ask
     *  before replacing it (or offer to create a new document instead). */
    hasDuplicate: boolean;
    /** The anonymous draft and the account's draft hold the same content. */
    identical: boolean;
}

/**
 * Read the anonymous draft on behalf of an account so the UI can offer to
 * claim it. Deliberately not automatic and deliberately not destructive:
 * the caller applies the payload to the open document and then calls
 * `clearAnonymousDraft()` once it is safely owned by the account.
 */
export function claimAnonymousDraft(userId: string, docKey: string = PRIMARY_DOC): AnonymousDraftClaim {
    const anon = readDraftPayload(ANON_SCOPE, docKey);
    const draft = anon.formData && !isBlankResumeData(anon.formData) ? anon : null;
    const own = readDraftPayload(draftScope(userId), docKey);
    const existing = own.formData ? own : null;
    const hasDuplicate = !!existing && !isBlankResumeData(existing.formData);
    const identical = !!draft && !!existing && JSON.stringify(draft.formData) === JSON.stringify(existing.formData);
    return { draft, existing, hasDuplicate, identical };
}

/** Forget the anonymous draft for a document (scoped keys only; legacy keys
 *  are never deleted). */
export function clearAnonymousDraft(docKey: string = PRIMARY_DOC): void {
    removeDraft(ANON_SCOPE, docKey);
}
