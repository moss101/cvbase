// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { application, campaign, goal, opportunity, outcome } from '../../../services/careerOs/__tests__/fixtures';
import { ConflictError } from '../../../services/careerOs/types';

const navigate = vi.fn();
const replace = vi.fn();
const invalidate = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate, context: null, contextLoading: false, refreshContext: vi.fn(), openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace, back: () => false, reset: vi.fn(), route: { view: 'career', space: 'campaigns' } }), useBackHandler: () => undefined };
});
vi.mock('../../../lib/useMobileShell', () => ({ useMobileShell: () => false }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/careerOs/campaignRepo', () => ({
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), pause: vi.fn(), close: vi.fn(), reopen: vi.fn(),
    addOpportunity: vi.fn(), removeOpportunity: vi.fn(), listOpportunityIds: vi.fn(), assignApplication: vi.fn(),
}));
vi.mock('../../../services/careerOs/goalRepo', () => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ list: vi.fn(), listForCampaign: vi.fn(), listForOpportunity: vi.fn(), update: vi.fn(), start: vi.fn() }));
vi.mock('../../../services/careerOs/outcomeRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/opportunityRepo', () => ({ list: vi.fn() }));

import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { clearOwnedQueries } from '../data/useOwnedQuery';
import { earlierStage, laterStage, STAGE_ORDER } from '../campaigns/stages';
import CampaignsSpace from '../spaces/CampaignsSpace';

const buttonByText = (text: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const buttonByLabel = (label: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label);
    if (!btn) throw new Error(`button not found by label: ${label}`);
    return btn as HTMLButtonElement;
};

let root: Root;
let container: HTMLDivElement;
async function mount(node: React.ReactElement) {
    await act(async () => { root = createRoot(container); root.render(node); });
}

const apps = [
    application({ id: 'a-prep', campaignId: 'c1', stage: 'preparing', jobTitle: 'Senior Nurse', revision: 4 }),
    application({ id: 'a-sub', campaignId: 'c1', stage: 'submitted', jobTitle: 'Charge Nurse', submittedAt: '2026-09-01T00:00:00Z', revision: 2 }),
    application({ id: 'a-int', campaignId: 'c1', stage: 'interview', jobTitle: 'Ward Manager', revision: 1 }),
];

afterEach(async () => { await act(async () => { root?.unmount(); }); });
beforeEach(() => {
    vi.clearAllMocks();
    clearOwnedQueries();
    try { window.localStorage.clear(); } catch { /* jsdom */ }
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(goalRepo.list).mockResolvedValue([goal()]);
    vi.mocked(goalRepo.get).mockResolvedValue(goal());
    vi.mocked(applicationRepo.list).mockResolvedValue([...apps, application({ id: 'a-loose', campaignId: null, jobTitle: 'Legacy tracker row' })]);
    vi.mocked(applicationRepo.listForCampaign).mockResolvedValue(apps);
    vi.mocked(applicationRepo.listForOpportunity).mockResolvedValue([]);
    vi.mocked(outcomeRepo.list).mockResolvedValue([outcome({ id: 'x-offer', applicationId: 'a-int', kind: 'offer' })]);
    vi.mocked(opportunityRepo.list).mockResolvedValue([opportunity({ id: 'o1' }), opportunity({ id: 'o2', title: 'Other role' })]);
    vi.mocked(campaignRepo.listOpportunityIds).mockResolvedValue(['o1', 'o2']);
    vi.mocked(campaignRepo.list).mockResolvedValue([campaign({ id: 'c1', name: 'Autumn search', milestones: [{ id: 'm1', title: 'Shortlist 10 roles', state: 'doing' }] })]);
    vi.mocked(campaignRepo.get).mockResolvedValue(campaign({ id: 'c1', name: 'Autumn search', revision: 3 }));
});

describe('stages', () => {
    it('moves earlier/later along the fixed column order and stops at the ends', () => {
        expect(STAGE_ORDER).toEqual(['saved', 'preparing', 'submitted', 'response', 'interview', 'final', 'closed']);
        expect(earlierStage('saved')).toBeNull();
        expect(laterStage('closed')).toBeNull();
        expect(laterStage('preparing')).toBe('submitted');
        expect(earlierStage('interview')).toBe('response');
    });
});

describe('CampaignsSpace list', () => {
    it('shows observed funnel counts from the campaign\'s own applications, opportunities and outcomes', async () => {
        await mount(<CampaignsSpace route={{ view: 'career', space: 'campaigns' }} />);
        expect(document.body.textContent).toContain('Autumn search');
        expect(document.body.textContent).toContain('Toward Senior nurse role');
        const cells = [...document.querySelectorAll('dl div')].map((d) => d.textContent);
        expect(cells).toContain('Opportunities2');
        expect(cells).toContain('Submitted1');
        expect(cells).toContain('Interviewing1');
        expect(cells).toContain('Offers1');
        expect(document.body.textContent).toContain('Next: Shortlist 10 roles');
        expect(document.body.textContent).not.toMatch(/\d+%/);
    });

    it('creates a campaign only from the form, links the goal and emits campaign_created', async () => {
        vi.mocked(campaignRepo.create).mockResolvedValue(campaign({ id: 'c-new', name: 'Winter push', goalId: 'g1' }));
        await mount(<CampaignsSpace route={{ view: 'career', space: 'campaigns' }} />);
        await act(async () => { buttonByText('New campaign').click(); });
        const name = [...document.querySelectorAll('input')].find((i) => i.getAttribute('placeholder')?.includes('Senior product')) as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        await act(async () => { setter.call(name, 'Winter push'); name.dispatchEvent(new Event('input', { bubbles: true })); });
        await act(async () => { buttonByText('Create campaign').click(); });
        expect(vi.mocked(campaignRepo.create)).toHaveBeenCalledWith('u1', { name: 'Winter push', goalId: 'g1', milestones: [] });
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'campaign_created', expect.objectContaining({ subjectRefs: { campaign: 'c-new', goal: 'g1' } }));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'campaigns', id: 'c-new' }));
    });
});

