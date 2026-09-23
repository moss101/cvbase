import React, { useId, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as eventRepo from '../../../services/careerOs/eventRepo';
import { ACTIVITY_FEED_EVENTS, EVENT_DICTIONARY } from '../../../services/careerOs/careerEvents';
import type { ProductEvent, ProductEventName } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { ActivityTimeline, StatePanel, type ActivityEntry } from '../primitives';

/**
 * Recent activity from genuine persisted events only. Titles come from the
 * event dictionary (ids, never text payloads), so the feed can never leak a
 * narrative or a job description. Older history pages in on request.
 */
export interface RecentActivityProps {
    userId: string;
    events: ProductEvent[];
    loading: boolean;
    failed: boolean;
    onRetry: () => void;
}

export const eventTitle = (t: (key: string, fallback: string) => string, name: ProductEventName): string => {
    const key = `careeros.today.activity.${name}`;
    return t(key, EVENT_DICTIONARY[name]?.description ?? name);
};

const sourceOf = (t: (key: string, fallback: string) => string, event: ProductEvent): string =>
    event.source === 'server' ? t('careeros.today.activity.sourceServer', 'System') : t('careeros.today.activity.sourceYou', 'You');

export const toEntries = (t: (key: string, fallback: string) => string, events: ProductEvent[]): ActivityEntry[] =>
    events.map((event) => {
        const subjects = Object.keys(event.subjectRefs).filter((k) => event.subjectRefs[k]);
        return {
            id: event.id,
            at: event.occurredAt,
            title: eventTitle(t, event.eventName),
            detail: subjects.length > 0 ? subjects.map((k) => t(`careeros.today.activity.subject.${k}`, k)).join(' · ') : undefined,
            source: sourceOf(t, event),
        };
    });

export const RecentActivity: React.FC<RecentActivityProps> = ({ userId, events, loading, failed, onRetry }) => {
    const { t } = useTranslation();
    const headingId = useId();
    const [extra, setExtra] = useState<ProductEvent[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [exhausted, setExhausted] = useState(false);
    const [moreError, setMoreError] = useState(false);

    const all = [...events, ...extra.filter((e) => !events.some((known) => known.id === e.id))];

    const loadMore = async () => {
        setLoadingMore(true);
        setMoreError(false);
        try {
            const next = await eventRepo.listRecent(userId, all.length + 20, ACTIVITY_FEED_EVENTS);
            if (next.length <= all.length) setExhausted(true);
            setExtra(next);
        } catch (err) {
            captureException(err, { context: 'today-activity-more' });
            setMoreError(true);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <section aria-labelledby={headingId} className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <h2 id={headingId} className="text-base font-semibold text-content-primary">{t('careeros.today.activity.title', 'Recent activity')}</h2>
            <div className="mt-3">
                {failed ? (
                    <StatePanel kind="error" compact title={t('careeros.today.activity.error', 'Activity could not be loaded')} onRetry={onRetry} />
                ) : (
                    <ActivityTimeline
                        entries={toEntries(t, all)}
                        loading={loading}
                        hasMore={!exhausted && all.length >= 20}
                        onLoadMore={() => void loadMore()}
                        loadingMore={loadingMore}
                        compact
                    />
                )}
                {moreError && <p role="alert" className="mt-2 text-xs text-status-danger">{t('careeros.today.activity.moreError', 'Earlier activity could not be loaded.')}</p>}
            </div>
        </section>
    );
};

export default RecentActivity;
