// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationProvider } from '../../../services/translationService';
import type { CareerProfile, FactReference } from '../../../services/careerOs/types';
import { fact } from '../../../services/careerOs/__tests__/fixtures';
import { clearOwnedQueries } from '../data/useOwnedQuery';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), registerBackHandler: () => () => undefined, route: { view: 'career', space: 'career' }, direction: 'forward', canGoBack: false }), useBackHandler: () => undefined };
});
vi.mock('../../AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' }, userProfile: null }) }));

const profile: CareerProfile = { userId: 'u1', headline: '', onboarding: { completedAt: 'x' }, migrationVersion: 1, migratedAt: null, factsRevision: '', revision: 1 };
const careerOs = { userId: 'u1', profile, profileError: null, migration: 'done', refreshProfile: vi.fn(async () => undefined), invalidate: vi.fn(), context: null, contextLoading: false, contextError: null, isAdmin: false, unreadCount: 0, refreshContext: vi.fn(), refreshInbox: vi.fn(), openAuth: vi.fn(), route: { view: 'career', space: 'career' } };
vi.mock('../shell/CareerOsProvider', () => ({ useCareerOs: () => careerOs }));

vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/smartStudioService', () => ({ parsePdfFileWithAi: vi.fn(), arrayBufferToBase64: () => '' }));
vi.mock('../../../services/careerOs/factRepo', () => ({
    list: vi.fn(async () => []), listForFact: vi.fn(async () => []), staleReferences: vi.fn(async () => []), confirm: vi.fn(), update: vi.fn(),
    createMany: vi.fn(async () => []), create: vi.fn(), softDelete: vi.fn(), withdraw: vi.fn(), verify: vi.fn(), resolveConflict: vi.fn(),
}));
vi.mock('../../../services/careerOs/artifactRepo', () => ({ markStale: vi.fn(async () => 1), get: vi.fn(async () => ({ id: 'art1', applicationId: 'app-1', title: 'Cover letter', kind: 'cover_letter', status: 'draft' })) }));
vi.mock('../../../services/careerOs/analysisRepo', () => ({ markStaleForFacts: vi.fn(async () => 2), markStaleForGoal: vi.fn(async () => 0) }));
vi.mock('../../../services/careerOs/careerProfileRepo', () => ({ setFactsRevision: vi.fn(async () => profile), updateHeadline: vi.fn(), get: vi.fn(), updateOnboarding: vi.fn() }));
vi.mock('../../../services/careerOs/eventRepo', () => ({ insert: vi.fn(async () => undefined), listRecent: vi.fn(async () => []) }));
vi.mock('../../../services/careerOs/goalRepo', () => ({ list: vi.fn(async () => []), getPrimary: vi.fn(async () => null), create: vi.fn(), update: vi.fn(), setPrimary: vi.fn(), archive: vi.fn(), listRevisions: vi.fn(async () => []), get: vi.fn() }));
vi.mock('../../../services/repos/resumeRepo', () => ({ list: vi.fn(async () => []), create: vi.fn() }));

import * as factRepo from '../../../services/careerOs/factRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as eventRepo from '../../../services/careerOs/eventRepo';
import { ReviewQueue } from '../career/ReviewQueue';
import { FactsView } from '../career/FactsView';
import { emptyGoalValues, validateGoal, valuesToGoalInput } from '../career/GoalForm';
import { destinationToRoute } from '../career/factFormat';
import { parsedResumeToResumeData } from '../career/importResume';
import { parseResumeText } from '../../../lib/ats/resumeParse';
import type { FactMutations } from '../career/useCareerFacts';

const t = (_key: string, fallback: string) => fallback;
const render = (node: React.ReactNode): string => renderToStaticMarkup(<TranslationProvider>{node}</TranslationProvider>);

