import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info, Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import type { Opportunity, OpportunityAnalysis } from '../../../services/careerOs/types';
import { careerPath, OPPORTUNITY_VIEWS, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, OpportunityCard, SkeletonCard, SpaceHeader, StatePanel } from '../primitives';
import { FailureNotice } from '../application/FailureNotice';
import { useAsyncAction } from '../application/useAsyncAction';
import { deriveFreshness } from './freshness';
import { ImportOpportunityDialog, type ImportResult } from './ImportOpportunityDialog';
import { rankForYou, supportedRatio, type RankedOpportunity } from './ranking';

/**
 * The Opportunities space list (REQ-15): For You, Saved, Watching, Applied
 * and Archived are views over the same owned rows. For You ranks only what
 * the person imported and says so — CVBase does not search job boards, and
 * nothing here is labelled an available vacancy. Not-interested rows stay
 * out of every view except Archived; rows hidden by a hard constraint are
 * collapsed with their reason.
 */
export type OpportunityView = (typeof OPPORTUNITY_VIEWS)[number];

interface ListData {
    opportunities: Opportunity[];
    analyses: OpportunityAnalysis[];
    analysesFailed: boolean;
}

const repoViewFor = (view: OpportunityView): opportunityRepo.OpportunityView => (view === 'for-you' ? 'for_you' : view);

async function loadView(userId: string, view: OpportunityView): Promise<ListData> {
    const opportunities = view === 'archived'
        ? [...(await opportunityRepo.list(userId, 'archived')), ...(await opportunityRepo.list(userId, 'not_interested'))]
        : await opportunityRepo.list(userId, repoViewFor(view));
    let analyses: OpportunityAnalysis[] = [];
    let analysesFailed = false;
    try {
        analyses = await analysisRepo.listLatest(userId);
    } catch {
        analysesFailed = true;
    }
    return { opportunities, analyses, analysesFailed };
}

const fitOf = (analysis: OpportunityAnalysis | null) => (analysis ? {
    supported: analysis.qualification.supported.length,
    partial: analysis.qualification.partial.length,
    missing: analysis.qualification.missing.length,
    unknown: analysis.qualification.unknown.length,
    stale: analysis.stale,
} : null);

