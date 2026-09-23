// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();
const openAuth = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: null, invalidate: vi.fn(), isAdmin: false, profile: null, migration: 'idle', refreshInbox: vi.fn(), openAuth }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), route: { view: 'career', space: 'today' } }), useBackHandler: () => undefined };
});
vi.mock('../../../lib/useMobileShell', () => ({ useMobileShell: () => false }));
vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/repos/resumeRepo', () => ({ list: vi.fn(), getPrimary: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/repos/prismRepo', () => ({ isPrismEnabled: vi.fn() }));
vi.mock('../../templates/TemplatePreviewRegistry', () => ({ LazyTemplatePreview: () => <div data-testid="preview" /> }));

import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as prismRepo from '../../../services/repos/prismRepo';
import { ANON_SCOPE, PRIMARY_DOC, writeDraftPayload } from '../../../lib/builder/draftCache';
import { GuestToday } from '../guest/GuestToday';
import { readGuestDraft } from '../guest/guestDraft';
import LibrarySpace from '../spaces/LibrarySpace';

let root: Root;
let container: HTMLDivElement;
const store = new Map<string, string>();
async function mount(node: React.ReactNode) {
    await act(async () => { root = createRoot(container); root.render(node); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}
const buttonByText = (text: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const saveDraft = (firstName: string, jobTitle: string, lastName = firstName ? 'Lee' : '') => writeDraftPayload(ANON_SCOPE, PRIMARY_DOC, {
    formData: { contact: { firstName, lastName, jobTitle, phoneCountryCode: '+1' } } as never,
    visibleSections: [] as never, settings: {} as never, templateId: 'modern' as never,
});

beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size; } } });
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

describe('guest mode (signed-out visitors in the Career OS shell)', () => {
    it('Today offers a CV start, the no-account tools and sign-in — nothing invented', async () => {
        await mount(<GuestToday onOpenAuth={openAuth} />);
        expect(document.body.textContent).toContain('Start your CV');
        for (const tool of ['ATS Checker', 'Smart Studio', 'Template gallery', 'Career resources']) expect(document.body.textContent).toContain(tool);
        expect(document.body.textContent).not.toMatch(/awaiting a response|primary goal/);
        await act(async () => { buttonByText('Start building').click(); });
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs', section: 'new' }));
        await act(async () => { buttonByText('Sign In / Sync').click(); });
        expect(openAuth).toHaveBeenCalled();
        const resources = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Career resources')) as HTMLButtonElement;
        await act(async () => { resources.click(); });
        expect(navigate).toHaveBeenCalledWith({ view: 'resources' });
    });

    it('Today shows the CV already started on this device, and blank drafts count as none', async () => {
        saveDraft('', '');
        expect(readGuestDraft()).toBeNull();
        saveDraft('Ana', 'Staff Nurse');
        await mount(<GuestToday onOpenAuth={openAuth} />);
        expect(document.body.textContent).toContain('Ana Lee');
        expect(document.body.textContent).toContain('Staff Nurse');
        expect(document.body.textContent).toContain('On this device');
    });

    it('the Library shows the on-device CV without querying an account, and PRISM asks for sign-in', async () => {
        saveDraft('Ana', 'Staff Nurse');
        await mount(<LibrarySpace route={{ view: 'career', space: 'library' }} />);
        expect(document.body.textContent).toContain('Ana Lee');
        expect(document.body.textContent).toContain('Keep more than one CV');
        expect(resumeRepo.list).not.toHaveBeenCalled();

        await act(async () => { root.unmount(); });
        await mount(<LibrarySpace route={{ view: 'career', space: 'library', sub: 'tailor' }} />);
        expect(document.body.textContent).toContain('PRISM tailoring needs an account');
        expect(prismRepo.isPrismEnabled).not.toHaveBeenCalled();
        await act(async () => { buttonByText('Sign In / Sync').click(); });
        expect(openAuth).toHaveBeenCalled();
    });
});
