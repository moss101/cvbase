import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import type { ApplicationRecord, Campaign } from '../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { ApplicationCard, Button, SkeletonCard, SpaceHeader, StatePanel } from '../primitives';
import { formatDate } from './format';

/**
 * Every application the person owns (REQ-17), including legacy tracker rows
 * that no campaign has claimed — those stay visible here rather than being
 * copied onto a board. Filters: active, closed, unassigned.
 */
type Filter = 'active' | 'closed' | 'unassigned' | 'all';

interface ListData { applications: ApplicationRecord[]; campaigns: Campaign[]; partial: boolean }

async function loadApplications(userId: string): Promise<ListData> {
    const applications = await applicationRepo.list(userId);
    try {
        return { applications, campaigns: await campaignRepo.list(userId, 'any'), partial: false };
    } catch {
        return { applications, campaigns: [], partial: true };
    }
}

export const ApplicationList: React.FC = () => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const { navigate } = useNavigation();
    const [filter, setFilter] = useState<Filter>('active');
    const query = useOwnedQuery(userId, 'applications:list', () => loadApplications(userId as string));

    const rows = useMemo(() => (query.data?.applications ?? []).filter((a) => {
        switch (filter) {
            case 'active': return a.stage !== 'closed';
            case 'closed': return a.stage === 'closed';
            case 'unassigned': return a.campaignId === null;
            default: return true;
        }
    }), [query.data, filter]);

    const campaignName = (id: string | null): string | null => (id ? (query.data?.campaigns.find((c) => c.id === id)?.name ?? null) : null);

    const filters: Array<{ key: Filter; label: string }> = [
        { key: 'active', label: t('careeros.application.filter.active', 'Active') },
        { key: 'closed', label: t('careeros.application.filter.closed', 'Closed') },
        { key: 'unassigned', label: t('careeros.application.filter.unassigned', 'Not in a campaign') },
        { key: 'all', label: t('careeros.campaign.filter.all', 'All') },
    ];

    return (
        <div className="mx-auto w-full max-w-5xl">
            <SpaceHeader
                eyebrow={t('careeros.shell.eyebrow', 'Career OS')}
                title={t('careeros.space.applications', 'Applications')}
                description={t('careeros.application.spaceDescription', 'Every application you own, including tracker entries not yet in a campaign. Open one to work on it.')}
                action={<Button variant="secondary" onClick={() => navigate(careerPath.toSpace('opportunities'))}>{t('careeros.application.startFromOpportunity', 'Start from an opportunity')}</Button>}
            >
                <div role="group" aria-label={t('careeros.application.filterLabel', 'Filter')} className="flex flex-wrap gap-1">
                    {filters.map((f) => (
                        <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`tap-target rounded-lg px-3 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${filter === f.key ? 'bg-action-primary/10 text-content-primary' : 'text-content-secondary hover:bg-surface-canvas'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </SpaceHeader>

            {query.error ? (
                <StatePanel kind="error" onRetry={() => { void query.refresh(); }} />
            ) : query.loading && !query.data ? (
                <ul className="space-y-3" aria-busy="true"><li><SkeletonCard /></li><li><SkeletonCard /></li></ul>
            ) : rows.length === 0 ? (
                <StatePanel
                    kind="empty"
                    title={t('careeros.application.emptyTitle', 'No applications here')}
                    description={filter === 'active' ? t('careeros.application.emptyDescription', 'Start an application from an opportunity. Each one gets its own workspace for analysis, CV, letters, questions and interviews.') : t('careeros.application.emptyFilterDescription', 'Nothing matches this filter.')}
                    action={{ label: t('careeros.space.opportunities', 'Opportunities'), onClick: () => navigate(careerPath.toSpace('opportunities')) }}
                />
            ) : (
                <>
                    {query.data?.partial && <StatePanel kind="partial" compact className="mb-3" title={t('careeros.application.campaignsUnavailable', 'Campaign names could not be loaded')} onRetry={() => { void query.refresh(); }} />}
                    <ul className="cos-list">
                        {rows.map((app) => (
                            <li key={app.id}>
                                <ApplicationCard
                                    jobTitle={app.jobTitle}
                                    company={app.company}
                                    stage={app.stage}
                                    closedReason={app.closedReason}
                                    readiness={app.readiness?.items ?? null}
                                    followUpLabel={app.followUpAt ? t('careeros.application.followUp', 'Follow up {date}').replace('{date}', formatDate(app.followUpAt)) : null}
                                    campaignLabel={campaignName(app.campaignId) ?? (app.campaignId ? null : t('careeros.application.noCampaign', 'No campaign'))}
                                    action={{ label: t('careeros.application.open', 'Open'), onClick: () => navigate(careerPath.toApplication(app.id, 'analysis')) }}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default ApplicationList;
