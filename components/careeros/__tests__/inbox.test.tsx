// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { action } from '../../../services/careerOs/__tests__/fixtures';
import type { UserNotification } from '../../../services/careerOs/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();
const refreshInbox = vi.fn().mockResolvedValue(undefined);

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate: vi.fn(), isAdmin: false, profile: null, migration: 'done', refreshInbox, openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace: vi.fn(), back: () => false, reset: vi.fn(), route: { view: 'career', space: 'notifications' } }), useBackHandler: () => undefined };
});
vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/careerOs/notificationRepo', () => ({ list: vi.fn(), markRead: vi.fn(), dismiss: vi.fn(), get: vi.fn(), upsertByDedupeKey: vi.fn() }));
vi.mock('../../../services/careerOs/actionRepo', () => ({ get: vi.fn() }));

import * as notificationRepo from '../../../services/careerOs/notificationRepo';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { clearOwnedQueries } from '../data/useOwnedQuery';
import { bodyWithoutLateness, groupNotifications, isLate, unreadCount } from '../inbox/inboxFormat';
import NotificationsSpace from '../spaces/NotificationsSpace';

const T0 = '2026-09-20T10:00:00.000Z';
const note = (o: Partial<UserNotification> = {}): UserNotification => ({
    id: 'n1', kind: 'action_required', title: 'Prepare for the Acme interview', body: 'Interview on Monday.', actionId: 'act1', dedupeKey: 'proactive:PREPARE_INTERVIEW:a1:h', readAt: null, dismissedAt: null, createdAt: T0, ...o,
});

const buttonByText = (text: string, scope: ParentNode = document): HTMLButtonElement => {
    const btn = [...scope.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const click = async (el: Element) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

let root: Root;
let container: HTMLDivElement;
let rows: UserNotification[];
async function mount() {
    await act(async () => { root = createRoot(container); root.render(<NotificationsSpace route={{ view: 'career', space: 'notifications' }} />); });
    await flush();
}

afterEach(async () => { await act(async () => { root?.unmount(); }); });
beforeEach(() => {
    vi.clearAllMocks();
    clearOwnedQueries();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    rows = [
        note(),
        note({ id: 'n2', kind: 'information', title: 'Your CV was linked', body: 'Legacy rows were linked.', actionId: null, dedupeKey: 'info:link', readAt: T0 }),
        note({ id: 'n3', title: 'Follow up with Beta', body: 'Send a note. This reminder is late: it was due 2026-09-18.', actionId: 'act-gone', dedupeKey: 'proactive:FOLLOW_UP_APPLICATION:a2:h' }),
        note({ id: 'n4', kind: 'information', title: 'Old', body: 'x', actionId: null, dedupeKey: 'info:old', dismissedAt: T0 }),
    ];
    vi.mocked(notificationRepo.list).mockImplementation(async (_u, opts) => (opts?.includeDismissed ? rows : rows.filter((n) => !n.dismissedAt)));
    vi.mocked(notificationRepo.markRead).mockImplementation(async (_u, id) => ({ ...(rows.find((n) => n.id === id) as UserNotification), readAt: '2026-09-20T11:00:00.000Z' }));
    vi.mocked(notificationRepo.dismiss).mockImplementation(async (_u, id) => ({ ...(rows.find((n) => n.id === id) as UserNotification), dismissedAt: '2026-09-20T11:00:00.000Z' }));
    vi.mocked(actionRepo.get).mockImplementation(async (_u, id) => { if (id === 'act-gone') throw new Error('not_found'); return action({ id, destination: { space: 'applications', id: 'a1', section: 'interview' } }); });
});

describe('inboxFormat', () => {
    it('groups by kind, hides dismissed by default, and recognises the lateness sentence', () => {
        const groups = groupNotifications(rows);
        expect(groups.actionRequired.map((n) => n.id)).toEqual(['n1', 'n3']);
        expect(groups.information.map((n) => n.id)).toEqual(['n2']);
        expect(groupNotifications(rows, { includeDismissed: true }).information.map((n) => n.id)).toEqual(['n2', 'n4']);
        expect(isLate(rows[2])).toBe(true);
        expect(isLate(rows[0])).toBe(false);
        expect(bodyWithoutLateness(rows[2])).toBe('Send a note.');
        expect(unreadCount(rows)).toBe(2);
    });
});

describe('NotificationsSpace', () => {
    it('renders the two groups with a Late chip and toggles dismissed rows', async () => {
        await mount();
        expect(document.body.textContent).toContain('Action required · 2');
        expect(document.body.textContent).toContain('Information · 1');
        expect(document.body.textContent).toContain('Late · due 2026-09-18');
        expect(document.body.textContent).not.toContain('Old');
        await click(buttonByText('Show dismissed'));
        await flush();
        expect(document.body.textContent).toContain('Old');
        expect(document.body.textContent).toContain('Dismissed');
    });

    it('Open marks the row read, emits the events and navigates to the linked action destination', async () => {
        await mount();
        const row = [...document.querySelectorAll('li')].find((li) => li.textContent?.includes('Prepare for the Acme interview')) as HTMLElement;
        await click(buttonByText('Open', row));
        await flush();
        expect(notificationRepo.markRead).toHaveBeenCalledWith('u1', 'n1');
        expect(track).toHaveBeenCalledWith('u1', 'notification_action_opened', expect.objectContaining({ subjectRefs: { notification: 'n1', action: 'act1' } }));
        expect(track).toHaveBeenCalledWith('u1', 'career_reminder_opened', expect.objectContaining({ subjectRefs: { notification: 'n1' } }));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a1', section: 'interview' }));
        expect(refreshInbox).toHaveBeenCalled();
    });

    it('Open falls back to Today when the linked action is gone, and Dismiss removes the row', async () => {
        await mount();
        const row = [...document.querySelectorAll('li')].find((li) => li.textContent?.includes('Follow up with Beta')) as HTMLElement;
        await click(buttonByText('Open', row));
        await flush();
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'today' }));
        const info = [...document.querySelectorAll('li')].find((li) => li.textContent?.includes('Your CV was linked')) as HTMLElement;
        await click(buttonByText('Dismiss', info));
        await flush();
        expect(notificationRepo.dismiss).toHaveBeenCalledWith('u1', 'n2');
        expect(document.body.textContent).not.toContain('Your CV was linked');
        expect(refreshInbox).toHaveBeenCalled();
    });

    it('shows the empty state and never creates rows itself', async () => {
        rows = [];
        await mount();
        expect(document.body.textContent).toContain('Nothing needs your attention');
        expect(notificationRepo.upsertByDedupeKey).not.toHaveBeenCalled();
    });
});
