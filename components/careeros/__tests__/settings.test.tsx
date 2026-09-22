// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { action } from '../../../services/careerOs/__tests__/fixtures';
import type { ActionCandidate } from '../../../services/careerOs/careerActions';
import type { CareerAction, CareerPreferences, UserNotification } from '../../../services/careerOs/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate: vi.fn(), isAdmin: false, profile: null, migration: 'done', refreshInbox: vi.fn(), openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), route: { view: 'career', space: 'settings' } }), useBackHandler: () => undefined };
});
vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/careerOs/preferencesRepo', () => ({ ensure: vi.fn(), update: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/goalRepo', () => ({ getPrimary: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/opportunityRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/interviewRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/analysisRepo', () => ({ listLatest: vi.fn() }));
vi.mock('../../../services/careerOs/outcomeRepo', () => ({ list: vi.fn() }));
vi.mock('../../../services/careerOs/actionRepo', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../services/careerOs/actionRepo')>();
    return { ...actual, list: vi.fn(), upsertByDedupeKey: vi.fn() };
});
vi.mock('../../../services/careerOs/notificationRepo', () => ({ list: vi.fn(), upsertByDedupeKey: vi.fn() }));
vi.mock('../../../services/repos/resumeRepo', () => ({ getPrimary: vi.fn(), upsertPrimary: vi.fn() }));
vi.mock('../../SettingsPanel', () => ({ default: (props: { onOpenBackup?: () => void }) => <div data-testid="settings-panel"><button type="button" onClick={props.onOpenBackup}>legacy backup</button></div> }));

import * as preferencesRepo from '../../../services/careerOs/preferencesRepo';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import * as notificationRepo from '../../../services/careerOs/notificationRepo';
import { countCreatedToday, runProactiveNow, toPlannerCandidate, type ProactiveDeps } from '../settings/proactiveRun';
import { CONNECTOR_ASSESSMENTS } from '../settings/connectorAssessment';
import SettingsSpace from '../spaces/SettingsSpace';

const prefs = (o: Partial<CareerPreferences> = {}): CareerPreferences => ({
    userId: 'u1', proactiveEnabled: true, consentAt: '2026-09-01T00:00:00.000Z', timeZone: 'Europe/London', quietHours: null, dailyActionCap: 2,
    triggers: { interview: true, followUp: true, staleImport: true, evidenceGap: false }, lastProactiveRunAt: null, checkpoint: {}, revision: 3, ...o,
});
const candidate = (type: CareerAction['actionType'], subjectId: string, deadlineAt: string | null = null): ActionCandidate => ({
    actionType: type, title: `${type} ${subjectId}`, reason: 'because', evidenceRefs: [], priorityBand: 'now', contextRefs: {}, inputRevisions: {},
    source: 'rule', ruleVersion: 'rules-1.0.0', dedupeKey: `${type}:${subjectId}:h1`, destination: { space: 'applications', id: subjectId },
    estimatedEffort: null, effortSource: null, confidence: null, expiresAt: null, subjectId, materialInputs: {}, ranking: { deadlineAt, unblocks: false, goalRelevant: true, effortMinutes: 10 },
});

const buttonByText = (text: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const click = async (el: Element) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

let root: Root;
let container: HTMLDivElement;
async function mount(sub?: string) {
    await act(async () => { root = createRoot(container); root.render(<SettingsSpace route={{ view: 'career', space: 'settings', ...(sub ? { sub } : {}) }} />); });
    await flush();
}

afterEach(async () => { await act(async () => { root?.unmount(); }); vi.useRealTimers(); });
beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(preferencesRepo.ensure).mockResolvedValue(prefs());
    vi.mocked(preferencesRepo.update).mockImplementation(async (_u, patch, rev) => ({ ...prefs(), ...patch, revision: rev + 1 }) as CareerPreferences);
});

