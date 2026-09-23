// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationProvider } from '../../../services/translationService';
import { ConflictError, type CareerProfile } from '../../../services/careerOs/types';
import { fact, goal } from '../../../services/careerOs/__tests__/fixtures';
import { clearOwnedQueries } from '../data/useOwnedQuery';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), registerBackHandler: () => () => undefined, route: { view: 'career', space: 'today' }, direction: 'forward', canGoBack: false }), useBackHandler: () => undefined };
});
vi.mock('../../AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' }, userProfile: null }) }));

const careerOs = { userId: 'u1', profile: null as CareerProfile | null, profileError: null, migration: 'done', refreshProfile: vi.fn(async () => undefined), invalidate: vi.fn(), context: null, contextLoading: false, contextError: null, isAdmin: false, unreadCount: 0, refreshContext: vi.fn(), refreshInbox: vi.fn(), openAuth: vi.fn(), route: { view: 'career', space: 'today' } };
vi.mock('../shell/CareerOsProvider', () => ({ useCareerOs: () => careerOs }));

vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/smartStudioService', () => ({ parsePdfFileWithAi: vi.fn(), arrayBufferToBase64: () => '' }));
vi.mock('../../../services/careerOs/careerProfileRepo', () => ({ updateOnboarding: vi.fn(), get: vi.fn(), updateHeadline: vi.fn(), setFactsRevision: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn(async () => []), listForFact: vi.fn(async () => []), confirm: vi.fn(), update: vi.fn(), createMany: vi.fn(async () => []), create: vi.fn(), softDelete: vi.fn(), withdraw: vi.fn(), verify: vi.fn(), resolveConflict: vi.fn(), staleReferences: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/goalRepo', () => ({ list: vi.fn(async () => []), getPrimary: vi.fn(async () => null), create: vi.fn(), update: vi.fn(), setPrimary: vi.fn(), archive: vi.fn(), listRevisions: vi.fn(async () => []), get: vi.fn() }));
vi.mock('../../../services/careerOs/analysisRepo', () => ({ markStaleForGoal: vi.fn(async () => 0), markStaleForFacts: vi.fn(async () => 0) }));
vi.mock('../../../services/careerOs/artifactRepo', () => ({ markStale: vi.fn(async () => 0), get: vi.fn() }));
vi.mock('../../../services/careerOs/eventRepo', () => ({ insert: vi.fn(async () => undefined), listRecent: vi.fn(async () => []) }));
vi.mock('../../../services/repos/resumeRepo', () => ({ list: vi.fn(async () => []), create: vi.fn() }));

import * as careerProfileRepo from '../../../services/careerOs/careerProfileRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as eventRepo from '../../../services/careerOs/eventRepo';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { resumeStep } from '../onboarding/useOnboardingState';

const profile = (onboarding: CareerProfile['onboarding'] = {}, revision = 1): CareerProfile => ({ userId: 'u1', headline: '', onboarding, migrationVersion: 1, migratedAt: null, factsRevision: '', revision });

let root: Root;
let container: HTMLDivElement;
const flush = async () => { for (let i = 0; i < 6; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const mount = async (node: React.ReactNode) => {
    await act(async () => { root = createRoot(container); root.render(<TranslationProvider>{node}</TranslationProvider>); });
    await flush();
};
const text = () => container.textContent ?? '';
const buttons = () => Array.from(container.querySelectorAll('button'));
const clickButton = async (label: string) => {
    const button = buttons().find((b) => (b.textContent ?? '').trim() === label);
    if (!button) throw new Error(`no button "${label}" in: ${buttons().map((b) => b.textContent?.trim()).join(' | ')}`);
    await act(async () => { button.click(); });
    await flush();
};
const setValue = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
    vi.resetAllMocks();
    clearOwnedQueries();
    vi.mocked(careerProfileRepo.updateOnboarding).mockImplementation(async (_u, onboarding, expected) => profile(onboarding, expected + 1));
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

describe('resumeStep', () => {
    it('resumes at the recorded step, or done once completed', () => {
        expect(resumeStep({})).toBe('objective');
        expect(resumeStep({ step: 'review' })).toBe('review');
        expect(resumeStep({ step: 'goal', pausedAt: 'x' })).toBe('goal');
        expect(resumeStep({ step: 'goal', completedAt: 'x' })).toBe('done');
    });
});

describe('OnboardingFlow', () => {
    it('persists the objective with the profile revision and moves to the import step', async () => {
        const onExit = vi.fn();
        await mount(<OnboardingFlow userId="u1" profile={profile()} onExit={onExit} />);
        expect(text()).toContain('What brings you here?');
        await clickButton('Actively lookingI want to apply for roles now.');
        await clickButton('Continue');
        expect(vi.mocked(careerProfileRepo.updateOnboarding)).toHaveBeenCalledWith('u1', expect.objectContaining({ objective: 'active_search', step: 'import' }), 1);
        expect(text()).toContain('Bring in what you already have');
        // Every step carries Finish later; pausing records pausedAt against the newer revision.
        await clickButton('Finish later');
        const last = vi.mocked(careerProfileRepo.updateOnboarding).mock.calls.at(-1)!;
        expect(last[1]).toEqual(expect.objectContaining({ step: 'import', objective: 'active_search' }));
        expect(typeof last[1].pausedAt).toBe('string');
        expect(last[2]).toBe(2);
        expect(onExit).toHaveBeenCalled();
    });

    it('resumes at the persisted step and re-reads the profile on a revision conflict', async () => {
        vi.mocked(careerProfileRepo.updateOnboarding)
            .mockRejectedValueOnce(new ConflictError('career_profile', 'u1', 1))
            .mockImplementation(async (_u, onboarding, expected) => profile(onboarding, expected + 1));
        vi.mocked(careerProfileRepo.get).mockResolvedValue(profile({ step: 'goal', objective: 'develop' }, 4));
        vi.mocked(goalRepo.create).mockResolvedValue(goal({ id: 'g-new', isPrimary: false, revision: 1 }));
        vi.mocked(goalRepo.setPrimary).mockResolvedValue(goal({ id: 'g-new', isPrimary: true, revision: 2 }));

        await mount(<OnboardingFlow userId="u1" profile={profile({ step: 'goal', objective: 'develop' })} onExit={vi.fn()} />);
        expect(text()).toContain('Where are you heading?');
        expect(text()).not.toContain('What brings you here?');
        const role = container.querySelector<HTMLInputElement>('input[id$="-role"]');
        await act(async () => { setValue(role!, 'Charge Nurse'); });
        await clickButton('Save goal and finish');

        expect(vi.mocked(goalRepo.create)).toHaveBeenCalledWith('u1', expect.objectContaining({ role: 'Charge Nurse', source: 'onboarding' }));
        expect(vi.mocked(goalRepo.setPrimary)).toHaveBeenCalledWith('u1', 'g-new', 1);
        const calls = vi.mocked(careerProfileRepo.updateOnboarding).mock.calls;
        expect(calls[0][2]).toBe(1); // first attempt with the stale revision
        expect(calls[1][2]).toBe(4); // retried with the re-read revision
        expect(calls[1][1]).toEqual(expect.objectContaining({ goalId: 'g-new', step: 'done' }));
        expect(text()).toContain('You are set up');
        expect(text()).toContain('A primary goal is set.');

        await clickButton('Go to Today');
        expect(vi.mocked(careerProfileRepo.updateOnboarding).mock.calls.at(-1)![1]).toEqual(expect.objectContaining({ step: 'done' }));
        expect(typeof vi.mocked(careerProfileRepo.updateOnboarding).mock.calls.at(-1)![1].completedAt).toBe('string');
        expect(vi.mocked(eventRepo.insert).mock.calls.map(([, e]) => e.eventName)).toContain('career_onboarding_completed');
    });

    it('review step shows the imported candidates and lets the person leave them for later', async () => {
        vi.mocked(factRepo.list).mockResolvedValue([fact({ id: 'f1', reviewState: 'candidate', confirmationState: 'inferred', sourceKind: 'resume_import' })]);
        await mount(<OnboardingFlow userId="u1" profile={profile({ step: 'review', importedResumeId: 'r1' })} onExit={vi.fn()} />);
        expect(text()).toContain('Check what was read');
        expect(text()).toContain('1 candidates waiting for you');
        await clickButton('Leave 1 for later');
        const call = vi.mocked(careerProfileRepo.updateOnboarding).mock.calls.at(-1)!;
        expect(call[1].step).toBe('goal');
        expect(call[1].reviewedAt).toBeUndefined();
        expect(text()).toContain('Where are you heading?');
    });
});
