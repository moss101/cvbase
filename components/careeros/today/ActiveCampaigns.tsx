import React, { useId, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import { milestoneSummary } from '../../../services/careerOs/campaignFunnel';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button, CampaignCard, StatePanel } from '../primitives';
import { formatDate } from '../career/factFormat';
import type { CampaignSummary } from './useTodayData';

/**
 * Active campaigns with their observed funnel counts. Nothing is created
 * here: an account with no campaigns sees an honest empty state and a link
 * to the Campaigns space, never an auto-created "default campaign".
 */
export interface ActiveCampaignsProps {
    campaigns: CampaignSummary[];
    loading: boolean;
    failed: boolean;
    onRetry: () => void;
}

const PAGE = 3;

export const ActiveCampaigns: React.FC<ActiveCampaignsProps> = ({ campaigns, loading, failed, onRetry }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const headingId = useId();
    const [shown, setShown] = useState(PAGE);

    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className="text-base font-semibold text-content-primary">{t('careeros.today.campaigns.title', 'Active campaigns')}</h2>
            <div className="mt-3">
                {loading ? (
                    <CampaignCard name="" status="active" loading compact />
                ) : failed ? (
                    <StatePanel kind="error" compact title={t('careeros.today.campaigns.error', 'Campaigns could not be loaded')} onRetry={onRetry} />
                ) : campaigns.length === 0 ? (
                    <StatePanel
                        kind="empty"
                        compact
                        title={t('careeros.today.campaigns.emptyTitle', 'No active campaign')}
                        description={t('careeros.today.campaigns.emptyDescription', 'A campaign coordinates a goal, target opportunities and applications. Start one when you want that structure; none is created for you.')}
                        action={{ label: t('careeros.today.campaigns.open', 'Open Campaigns'), onClick: () => navigate(careerPath.toSpace('campaigns')) }}
                    />
                ) : (
                    <>
                        <ul className="space-y-3">
                            {campaigns.slice(0, shown).map(({ campaign, funnel, goalLabel }) => {
                                const next = milestoneSummary(campaign).next;
                                return (
                                    <li key={campaign.id}>
                                        <CampaignCard
                                            name={campaign.name}
                                            goalLabel={goalLabel}
                                            status={campaign.status}
                                            funnel={funnel}
                                            nextMilestone={next ? { title: next.title, dueLabel: next.dueDate ? formatDate(next.dueDate) : undefined } : null}
                                            action={{ label: t('careeros.today.campaigns.openOne', 'Open campaign'), onClick: () => navigate(careerPath.toCampaign(campaign.id)) }}
                                            compact
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                        {campaigns.length > shown && (
                            <Button variant="quiet" size="sm" className="mt-2" onClick={() => setShown((n) => n + PAGE)}>
                                {t('careeros.today.campaigns.showMore', 'Show {count} more').replace('{count}', String(Math.min(PAGE, campaigns.length - shown)))}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default ActiveCampaigns;