describe('CampaignsSpace detail board', () => {
    it('renders keyboard-operable columns with counts; Later updates the stage with the revision and labels the move as yours with Undo', async () => {
        vi.mocked(applicationRepo.update).mockImplementation(async (_u, id, patch, rev) => ({ ...(apps.find((a) => a.id === id) as ReturnType<typeof application>), ...patch, revision: rev + 1 }));
        await mount(<CampaignsSpace route={{ view: 'career', space: 'campaigns', id: 'c1' }} />);

        expect(document.body.textContent).toContain('Autumn search');
        const headers = [...document.querySelectorAll('h3[id^="col-"]')].map((h) => h.textContent);
        expect(headers).toEqual(['Target Roles0', 'Preparing1', 'Applied1', 'Response received0', 'Interviewing1', 'Final stage0', 'Archived / Rejected0']);
        // Every card has non-drag move buttons.
        expect(buttonByLabel('Move Senior Nurse to Applied').tagName).toBe('BUTTON');
        expect(buttonByLabel('Move Senior Nurse to Target Roles').disabled).toBe(false);

        await act(async () => { buttonByLabel('Move Senior Nurse to Applied').click(); });
        expect(vi.mocked(applicationRepo.update)).toHaveBeenCalledWith('u1', 'a-prep', { stage: 'submitted', closedReason: null }, 4);
        expect(document.body.textContent).toContain('Moved by you from Preparing');
        expect(document.querySelector('[role="status"][aria-live="polite"]')?.textContent).toContain('Senior Nurse moved to Applied — moved by you.');

        await act(async () => { buttonByText('Undo').click(); });
        expect(vi.mocked(applicationRepo.update)).toHaveBeenLastCalledWith('u1', 'a-prep', { stage: 'preparing', closedReason: null }, 5);
    });

    it('closing asks for a reason first, and a revision conflict shows the changed-elsewhere notice instead of overwriting', async () => {
        vi.mocked(applicationRepo.update).mockRejectedValue(new ConflictError('application', 'a-int', 1));
        await mount(<CampaignsSpace route={{ view: 'career', space: 'campaigns', id: 'c1' }} />);
        await act(async () => { buttonByLabel('Move Ward Manager to Final stage').click(); });
        expect(document.body.textContent).toContain('This record changed elsewhere');
        expect(buttonByText('Reload')).toBeTruthy();
        vi.mocked(applicationRepo.update).mockClear();

        // Move to closed: the reason dialog appears before any write.
        vi.mocked(applicationRepo.listForCampaign).mockResolvedValue([application({ id: 'a-fin', campaignId: 'c1', stage: 'final', jobTitle: 'Final Role', revision: 9 })]);
        clearOwnedQueries();
        await act(async () => { root.unmount(); root = createRoot(container); root.render(<CampaignsSpace route={{ view: 'career', space: 'campaigns', id: 'c1' }} />); });
        await act(async () => { buttonByLabel('Move Final Role to Archived / Rejected').click(); });
        expect(document.body.textContent).toContain('Why is it closed?');
        expect(vi.mocked(applicationRepo.update)).not.toHaveBeenCalled();
        vi.mocked(applicationRepo.update).mockResolvedValue(application({ id: 'a-fin', stage: 'closed', closedReason: 'archived', revision: 10 }));
        await act(async () => { buttonByText('Move to closed').click(); });
        expect(vi.mocked(applicationRepo.update)).toHaveBeenCalledWith('u1', 'a-fin', { stage: 'closed', closedReason: 'archived' }, 9);
    });

    it('list view is the same data without drag, driven by the route query; assign/unassign touch only campaign_id', async () => {
        vi.mocked(campaignRepo.assignApplication).mockResolvedValue(application({ id: 'a-loose', campaignId: 'c1' }));
        await mount(<CampaignsSpace route={{ view: 'career', space: 'campaigns', id: 'c1', query: { view: 'list' } }} />);
        expect(document.querySelector('ol[aria-label="Applications by stage"]')).not.toBeNull();
        expect(document.querySelector('h3[id="col-saved"]')).toBeNull();

        await act(async () => { buttonByText('Assign existing application').click(); });
        expect(document.body.textContent).toContain('Legacy tracker row');
        await act(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent === 'Assign')?.click(); });
        expect(vi.mocked(campaignRepo.assignApplication)).toHaveBeenCalledWith('u1', 'a-loose', 'c1', 1);

        await act(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent === 'Unassign')?.click(); });
        expect(vi.mocked(campaignRepo.assignApplication)).toHaveBeenLastCalledWith('u1', expect.any(String), null, expect.any(Number));
    });
});
