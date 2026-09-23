// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationProvider } from '../../../services/translationService';
import type { CareerProfile } from '../../../services/careerOs/types';
import { action, application, fact, goal } from '../../../services/careerOs/__tests__/fixtures';
import { clearOwnedQueries } from '../data/useOwnedQuery';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Mocks -----------------------------------------------------------------

const navigate = vi.fn();
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), registerBackHandler: () => () => undefined, route: { view: 'career', space: 'today' }, direction: 'forward', canGoBack: false }), useBackHandler: () => undefined };
});

const authState = { user: { id: 'u1', user_metadata: { full_name: 'Ada Lovelace' } } as unknown, userProfile: null as unknown };
vi.mock('../../AuthProvider', () => ({ useAuth: () => ({ user: authState.user, userProfile: authState.userProfile }) }));

const careerOs = {
    userId: 'u1' as string | null,
    profile: null as CareerProfile | null,
    profileError: null as unknown,
    migration: 'done' as const,
    refreshProfile: vi.fn(async () => undefined),
    invalidate: vi.fn(),
    context: null,
    contextLoading: false,
    contextError: null,
    isAdmin: false,
    unreadCount: 0,
    refreshContext: vi.fn(async () => undefined),
    refreshInbox: vi.fn(async () => undefined),
    openAuth: vi.fn(),
    route: { view: 'career', space: 'today' },
};
vi.mock('../shell/CareerOsProvider', () => ({ useCareerOs: () => careerOs }));

