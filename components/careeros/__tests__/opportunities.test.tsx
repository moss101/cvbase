// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { analysis, application, fact, goal, opportunity } from '../../../services/careerOs/__tests__/fixtures';
import type { Opportunity } from '../../../services/careerOs/types';

const navigate = vi.fn();
const replace = vi.fn();
const invalidate = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate, context: null, contextLoading: false, refreshContext: vi.fn(), openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace, back: () => false, reset: vi.fn(), route: { view: 'career', space: 'opportunities' } }), useBackHandler: () => undefined };
});
vi.mock('../../../lib/useMobileShell', () => ({ useMobileShell: () => false }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/careerOs/opportunityRepo', async () => {
    // The real module imports the Supabase client (needs env); mirror the pure fingerprint only.
    const util = await import('../../../services/careerOs/util');
    return {
        contentFingerprint: (content: string) => { const norm = util.normaliseText(content); return norm ? util.fingerprint(`opportunity|${norm}`) : null; },
        list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), findDuplicates: vi.fn(), merge: vi.fn(), unmerge: vi.fn(),
    };
});
vi.mock('../../../services/careerOs/analysisRepo', () => ({ listLatest: vi.fn(), latestForOpportunity: vi.fn(), save: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/goalRepo', () => ({ getPrimary: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ listForOpportunity: vi.fn(), start: vi.fn() }));
vi.mock('../../../services/repos/resumeRepo', () => ({ getPrimary: vi.fn() }));

import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { clearOwnedQueries } from '../data/useOwnedQuery';
import { ImportOpportunityDialog } from '../opportunities/ImportOpportunityDialog';
import { guessFromListing } from '../opportunities/importHeuristics';
import { deriveFreshness } from '../opportunities/freshness';
import { rankForYou } from '../opportunities/ranking';
import OpportunitiesSpace from '../spaces/OpportunitiesSpace';

const JD = `Senior Nurse at Acme Health
London · Hybrid

Requirements
- 5+ years of nursing experience in an acute setting
- Registered nurse licence required
- Experience with electronic patient records

Nice to have
- Leadership experience`;

function setValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(el, value);
    (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
const buttonByText = (text: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const byLabel = (label: string): HTMLInputElement | HTMLTextAreaElement => {
    const el = [...document.querySelectorAll('label')].find((l) => l.textContent?.startsWith(label));
    if (!el) throw new Error(`label not found: ${label}`);
    return document.getElementById(el.getAttribute('for') as string) as HTMLInputElement;
};

let root: Root;
let container: HTMLDivElement;
async function mount(node: React.ReactElement) {
    await act(async () => {
        root = createRoot(container);
        root.render(node);
    });
}

afterEach(async () => {
    // Unmount so a previous test's tree cannot refill the owned-query cache.
    await act(async () => { root?.unmount(); });
});

beforeEach(() => {
    vi.clearAllMocks();
    clearOwnedQueries();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(factRepo.list).mockResolvedValue([fact()]);
    vi.mocked(goalRepo.getPrimary).mockResolvedValue(goal());
    vi.mocked(resumeRepo.getPrimary).mockResolvedValue(null);
    vi.mocked(applicationRepo.listForOpportunity).mockResolvedValue([]);
});

describe('pure helpers', () => {
    it('guesses title/company from the first lines and remote type from the text', () => {
        const guess = guessFromListing(JD);
        expect(guess.title).toBe('Senior Nurse');
        expect(guess.company).toBe('Acme Health');
        expect(guess.remoteType).toBe('hybrid');
    });
    it('derives freshness from the listing or capture date and keeps unknown unknown', () => {
        const now = new Date('2026-09-21T00:00:00Z');
        expect(deriveFreshness(opportunity({ capturedAt: '2026-09-15T00:00:00Z', sourceDate: null }), now)).toBe('fresh');
        expect(deriveFreshness(opportunity({ capturedAt: '2026-08-15T00:00:00Z', sourceDate: null }), now)).toBe('aging');
        expect(deriveFreshness(opportunity({ capturedAt: '2026-06-01T00:00:00Z', sourceDate: '2026-06-01' }), now)).toBe('stale');
        expect(deriveFreshness(opportunity({ capturedAt: '2026-09-20T00:00:00Z', listingStatus: 'closed' }), now)).toBe('closed');
        expect(deriveFreshness(opportunity({ capturedAt: 'not a date' }), now)).toBe('unknown');
    });
    it('ranks by supported ratio then recency and separates hard-constraint hidden rows', () => {
        const a = opportunity({ id: 'oa', updatedAt: '2026-09-01T00:00:00Z' });
        const b = opportunity({ id: 'ob', updatedAt: '2026-09-02T00:00:00Z' });
        const c = opportunity({ id: 'oc', updatedAt: '2026-09-03T00:00:00Z' });
        const req = (id: string) => ({ requirementId: id, text: id, state: 'supported' as const, evidence: [] });
        const ranked = rankForYou([a, b, c], [
            analysis({ id: 'an-a', opportunityId: 'oa', qualification: { supported: [req('1'), req('2')], partial: [], missing: [req('3')], unknown: [] } }),
            analysis({ id: 'an-b', opportunityId: 'ob', qualification: { supported: [req('1')], partial: [], missing: [req('2')], unknown: [] } }),
            analysis({ id: 'an-c', opportunityId: 'oc', hiddenByConstraint: { constraintId: 'k1', text: 'Must be in London — Listing location "Leeds" is not "London".' } }),
        ]);
        expect(ranked.ranked.map((r) => r.opportunity.id)).toEqual(['oa', 'ob']);
        expect(ranked.hidden.map((r) => r.opportunity.id)).toEqual(['oc']);
    });
});

describe('ImportOpportunityDialog', () => {
    it('extracts requirements from the pasted listing, detects a duplicate and merges INTO the existing record', async () => {
        const existing = opportunity({ id: 'o-existing', title: 'Senior Nurse', company: 'Acme Health' });
        const created = opportunity({ id: 'o-new', title: 'Senior Nurse', company: 'Acme Health', capturedContent: JD });
        vi.mocked(opportunityRepo.findDuplicates).mockResolvedValue({ exact: [existing], possible: [] });
        vi.mocked(opportunityRepo.create).mockResolvedValue(created);
        vi.mocked(opportunityRepo.merge).mockResolvedValue({ source: { ...created, mergedIntoId: existing.id }, target: existing });
        const onSaved = vi.fn();
        await mount(<ImportOpportunityDialog open onClose={() => undefined} onSaved={onSaved} />);

        await act(async () => { setValue(document.querySelector('textarea') as HTMLTextAreaElement, JD); });
        expect((byLabel('Job title') as HTMLInputElement).value).toBe('Senior Nurse');
        expect((byLabel('Company') as HTMLInputElement).value).toBe('Acme Health');
        expect(document.body.textContent).toContain('4 requirement lines found');

        await act(async () => { buttonByText('Save opportunity').click(); });
        expect(vi.mocked(opportunityRepo.findDuplicates)).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Senior Nurse', company: 'Acme Health', fingerprint: expect.any(String) }));
        expect(document.body.textContent).toContain('Looks like a duplicate of Senior Nurse at Acme Health');
        expect(vi.mocked(opportunityRepo.create)).not.toHaveBeenCalled();

        await act(async () => { buttonByText('Merge into this one').click(); });
        expect(vi.mocked(opportunityRepo.create)).toHaveBeenCalledWith('u1', expect.objectContaining({
            sourceKind: 'paste', capturedContent: JD, contentFingerprint: expect.any(String), status: 'saved',
            requirements: expect.arrayContaining([expect.objectContaining({ text: 'Registered nurse licence required', kind: 'must' })]),
        }));
        expect(vi.mocked(opportunityRepo.create).mock.calls[0][1].requirements).toHaveLength(4);
        // The new record is merged INTO the existing one: the survivor is the existing id.
        expect(vi.mocked(opportunityRepo.merge)).toHaveBeenCalledWith('u1', 'o-new', 'o-existing');
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'opportunity_saved', expect.objectContaining({ subjectRefs: { opportunity: 'o-new' } }));
        expect(onSaved).toHaveBeenCalledWith({ opportunity: created, mergedInto: existing });
    });
});

describe('OpportunitiesSpace list (For You)', () => {
    it('states imported-only coverage, never labels a vacancy, and keeps hidden-by-constraint rows inspectable', async () => {
        const visible = opportunity({ id: 'o-vis', title: 'Senior Nurse', company: 'Acme Health' });
        const hidden = opportunity({ id: 'o-hid', title: 'Ward Manager', company: 'Leeds Trust', updatedAt: '2026-09-05T00:00:00Z' });
        vi.mocked(opportunityRepo.list).mockResolvedValue([visible, hidden]);
        vi.mocked(analysisRepo.listLatest).mockResolvedValue([
            analysis({ id: 'an-h', opportunityId: 'o-hid', goalId: 'g1', hiddenByConstraint: { constraintId: 'k1', text: 'Must be in London — Listing location "Leeds" is not "London".' } }),
        ]);
        await mount(<OpportunitiesSpace route={{ view: 'career', space: 'opportunities' }} />);

        expect(document.body.textContent).toContain('Ranking your 2 imported opportunities. CVBase does not search job boards yet.');
        expect(document.body.textContent?.toLowerCase()).not.toContain('vacanc');
        expect(document.body.textContent).toContain('Senior Nurse');
        expect(document.body.textContent).not.toContain('Ward Manager');

        await act(async () => { buttonByText('Hidden by your constraints (1)').click(); });
        expect(document.body.textContent).toContain('Ward Manager');
        expect(document.body.textContent).toContain('Listing location "Leeds" is not "London"');
        expect(buttonByText('Revise constraint')).toBeTruthy();
        await act(async () => { buttonByText('Revise constraint').click(); });
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'career', sub: 'goals', id: 'g1' }));
    });
});

describe('OpportunitiesSpace detail', () => {
    const opp = opportunity({ id: 'o1', title: 'Senior Nurse', company: 'Acme Health', capturedContent: JD, requirements: [{ id: 'r1', text: 'Registered nurse licence required', kind: 'must' }] });

    it('shows Pay not stated, the unknown listing date and starts an application with a stable idempotency key', async () => {
        vi.mocked(opportunityRepo.get).mockResolvedValue(opp);
        vi.mocked(analysisRepo.latestForOpportunity).mockResolvedValue(null);
        const started = application({ id: 'a-new', opportunityId: 'o1', attemptNo: 1 });
        vi.mocked(applicationRepo.start).mockResolvedValue(started);
        await mount(<OpportunitiesSpace route={{ view: 'career', space: 'opportunities', id: 'o1' }} />);

        expect(document.body.textContent).toContain('Pay not stated');
        expect(document.body.textContent).toContain('Listing date');
        expect(document.body.textContent).toContain('Unknown');
        expect(document.body.textContent).toContain('Fit has not been analysed yet');

        const start = buttonByText('Start application');
        await act(async () => { start.click(); start.click(); });
        expect(vi.mocked(applicationRepo.start)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(applicationRepo.start)).toHaveBeenCalledWith('u1', { opportunityId: 'o1', campaignId: null, idempotencyKey: 'start:o1', reapply: false });
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'application_started', expect.objectContaining({ subjectRefs: { application: 'a-new', opportunity: 'o1' }, dedupeKey: 'application_started:a-new' }));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a-new', section: 'analysis' }));
    });

    it('presents an existing application as Open, and Apply again creates attempt 2 with reapply', async () => {
        vi.mocked(opportunityRepo.get).mockResolvedValue(opp);
        vi.mocked(analysisRepo.latestForOpportunity).mockResolvedValue(analysis({ opportunityId: 'o1', direction: { factors: [{ key: 'compensation', label: 'Compensation', verdict: 'unknown', detail: 'Pay not stated.' }], constraints: [], missing: ['compensation'] } }));
        const existing = application({ id: 'a-1', opportunityId: 'o1', attemptNo: 1, matchScore: 72 });
        vi.mocked(applicationRepo.listForOpportunity).mockResolvedValue([existing]);
        vi.mocked(applicationRepo.start).mockResolvedValue(application({ id: 'a-2', opportunityId: 'o1', attemptNo: 2, previousAttemptId: 'a-1' }));
        await mount(<OpportunitiesSpace route={{ view: 'career', space: 'opportunities', id: 'o1' }} />);

        expect(() => buttonByText('Start application')).toThrow();
        expect(document.body.textContent).toContain('Legacy match score (historical): 72');
        expect(document.body.textContent).toContain('Pay not stated');
        await act(async () => { buttonByText('Open application').click(); });
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a-1' }));

        await act(async () => { buttonByText('Apply again').click(); });
        expect(vi.mocked(applicationRepo.start)).toHaveBeenCalledWith('u1', { opportunityId: 'o1', campaignId: null, idempotencyKey: 'start:o1:attempt:2', reapply: true });
    });

    it('Analyse fit saves an analysis with the goal and facts and emits opportunity_fit_reviewed', async () => {
        vi.mocked(opportunityRepo.get).mockResolvedValue(opp);
        vi.mocked(analysisRepo.latestForOpportunity).mockResolvedValue(null);
        vi.mocked(analysisRepo.save).mockImplementation(async (_u, input) => analysis({ ...input, id: 'an-new' }));
        await mount(<OpportunitiesSpace route={{ view: 'career', space: 'opportunities', id: 'o1' }} />);
        await act(async () => { buttonByText('Analyse fit').click(); });
        expect(vi.mocked(analysisRepo.save)).toHaveBeenCalledWith('u1', expect.objectContaining({ opportunityId: 'o1', goalId: 'g1', engineVersion: 'fit-1.0.0', atsScore: null }));
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'opportunity_fit_reviewed', expect.objectContaining({ subjectRefs: { opportunity: 'o1', analysis: 'an-new' } }));
        expect(document.body.textContent).toContain('Qualification fit');
        expect(document.body.textContent).toContain('Career direction fit');
    });
});

describe('Opportunity type guard', () => {
    it('fixture is a full Opportunity', () => {
        const o: Opportunity = opportunity();
        expect(o.status).toBe('saved');
    });
});
