import React, { useState } from 'react';
import { Bookmark, ChevronDown, ChevronRight, ExternalLink, Eye, GitMerge, MessageCircle, Play, ThumbsDown, Undo2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import { track } from '../../../services/careerOs/careerEvents';
import type { CareerGoal, Freshness, Opportunity, OpportunityStatus } from '../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { useMobileShell } from '../../../lib/useMobileShell';
import StickyActionBar from '../../mobile/StickyActionBar';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, Pill, Skeleton, SpaceHeader, StatePanel, StatusChip, type Tone } from '../primitives';
import { FailureNotice } from '../application/FailureNotice';
import { formatDate } from '../application/format';
import { useAsyncAction } from '../application/useAsyncAction';
import { deriveFreshness } from './freshness';
import { FitPanel } from './FitPanel';
import { OpportunityPicker } from './OpportunityPicker';
import { useStartApplication } from './useStartApplication';

/**
 * One opportunity (REQ-07/REQ-15): the recorded facts about the listing
 * (source, captured and listing dates, freshness — unknown when not stated),
 * the captured text as plain data, the requirements read from it and the two
 * fit panels. Actions: Save/Watch, Ask Coach, Start Application, Not
 * interested, Merge into another record, Undo merge. Closed or stale
 * listings stay reviewable with their status shown.
 */
interface DetailData { opportunity: Opportunity; goal: CareerGoal | null }

async function loadDetail(userId: string, id: string): Promise<DetailData> {
    const [opportunity, goal] = await Promise.all([opportunityRepo.get(userId, id), goalRepo.getPrimary(userId).catch(() => null)]);
    return { opportunity, goal };
}

const openExternal = async (url: string): Promise<void> => {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url });
            return;
        }
    } catch { /* fall through to the web path */ }
    window.open(url, '_blank', 'noopener,noreferrer');
};

