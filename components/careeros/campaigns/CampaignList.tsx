import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import { computeFunnel, milestoneSummary } from '../../../services/careerOs/campaignFunnel';
import { track } from '../../../services/careerOs/careerEvents';
import type { ApplicationRecord, Campaign, CampaignFunnel, CampaignStatus, CareerGoal, Opportunity, OutcomeObservation } from '../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, CampaignCard, SkeletonCard, SpaceHeader, StatePanel } from '../primitives';
import { FailureNotice } from '../application/FailureNotice';
import { formatDate } from '../application/format';
import { useAsyncAction } from '../application/useAsyncAction';
import { CampaignForm, type CampaignFormValue } from './CampaignForm';

/**
 * Campaigns (REQ-16): active, paused and closed, each with its goal, the
 * observed funnel over its own applications/opportunities/outcomes and the
 * next milestone. Campaigns are only ever created by the person.
 */
interface ListData {
    campaigns: Campaign[];
    goals: CareerGoal[];
    applications: ApplicationRecord[];
    outcomes: OutcomeObservation[];
    opportunities: Opportunity[];
    memberIds: Record<string, string[]>;
    partial: boolean;
}

async function loadCampaigns(userId: string): Promise<ListData> {
    const campaigns = await campaignRepo.list(userId, 'any');
    const settled = await Promise.allSettled([
        goalRepo.list(userId, 'any'),
        applicationRepo.list(userId),
        outcomeRepo.list(userId),
        opportunityRepo.list(userId, 'all', { includeMerged: true }),
        Promise.all(campaigns.map(async (c) => [c.id, await campaignRepo.listOpportunityIds(userId, c.id)] as const)),
    ]);
    const value = <T,>(index: number, fallback: T): T => (settled[index].status === 'fulfilled' ? (settled[index] as PromiseFulfilledResult<T>).value : fallback);
    return {
        campaigns,
        goals: value<CareerGoal[]>(0, []),
        applications: value<ApplicationRecord[]>(1, []),
        outcomes: value<OutcomeObservation[]>(2, []),
        opportunities: value<Opportunity[]>(3, []),
        memberIds: Object.fromEntries(value<ReadonlyArray<readonly [string, string[]]>>(4, [])),
        partial: settled.some((s) => s.status === 'rejected'),
    };
}

export function funnelFor(campaign: Campaign, data: Pick<ListData, 'applications' | 'outcomes' | 'opportunities' | 'memberIds'>): CampaignFunnel {
    const apps = data.applications.filter((a) => a.campaignId === campaign.id);
    const appIds = new Set(apps.map((a) => a.id));
    const members = new Set(data.memberIds[campaign.id] ?? []);
    return computeFunnel(apps, data.opportunities.filter((o) => members.has(o.id)), data.outcomes.filter((o) => appIds.has(o.applicationId)));
}