function deps(over: Partial<ProactiveDeps> = {}): ProactiveDeps {
    return {
        loadCandidates: async () => [candidate('PREPARE_INTERVIEW', 'a1', '2026-09-22T09:00:00.000Z'), candidate('FOLLOW_UP_APPLICATION', 'a2', '2026-09-18T09:00:00.000Z'), candidate('PREPARE_INTERVIEW', 'a3', '2026-09-25T09:00:00.000Z'), candidate('TAILOR_CV', 'a4')],
        listActions: async () => [],
        listNotifications: async () => [],
        upsertActions: async (_u, cs) => ({ inserted: cs.map((c, i) => action({ id: `act${i}`, dedupeKey: c.dedupeKey, actionType: c.actionType })), resurfaced: [], expired: [], unchanged: 0, refreshed: [] }),
        upsertNotification: vi.fn(async (_u, n) => ({ id: `n-${n.dedupeKey}`, kind: n.kind, title: n.title, body: n.body, actionId: n.actionId ?? null, dedupeKey: n.dedupeKey, readAt: null, dismissedAt: null, createdAt: '2026-09-20T10:00:00.000Z' }) as UserNotification),
        updatePreferences: vi.fn(async (_u, patch, rev) => ({ ...prefs(), ...patch, revision: rev + 1 }) as CareerPreferences),
        ...over,
    };
}

describe('proactive run', () => {
    it('creates at most the daily cap, deadline-first, links each reminder to its action, marks late ones, and checkpoints with the revision', async () => {
        const d = deps();
        const now = new Date('2026-09-20T12:00:00.000Z'); // 13:00 London, outside quiet hours
        const { summary, preferences } = await runProactiveNow('u1', prefs({ dailyActionCap: 2 }), d, now);
        expect(summary.created).toBe(2);
        expect(summary.skipped).toEqual({ cap: 1, not_actionable: 1 });
        const calls = vi.mocked(d.upsertNotification).mock.calls.map((c) => c[1]);
        expect(calls.map((n) => n.dedupeKey)).toEqual(['proactive:FOLLOW_UP_APPLICATION:a2:h1', 'proactive:PREPARE_INTERVIEW:a1:h1']);
        expect(calls[0].body).toContain('This reminder is late: it was due 2026-09-18.');
        expect(calls[0].actionId).toBe('act0');
        expect(calls.every((n) => n.kind === 'action_required')).toBe(true);
        expect(d.updatePreferences).toHaveBeenCalledWith('u1', expect.objectContaining({ lastProactiveRunAt: now.toISOString(), checkpoint: expect.objectContaining({ created: 2, policyVersion: 'proactive-1.0.0' }) }), 3);
        expect(preferences.revision).toBe(4);
    });

    it('respects quiet hours in the user time zone and reports the next eligible time', async () => {
        const d = deps();
        const now = new Date('2026-09-20T22:30:00.000Z'); // 23:30 London
        const { summary } = await runProactiveNow('u1', prefs({ quietHours: { start: '21:00', end: '08:00' } }), d, now);
        expect(summary.quietHours).toBe(true);
        expect(summary.created).toBe(0);
        expect(d.upsertNotification).not.toHaveBeenCalled();
        expect(summary.nextEligibleAt).toBe('2026-09-21T07:00:00.000Z');
        expect(summary.skipped.quiet_hours).toBe(4);
    });

    it('does not deliver twice: existing notifications and today\'s count consume the budget', async () => {
        const existing: UserNotification = { id: 'n0', kind: 'action_required', title: 'x', body: 'y', actionId: null, dedupeKey: 'proactive:PREPARE_INTERVIEW:a1:h1', readAt: null, dismissedAt: null, createdAt: '2026-09-20T09:00:00.000Z' };
        const d = deps({ listNotifications: async () => [existing] });
        const now = new Date('2026-09-20T12:00:00.000Z');
        expect(countCreatedToday([existing], now, 'Europe/London')).toBe(1);
        const { summary } = await runProactiveNow('u1', prefs({ dailyActionCap: 2 }), d, now);
        expect(summary.skipped.duplicate).toBe(1);
        expect(summary.created).toBe(1);
        expect(toPlannerCandidate(candidate('TAILOR_CV', 'a4')).status).toBe('READY');
    });

    it('is quiet when opted out', async () => {
        const d = deps();
        const { summary } = await runProactiveNow('u1', prefs({ proactiveEnabled: false }), d, new Date('2026-09-20T12:00:00.000Z'));
        expect(summary.enabled).toBe(false);
        expect(summary.created).toBe(0);
        expect(d.upsertNotification).not.toHaveBeenCalled();
    });
});

