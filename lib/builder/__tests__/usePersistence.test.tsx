// @vitest-environment jsdom
import React, { act, useCallback, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLocalStorage } from './localStorageStub';
import type { ResumeData, ResumeSettings, SectionId, TemplateId } from '../../../types';
import type { StoredResume } from '../../../services/repos/mappers';
import { ConflictError, NotFoundError } from '../../../services/careerOs/types';
import { INITIAL_STATE } from '../../../constants';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
installLocalStorage();

const repo = {
    get: vi.fn<(userId: string, id: string) => Promise<StoredResume | null>>(),
    getPrimary: vi.fn<(userId: string) => Promise<StoredResume | null>>(),
    upsertPrimary: vi.fn<(userId: string, r: StoredResume) => Promise<StoredResume>>(),
    saveById: vi.fn<(userId: string, id: string, r: Partial<StoredResume>, expectedRevision?: number) => Promise<{ id: string; revision: number | null; updatedAt: string | null }>>(),
};
vi.mock('../../../services/repos/resumeRepo', () => ({
    get: (...a: [string, string]) => repo.get(...a),
    getPrimary: (...a: [string]) => repo.getPrimary(...a),
    upsertPrimary: (...a: [string, StoredResume]) => repo.upsertPrimary(...a),
    saveById: (...a: [string, string, Partial<StoredResume>, number?]) => repo.saveById(...a),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('../../monitoring', () => ({ captureException: vi.fn() }));

import { usePersistence, type CloudHydrationPayload } from '../usePersistence';
import { draftKey, lastSyncedKey, LEGACY_KEYS } from '../draftCache';

const cv = (firstName: string): ResumeData => ({ ...INITIAL_STATE, contact: { ...INITIAL_STATE.contact, firstName } });
const row = (id: string, firstName: string, over: Partial<StoredResume> = {}): StoredResume => ({
    id, title: 'My Resume', data: cv(firstName), settings: { fontSize: 'medium' } as ResumeSettings,
    templateId: 'default', visibleSections: ['skills'], isPrimary: true,
    revision: 3, updatedAt: '2026-09-20T10:00:00Z', applicationId: null, origin: null, ...over,
});

type Hook = ReturnType<typeof usePersistence>;
interface ProbeState extends Hook { formData: ResumeData; setFormData: (d: ResumeData) => void; hydrations: CloudHydrationPayload[] }
interface ProbeProps {
    userId: string | null;
    initialResumeId?: string | null;
    authResolved?: boolean;
    initial?: ResumeData;
    probe: { current: ProbeState | null };
}

const Probe: React.FC<ProbeProps> = ({ userId, initialResumeId = null, authResolved, initial = INITIAL_STATE, probe }) => {
    const [formData, setFormData] = useState<ResumeData>(initial);
    const [visibleSections, setVisibleSections] = useState<SectionId[]>(['skills']);
    const [settings, setSettings] = useState<ResumeSettings>({ fontSize: 'medium' } as ResumeSettings);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('default');
    const [hydrations, setHydrations] = useState<CloudHydrationPayload[]>([]);
    const onHydrate = useCallback((p: CloudHydrationPayload) => {
        setFormData(p.formData);
        setVisibleSections(p.visibleSections);
        setSettings(p.settings);
        if (p.templateId) setSelectedTemplate(p.templateId);
        setHydrations((h) => [...h, p]);
    }, []);
    const hook = usePersistence({
        userId, initialResumeId, authResolved, formData, visibleSections, settings, selectedTemplate, onHydrate,
        localDebounceMs: 1, cloudDebounceMs: 1,
    });
    probe.current = { ...hook, formData, setFormData, hydrations };
    return null;
};

let root: Root;
let container: HTMLDivElement;
const probe: { current: ProbeState | null } = { current: null };
const p = () => probe.current!;

const render = (props: Omit<ProbeProps, 'probe'>, strict = false) => act(() => root.render(
    strict ? <React.StrictMode><Probe {...props} probe={probe} /></React.StrictMode> : <Probe {...props} probe={probe} />,
));
/** Let debounces (1ms) and mocked promises settle. */
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
const edit = (firstName: string) => act(() => p().setFormData(cv(firstName)));

beforeEach(() => {
    localStorage.clear();
    repo.get.mockReset(); repo.getPrimary.mockReset(); repo.upsertPrimary.mockReset(); repo.saveById.mockReset();
    repo.saveById.mockImplementation(async (_u, id, _r, expected) => ({ id, revision: (expected ?? 0) + 1, updatedAt: '2026-09-20T11:00:00Z' }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe('usePersistence: document identity', () => {
    it('reports a missing requested id as unavailable and never opens the primary', async () => {
        repo.get.mockResolvedValue(null);
        repo.getPrimary.mockResolvedValue(row('p1', 'Primary'));
        await render({ userId: 'u1', initialResumeId: 'r-missing' });
        await flush();
        expect(p().documentState).toBe('unavailable');
        expect(p().unavailableResumeId).toBe('r-missing');
        expect(p().resumeId).toBeNull();
        expect(repo.get).toHaveBeenCalledWith('u1', 'r-missing');
        expect(repo.getPrimary).not.toHaveBeenCalled();
        expect(repo.upsertPrimary).not.toHaveBeenCalled();
        expect(p().hydrations).toEqual([]);
        // No autosave for a document we could not open.
        await edit('Typing');
        await flush();
        expect(repo.saveById).not.toHaveBeenCalled();
        expect(repo.upsertPrimary).not.toHaveBeenCalled();
    });
    it('opens the requested id when it exists and autosaves it with its revision', async () => {
        repo.get.mockResolvedValue(row('r2', 'Tailored', { revision: 7, isPrimary: false }));
        await render({ userId: 'u1', initialResumeId: 'r2' });
        await flush();
        expect(p().documentState).toBe('ready');
        expect(p().resumeId).toBe('r2');
        expect(p().formData.contact.firstName).toBe('Tailored');
        // Hydration itself is not written back (would bump the revision for nothing).
        expect(repo.saveById).not.toHaveBeenCalled();
        await edit('Tailored v2');
        await flush();
        expect(repo.saveById).toHaveBeenCalledTimes(1);
        expect(repo.saveById.mock.calls[0][1]).toBe('r2');
        expect(repo.saveById.mock.calls[0][3]).toBe(7);
        expect(p().saveState).toBe('saved');
        // Next save carries the revision the server handed back.
        await edit('Tailored v3');
        await flush();
        expect(repo.saveById.mock.calls[1][3]).toBe(8);
        expect(localStorage.getItem(draftKey('u1', 'r2', 'data'))).toBe(JSON.stringify(cv('Tailored v3')));
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBeNull(); // specific documents are not mirrored
    });
    it('keeps the primary/local flow: hydrates the primary, creates one when absent', async () => {
        repo.getPrimary.mockResolvedValue(row('p1', 'Primary'));
        await render({ userId: 'u1' });
        await flush();
        expect(p().documentState).toBe('ready');
        expect(p().resumeId).toBe('p1');
        expect(p().formData.contact.firstName).toBe('Primary');
        expect(repo.get).not.toHaveBeenCalled();
        expect(repo.upsertPrimary).not.toHaveBeenCalled();
        expect(localStorage.getItem(draftKey('u1', 'primary', 'data'))).toBe(JSON.stringify(cv('Primary')));
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBe(JSON.stringify(cv('Primary'))); // Dashboard mirror
        expect(localStorage.getItem(lastSyncedKey('u1', 'p1'))).toBe('2026-09-20T10:00:00Z');
    });
    it('signed out: local flow is ready immediately and a requested id is unavailable once auth is resolved', async () => {
        await render({ userId: null });
        expect(p().documentState).toBe('ready');
        await render({ userId: null, initialResumeId: 'r2', authResolved: false });
        await flush();
        expect(p().documentState).toBe('loading');
        await render({ userId: null, initialResumeId: 'r2', authResolved: true });
        await flush();
        expect(p().documentState).toBe('unavailable');
        expect(p().unavailableResumeId).toBe('r2');
        expect(repo.get).not.toHaveBeenCalled();
    });
    it('a failed hydration stays unresolved (no autosave) and retry re-hydrates', async () => {
        repo.getPrimary.mockRejectedValueOnce(new Error('offline'));
        await render({ userId: 'u1' });
        await flush();
        expect(p().documentState).toBe('loading');
        expect(p().saveState).toBe('error');
        await edit('Offline edit');
        await flush();
        expect(repo.saveById).not.toHaveBeenCalled();
        expect(repo.upsertPrimary).not.toHaveBeenCalled();
        repo.getPrimary.mockResolvedValue(row('p1', 'Primary'));
        await act(() => p().retry());
        await flush();
        expect(p().documentState).toBe('ready');
        expect(p().saveState).toBe('idle');
        expect(p().resumeId).toBe('p1');
    });
});

describe('usePersistence: optimistic concurrency', () => {
    it('stages a conflict on a stale revision instead of overwriting, then "keep mine" re-saves once without the precondition', async () => {
        repo.getPrimary.mockResolvedValue(row('p1', 'Primary', { revision: 3 }));
        await render({ userId: 'u1' });
        await flush();
        const theirs = row('p1', 'Theirs', { revision: 5, updatedAt: '2026-09-20T10:30:00Z' });
        repo.saveById.mockRejectedValueOnce(new ConflictError('resume', 'p1', 3));
        repo.get.mockResolvedValue(theirs);
        await edit('Mine');
        await flush();
        expect(repo.saveById).toHaveBeenCalledTimes(1);
        expect(repo.saveById.mock.calls[0][3]).toBe(3);
        expect(p().conflict).toEqual({ cloud: theirs, reason: 'stale-revision' });
        expect(p().documentState).toBe('conflict');
        expect(p().saveState).toBe('idle');
        expect(p().formData.contact.firstName).toBe('Mine'); // nothing overwritten either way

        // Editing while the conflict is staged does not push anything.
        await edit('Mine again');
        await flush();
        expect(repo.saveById).toHaveBeenCalledTimes(1);

        await act(() => p().resolveConflict('keepMine'));
        await flush();
        expect(p().conflict).toBeNull();
        expect(p().documentState).toBe('ready');
        const forced = repo.saveById.mock.calls[1];
        expect(forced[3]).toBeUndefined();
        expect((forced[2].data as ResumeData).contact.firstName).toBe('Mine again');
        // Adopted the revision the forced save returned: 0 + 1 = 1 in the mock.
        await edit('Mine v3');
        await flush();
        expect(repo.saveById.mock.calls[repo.saveById.mock.calls.length - 1][3]).toBe(1);
    });
    it('"use cloud" applies the cloud row and continues from its revision', async () => {
        repo.getPrimary.mockResolvedValue(row('p1', 'Primary', { revision: 3 }));
        await render({ userId: 'u1' });
        await flush();
        const theirs = row('p1', 'Theirs', { revision: 5, updatedAt: '2026-09-20T10:30:00Z' });
        repo.saveById.mockRejectedValueOnce(new ConflictError('resume', 'p1', 3));
        repo.get.mockResolvedValue(theirs);
        await edit('Mine');
        await flush();
        expect(p().conflict?.reason).toBe('stale-revision');
        await act(() => p().resolveConflict('useCloud'));
        await flush();
        expect(p().formData.contact.firstName).toBe('Theirs');
        expect(p().documentState).toBe('ready');
        expect(repo.saveById).toHaveBeenCalledTimes(1); // applying the cloud row is not written back
        expect(localStorage.getItem(lastSyncedKey('u1', 'p1'))).toBe('2026-09-20T10:30:00Z');
        await edit('After cloud');
        await flush();
        expect(repo.saveById.mock.calls[1][3]).toBe(5);
    });
    it('a save error stays retryable and keeps the precondition', async () => {
        repo.getPrimary.mockResolvedValue(row('p1', 'Primary', { revision: 3 }));
        await render({ userId: 'u1' });
        await flush();
        repo.saveById.mockRejectedValueOnce(new Error('network'));
        await edit('Mine');
        await flush();
        expect(p().saveState).toBe('error');
        expect(p().documentState).toBe('ready');
        await act(() => p().retry());
        await flush();
        expect(p().saveState).toBe('saved');
        expect(repo.saveById).toHaveBeenCalledTimes(2);
        expect(repo.saveById.mock.calls[1][3]).toBe(3);
    });
    it('a row deleted elsewhere becomes unavailable on save', async () => {
        repo.get.mockResolvedValue(row('r2', 'Tailored', { revision: 2, isPrimary: false }));
        await render({ userId: 'u1', initialResumeId: 'r2' });
        await flush();
        repo.saveById.mockRejectedValueOnce(new NotFoundError('resume', 'r2'));
        await edit('Mine');
        await flush();
        expect(p().documentState).toBe('unavailable');
        expect(p().unavailableResumeId).toBe('r2');
        expect(p().saveState).toBe('idle');
        await edit('More');
        await flush();
        expect(repo.saveById).toHaveBeenCalledTimes(1);
    });
});

describe('usePersistence: two devices', () => {
    it('stages a conflict at hydration when the cloud is newer than this device and the local draft differs', async () => {
        localStorage.setItem(draftKey('u1', 'primary', 'data'), JSON.stringify(cv('Device A')));
        localStorage.setItem(lastSyncedKey('u1', 'p1'), '2026-09-20T09:00:00Z');
        const theirs = row('p1', 'Device B', { revision: 9, updatedAt: '2026-09-20T10:00:00Z' });
        repo.getPrimary.mockResolvedValue(theirs);
        await render({ userId: 'u1', initial: cv('Device A') });
        await flush();
        expect(p().conflict).toEqual({ cloud: theirs, reason: 'newer-in-cloud' });
        expect(p().documentState).toBe('conflict');
        expect(p().resumeId).toBe('p1');
        expect(p().formData.contact.firstName).toBe('Device A');
        expect(repo.saveById).not.toHaveBeenCalled();
        expect(p().hydrations).toEqual([]);
        await act(() => p().resolveConflict('useCloud'));
        await flush();
        expect(p().formData.contact.firstName).toBe('Device B');
        expect(p().documentState).toBe('ready');
        expect(repo.saveById).not.toHaveBeenCalled();
    });
    it('"keep mine" at hydration pushes the local draft once without a precondition', async () => {
        localStorage.setItem(draftKey('u1', 'primary', 'data'), JSON.stringify(cv('Device A')));
        localStorage.setItem(lastSyncedKey('u1', 'p1'), '2026-09-20T09:00:00Z');
        repo.getPrimary.mockResolvedValue(row('p1', 'Device B', { revision: 9, updatedAt: '2026-09-20T10:00:00Z' }));
        await render({ userId: 'u1', initial: cv('Device A') });
        await flush();
        await act(() => p().resolveConflict('keepMine'));
        await flush();
        expect(repo.saveById).toHaveBeenCalledTimes(1);
        expect(repo.saveById.mock.calls[0][3]).toBeUndefined();
        expect((repo.saveById.mock.calls[0][2].data as ResumeData).contact.firstName).toBe('Device A');
        expect(p().documentState).toBe('ready');
    });
    it('hydrates silently when the local draft already matches the newer cloud row', async () => {
        localStorage.setItem(draftKey('u1', 'primary', 'data'), JSON.stringify(cv('Same')));
        localStorage.setItem(lastSyncedKey('u1', 'p1'), '2026-09-20T09:00:00Z');
        repo.getPrimary.mockResolvedValue(row('p1', 'Same', { updatedAt: '2026-09-20T10:00:00Z' }));
        await render({ userId: 'u1', initial: cv('Same') });
        await flush();
        expect(p().conflict).toBeNull();
        expect(p().documentState).toBe('ready');
    });
});

describe('usePersistence: account switch', () => {
    it('two users in sequence: nothing of the first account reaches the second', async () => {
        repo.getPrimary.mockImplementation(async (uid) => (uid === 'uA' ? row('pA', 'Alice', { revision: 4 }) : null));
        repo.upsertPrimary.mockImplementation(async (_uid, r) => ({ ...r, id: 'pB', revision: 1, updatedAt: '2026-09-20T12:00:00Z' }));
        await render({ userId: 'uA' });
        await flush();
        expect(p().resumeId).toBe('pA');
        await edit('Alice edited');
        await flush();
        expect(repo.saveById).toHaveBeenCalledTimes(1);

        // Stage a conflict for A so we can see it being dropped.
        repo.saveById.mockRejectedValueOnce(new ConflictError('resume', 'pA', 5));
        repo.get.mockResolvedValue(row('pA', 'Alice elsewhere', { revision: 6 }));
        await edit('Alice again');
        await flush();
        expect(p().conflict).not.toBeNull();

        await render({ userId: 'uB' });
        await flush();
        expect(p().conflict).toBeNull();
        expect(p().documentState).toBe('ready');
        expect(p().resumeId).toBe('pB');
        expect(p().saveState).not.toBe('error');
        // B's new primary was seeded from a blank document, not from Alice's CV …
        expect(repo.upsertPrimary).toHaveBeenCalledTimes(1);
        expect(repo.upsertPrimary.mock.calls[0][0]).toBe('uB');
        expect((repo.upsertPrimary.mock.calls[0][1].data as ResumeData).contact.firstName).toBe('');
        // … and the editor shows B's (blank) document, not Alice's.
        expect(p().formData.contact.firstName).toBe('');
        // A's pending edit was never written under B.
        expect(repo.saveById.mock.calls.every(([uid]) => uid === 'uA')).toBe(true);
        expect(localStorage.getItem(draftKey('uA', 'primary', 'data'))).toBe(JSON.stringify(cv('Alice again')));
        expect(localStorage.getItem(draftKey('uB', 'primary', 'data'))).toBe(JSON.stringify(INITIAL_STATE));

        // B's edits go to B's row with B's revision.
        await edit('Bob');
        await flush();
        const last = repo.saveById.mock.calls[repo.saveById.mock.calls.length - 1];
        expect(last[0]).toBe('uB');
        expect(last[1]).toBe('pB');
        expect(last[3]).toBe(1);
    });
    it('the second account opens its own cached draft when it has no cloud row yet', async () => {
        repo.getPrimary.mockImplementation(async (uid) => (uid === 'uA' ? row('pA', 'Alice') : null));
        repo.upsertPrimary.mockImplementation(async (_uid, r) => ({ ...r, id: 'pB', revision: 1 }));
        localStorage.setItem(draftKey('uB', 'primary', 'data'), JSON.stringify(cv('Bob draft')));
        await render({ userId: 'uA' });
        await flush();
        await render({ userId: 'uB' });
        await flush();
        expect(p().formData.contact.firstName).toBe('Bob draft');
        expect((repo.upsertPrimary.mock.calls[0][1].data as ResumeData).contact.firstName).toBe('Bob draft');
    });
    it('under StrictMode (double-invoked effects) the second account is still seeded blank, once', async () => {
        repo.getPrimary.mockImplementation(async (uid) => (uid === 'uA' ? row('pA', 'Alice') : null));
        repo.upsertPrimary.mockImplementation(async (_uid, r) => ({ ...r, id: 'pB', revision: 1 }));
        await render({ userId: 'uA' }, true);
        await flush();
        expect(p().formData.contact.firstName).toBe('Alice');
        await render({ userId: 'uB' }, true);
        await flush();
        expect(repo.upsertPrimary).toHaveBeenCalledTimes(1);
        expect((repo.upsertPrimary.mock.calls[0][1].data as ResumeData).contact.firstName).toBe('');
        expect(p().resumeId).toBe('pB');
        expect(p().formData.contact.firstName).toBe('');
    });
    it('sign-out drops the account document and shows the anonymous draft', async () => {
        repo.getPrimary.mockResolvedValue(row('pA', 'Alice'));
        localStorage.setItem(draftKey('anon', 'primary', 'data'), JSON.stringify(cv('Visitor')));
        await render({ userId: 'uA' });
        await flush();
        expect(p().formData.contact.firstName).toBe('Alice');
        await render({ userId: null });
        await flush();
        expect(p().resumeId).toBeNull();
        expect(p().documentState).toBe('ready');
        expect(p().formData.contact.firstName).toBe('Visitor');
        expect(localStorage.getItem(draftKey('uA', 'primary', 'data'))).toBe(JSON.stringify(cv('Alice')));
        await edit('Visitor edit');
        await flush();
        expect(repo.saveById).not.toHaveBeenCalled();
        expect(localStorage.getItem(draftKey('uA', 'primary', 'data'))).toBe(JSON.stringify(cv('Alice')));
        expect(localStorage.getItem(draftKey('anon', 'primary', 'data'))).toBe(JSON.stringify(cv('Visitor edit')));
    });
});

describe('usePersistence: anonymous draft claim', () => {
    it('never claims the anonymous draft by itself, offers it, and applies it only on request', async () => {
        localStorage.setItem(draftKey('anon', 'primary', 'data'), JSON.stringify(cv('Visitor')));
        localStorage.setItem(LEGACY_KEYS.data, JSON.stringify(cv('Visitor')));
        repo.getPrimary.mockResolvedValue(null);
        repo.upsertPrimary.mockImplementation(async (_uid, r) => ({ ...r, id: 'p1', revision: 1 }));
        // Cold start: the editor mounted with the anonymous draft, then the session resolved.
        await render({ userId: null, initial: cv('Visitor') });
        await render({ userId: 'u1' });
        await flush();
        expect(p().documentState).toBe('ready');
        expect((repo.upsertPrimary.mock.calls[0][1].data as ResumeData).contact.firstName).toBe('');
        expect(p().formData.contact.firstName).toBe('');
        expect(p().anonymousDraft).toEqual({ available: true, hasDuplicate: false });
        expect(localStorage.getItem(draftKey('anon', 'primary', 'data'))).toBe(JSON.stringify(cv('Visitor')));

        await act(() => p().claimAnonymousDraft());
        await flush();
        expect(p().formData.contact.firstName).toBe('Visitor');
        expect(p().anonymousDraft.available).toBe(false);
        const last = repo.saveById.mock.calls[repo.saveById.mock.calls.length - 1];
        expect(last[1]).toBe('p1');
        expect((last[2].data as ResumeData).contact.firstName).toBe('Visitor');
        expect(localStorage.getItem(draftKey('anon', 'primary', 'data'))).toBeNull();
        expect(localStorage.getItem(LEGACY_KEYS.data)).not.toBeNull(); // legacy keys are never deleted
    });
    it('does not offer a draft the account already holds, and dismiss forgets it', async () => {
        localStorage.setItem(draftKey('anon', 'primary', 'data'), JSON.stringify(cv('Same')));
        repo.getPrimary.mockResolvedValue(row('p1', 'Same'));
        await render({ userId: 'u1' });
        await flush();
        expect(p().anonymousDraft.available).toBe(false);

        localStorage.setItem(draftKey('anon', 'primary', 'data'), JSON.stringify(cv('Other')));
        await render({ userId: 'u2' });
        await flush();
        expect(p().anonymousDraft).toEqual({ available: true, hasDuplicate: true });
        await act(() => p().dismissAnonymousDraft());
        expect(p().anonymousDraft.available).toBe(false);
        expect(localStorage.getItem(draftKey('anon', 'primary', 'data'))).toBeNull();
        expect(p().formData.contact.firstName).toBe('Same');
    });
});
