import type { UserNotification } from '../../../services/careerOs/types';

/**
 * Pure helpers for the inbox (REQ-10): grouping into "Action required" and
 * "Information", hiding dismissed rows by default, and recognising a late
 * reminder by the sentence the proactive planner stores in its body. The
 * UI never creates rows; dedupe is the server's and the planner's job.
 */
export interface InboxGroups {
    actionRequired: UserNotification[];
    information: UserNotification[];
}

export const LATE_SENTENCE_RE = /This reminder is late: it was due (\d{4}-\d{2}-\d{2})\./;

export const isLate = (n: Pick<UserNotification, 'body'>): boolean => LATE_SENTENCE_RE.test(n.body);

/** The body without the lateness sentence (shown as a chip instead). */
export const bodyWithoutLateness = (n: Pick<UserNotification, 'body'>): string => n.body.replace(LATE_SENTENCE_RE, '').trim();

export const dueDateOf = (n: Pick<UserNotification, 'body'>): string | null => n.body.match(LATE_SENTENCE_RE)?.[1] ?? null;

export const isProactive = (n: Pick<UserNotification, 'dedupeKey'>): boolean => n.dedupeKey.startsWith('proactive:');

export function groupNotifications(list: UserNotification[], opts: { includeDismissed?: boolean } = {}): InboxGroups {
    const visible = opts.includeDismissed ? list : list.filter((n) => !n.dismissedAt);
    const sorted = [...visible].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return {
        actionRequired: sorted.filter((n) => n.kind === 'action_required'),
        information: sorted.filter((n) => n.kind !== 'action_required'),
    };
}

export const unreadCount = (list: UserNotification[]): number => list.filter((n) => !n.readAt && !n.dismissedAt).length;

export function timeAgo(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = now.getTime() - d.getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 14) return `${days}d`;
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}
