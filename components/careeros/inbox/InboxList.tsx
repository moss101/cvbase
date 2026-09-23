import React, { useCallback, useState } from 'react';
import { ArrowRight, Bell, Check, X } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type Route } from '../../NavigationProvider';
import * as notificationRepo from '../../../services/careerOs/notificationRepo';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import { track } from '../../../services/careerOs/careerEvents';
import type { UserNotification } from '../../../services/careerOs/types';
import { Button, Pill, SkeletonCard, StatePanel, StatusChip } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useOnline } from '../career/useOnline';
import { destinationToRoute } from '../career/factFormat';
import { FailureNotice } from '../application/FailureNotice';
import { bodyWithoutLateness, dueDateOf, groupNotifications, isLate, isProactive, timeAgo } from './inboxFormat';

/**
 * The in-app inbox (REQ-10, COS-029): two groups — action required and
 * information — with read/dismiss state persisted per row. "Open" on an
 * action-required item marks it read, records the event and goes to the
 * linked action's destination (or Today when the action is gone). Late
 * reminders say so with a chip instead of pretending they were on time.
 * The badge count is refreshed through the shell after every change.
 */
export const INBOX_KEY = 'inbox';

export const InboxList: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId, refreshInbox } = useCareerOs();
    const online = useOnline();
    const [showDismissed, setShowDismissed] = useState(false);
    const inbox = useOwnedQuery<UserNotification[]>(userId, userId ? `${INBOX_KEY}:${showDismissed ? 'all' : 'live'}` : null,
        () => notificationRepo.list(userId as string, { includeDismissed: showDismissed, limit: 200 }));
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<unknown>(null);

    const applyLocal = useCallback((next: UserNotification) => {
        if (inbox.data) inbox.setData(inbox.data.map((n) => (n.id === next.id ? next : n)));
    }, [inbox]);

    const markRead = useCallback(async (n: UserNotification) => {
        if (!userId || n.readAt) return;
        setBusyId(n.id);
        setError(null);
        try {
            applyLocal(await notificationRepo.markRead(userId, n.id));
            void refreshInbox();
        } catch (err) {
            setError(err);
        } finally {
            setBusyId(null);
        }
    }, [userId, applyLocal, refreshInbox]);

    const dismiss = useCallback(async (n: UserNotification) => {
        if (!userId) return;
        setBusyId(n.id);
        setError(null);
        try {
            const updated = await notificationRepo.dismiss(userId, n.id);
            if (showDismissed) applyLocal(updated);
            else if (inbox.data) inbox.setData(inbox.data.filter((row) => row.id !== n.id));
            void refreshInbox();
        } catch (err) {
            setError(err);
        } finally {
            setBusyId(null);
        }
    }, [userId, applyLocal, inbox, showDismissed, refreshInbox]);

    const open = useCallback(async (n: UserNotification) => {
        if (!userId) return;
        setBusyId(n.id);
        setError(null);
        let route: Route = careerPath.toSpace('today');
        try {
            if (!n.readAt) applyLocal(await notificationRepo.markRead(userId, n.id));
            if (n.actionId) {
                try {
                    const action = await actionRepo.get(userId, n.actionId);
                    route = destinationToRoute(action.destination);
                } catch { /* action gone — Today is the honest fallback */ }
            }
            void track(userId, 'notification_action_opened', {
                subjectRefs: { notification: n.id, ...(n.actionId ? { action: n.actionId } : {}) },
                payload: { kind: n.kind, late: isLate(n), proactive: isProactive(n) },
            });
            if (isProactive(n)) void track(userId, 'career_reminder_opened', { subjectRefs: { notification: n.id }, payload: { late: isLate(n) } });
            void refreshInbox();
            navigate(route);
        } catch (err) {
            setError(err);
        } finally {
            setBusyId(null);
        }
    }, [userId, applyLocal, refreshInbox, navigate]);

    if (!userId) return null;

    const groups = inbox.data ? groupNotifications(inbox.data, { includeDismissed: showDismissed }) : null;
    const total = (groups?.actionRequired.length ?? 0) + (groups?.information.length ?? 0);

    const row = (n: UserNotification) => {
        const late = isLate(n);
        const busy = busyId === n.id;
        return (
            <li key={n.id} className="flex gap-3.5 px-5 py-4 sm:px-6">
                {/* Unread is a dot beside the row, named for screen readers; not a chip above the title. */}
                <span className="mt-[9px] flex h-2 w-2 shrink-0" aria-hidden={n.readAt || n.dismissedAt ? 'true' : undefined}>
                    {!n.readAt && !n.dismissedAt && <span className="h-2 w-2 rounded-full bg-action-primary" />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className={`min-w-0 text-[15px] text-content-primary ${n.readAt ? 'font-medium' : 'font-semibold'}`}>
                            {!n.readAt && !n.dismissedAt && <span className="sr-only">{t('careeros.inbox.unread', 'Unread')}: </span>}
                            {n.title}
                        </h3>
                        <time className="shrink-0 pt-0.5 text-xs tabular-nums text-content-muted" dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                    </div>
                    {bodyWithoutLateness(n) && <p className="mt-0.5 text-sm text-content-secondary">{bodyWithoutLateness(n)}</p>}
                    {(late || isProactive(n) || n.dismissedAt) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {late && <StatusChip label={dueDateOf(n) ? t('careeros.inbox.lateDue', 'Late · due {date}').replace('{date}', dueDateOf(n) as string) : t('careeros.inbox.late', 'Late')} tone="warning" announce />}
                            {isProactive(n) && <span className="text-xs text-content-muted">{t('careeros.inbox.reminder', 'Reminder')}</span>}
                            {n.dismissedAt && <Pill>{t('careeros.inbox.dismissed', 'Dismissed')}</Pill>}
                        </div>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1">
                        {n.kind === 'action_required' && !n.dismissedAt && (
                            <Button variant="secondary" size="sm" loading={busy} trailingIcon={<ArrowRight size={14} strokeWidth={2} />} onClick={() => { void open(n); }}>{t('careeros.inbox.open', 'Open')}</Button>
                        )}
                        {!n.readAt && !n.dismissedAt && (
                            <Button variant="quiet" size="sm" icon={<Check size={14} strokeWidth={2} />} disabled={busy} onClick={() => { void markRead(n); }}>{t('careeros.inbox.markRead', 'Mark read')}</Button>
                        )}
                        {!n.dismissedAt && (
                            <Button variant="quiet" size="sm" icon={<X size={14} strokeWidth={2} />} disabled={busy} onClick={() => { void dismiss(n); }}>{t('careeros.inbox.dismiss', 'Dismiss')}</Button>
                        )}
                    </div>
                </div>
            </li>
        );
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-content-secondary">{t('careeros.inbox.description', 'Only what needs you, only in the app. Nothing is emailed or pushed.')}</p>
                <Button variant="quiet" size="sm" aria-pressed={showDismissed} onClick={() => setShowDismissed((v) => !v)}>
                    {showDismissed ? t('careeros.inbox.hideDismissed', 'Hide dismissed') : t('careeros.inbox.showDismissed', 'Show dismissed')}
                </Button>
            </div>
            {error !== null && <FailureNotice error={error} className="mb-3" onRetry={() => setError(null)} onDismiss={() => setError(null)} />}
            {inbox.error !== null ? (
                <StatePanel kind={online ? 'error' : 'offline'} onRetry={() => { void inbox.refresh(); }} />
            ) : groups === null ? (
                <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <SkeletonCard compact /><SkeletonCard compact />
                </div>
            ) : total === 0 ? (
                <StatePanel
                    kind="empty"
                    title={t('careeros.inbox.empty', 'Nothing needs your attention')}
                    description={t('careeros.inbox.emptyDescription', 'Reminders and updates appear here when something changes. Today always shows your next actions regardless.')}
                    action={{ label: t('careeros.notFound.backToToday', 'Go to Today'), onClick: () => navigate(careerPath.toSpace('today')) }}
                />
            ) : (
                <div className="space-y-6">
                    <section aria-labelledby="inbox-action">
                        <h2 id="inbox-action" className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-content-primary">
                            <Bell size={15} strokeWidth={1.9} className="text-content-muted" aria-hidden="true" />{t('careeros.inbox.actionRequired', 'Action required')}
                            <span className="font-normal tabular-nums text-content-muted">{groups.actionRequired.length}</span>
                        </h2>
                        {groups.actionRequired.length === 0
                            ? <p className="text-[13px] text-content-secondary">{t('careeros.inbox.noActions', 'No actions are waiting on you.')}</p>
                            : <ul className="cos-list">{groups.actionRequired.map(row)}</ul>}
                    </section>
                    <section aria-labelledby="inbox-info">
                        <h2 id="inbox-info" className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-content-primary">
                            {t('careeros.inbox.information', 'Information')}
                            <span className="font-normal tabular-nums text-content-muted">{groups.information.length}</span>
                        </h2>
                        {groups.information.length === 0
                            ? <p className="text-[13px] text-content-secondary">{t('careeros.inbox.noInformation', 'No updates.')}</p>
                            : <ul className="cos-list">{groups.information.map(row)}</ul>}
                    </section>
                </div>
            )}
        </div>
    );
};

export default InboxList;
