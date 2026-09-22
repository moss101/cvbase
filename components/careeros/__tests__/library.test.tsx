// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { application, artifact, fact, interview } from '../../../services/careerOs/__tests__/fixtures';
import type { StoredResume } from '../../../services/repos/mappers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();
const replace = vi.fn();
const invalidate = vi.fn();
const planState = vi.hoisted(() => ({ limit: 5 }));

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate, isAdmin: false, profile: { revision: 1 }, migration: 'done', refreshInbox: vi.fn(), openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace, back: () => false, reset: vi.fn(), route: { view: 'career', space: 'library' } }), useBackHandler: () => undefined };
});
vi.mock('../../../lib/useMobileShell', () => ({ useMobileShell: () => false }));
vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/repos/resumeRepo', () => ({ list: vi.fn(), getPrimary: vi.fn(), get: vi.fn(), create: vi.fn(), duplicate: vi.fn(), rename: vi.fn(), remove: vi.fn() }));
vi.mock('../../SubscriptionProvider', () => ({ useSubscription: () => ({ plan: { name: 'Free', limits: { resumes: planState.limit } } }) }));
vi.mock('../../SmartStudio', () => ({
    SmartStudio: (props: { initialTool?: string; onToolChange?: (t: string) => void; trackerNotice?: React.ReactNode; resumeData?: unknown }) => (
        <div data-testid="studio">
            <span>tool:{props.initialTool ?? 'none'}</span>
            <span>resume:{props.resumeData ? 'yes' : 'no'}</span>
            <button type="button" onClick={() => props.onToolChange?.('tracker')}>switch-tool</button>
            {props.trackerNotice}
        </div>
    ),
}));
vi.mock('../../../services/repos/atsReportRepo', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../services/repos/atsReportRepo')>();
    return { ...actual, listRecent: vi.fn(), getById: vi.fn() };
});
vi.mock('../../../services/repos/headshotRepo', () => ({ list: vi.fn(), signedUrl: vi.fn() }));
vi.mock('../../../services/repos/versionRepo', () => ({ listForResume: vi.fn() }));
vi.mock('../../../services/repos/prismRepo', () => ({ isPrismEnabled: vi.fn() }));
vi.mock('../../../services/careerOs/artifactRepo', () => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/interviewRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../templates/TemplatePreviewRegistry', () => ({ LazyTemplatePreview: () => <div data-testid="preview" /> }));

import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as atsReportRepo from '../../../services/repos/atsReportRepo';
import * as headshotRepo from '../../../services/repos/headshotRepo';
import * as versionRepo from '../../../services/repos/versionRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as interviewRepo from '../../../services/careerOs/interviewRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { clearOwnedQueries } from '../data/useOwnedQuery';
import { composeAssets, countByKind, filterAssets, paginate, sortNewest } from '../library/libraryFormat';
import { loadLibraryData } from '../library/useLibraryAssets';
import LibrarySpace from '../spaces/LibrarySpace';

const resume = (o: Partial<StoredResume> = {}): StoredResume => ({
    id: 'r1', title: 'Main CV', data: { contact: { jobTitle: 'Nurse' } } as never, settings: {} as never, templateId: 'modern', visibleSections: [], isPrimary: true,
    updatedAt: '2026-09-10T00:00:00.000Z', revision: 1, applicationId: null, origin: null, ...o,
});

const buttonByText = (text: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const click = async (el: Element) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
function setValue(el: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(el, value);
    (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

let root: Root;
let container: HTMLDivElement;
async function mount(node: React.ReactNode) {
    await act(async () => { root = createRoot(container); root.render(node); });
    await flush();
}

afterEach(async () => { await act(async () => { root?.unmount(); }); });
beforeEach(() => {
    vi.clearAllMocks();
    clearOwnedQueries();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(resumeRepo.list).mockResolvedValue([resume(), resume({ id: 'r2', title: 'Tailored for Acme', isPrimary: false, applicationId: 'a1', origin: { kind: 'prism' }, updatedAt: '2026-09-12T00:00:00.000Z' })]);
    vi.mocked(atsReportRepo.listRecent).mockResolvedValue([{ id: 'rep1', resumeId: 'r1', jobDescription: 'Senior Nurse at Acme\nmore', score: 81, createdAt: '2026-09-11T00:00:00.000Z' }]);
    vi.mocked(headshotRepo.list).mockResolvedValue([{ id: 'h1', storagePath: 'u1/h1.png', createdAt: '2026-09-01T00:00:00.000Z' }]);
    vi.mocked(factRepo.list).mockResolvedValue([
        fact({ id: 'f1', kind: 'achievement', title: 'Cut readmissions by 12%', organization: 'St Mary', updatedAt: '2026-09-05T00:00:00.000Z' }),
        fact({ id: 'f2', kind: 'experience', title: 'Senior Nurse', organization: 'St Mary', reviewState: 'candidate', confirmationState: 'inferred', updatedAt: '2026-09-06T00:00:00.000Z' }),
        fact({ id: 'f3', kind: 'skill', title: 'Triage', status: 'deleted', narrative: '' }),
    ]);
    vi.mocked(interviewRepo.list).mockResolvedValue([interview({ storyFactIds: ['f1'] })]);
    vi.mocked(applicationRepo.list).mockResolvedValue([application({ id: 'a1', jobTitle: 'Senior Nurse', company: 'Acme Health', goalId: 'g1' })]);
    vi.mocked(artifactRepo.list).mockImplementation(async (_u, appId, kind) => (kind === 'cover_letter' ? [artifact({ id: 'art1', applicationId: appId, kind: 'cover_letter', title: 'Acme cover letter', status: 'reviewed', updatedAt: '2026-09-13T00:00:00.000Z' })] : []));
    vi.mocked(versionRepo.listForResume).mockResolvedValue([]);
});

describe('libraryFormat', () => {
    it('composes every owner into one list, links CVs to applications and counts evidence to review', async () => {
        const data = await loadLibraryData('u1');
        expect(data.failed).toEqual([]);
        const kinds = data.assets.map((a) => a.kind).sort();
        expect(kinds).toEqual(['cover-letter', 'cv', 'cv', 'evidence', 'headshot', 'report', 'story']);
        const tailored = data.assets.find((a) => a.key === 'cv:r2');
        expect(tailored?.applicationId).toBe('a1');
        expect(tailored?.goalId).toBe('g1');
        expect(tailored?.extra.origin).toBe('prism');
        // Deleted facts are never library assets; achievements are stories, not evidence.
        expect(data.assets.some((a) => a.id === 'f3')).toBe(false);
        expect(data.assets.find((a) => a.id === 'f1')?.kind).toBe('story');
        expect(data.assets.find((a) => a.id === 'f1')?.extra.usageCount).toBe(1);
        expect(countByKind(data.assets).toReview).toBe(1);
    });
    it('filters by type and by case-insensitive text over titles, company and labels — never narrative', () => {
        const assets = composeAssets({
            resumes: [resume()], reports: [], headshots: [], coverLetters: [], interviews: [],
            facts: [fact({ id: 'f2', kind: 'experience', title: 'Senior Nurse', organization: 'St Mary', narrative: 'SECRETWORD in narrative' })],
            applications: [],
        });
        expect(filterAssets(assets, { type: 'cv' }).map((a) => a.id)).toEqual(['r1']);
        expect(filterAssets(assets, { query: 'st mary' }).map((a) => a.id)).toEqual(['f2']);
        expect(filterAssets(assets, { query: 'MAIN' }).map((a) => a.id)).toEqual(['r1']);
        expect(filterAssets(assets, { query: 'secretword' })).toEqual([]);
    });
    it('sorts newest first and paginates in pages of 20', () => {
        const many = Array.from({ length: 45 }, (_, i) => resume({ id: `r${i}`, title: `CV ${i}`, updatedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z` }));
        const assets = sortNewest(composeAssets({ resumes: many, reports: [], headshots: [], coverLetters: [], facts: [], interviews: [], applications: [] }));
        expect(assets[0].updatedAt >= assets[1].updatedAt).toBe(true);
        expect(paginate(assets, 1)).toMatchObject({ hasMore: true });
        expect(paginate(assets, 1).items).toHaveLength(20);
        expect(paginate(assets, 3)).toMatchObject({ hasMore: false });
        expect(paginate(assets, 3).items).toHaveLength(45);
    });
    it('reports a partial list when one owner fails instead of an empty page', async () => {
        vi.mocked(headshotRepo.list).mockRejectedValueOnce(new Error('bucket down'));
        const data = await loadLibraryData('u1');
        expect(data.failed).toEqual(['headshots']);
        expect(data.assets.length).toBeGreaterThan(0);
    });
});

describe('LibrarySpace', () => {
    it('lists assets with one dominant action each, filters by the route type and searches client-side', async () => {
        await mount(<LibrarySpace route={{ view: 'career', space: 'library' }} />);
        expect(document.body.textContent).toContain('Main CV');
        expect(document.body.textContent).toContain('Tailored for Senior Nurse · Acme Health');
        expect(document.body.textContent).toContain('Acme cover letter');
        expect(document.body.textContent).toContain('Showing 7 of 7');
        await click(buttonByText('CV · 2'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', query: { type: 'cv' } }));

        await act(async () => { root.unmount(); });
        await mount(<LibrarySpace route={{ view: 'career', space: 'library', query: { type: 'cv' } }} />);
        expect(document.body.textContent).toContain('Showing 2 of 2');
        expect(document.body.textContent).toContain('exports run from the editor');
        setValue(document.querySelector('input[type="search"]') as HTMLInputElement, 'tailored');
        await flush();
        expect(document.body.textContent).toContain('Showing 1 of 1');
        await click(buttonByText('Open in editor'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs', id: 'r2', section: 'edit' }));
        expect(track).toHaveBeenCalledWith('u1', 'library_asset_opened', expect.objectContaining({ subjectRefs: { asset: 'r2' } }));
    });

    it('shows CV versions read-only with an editor link, and a headshot through a signed URL with expiry retry', async () => {
        vi.mocked(versionRepo.listForResume).mockResolvedValue([{ id: 'v1', resumeId: 'r1', label: 'Before tailoring', data: {} as never, createdAt: '2026-09-01T00:00:00.000Z' }]);
        vi.mocked(headshotRepo.signedUrl).mockResolvedValue('https://signed.example/h1.png');
        await mount(<LibrarySpace route={{ view: 'career', space: 'library' }} />);
        await click(buttonByText('Versions'));
        await flush();
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Before tailoring');
        await click(buttonByText('Open in editor to restore'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs', id: 'r2', section: 'edit' }));

        await click(buttonByText('View'));
        await flush();
        const img = document.querySelector('[role="dialog"] img') as HTMLImageElement;
        expect(img.getAttribute('src')).toBe('https://signed.example/h1.png');
        await act(async () => { img.dispatchEvent(new Event('error')); });
        expect(document.body.textContent).toContain('The link to this image expired');
        await click(buttonByText('Retry'));
        await flush();
        expect(headshotRepo.signedUrl).toHaveBeenCalledTimes(2);
    });

    it('renders the template gallery and remembers the chosen template before opening a new CV', async () => {
        const store = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } } });
        await mount(<LibrarySpace route={{ view: 'career', space: 'library', sub: 'templates' }} />);
        expect(document.querySelectorAll('[data-testid="preview"]').length).toBeGreaterThan(0);
        const useButtons = [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Use Template');
        await click(useButtons[0]);
        expect(window.localStorage.getItem('cvbase-selected-template')).toBeTruthy();
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs', section: 'new' }));
    });

    it('shows the document detail read-only with provenance and the workspace link', async () => {
        vi.mocked(artifactRepo.get).mockResolvedValue(artifact({ id: 'art1', applicationId: 'a1', kind: 'cover_letter', title: 'Acme cover letter', plainText: 'Dear hiring manager', status: 'snapshot', snapshotOf: 'art0', provenance: { factIds: ['f1'] } }));
        vi.mocked(applicationRepo.get).mockResolvedValue(application({ id: 'a1', jobTitle: 'Senior Nurse', company: 'Acme Health' }));
        await mount(<LibrarySpace route={{ view: 'career', space: 'library', sub: 'documents', id: 'art1' }} />);
        expect(document.body.textContent).toContain('Dear hiring manager');
        expect(document.body.textContent).toContain('Submitted snapshot');
        expect(document.body.textContent).toContain('Cut readmissions by 12%');
        expect(document.querySelector('textarea')).toBeNull();
        await click(buttonByText('Open in the application workspace'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a1', section: 'cover-letter' }));
    });

    it('manages CVs with the resume manager actions: create, duplicate, rename, delete and the primary guard', async () => {
        vi.mocked(resumeRepo.create).mockResolvedValue(resume({ id: 'r9', title: 'Untitled resume', isPrimary: false }));
        vi.mocked(resumeRepo.duplicate).mockResolvedValue(resume({ id: 'r10', isPrimary: false }));
        vi.mocked(resumeRepo.rename).mockResolvedValue(undefined);
        vi.mocked(resumeRepo.remove).mockResolvedValue(undefined);
        await mount(<LibrarySpace route={{ view: 'career', space: 'library', query: { type: 'cv' } }} />);

        await click(buttonByText('New CV'));
        await flush();
        expect(resumeRepo.create).toHaveBeenCalledWith('u1', { title: 'Untitled resume' });
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs', id: 'r9', section: 'edit' }));

        // Newest first: the tailored CV (r2) is the first card.
        await click(buttonByText('Duplicate'));
        await flush();
        expect(resumeRepo.duplicate).toHaveBeenCalledWith('u1', 'r2');
        expect(vi.mocked(resumeRepo.list).mock.calls.length).toBeGreaterThan(1);

        await click(buttonByText('Rename'));
        const input = document.querySelector('[role="dialog"] input') as HTMLInputElement;
        expect(input.value).toBe('Tailored for Acme');
        setValue(input, 'Acme — final');
        const confirmRename = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === 'Rename') as HTMLButtonElement;
        await click(confirmRename);
        await flush();
        expect(resumeRepo.rename).toHaveBeenCalledWith('u1', 'r2', 'Acme — final');

        // The primary CV cannot be deleted while another CV exists.
        const deleteButtons = [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Delete');
        await click(deleteButtons[1]);
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        await click(deleteButtons[0]);
        const confirmDelete = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === 'Delete') as HTMLButtonElement;
        await click(confirmDelete);
        await flush();
        expect(resumeRepo.remove).toHaveBeenCalledTimes(1);
        expect(resumeRepo.remove).toHaveBeenCalledWith('u1', 'r2');
    });

    it('sends the person to pricing instead of creating a CV at the plan limit', async () => {
        planState.limit = 2;
        try {
            await mount(<LibrarySpace route={{ view: 'career', space: 'library', query: { type: 'cv' } }} />);
            await click(buttonByText('Upgrade for more resumes'));
            expect(resumeRepo.create).not.toHaveBeenCalled();
            expect(navigate).toHaveBeenCalledWith({ view: 'pricing' });
        } finally {
            planState.limit = 5;
        }
    });

    it('opens Smart Studio on the requested tool with the primary CV and keeps the URL in step', async () => {
        vi.mocked(resumeRepo.getPrimary).mockResolvedValue(resume());
        await mount(<LibrarySpace route={{ view: 'career', space: 'library', sub: 'studio', query: { tool: 'linkedin' } }} />);
        await flush();
        expect(document.body.textContent).toContain('Smart Studio');
        expect(document.body.textContent).toContain('tool:linkedin');
        expect(document.body.textContent).toContain('resume:yes');
        await click(buttonByText('switch-tool'));
        expect(replace).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'studio', query: { tool: 'tracker' } }));
        // The pipeline explains that its jobs are the same records as applications.
        await click(buttonByText('Applications'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications' }));
    });

    it('shows the empty state for a new account', async () => {
        vi.mocked(resumeRepo.list).mockResolvedValue([]);
        vi.mocked(atsReportRepo.listRecent).mockResolvedValue([]);
        vi.mocked(headshotRepo.list).mockResolvedValue([]);
        vi.mocked(factRepo.list).mockResolvedValue([]);
        vi.mocked(interviewRepo.list).mockResolvedValue([]);
        vi.mocked(applicationRepo.list).mockResolvedValue([]);
        await mount(<LibrarySpace route={{ view: 'career', space: 'library' }} />);
        expect(document.body.textContent).toContain('Your library is empty');
    });
});