let root: Root;
let container: HTMLDivElement;
const flush = async () => { for (let i = 0; i < 6; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const mount = async (node: React.ReactNode) => {
    await act(async () => { root = createRoot(container); root.render(<TranslationProvider>{node}</TranslationProvider>); });
    await flush();
};
const text = () => container.textContent ?? '';
const clickButton = async (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === label);
    if (!button) throw new Error(`no button "${label}"`);
    await act(async () => { button.click(); });
    await flush();
};
const setValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
    vi.resetAllMocks();
    clearOwnedQueries();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

const noopMutations = (): FactMutations => ({
    create: vi.fn(), confirm: vi.fn(), verify: vi.fn(), withdraw: vi.fn(), remove: vi.fn(), resolveConflict: vi.fn(), confirmAll: vi.fn(),
    edit: vi.fn(),
});

describe('goal form validation', () => {
    it('requires a three-letter currency and an ordered range', () => {
        const values = { ...emptyGoalValues(), role: 'Nurse', compMin: '50000', compMax: '40000', compCurrency: 'pounds' };
        const errors = validateGoal(values, t);
        expect(errors.compCurrency).toContain('three-letter');
        expect(errors.compRange).toContain('minimum');
        expect(validateGoal({ ...values, compMin: '40000', compMax: '50000', compCurrency: 'gbp' }, t)).toEqual({});
        expect(validateGoal({ ...values, compMin: '40000', compMax: '', compCurrency: '' }, t).compCurrency).toContain('currency');
        expect(validateGoal({ ...emptyGoalValues() }, t).role).toBeTruthy();
    });

    it('maps values to a goal input with weights in 0..1 and never claims primary itself', () => {
        const values = { ...emptyGoalValues(), role: 'Nurse', compMin: '40000', compMax: '50000', compCurrency: 'gbp', compPeriod: 'year' as const, targetEmployers: 'NHS, Bupa' };
        values.priorities.growth = 5;
        values.priorities.mission = 2;
        const input = valuesToGoalInput(values, 'onboarding');
        expect(input.title).toBe('Nurse');
        expect(input.compCurrency).toBe('GBP');
        expect(input.targetEmployers).toEqual(['NHS', 'Bupa']);
        expect(input.priorities).toEqual([{ key: 'growth', weight: 1 }, { key: 'mission', weight: 0.4 }]);
        expect(input.isPrimary).toBe(false);
        expect(input.source).toBe('onboarding');
    });
});

describe('destinationToRoute', () => {
    it('maps every action destination to a typed route with ids only', () => {
        expect(destinationToRoute({ space: 'applications', id: 'a1', section: 'interview' })).toEqual({ view: 'career', space: 'applications', id: 'a1', section: 'interview' });
        expect(destinationToRoute({ space: 'career', section: 'evidence', sub: 'review' })).toEqual({ view: 'career', space: 'career', sub: 'evidence' });
        expect(destinationToRoute({ space: 'opportunities', id: 'o1' })).toEqual({ view: 'career', space: 'opportunities', id: 'o1' });
        expect(destinationToRoute({ space: 'today' })).toEqual({ view: 'career', space: 'today' });
    });
});

describe('import parsing', () => {
    it('turns parsed CV text into ResumeData without inventing fields', () => {
        const parsed = parseResumeText(
            'Jane Doe\njane@example.com\n\nExperience\nSenior Nurse | St Mary Hospital | Jan 2019 - Present\n- Led a ward of 12\n\nSkills\nTriage, Leadership\n\nEducation\nBSc Nursing\nKings College\n',
            'pasted',
        );
        const data = parsedResumeToResumeData(parsed);
        expect(data.contact.firstName).toBe('Jane');
        expect(data.contact.email).toBe('jane@example.com');
        expect(data.experience[0]?.jobTitle).toBe('Senior Nurse');
        expect(data.experience[0]?.endDate).toBe('Present');
        expect(data.skills).toEqual(['Triage', 'Leadership']);
        expect(data.education[0]?.degree).toBe('BSc Nursing');
        expect(data.contact.phone).toBe('');
        expect(data.summary.professionalSummary).toBe('');
    });
});

describe('ReviewQueue', () => {
    it('confirming a candidate calls the mutation and the badge changes once the fact is reviewed', async () => {
        const candidate = fact({ id: 'f1', reviewState: 'candidate', confirmationState: 'inferred', sourceKind: 'resume_import' });
        const mutations = noopMutations();
        vi.mocked(mutations.confirm).mockResolvedValue({ ...candidate, reviewState: 'reviewed', confirmationState: 'user_confirmed' });
        const onChanged = vi.fn();
        await mount(<ReviewQueue userId="u1" facts={[candidate]} mutations={mutations} onChanged={onChanged} />);
        expect(text()).toContain('Inferred');
        expect(text()).toContain('Needs review');
        expect(text()).toContain('1 candidates waiting for you');
        await clickButton('Confirm');
        expect(mutations.confirm).toHaveBeenCalledWith(candidate);
        expect(onChanged).toHaveBeenCalled();
        await act(async () => { root.unmount(); });
        container = document.createElement('div');
        document.body.appendChild(container);
        await mount(<ReviewQueue userId="u1" facts={[{ ...candidate, reviewState: 'reviewed', confirmationState: 'user_confirmed' }]} mutations={mutations} />);
        expect(text()).toContain('Nothing waiting for review');
        expect(text()).not.toContain('Inferred');
    });

    it('shows contradictions side by side with a keep-this-one choice', () => {
        const a = fact({ id: 'f1', reviewState: 'conflict', conflictGroup: 'grp', startDate: '2019-01', endDate: '2023-06' });
        const b = fact({ id: 'f2', reviewState: 'conflict', conflictGroup: 'grp', startDate: '2020-01', endDate: '2023-06', sourceKind: 'resume_import', confirmationState: 'inferred' });
        const markup = render(<ReviewQueue userId="u1" facts={[a, b]} mutations={noopMutations()} />);
        expect(markup).toContain('1 contradictions to resolve');
        expect(markup.match(/Keep this one/g)?.length).toBe(2);
        expect(markup).toContain('2019-01');
        expect(markup).toContain('2020-01');
    });
});

describe('FactsView change impact', () => {
    it('shows the impact banner and marks dependants stale when a referenced fact changes', async () => {
        const existing = fact({ id: 'f1', title: 'Senior Nurse', organization: 'St Mary Hospital' });
        const reference: FactReference = { id: 'ref1', factId: 'f1', factRevision: 1, artifactKind: 'application_artifact', artifactId: 'art1', artifactSection: 'body', createdAt: 'x' };
        vi.mocked(factRepo.list).mockResolvedValue([existing]);
        vi.mocked(factRepo.listForFact).mockResolvedValue([reference]);
        vi.mocked(factRepo.update).mockImplementation(async (_u, _id, patch) => ({ ...existing, ...patch, revision: 2 }));

        await mount(<FactsView kind="experience" />);
        expect(text()).toContain('Senior Nurse');
        await clickButton('Edit');
        const title = container.querySelector<HTMLInputElement>('input[id$="-title"]');
        expect(title).not.toBeNull();
        await act(async () => { setValue(title!, 'Charge Nurse'); });
        await clickButton('Save');

        expect(vi.mocked(factRepo.update)).toHaveBeenCalledWith('u1', 'f1', expect.objectContaining({ title: 'Charge Nurse' }), 1);
        expect(vi.mocked(artifactRepo.markStale)).toHaveBeenCalledWith('u1', ['art1']);
        expect(text()).toContain('1 drafts were built from the previous version of this fact');
        expect(text()).toContain('Submitted snapshots are never changed');
        expect(text()).toContain('Charge Nurse');
        expect(text()).toContain('Cover letter');
        const events = vi.mocked(eventRepo.insert).mock.calls.map(([, e]) => e.eventName);
        expect(events).toContain('career_claim_corrected');
        await clickButton('Review draft');
        expect(navigate).toHaveBeenCalledWith({ view: 'career', space: 'applications', id: 'app-1', section: 'cover-letter' });
    });

    it('does not show an impact banner when nothing references the fact', async () => {
        const existing = fact({ id: 'f2', title: 'Nurse' });
        vi.mocked(factRepo.list).mockResolvedValue([existing]);
        vi.mocked(factRepo.listForFact).mockResolvedValue([]);
        vi.mocked(factRepo.update).mockImplementation(async (_u, _id, patch) => ({ ...existing, ...patch, revision: 2 }));
        await mount(<FactsView kind="experience" />);
        await clickButton('Edit');
        const title = container.querySelector<HTMLInputElement>('input[id$="-title"]');
        await act(async () => { setValue(title!, 'Staff Nurse'); });
        await clickButton('Save');
        expect(text()).not.toContain('drafts were built');
        expect(vi.mocked(artifactRepo.markStale)).not.toHaveBeenCalled();
    });
});