vi.mock('../../../services/careerOs/goalRepo', () => ({ getPrimary: vi.fn(async () => null), list: vi.fn(async () => []), create: vi.fn(), update: vi.fn(), setPrimary: vi.fn(), archive: vi.fn(), listRevisions: vi.fn(async () => []), get: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn(async () => []), listForFact: vi.fn(async () => []), staleReferences: vi.fn(async () => []), confirm: vi.fn(), update: vi.fn(), createMany: vi.fn(async () => []), create: vi.fn(), softDelete: vi.fn(), withdraw: vi.fn(), verify: vi.fn(), resolveConflict: vi.fn() }));
vi.mock('../../../services/careerOs/opportunityRepo', () => ({ list: vi.fn(async () => []), create: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ list: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/interviewRepo', () => ({ list: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/analysisRepo', () => ({ listLatest: vi.fn(async () => []), markStaleForGoal: vi.fn(async () => 0), markStaleForFacts: vi.fn(async () => 0) }));
vi.mock('../../../services/careerOs/outcomeRepo', () => ({ list: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/campaignRepo', () => ({ list: vi.fn(async () => []), listOpportunityIds: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/eventRepo', () => ({ insert: vi.fn(async () => undefined), listRecent: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/insightRepo', () => ({ create: vi.fn(async (_u: string, i: Record<string, unknown>) => ({ ...i, id: 'ins1' })) }));
vi.mock('../../../services/careerOs/careerProfileRepo', () => ({ updateOnboarding: vi.fn(async () => ({})), get: vi.fn(async () => null), updateHeadline: vi.fn(), setFactsRevision: vi.fn() }));
vi.mock('../../../services/careerOs/actionRepo', () => ({
    upsertByDedupeKey: vi.fn(async () => ({ inserted: [], resurfaced: [], expired: [], unchanged: 0 })),
    listEligible: vi.fn(async () => []),
    list: vi.fn(async () => []),
    start: vi.fn(async () => ({})),
    dismiss: vi.fn(async () => ({})),
    snooze: vi.fn(async () => ({})),
    complete: vi.fn(async () => ({})),
    recordUserReported: vi.fn(async () => ({})),
}));
vi.mock('../../../services/repos/resumeRepo', () => ({ list: vi.fn(async () => []), create: vi.fn(), upsertPrimary: vi.fn(), getPrimary: vi.fn(async () => null) }));
vi.mock('../../../services/repos/prismRepo', () => ({ getResumableForApplication: vi.fn(async () => null) }));
vi.mock('../../../services/repos/atsReportRepo', () => ({ listRecent: vi.fn(async () => []) }));
vi.mock('../../SubscriptionProvider', () => ({ useSubscription: () => ({ plan: { id: 'free', name: 'Free', limits: { resumes: 1 } } }) }));

vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/smartStudioService', () => ({ parsePdfFileWithAi: vi.fn(), arrayBufferToBase64: () => '' }));

const drafts = { list: [] as Array<{ docKey: string; blank: boolean }>, payload: null as unknown };
vi.mock('../../../lib/builder/draftCache', () => ({
    listAnonymousDrafts: () => drafts.list,
    claimAnonymousDraft: () => ({ draft: drafts.payload, existing: null, hasDuplicate: false, identical: false }),
    clearAnonymousDraft: vi.fn(),
}));

import * as factRepo from '../../../services/careerOs/factRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as atsReportRepo from '../../../services/repos/atsReportRepo';
import TodaySpace, { shouldShowOnboarding } from '../spaces/TodaySpace';

// --- Helpers ---------------------------------------------------------------

const profile = (onboarding: CareerProfile['onboarding'] = {}): CareerProfile => ({ userId: 'u1', headline: '', onboarding, migrationVersion: 1, migratedAt: null, factsRevision: '', revision: 1 });

let root: Root;
let container: HTMLDivElement;

const flush = async () => {
    for (let i = 0; i < 6; i += 1) {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
};

const mount = async () => {
    await act(async () => {
        root = createRoot(container);
        root.render(<TranslationProvider><TodaySpace route={{ view: 'career', space: 'today' }} /></TranslationProvider>);
    });
    await flush();
};

const text = () => container.textContent ?? '';
const buttons = () => Array.from(container.querySelectorAll('button'));
const click = async (label: string) => {
    const button = buttons().find((b) => (b.textContent ?? '').trim() === label);
    if (!button) throw new Error(`no button "${label}" in: ${buttons().map((b) => b.textContent).join(' | ')}`);
    await act(async () => { button.click(); });
    await flush();
};

beforeEach(() => {
    vi.resetAllMocks();
    clearOwnedQueries();
    careerOs.profile = profile({ completedAt: '2026-01-01T00:00:00Z', introducedAt: '2026-01-01T00:00:00Z' });
    drafts.list = [];
    drafts.payload = null;
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
});

afterEach(async () => {
    await act(async () => { root?.unmount(); });
});

// --- Tests -----------------------------------------------------------------

describe('shouldShowOnboarding', () => {
    it('gates only empty accounts or a started, unpaused flow', () => {
        expect(shouldShowOnboarding({}, true)).toBe(true);
        expect(shouldShowOnboarding({}, false)).toBe(false);
        expect(shouldShowOnboarding({ step: 'review' }, false)).toBe(true);
        expect(shouldShowOnboarding({ step: 'review', pausedAt: 'x' }, false)).toBe(false);
        expect(shouldShowOnboarding({ completedAt: 'x' }, true)).toBe(false);
    });
});

describe('TodaySpace', () => {
    it('renders the empty state without a goal and without fake momentum', async () => {
        await mount();
        expect(text()).toContain('Good');
        expect(text()).toContain('no goal set');
        // Layer 1: nothing invented to fill the next step.
        expect(text()).toContain('You are clear for now');
        expect(text()).toContain('Nothing is invented to fill this space');
        // Layer 2: every stage says it is empty rather than showing progress.
        for (const empty of ['Not set', 'None saved yet', 'None in progress', 'None scheduled', 'None yet']) expect(text()).toContain(empty);
        // Layer 4: the rail is honest too.
        expect(text()).toContain('No activity yet');
        expect(text()).toContain('Nothing dated');
        expect(text()).not.toMatch(/\d+%/);
        expect(text()).not.toContain('This space is being built');
    });

    it('shows the action queue with its reason and Begin marks it in progress then opens the destination', async () => {
        const app = application({ id: 'a1', stage: 'preparing', jobTitle: 'Nurse', company: 'Acme' });
        vi.mocked(applicationRepo.list).mockResolvedValue([app]);
        vi.mocked(factRepo.list).mockResolvedValue([fact({ id: 'f1' })]);
        vi.mocked(actionRepo.listEligible).mockResolvedValue([
            action({ id: 'act1', actionType: 'TAILOR_CV', title: 'Create the CV for Nurse at Acme', reason: 'This application is in preparation but has no CV linked yet.', dedupeKey: 'TAILOR_CV:a1:zzz', destination: { space: 'applications', id: 'a1', section: 'cv' }, evidenceRefs: [{ kind: 'application', id: 'a1', label: 'Nurse at Acme' }], estimatedEffort: '~30 min', effortSource: 'rule_estimate' }),
        ]);
        await mount();
        expect(vi.mocked(actionRepo.upsertByDedupeKey)).toHaveBeenCalledTimes(1);
        expect(text()).toContain('Create the CV for Nurse at Acme');
        expect(text()).toContain('no CV linked yet');
        // Provenance is progressive: hidden until the person asks for sources.
        expect(text()).not.toContain('Rule rules-1.0.0');
        await click('Sources');
        expect(text()).toContain('Rule rules-1.0.0');
        expect(text()).toContain('1 preparing');
        await click('Begin');
        expect(vi.mocked(actionRepo.start)).toHaveBeenCalledWith('u1', 'act1', 1);
        expect(vi.mocked(actionRepo.complete)).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith({ view: 'career', space: 'applications', id: 'a1', section: 'cv' });
    });

    it('dismiss records the dismissal and never completes the action', async () => {
        vi.mocked(factRepo.list).mockResolvedValue([fact({ id: 'f1' })]);
        vi.mocked(actionRepo.listEligible).mockResolvedValue([action({ id: 'act2', title: 'Set a career goal', destination: { space: 'career', section: 'goals' } })]);
        await mount();
        await click('Dismiss');
        expect(vi.mocked(actionRepo.dismiss)).toHaveBeenCalledWith('u1', 'act2', 1);
        expect(vi.mocked(actionRepo.complete)).not.toHaveBeenCalled();
        expect(careerOs.invalidate).toHaveBeenCalledWith('today');
    });

    it('pulse lists decomposable counts once there is anything to count, and the goal when set', async () => {
        vi.mocked(goalRepo.getPrimary).mockResolvedValue(goal({ id: 'g1', title: 'Senior nurse role' }));
        vi.mocked(factRepo.list).mockResolvedValue([fact({ id: 'f1', reviewState: 'candidate', confirmationState: 'inferred' }), fact({ id: 'f2' })]);
        await mount();
        expect(text()).toContain('primary goal: Senior nurse role');
        // The progress strip decomposes: facts confirmed of total, and the blocker.
        expect(text()).toContain('1 of 2 facts confirmed');
        expect(text()).toContain('Facts to review: 1');
        expect(text()).toContain('Senior nurse role');
        expect(text()).not.toContain('Not set');
    });

    it('shows the CV in use with its ATS signal, and opens it in the Builder or the CV workspace', async () => {
        vi.mocked(factRepo.list).mockResolvedValue([fact({ id: 'f1' })]);
        vi.mocked(resumeRepo.list).mockResolvedValue([
            { id: 'r1', title: 'Older CV', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 'r2', title: 'Newest CV', updatedAt: '2026-09-15T00:00:00.000Z' },
        ] as never);
        vi.mocked(atsReportRepo.listRecent).mockResolvedValue([{ id: 'rep1', resumeId: 'r2', jobDescription: null, score: 82, createdAt: '2026-09-16T00:00:00.000Z' }]);
        await mount();
        expect(text()).toContain('In progress');
        expect(text()).toContain('Newest CV');
        expect(text()).toContain('Score 82/100');
        await click('Open in Builder');
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs', id: 'r2', section: 'edit' }));
        await click('All CVs');
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'library', sub: 'cvs' }));
    });

    it('sends an empty new account into onboarding, but never an account with history', async () => {
        careerOs.profile = profile({});
        await mount();
        expect(text()).toContain('What brings you here?');
        expect(text()).not.toContain('In progress');
        await act(async () => { root.unmount(); });

        container = document.createElement('div');
        document.body.appendChild(container);
        clearOwnedQueries();
        vi.mocked(resumeRepo.list).mockResolvedValue([{ id: 'r1', title: 'My CV', data: {} as never, settings: {} as never, templateId: 'default', visibleSections: [], isPrimary: true }]);
        vi.mocked(applicationRepo.list).mockResolvedValue([application({ id: 'a9' })]);
        await mount();
        expect(text()).not.toContain('What brings you here?');
        expect(text()).toContain('In progress');
        // Existing users get a compact notice with the detail on demand.
        expect(text()).toContain('Your account is now a Career OS');
        expect(text()).toContain('1 CVs');
        await click('What moved where');
        expect(text()).toContain('Nothing was rewritten');
    });

    it('offers to claim an anonymous draft only when one exists on the device', async () => {
        await mount();
        expect(text()).not.toContain('Work saved on this device');
        await act(async () => { root.unmount(); });

        container = document.createElement('div');
        document.body.appendChild(container);
        clearOwnedQueries();
        drafts.list = [{ docKey: 'primary', blank: false }];
        drafts.payload = { formData: { contact: { firstName: 'Grace', lastName: 'Hopper', jobTitle: 'Rear Admiral' }, experience: [{}, {}], skills: ['COBOL'] }, visibleSections: [], settings: null, templateId: null };
        await mount();
        expect(text()).toContain('Work saved on this device');
        expect(text()).toContain('Grace Hopper');
        expect(text()).toContain('2 roles');
        expect(vi.mocked(resumeRepo.create)).not.toHaveBeenCalled();
    });
});