export const OpportunityDetail: React.FC<{ id: string }> = ({ id }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate, back, reset } = useNavigation();
    const isMobile = useMobileShell();
    const query = useOwnedQuery(userId, `opportunity:detail:${id}`, () => loadDetail(userId as string, id), [id]);
    const start = useStartApplication(id);
    const [contentOpen, setContentOpen] = useState(false);
    const [notInterestedOpen, setNotInterestedOpen] = useState(false);
    const [mergeOpen, setMergeOpen] = useState(false);

    const opportunity = query.data?.opportunity ?? null;
    const goal = query.data?.goal ?? null;

    const [setStatus, statusState] = useAsyncAction(async (status: OpportunityStatus, reason?: string) => {
        if (!userId || !opportunity) return;
        const next = await opportunityRepo.setStatus(userId, opportunity.id, status, opportunity.revision, reason ?? null);
        query.setData({ opportunity: next, goal });
        invalidate('opportunities:');
        await track(userId, 'opportunity_reviewed', { subjectRefs: { opportunity: next.id }, payload: { status } });
    });

    const [mergeInto, mergeState] = useAsyncAction(async (target: Opportunity) => {
        if (!userId || !opportunity) return;
        await opportunityRepo.merge(userId, opportunity.id, target.id);
        invalidate('opportunit');
        invalidate('analysis:');
        setMergeOpen(false);
        await query.refresh();
    });

    const [undoMerge, undoState] = useAsyncAction(async () => {
        if (!userId || !opportunity) return;
        await opportunityRepo.unmerge(userId, opportunity.id);
        invalidate('opportunit');
        invalidate('analysis:');
        await query.refresh();
    });

    const freshnessChip = (freshness: Freshness): { label: string; tone: Tone } => ({
        fresh: { label: t('careeros.opportunity.freshness.fresh', 'Listing fresh'), tone: 'success' as Tone },
        aging: { label: t('careeros.opportunity.freshness.aging', 'Listing aging'), tone: 'warning' as Tone },
        stale: { label: t('careeros.opportunity.freshness.stale', 'Listing may be stale'), tone: 'warning' as Tone },
        closed: { label: t('careeros.opportunity.freshness.closed', 'Listing closed'), tone: 'danger' as Tone },
        unknown: { label: t('careeros.opportunity.freshness.unknown', 'Freshness unknown'), tone: 'neutral' as Tone },
    })[freshness];

    const statusLabel: Record<OpportunityStatus, string> = {
        saved: t('careeros.opportunity.status.saved', 'Saved'),
        watching: t('careeros.opportunity.status.watching', 'Watching'),
        applied: t('careeros.opportunity.status.applied', 'Applied'),
        not_interested: t('careeros.opportunity.status.notInterested', 'Not interested'),
        archived: t('careeros.opportunity.status.archived', 'Archived'),
    };

    const onBack = () => { if (!back()) reset(careerPath.toSpace('opportunities')); };

    if (query.error) {
        return (
            <div className="mx-auto w-full max-w-4xl">
                <SpaceHeader eyebrow={t('careeros.space.opportunities', 'Opportunities')} title={t('careeros.opportunity.unavailableTitle', 'Opportunity unavailable')} compact />
                <FailureNotice error={query.error} onRetry={() => { void query.refresh(); }} onReload={() => { void query.refresh(); }} />
                <Button variant="quiet" className="mt-4" onClick={onBack}>{t('careeros.common.back', 'Back')}</Button>
            </div>
        );
    }
    if (!opportunity) {
        return (
            <div className="mx-auto w-full max-w-4xl" aria-busy="true">
                <Skeleton variant="text" width="6rem" className="h-2.5" />
                <Skeleton variant="title" width="60%" className="mt-3" />
                <Skeleton variant="text" lines={3} className="mt-4" />
                <Skeleton variant="block" className="mt-6" />
            </div>
        );
    }

    const freshness = deriveFreshness(opportunity);
    const fresh = freshnessChip(freshness);
    const merged = Boolean(opportunity.mergedIntoId);
    const existing = start.latest;
    const startPending = start.pending;

    const primaryAction = existing ? (
        <Button variant="primary" icon={<Play size={16} strokeWidth={2} />} onClick={start.openLatest} fullWidth={isMobile}>
            {t('careeros.opportunity.openApplication', 'Open application')}
        </Button>
    ) : (
        <Button variant="primary" icon={<Play size={16} strokeWidth={2} />} onClick={() => { void start.start(); }} loading={startPending} disabled={merged || start.loading} fullWidth={isMobile}>
            {t('careeros.opportunity.startApplication', 'Start application')}
        </Button>
    );

    return (
        <div className="mx-auto w-full max-w-4xl">
            <SpaceHeader
                eyebrow={t('careeros.space.opportunities', 'Opportunities')}
                title={opportunity.title}
                description={[opportunity.company, opportunity.location, opportunity.remoteType ? { remote: t('careeros.opportunity.remote', 'Remote'), hybrid: t('careeros.opportunity.hybrid', 'Hybrid'), onsite: t('careeros.opportunity.onsite', 'On site') }[opportunity.remoteType] : null].filter(Boolean).join(' · ')}
                action={!isMobile ? primaryAction : undefined}
                compact
            >
                <div className="flex flex-wrap items-center gap-2">
                    <StatusChip label={statusLabel[opportunity.status]} tone={opportunity.status === 'applied' ? 'success' : opportunity.status === 'watching' ? 'info' : 'neutral'} announce />
                    <StatusChip label={fresh.label} tone={fresh.tone} />
                    {opportunity.listingStatus === 'closed' && <StatusChip label={t('careeros.opportunity.closedReviewable', 'Closed — still reviewable')} tone="neutral" />}
                    {merged && <StatusChip label={t('careeros.opportunity.mergedChip', 'Merged into another record')} tone="warning" />}
                    <Pill mono>{opportunity.sourceKind}</Pill>
                </div>
            </SpaceHeader>

            {(statusState.error || mergeState.error || undoState.error || start.error) ? (
                <FailureNotice
                    error={statusState.error ?? mergeState.error ?? undoState.error ?? start.error}
                    onReload={() => { void query.refresh(); }}
                    onDismiss={() => { statusState.reset(); mergeState.reset(); undoState.reset(); }}
                    className="mb-4"
                />
            ) : null}

            {merged && (
                <StatePanel
                    kind="partial"
                    compact
                    className="mb-4"
                    title={t('careeros.opportunity.mergedTitle', 'This record was merged into another opportunity')}
                    description={t('careeros.opportunity.mergedDescription', 'Its applications and campaign links moved to the surviving record. Undo restores them here.')}
                    action={{ label: t('careeros.opportunity.openSurvivor', 'Open the surviving record'), onClick: () => navigate(careerPath.toOpportunity(opportunity.mergedIntoId as string)) }}
                    secondaryAction={{ label: t('careeros.opportunity.undoMerge', 'Undo merge'), onClick: () => { void undoMerge(); } }}
                />
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-4">
                    <section aria-labelledby="opp-facts" className="rounded-2xl border border-border-default bg-surface-panel p-5">
                        <h2 id="opp-facts" className="text-sm font-semibold text-content-primary">{t('careeros.opportunity.listingFacts', 'Listing details')}</h2>
                        <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                            <div><dt className="text-content-muted">{t('careeros.opportunity.captured', 'Captured')}</dt><dd className="text-content-primary">{formatDate(opportunity.capturedAt)}</dd></div>
                            <div><dt className="text-content-muted">{t('careeros.opportunity.listingDate', 'Listing date')}</dt><dd className="text-content-primary">{opportunity.sourceDate ? formatDate(opportunity.sourceDate) : t('careeros.common.unknown', 'Unknown')}</dd></div>
                            <div><dt className="text-content-muted">{t('careeros.opportunity.listingStatus', 'Listing status')}</dt><dd className="text-content-primary">{{ open: t('careeros.opportunity.listingOpen', 'Open'), closed: t('careeros.opportunity.listingClosed', 'Closed'), unknown: t('careeros.common.unknown', 'Unknown') }[opportunity.listingStatus]}</dd></div>
                            <div>
                                <dt className="text-content-muted">{t('careeros.opportunity.sourceLink', 'Source link')}</dt>
                                <dd className="text-content-primary">
                                    {opportunity.sourceUrl ? (
                                        <button type="button" onClick={() => { void openExternal(opportunity.sourceUrl as string); }} className="tap-target inline-flex items-center gap-1 font-semibold text-action-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded">
                                            {t('careeros.opportunity.openSource', 'Open listing')} <ExternalLink size={12} aria-hidden="true" />
                                        </button>
                                    ) : t('careeros.opportunity.noSourceUrl', 'Not supplied')}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section aria-labelledby="opp-requirements" className="rounded-2xl border border-border-default bg-surface-panel p-5">
                        <h2 id="opp-requirements" className="text-sm font-semibold text-content-primary">
                            {t('careeros.opportunity.requirements', 'Requirements read from the listing')} <span className="font-normal text-content-muted">({opportunity.requirements.length})</span>
                        </h2>
                        {opportunity.requirements.length === 0 ? (
                            <p className="mt-2 text-[13px] text-content-secondary">{t('careeros.opportunity.noRequirements', 'No requirement lines were found in the captured text.')}</p>
                        ) : (
                            <ul className="mt-2 space-y-1.5">
                                {opportunity.requirements.map((req) => (
                                    <li key={req.id} className="flex items-start gap-2 text-sm text-content-primary">
                                        <Pill mono tone={req.kind === 'must' ? 'accent' : 'neutral'} className="mt-0.5 shrink-0">{{ must: t('careeros.opportunity.req.must', 'must'), nice: t('careeros.opportunity.req.nice', 'nice'), unknown: t('careeros.opportunity.req.unknown', '?') }[req.kind]}</Pill>
                                        <span>{req.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="opp-fit">
                        <h2 id="opp-fit" className="sr-only">{t('careeros.fit.title', 'Fit')}</h2>
                        <FitPanel opportunity={opportunity} goal={goal} legacyMatchScore={existing?.matchScore ?? null} />
                    </section>

                    <section aria-labelledby="opp-content" className="rounded-2xl border border-border-default bg-surface-panel p-5">
                        <button type="button" id="opp-content" aria-expanded={contentOpen} onClick={() => setContentOpen((o) => !o)} className="tap-target flex w-full items-center gap-2 text-left text-sm font-semibold text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded">
                            {contentOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                            {t('careeros.opportunity.capturedContent', 'Captured listing text')}
                        </button>
                        {contentOpen && (
                            opportunity.capturedContent ? (
                                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-surface-canvas p-3 font-sans text-[13px] leading-relaxed text-content-secondary">{opportunity.capturedContent}</pre>
                            ) : (
                                <p className="mt-2 text-[13px] text-content-secondary">{t('careeros.opportunity.noContent', 'No listing text was captured for this record.')}</p>
                            )
                        )}
                    </section>
                </div>

                <aside aria-label={t('careeros.opportunity.actions', 'Actions')} className="space-y-2 lg:sticky lg:top-20 lg:self-start">
                    {existing && (
                        <p className="rounded-xl bg-surface-canvas px-3 py-2 text-[13px] text-content-secondary">
                            {t('careeros.opportunity.attemptsCount', '{count} application attempt(s)').replace('{count}', String(start.attempts.length))}
                        </p>
                    )}
                    {existing && !merged && (
                        <Button variant="secondary" fullWidth onClick={() => { void start.start({ reapply: true }); }} loading={startPending}>
                            {t('careeros.opportunity.applyAgain', 'Apply again (new attempt)')}
                        </Button>
                    )}
                    <Button variant="secondary" fullWidth icon={<MessageCircle size={16} strokeWidth={2} />} onClick={() => navigate(careerPath.toCoach(undefined, { opportunity: opportunity.id }))}>
                        {t('careeros.opportunity.askCoach', 'Ask Coach')}
                    </Button>
                    {opportunity.status !== 'saved' && (
                        <Button variant="secondary" fullWidth icon={<Bookmark size={16} strokeWidth={2} />} onClick={() => { void setStatus('saved'); }} loading={statusState.pending}>
                            {t('careeros.opportunity.save', 'Save')}
                        </Button>
                    )}
                    {opportunity.status !== 'watching' && (
                        <Button variant="secondary" fullWidth icon={<Eye size={16} strokeWidth={2} />} onClick={() => { void setStatus('watching'); }} loading={statusState.pending}>
                            {t('careeros.opportunity.watch', 'Watch')}
                        </Button>
                    )}
                    {opportunity.status !== 'not_interested' && (
                        <Button variant="quiet" fullWidth icon={<ThumbsDown size={16} strokeWidth={2} />} onClick={() => setNotInterestedOpen(true)}>
                            {t('careeros.opportunity.notInterested', 'Not interested')}
                        </Button>
                    )}
                    {!merged ? (
                        <Button variant="quiet" fullWidth icon={<GitMerge size={16} strokeWidth={2} />} onClick={() => setMergeOpen(true)}>
                            {t('careeros.opportunity.mergeInto', 'Merge into…')}
                        </Button>
                    ) : (
                        <Button variant="quiet" fullWidth icon={<Undo2 size={16} strokeWidth={2} />} onClick={() => { void undoMerge(); }} loading={undoState.pending}>
                            {t('careeros.opportunity.undoMerge', 'Undo merge')}
                        </Button>
                    )}
                </aside>
            </div>

            {isMobile && <StickyActionBar>{primaryAction}</StickyActionBar>}

            <ConfirmDialog
                open={notInterestedOpen}
                mode="prompt"
                title={t('careeros.opportunity.notInterestedTitle', 'Mark as not interested')}
                description={t('careeros.opportunity.notInterestedDescription', 'It leaves your views and stays in Archived. A reason is optional and only for you.')}
                inputLabel={t('careeros.opportunity.notInterestedReason', 'Reason')}
                confirmLabel={t('careeros.opportunity.notInterested', 'Not interested')}
                onCancel={() => setNotInterestedOpen(false)}
                onConfirm={(value) => { setNotInterestedOpen(false); void setStatus('not_interested', value?.trim() || undefined); }}
            />
            <OpportunityPicker
                open={mergeOpen}
                title={t('careeros.opportunity.mergePickerTitle', 'Merge into another opportunity')}
                description={t('careeros.opportunity.mergePickerDescription', 'This record keeps its captured text; its applications, campaign links and analyses move to the one you choose. You can undo it afterwards.')}
                confirmLabel={t('careeros.opportunity.mergeConfirm', 'Merge')}
                excludeIds={[opportunity.id]}
                onClose={() => setMergeOpen(false)}
                onPick={(target) => { void mergeInto(target); }}
                pending={mergeState.pending}
            />
        </div>
    );
};

export default OpportunityDetail;