describe('SettingsSpace', () => {
    it('shows the Career OS section above the legacy panel with the consent copy and honest delivery note; saves with the revision', async () => {
        await mount();
        const text = document.body.textContent ?? '';
        expect(text.indexOf('Proactive assistance')).toBeLessThan(text.indexOf('legacy backup'));
        expect(text).toContain('nothing is sent anywhere outside CVBase');
        expect(text).toContain('Reminders are generated when you open CVBase or run this; background delivery is not enabled.');
        expect(document.querySelector('select')).toBeTruthy();
        const cap = document.querySelector('input[type="number"]') as HTMLInputElement;
        expect(cap.value).toBe('2');
        await act(async () => {
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(cap, '5');
            (cap as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
            cap.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await click(buttonByText('Save'));
        await flush();
        expect(preferencesRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ dailyActionCap: 5, proactiveEnabled: true }), 3);
        expect(document.body.textContent).toContain('Saved');
    });

    it('disables the settings when opted out and runs the planner from the button', async () => {
        vi.mocked(preferencesRepo.ensure).mockResolvedValue(prefs({ proactiveEnabled: false, consentAt: null }));
        await mount();
        expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
        expect(buttonByText('Run reminders now').disabled).toBe(true);

        await act(async () => { root.unmount(); });
        vi.mocked(preferencesRepo.ensure).mockResolvedValue(prefs());
        const { list: listActions, upsertByDedupeKey } = actionRepo;
        vi.mocked(listActions).mockResolvedValue([]);
        vi.mocked(upsertByDedupeKey).mockResolvedValue({ inserted: [], resurfaced: [], expired: [], unchanged: 0, refreshed: [] });
        vi.mocked(notificationRepo.list).mockResolvedValue([]);
        const goalRepo = await import('../../../services/careerOs/goalRepo');
        const factRepo = await import('../../../services/careerOs/factRepo');
        const opportunityRepo = await import('../../../services/careerOs/opportunityRepo');
        const applicationRepo = await import('../../../services/careerOs/applicationRepo');
        const interviewRepo = await import('../../../services/careerOs/interviewRepo');
        const analysisRepo = await import('../../../services/careerOs/analysisRepo');
        const outcomeRepo = await import('../../../services/careerOs/outcomeRepo');
        vi.mocked(goalRepo.getPrimary).mockResolvedValue(null);
        vi.mocked(factRepo.list).mockResolvedValue([]);
        vi.mocked(opportunityRepo.list).mockResolvedValue([]);
        vi.mocked(applicationRepo.list).mockResolvedValue([]);
        vi.mocked(interviewRepo.list).mockResolvedValue([]);
        vi.mocked(analysisRepo.listLatest).mockResolvedValue([]);
        vi.mocked(outcomeRepo.list).mockResolvedValue([]);
        await mount();
        expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(false);
        await click(buttonByText('Run reminders now'));
        await flush();
        expect(preferencesRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ lastProactiveRunAt: expect.any(String) }), 3);
        expect(document.body.textContent).toContain('reminder(s) created from');
        expect(notificationRepo.upsertByDedupeKey).not.toHaveBeenCalled();
    });

    it('the integrations page states the no-go honestly and has no inputs', async () => {
        await mount('integrations');
        expect(document.body.textContent).toContain('No external connectors are enabled');
        expect(document.body.textContent).toContain('does not read your mailbox, calendar, LinkedIn account or job boards');
        for (const c of CONNECTOR_ASSESSMENTS) expect(document.body.textContent).toContain(c.label);
        expect((document.body.textContent?.match(/Assessed: no-go for this release/g) ?? []).length).toBe(CONNECTOR_ASSESSMENTS.length);
        expect(document.querySelectorAll('input, textarea, select, form')).toHaveLength(0);
        await click(buttonByText('Import an opportunity'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'opportunities' }));
    });
});
