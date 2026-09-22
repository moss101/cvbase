import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../../services/translationService';
import * as eventRepo from '../../../../services/careerOs/eventRepo';
import { outcomeHistory } from '../../../../services/careerOs/outcomes';
import { EVENT_DICTIONARY } from '../../../../services/careerOs/careerEvents';
import type { OutcomeKind, ProductEvent } from '../../../../services/careerOs/types';
import { useOwnedQuery } from '../../data/useOwnedQuery';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { ActivityTimeline, StatePanel, type ActivityEntry } from '../../primitives';
import { Panel, PaneHeading } from '../fields';
import type { Workspace } from '../useApplicationWorkspace';

/**
 * What happened to this application: every outcome observation (with
 * corrections shown against the entry they superseded, never rewritten) and
 * the persisted product events that reference it. Large histories page with
 * "show earlier".
 */
const PAGE = 20;

export const useOutcomeKindLabel = (): ((kind: OutcomeKind | null) => string) => {
    const { t } = useTranslation();
    return (kind) => {
        switch (kind) {
            case 'submitted': return t('careeros.outcome.kind.submitted', 'Submission recorded');
            case 'response': return t('careeros.outcome.kind.response', 'Employer responded');
            case 'interview_scheduled': return t('careeros.outcome.kind.interviewScheduled', 'Interview scheduled');
            case 'interview_completed': return t('careeros.outcome.kind.interviewCompleted', 'Interview completed');
            case 'offer': return t('careeros.outcome.kind.offer', 'Offer received');
            case 'rejected': return t('careeros.outcome.kind.rejected', 'Not selected');
            case 'withdrawn': return t('careeros.outcome.kind.withdrawn', 'Withdrawn');
            case 'accepted': return t('careeros.outcome.kind.accepted', 'Offer accepted');
            case 'no_response': return t('careeros.outcome.kind.noResponse', 'No response recorded');
            case 'correction': return t('careeros.outcome.kind.correction', 'Correction');
            default: return t('careeros.outcome.kind.retracted', 'Retracted');
        }
    };
};

export const ActivitySection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const kindLabel = useOutcomeKindLabel();
    const [shown, setShown] = useState(PAGE);
    const app = workspace.data?.application ?? null;
    const events = useOwnedQuery(userId, app ? `events:application:${app.id}` : null, async () => {
        const all = await eventRepo.listRecent(userId as string, 100);
        return all.filter((e) => e.subjectRefs.application === (app as { id: string }).id);
    }, [app?.id]);

    const entries = useMemo<ActivityEntry[]>(() => {
        const out: ActivityEntry[] = [];
        for (const entry of outcomeHistory(workspace.data?.outcomes ?? [])) {
            const title = entry.kind === 'correction'
                ? (entry.retracted ? t('careeros.outcome.retractedTitle', 'Retracted an earlier observation') : t('careeros.outcome.correctedTitle', 'Corrected to: {kind}').replace('{kind}', kindLabel(entry.effectiveKind)))
                : kindLabel(entry.kind);
            out.push({
                id: `outcome:${entry.id}`,
                at: entry.observedAt,
                title: entry.superseded ? `${title} — ${t('careeros.outcome.superseded', 'superseded by a later correction')}` : title,
                detail: entry.note || undefined,
                source: { user_reported: t('careeros.outcome.source.user', 'You'), system: t('careeros.outcome.source.system', 'System'), connector: t('careeros.outcome.source.connector', 'Connector') }[entry.source],
            });
        }
        for (const e of (events.data ?? []) as ProductEvent[]) {
            out.push({ id: `event:${e.id}`, at: e.occurredAt, title: EVENT_DICTIONARY[e.eventName]?.description ?? e.eventName, source: e.source === 'server' ? t('careeros.outcome.source.system', 'System') : t('careeros.outcome.source.user', 'You') });
        }
        return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    }, [workspace.data?.outcomes, events.data, kindLabel, t]);

    return (
        <Panel as="section" aria-labelledby="activity-heading">
            <PaneHeading id="activity-heading" title={t('careeros.activity.title', 'Activity')} description={t('careeros.activity.description', 'Observations you recorded and milestones for this application, newest first. Corrections keep the original entry visible.')} />
            {events.error ? <StatePanel kind="partial" compact className="mt-3" title={t('careeros.activity.eventsUnavailable', 'Milestone events could not be loaded')} onRetry={() => { void events.refresh(); }} /> : null}
            <div className="mt-4">
                <ActivityTimeline
                    entries={entries.slice(0, shown)}
                    loading={workspace.loading && !workspace.data}
                    hasMore={entries.length > shown}
                    onLoadMore={() => setShown((n) => n + PAGE)}
                />
            </div>
        </Panel>
    );
};

export default ActivitySection;