export const CampaignList: React.FC = () => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate } = useNavigation();
    const [formOpen, setFormOpen] = useState(false);
    const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');
    const query = useOwnedQuery(userId, 'campaigns:list', () => loadCampaigns(userId as string));

    const [create, createState] = useAsyncAction(async (value: CampaignFormValue) => {
        if (!userId) return;
        const created = await campaignRepo.create(userId, { name: value.name, goalId: value.goalId, milestones: value.milestones });
        await track(userId, 'campaign_created', {
            subjectRefs: { campaign: created.id, ...(created.goalId ? { goal: created.goalId } : {}) },
            payload: { milestones: created.milestones.length, hasGoal: created.goalId !== null },
            dedupeKey: `campaign_created:${created.id}`,
        });
        invalidate('campaign');
        setFormOpen(false);
        navigate(careerPath.toCampaign(created.id));
    });

    const rows = useMemo(() => (query.data?.campaigns ?? []).filter((c) => filter === 'all' || c.status === filter), [query.data, filter]);
    const goalTitle = (id: string | null): string | null => {
        if (!id) return null;
        const g = query.data?.goals.find((goal) => goal.id === id);
        return g ? (g.title || g.role) : t('careeros.campaign.goalUnavailable', 'Goal unavailable');
    };

    const filters: Array<{ key: CampaignStatus | 'all'; label: string }> = [
        { key: 'all', label: t('careeros.campaign.filter.all', 'All') },
        { key: 'active', label: t('careeros.campaign.status.active', 'Active') },
        { key: 'paused', label: t('careeros.campaign.status.paused', 'Paused') },
        { key: 'closed', label: t('careeros.campaign.status.closed', 'Closed') },
    ];

    return (
        <div className="mx-auto w-full max-w-[1240px]">
            <SpaceHeader
                eyebrow={t('careeros.shell.eyebrow', 'Career OS')}
                title={t('careeros.space.campaigns', 'Campaigns')}
                description={t('careeros.campaign.spaceDescription', 'Coordinate a goal, its target opportunities, applications and interviews. Progress is the observed funnel, not a percentage.')}
                action={<Button variant="primary" icon={<Plus size={16} strokeWidth={2} />} onClick={() => setFormOpen(true)} disabled={!userId}>{t('careeros.campaign.new', 'New campaign')}</Button>}
            >
                <div role="group" aria-label={t('careeros.campaign.filterLabel', 'Filter by status')} className="flex flex-wrap gap-1">
                    {filters.map((f) => (
                        <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`tap-target rounded-lg px-3 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${filter === f.key ? 'bg-action-primary/10 text-content-primary' : 'text-content-secondary hover:bg-surface-canvas'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </SpaceHeader>

            {createState.error ? <FailureNotice error={createState.error} onDismiss={createState.reset} className="mb-4" /> : null}

            {query.error ? (
                <StatePanel kind="error" onRetry={() => { void query.refresh(); }} />
            ) : query.loading && !query.data ? (
                <ul className="space-y-3" aria-busy="true"><li><SkeletonCard /></li><li><SkeletonCard /></li></ul>
            ) : rows.length === 0 ? (
                <StatePanel
                    kind="empty"
                    title={filter === 'all' ? t('careeros.campaign.emptyTitle', 'No campaigns yet') : t('careeros.campaign.emptyFilterTitle', 'No {status} campaigns').replace('{status}', filters.find((f) => f.key === filter)?.label.toLowerCase() ?? '')}
                    description={t('careeros.campaign.emptyDescription', 'A campaign groups the applications and opportunities you pursue toward one goal. Applications without a campaign stay visible in Applications.')}
                    action={{ label: t('careeros.campaign.new', 'New campaign'), onClick: () => setFormOpen(true) }}
                    secondaryAction={{ label: t('careeros.space.applications', 'Applications'), onClick: () => navigate(careerPath.toSpace('applications')) }}
                />
            ) : (
                <>
                    {query.data?.partial && <StatePanel kind="partial" compact className="mb-3" onRetry={() => { void query.refresh(); }} />}
                    <ul className="cos-list">
                        {rows.map((campaign) => {
                            const summary = milestoneSummary(campaign);
                            return (
                                <li key={campaign.id}>
                                    <CampaignCard
                                        name={campaign.name}
                                        goalLabel={goalTitle(campaign.goalId)}
                                        status={campaign.status}
                                        funnel={query.data ? funnelFor(campaign, query.data) : null}
                                        nextMilestone={summary.next ? { title: summary.next.title, dueLabel: summary.next.dueDate ? formatDate(summary.next.dueDate) : undefined } : null}
                                        action={{ label: t('careeros.campaign.open', 'Open'), onClick: () => navigate(careerPath.toCampaign(campaign.id)) }}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            <CampaignForm open={formOpen} title={t('careeros.campaign.new', 'New campaign')} goals={(query.data?.goals ?? []).filter((g) => g.status === 'active')} pending={createState.pending} onClose={() => setFormOpen(false)} onSubmit={(value) => { void create(value); }} />
        </div>
    );
};

export default CampaignList;
