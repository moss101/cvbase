// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { action, application, campaign, fact, goal, opportunity } from '../../../services/careerOs/__tests__/fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate: vi.fn(), isAdmin: false, profile: null, migration: 'done', refreshInbox: vi.fn(), openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), route: { view: 'career', space: 'search' } }), useBackHandler: () => undefined };
});
vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/careerOs/actionRepo', () => ({ listEligible: vi.fn(), list: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/opportunityRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/goalRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/campaignRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/repos/resumeRepo', () => ({ list: vi.fn() }));
vi.mock('../coach/coachRepo', () => ({ listConversations: vi.fn() }));

import * as actionRepo from '../../../services/careerOs/actionRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as coachRepo from '../coach/coachRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { factSnippet, navigateResults, normaliseQuery, searchOwnedRecords, GROUP_CAP } from '../search/useCommandPalette';
import CommandPalette, { useCommandPaletteShortcut } from '../search/CommandPalette';
import SearchSpace from '../spaces/SearchSpace';

const t = (_k: string, f: string) => f;
const flush = async (ms = 0) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
function setValue(el: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(el, value);
    (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
const key = async (el: Element, k: string) => { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); };

let root: Root;
let container: HTMLDivElement;
async function mount(node: React.ReactNode) {
    await act(async () => { root = createRoot(container); root.render(node); });
}

afterEach(async () => { await act(async () => { root?.unmount(); }); });
beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(actionRepo.listEligible).mockResolvedValue([action({ id: 'act1', title: 'Tailor the Acme CV', reason: 'Application is preparing', destination: { space: 'applications', id: 'a1', section: 'cv' } })]);
    vi.mocked(opportunityRepo.list).mockResolvedValue([opportunity({ id: 'o1', title: 'Senior Nurse', company: 'Acme Health' }), opportunity({ id: 'o2', title: 'Ward Manager', company: 'Beta Care' })]);
    vi.mocked(applicationRepo.list).mockResolvedValue([application({ id: 'a1', jobTitle: 'Senior Nurse', company: 'Acme Health' })]);
    vi.mocked(goalRepo.list).mockResolvedValue([goal({ id: 'g1', title: 'Senior nurse role' })]);
    vi.mocked(campaignRepo.list).mockResolvedValue([campaign({ id: 'c1', name: 'Acme push' })]);
    vi.mocked(factRepo.list).mockResolvedValue([
        fact({ id: 'f1', kind: 'experience', title: 'Senior Nurse', organization: 'Acme Health', narrative: 'PRIVATE narrative about Acme' }),
        fact({ id: 'f2', kind: 'skill', title: 'Acme triage system', status: 'withdrawn' }),
        fact({ id: 'f3', kind: 'skill', title: 'Acme scheduling', status: 'deleted' }),
    ]);
    vi.mocked(resumeRepo.list).mockResolvedValue([{ id: 'r1', title: 'Acme CV' } as never]);
    vi.mocked(coachRepo.listConversations).mockResolvedValue([{ id: 'cv1', title: 'Acme interview prep' } as never]);
});

describe('search logic', () => {
    it('limits the query and matches the six spaces and utilities by label', () => {
        expect(normaliseQuery('  a'.repeat(50))).toHaveLength(64);
        const nav = navigateResults('coa', t);
        expect(nav.items.map((i) => i.title)).toEqual(['Coach']);
        expect(navigateResults('admin', t).items).toHaveLength(0);
        expect(navigateResults('admin', t, { isAdmin: true }).items.map((i) => i.title)).toEqual(['Admin']);
    });

    it('searches every owned group, excludes withdrawn/deleted facts and keeps narrative out of snippets', async () => {
        const groups = await searchOwnedRecords('u1', 'acme');
        const byGroup = Object.fromEntries(groups.map((g) => [g.group, g.items]));
        expect(Object.keys(byGroup).sort()).toEqual(['actions', 'applications', 'campaigns', 'conversations', 'documents', 'facts', 'opportunities']);
        expect(byGroup.facts.map((i) => i.id)).toEqual(['fact:f1']);
        expect(JSON.stringify(groups)).not.toContain('PRIVATE');
        expect(JSON.stringify(groups)).not.toContain('narrative');
        expect(byGroup.facts[0]).toMatchObject({ title: 'Senior Nurse', subtitle: 'Acme Health' });
        expect(factRepo.list).toHaveBeenCalledWith('u1', { status: 'active' });
        expect(byGroup.actions[0].route).toMatchObject({ space: 'applications', id: 'a1', section: 'cv' });
        expect(factSnippet(fact({ title: 'X', organization: '', narrative: 'no' }))).toEqual({ title: 'X' });
    });

    it('caps each group and reports the total; a failed source is flagged, not hidden', async () => {
        vi.mocked(opportunityRepo.list).mockResolvedValue(Array.from({ length: 12 }, (_, i) => opportunity({ id: `o${i}`, title: `Acme role ${i}` })));
        vi.mocked(goalRepo.list).mockRejectedValue(new Error('down'));
        const groups = await searchOwnedRecords('u1', 'acme');
        const opps = groups.find((g) => g.group === 'opportunities');
        expect(opps?.items).toHaveLength(GROUP_CAP);
        expect(opps?.total).toBe(12);
        expect(groups.find((g) => g.group === 'goals')?.failed).toBe(true);
    });
});