export const OpportunityList: React.FC<{ route: CareerRoute }> = ({ route }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate, replace } = useNavigation();
    const view = (route.query?.view ?? 'for-you') as OpportunityView;
    const [importOpen, setImportOpen] = useState(false);
    const [hiddenOpen, setHiddenOpen] = useState(false);
    const [lastImport, setLastImport] = useState<ImportResult | null>(null);

    const query = useOwnedQuery(userId, `opportunities:list:${view}`, () => loadView(userId as string, view), [view]);

    const sourceLabel = (o: Opportunity): string => ({
        paste: t('careeros.opportunity.source.paste', 'Pasted by you'),
        manual: t('careeros.opportunity.source.manual', 'Entered by you'),
        tracker_migration: t('careeros.opportunity.source.tracker', 'From your tracker'),
        connector: t('careeros.opportunity.source.connector', 'Imported'),
        coach: t('careeros.opportunity.source.coach', 'Suggested in Coach'),
    })[o.sourceKind];

    const forYou = useMemo(() => (query.data && view === 'for-you' ? rankForYou(query.data.opportunities, query.data.analyses) : null), [query.data, view]);

    const rows: RankedOpportunity[] = useMemo(() => {
        if (!query.data) return [];
        if (forYou) return forYou.ranked;
        const latest = new Map(query.data.analyses.map((a) => [a.opportunityId, a] as const));
        return query.data.opportunities.map((opportunity) => {
            const analysis = latest.get(opportunity.id) ?? null;
            return { opportunity, analysis, supportedRatio: supportedRatio(analysis) };
        });
    }, [query.data, forYou]);

    const [undoMerge, undoState] = useAsyncAction(async (sourceId: string) => {
        if (!userId) return;
        await opportunityRepo.unmerge(userId, sourceId);
        invalidate('opportunit');
        setLastImport(null);
    });

    const tabs: Array<{ key: OpportunityView; label: string }> = [
        { key: 'for-you', label: t('careeros.opportunity.view.forYou', 'For you') },
        { key: 'saved', label: t('careeros.opportunity.view.saved', 'Saved') },
        { key: 'watching', label: t('careeros.opportunity.view.watching', 'Watching') },
        { key: 'applied', label: t('careeros.opportunity.view.applied', 'Applied') },
        { key: 'archived', label: t('careeros.opportunity.view.archived', 'Archived') },
    ];

    const onSaved = (result: ImportResult) => {
        setImportOpen(false);
        setLastImport(result);
        void query.refresh();
    };

    const renderCard = ({ opportunity, analysis }: RankedOpportunity) => (
        <li key={opportunity.id}>
            <OpportunityCard
                title={opportunity.title}
                company={opportunity.company}
                location={opportunity.location}
                remoteType={opportunity.remoteType}
                type={opportunity.opportunityType}
                status={opportunity.status}
                freshness={deriveFreshness(opportunity)}
                fit={fitOf(analysis)}
                sourceLabel={sourceLabel(opportunity)}
                action={{ label: t('careeros.opportunity.open', 'Open'), onClick: () => navigate(careerPath.toOpportunity(opportunity.id)) }}
            />
        </li>
    );

    return (
        <div className="mx-auto w-full max-w-5xl">
            <SpaceHeader
                eyebrow={t('careeros.shell.eyebrow', 'Career OS')}
                title={t('careeros.space.opportunities', 'Opportunities')}
                description={t('careeros.opportunity.spaceDescription', 'Roles, projects and paths you have captured, with how well each fits your evidence and your goal.')}
                action={<Button variant="primary" icon={<Plus size={16} strokeWidth={2} />} onClick={() => setImportOpen(true)} disabled={!userId}>{t('careeros.opportunity.add', 'Add opportunity')}</Button>}
            >
                <nav aria-label={t('careeros.opportunity.views', 'Views')}>
                    <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1">
                        {tabs.map((tab) => (
                            <li key={tab.key}>
                                <button
                                    type="button"
                                    aria-current={view === tab.key ? 'page' : undefined}
                                    onClick={() => replace(careerPath.toSpace('opportunities', { view: tab.key }))}
                                    className={`tap-target whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                                        view === tab.key ? 'bg-action-primary/10 text-content-primary' : 'text-content-secondary hover:bg-surface-canvas hover:text-content-primary'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </SpaceHeader>

            {lastImport && (
                <StatePanel
                    kind="partial"
                    compact
                    className="mb-4"
                    title={lastImport.mergedInto
                        ? t('careeros.opportunity.import.mergedTitle', 'Merged into {title} at {company}').replace('{title}', lastImport.mergedInto.title).replace('{company}', lastImport.mergedInto.company)
                        : t('careeros.opportunity.import.savedTitle', 'Saved {title} at {company}').replace('{title}', lastImport.opportunity.title).replace('{company}', lastImport.opportunity.company)}
                    description={lastImport.mergedInto ? t('careeros.opportunity.import.mergedDescription', 'Its links moved to the existing record. You can undo this.') : undefined}
                    action={lastImport.mergedInto
                        ? { label: t('careeros.opportunity.undoMerge', 'Undo merge'), onClick: () => { void undoMerge(lastImport.opportunity.id); } }
                        : { label: t('careeros.opportunity.open', 'Open'), onClick: () => navigate(careerPath.toOpportunity(lastImport.opportunity.id)) }}
                    secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: () => setLastImport(null) }}
                />
            )}
            {undoState.error ? <FailureNotice error={undoState.error} onDismiss={undoState.reset} className="mb-4" /> : null}

            {view === 'for-you' && query.data && (
                <p role="status" className="mb-3 flex items-center gap-1.5 text-[13px] text-content-muted">
                    <Info size={14} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
                    {t('careeros.opportunity.coverage', 'Ranking your {count} imported opportunities. CVBase does not search job boards yet.').replace('{count}', String(query.data.opportunities.length))}
                </p>
            )}

            {query.error ? (
                <StatePanel kind="error" onRetry={() => { void query.refresh(); }} />
            ) : query.loading && !query.data ? (
                <ul className="space-y-3" aria-busy="true"><li><SkeletonCard /></li><li><SkeletonCard /></li><li><SkeletonCard /></li></ul>
            ) : rows.length === 0 && !(forYou && forYou.hidden.length > 0) ? (
                <StatePanel
                    kind="empty"
                    title={view === 'for-you' || view === 'saved'
                        ? t('careeros.opportunity.emptyTitle', 'No opportunities yet')
                        : t('careeros.opportunity.emptyViewTitle', 'Nothing in this view')}
                    description={view === 'for-you' || view === 'saved'
                        ? t('careeros.opportunity.emptyDescription', 'Paste a job description or enter a role by hand. Fit is analysed against the facts in your Career space.')
                        : t('careeros.opportunity.emptyViewDescription', 'Opportunities move here when you change their status.')}
                    action={{ label: t('careeros.opportunity.add', 'Add opportunity'), onClick: () => setImportOpen(true) }}
                />
            ) : (
                <>
                    {query.data?.analysesFailed && (
                        <StatePanel kind="partial" compact className="mb-3" title={t('careeros.opportunity.fitUnavailable', 'Fit summaries could not be loaded')} description={t('careeros.opportunity.fitUnavailableDescription', 'The opportunities are shown without their fit counts.')} onRetry={() => { void query.refresh(); }} />
                    )}
                    <ul className="cos-list">{rows.map(renderCard)}</ul>
                    {forYou && forYou.hidden.length > 0 && (
                        <section className="mt-6" aria-labelledby="hidden-by-constraints">
                            <button
                                type="button"
                                id="hidden-by-constraints"
                                aria-expanded={hiddenOpen}
                                onClick={() => setHiddenOpen((open) => !open)}
                                className="tap-target flex w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                            >
                                {hiddenOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                                {t('careeros.opportunity.hiddenByConstraints', 'Hidden by your constraints ({count})').replace('{count}', String(forYou.hidden.length))}
                            </button>
                            {hiddenOpen && (
                                <ul className="cos-list mt-2">
                                    {forYou.hidden.map((row) => (
                                        <li key={row.opportunity.id}>
                                            <OpportunityCard
                                                compact
                                                title={row.opportunity.title}
                                                company={row.opportunity.company}
                                                location={row.opportunity.location}
                                                remoteType={row.opportunity.remoteType}
                                                type={row.opportunity.opportunityType}
                                                status={row.opportunity.status}
                                                freshness={deriveFreshness(row.opportunity)}
                                                sourceLabel={row.analysis?.hiddenByConstraint?.text}
                                                action={{ label: t('careeros.opportunity.open', 'Open'), onClick: () => navigate(careerPath.toOpportunity(row.opportunity.id)) }}
                                                secondaryAction={row.analysis?.goalId ? { label: t('careeros.fit.reviseConstraint', 'Revise constraint'), onClick: () => navigate(careerPath.toGoal(row.analysis?.goalId as string)) } : undefined}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </>
            )}

            <ImportOpportunityDialog open={importOpen} onClose={() => setImportOpen(false)} onSaved={onSaved} />
        </div>
    );
};

export default OpportunityList;