describe('CommandPalette', () => {
    it('debounces, groups results and is fully keyboard operable (arrows, Enter, Escape)', async () => {
        const onClose = vi.fn();
        await mount(<CommandPalette open onClose={onClose} />);
        const input = document.querySelector('input[role="combobox"]') as HTMLInputElement;
        expect(input).toBeTruthy();
        setValue(input, 'a');
        await flush(250);
        expect(document.body.textContent).toContain('Type at least 2 characters');
        setValue(input, 'acme');
        await flush(50);
        expect(opportunityRepo.list).not.toHaveBeenCalled();
        await flush(250);
        expect(opportunityRepo.list).toHaveBeenCalledTimes(1);
        const options = [...document.querySelectorAll('[role="option"]')];
        expect(options.length).toBeGreaterThan(3);
        expect(document.body.textContent).toContain('Opportunities');
        expect(document.body.textContent).toContain('Facts');
        // Ask CVbase: the typed words can go to the Coach first; results follow.
        expect(options[0].textContent).toContain('Ask the Coach: “acme”');
        expect(options[0].getAttribute('aria-selected')).toBe('true');
        await key(input, 'ArrowDown');
        expect(document.querySelectorAll('[role="option"]')[1].getAttribute('aria-selected')).toBe('true');
        await key(input, 'ArrowDown');
        await key(input, 'ArrowUp');
        expect(document.querySelectorAll('[role="option"]')[1].getAttribute('aria-selected')).toBe('true');
        await key(input, 'Enter');
        expect(onClose).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a1' }));
        await key(input, 'Escape');
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(track).toHaveBeenCalledWith('u1', 'career_search_used', expect.objectContaining({ payload: expect.objectContaining({ groups: expect.any(Number) }) }));
        const payload = vi.mocked(track).mock.calls.find((c) => c[1] === 'career_search_used')?.[2]?.payload ?? {};
        expect(JSON.stringify(payload)).not.toContain('acme');
    });

    it('Ask the Coach hands the typed question to the Coach without sending it', async () => {
        const onClose = vi.fn();
        await mount(<CommandPalette open onClose={onClose} />);
        const input = document.querySelector('input[role="combobox"]') as HTMLInputElement;
        setValue(input, 'how do I negotiate');
        await flush(300);
        await key(input, 'Enter');
        expect(onClose).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'coach' }));
        expect(sessionStorage.getItem('cvbase:coach-handoff')).toBe('how do I negotiate');
    });

    it('drops a stale response when the query changes before it answers', async () => {
        let resolveFirst: (v: never[]) => void = () => undefined;
        vi.mocked(opportunityRepo.list)
            .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve as never; }))
            .mockResolvedValueOnce([opportunity({ id: 'o9', title: 'Beta lead', company: 'Beta' })]);
        await mount(<CommandPalette open onClose={vi.fn()} />);
        const input = document.querySelector('input[role="combobox"]') as HTMLInputElement;
        setValue(input, 'acme');
        await flush(250);
        setValue(input, 'beta');
        await flush(250);
        await act(async () => { resolveFirst([]); });
        await flush();
        expect(document.body.textContent).toContain('Beta lead');
        expect(document.body.textContent).not.toContain('Senior Nurse');
    });

    it('shows empty and error states and the page form works without the shortcut', async () => {
        vi.mocked(opportunityRepo.list).mockResolvedValue([]);
        vi.mocked(applicationRepo.list).mockResolvedValue([]);
        vi.mocked(goalRepo.list).mockResolvedValue([]);
        vi.mocked(campaignRepo.list).mockResolvedValue([]);
        vi.mocked(factRepo.list).mockResolvedValue([]);
        vi.mocked(resumeRepo.list).mockResolvedValue([]);
        vi.mocked(coachRepo.listConversations).mockResolvedValue([]);
        vi.mocked(actionRepo.listEligible).mockResolvedValue([]);
        await mount(<SearchSpace route={{ view: 'career', space: 'search' }} />);
        const input = document.querySelector('input[role="combobox"]') as HTMLInputElement;
        setValue(input, 'zzzz');
        await flush(250);
        expect(document.body.textContent).toContain('No matches in your account');
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('the shortcut hook opens on Ctrl/Cmd-K only', async () => {
        const onOpen = vi.fn();
        const Probe: React.FC = () => { useCommandPaletteShortcut(onOpen); return null; };
        await mount(<Probe />);
        await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' })); });
        expect(onOpen).not.toHaveBeenCalled();
        await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); });
        await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', metaKey: true })); });
        expect(onOpen).toHaveBeenCalledTimes(2);
    });
});
