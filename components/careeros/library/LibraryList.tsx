import React, { useCallback, useId, useMemo, useState } from 'react';
import { Search, Wand2, LayoutTemplate, Sparkles, Plus, FileText, Image as ImageIcon, ScrollText, BookOpen, ClipboardCheck, Award, Copy, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { track } from '../../../services/careerOs/careerEvents';
import { Button, EntityCard, Pill, RowMenu, SkeletonCard, StatePanel, StatusChip, type EntityCardAction, type Tone } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from '../career/useOnline';
import { confirmationLabel } from '../career/factFormat';
import { HeadshotDialog, ReportDialog, VersionsDialog } from './LibraryDialogs';
import { applicationLabel, countByKind, dateLabel, filterAssets, isLibraryKind, LIBRARY_KINDS, paginate, sortNewest, type LibraryAsset, type LibraryKind } from './libraryFormat';
import { APPLICATION_CAP, useLibraryAssets } from './useLibraryAssets';
import { useSubscription } from '../../SubscriptionProvider';
import { useResumeActions, type ResumeActions } from '../../resumes/useResumeActions';

/**
 * The unified Library list (REQ-22): filter pills, a client-side text
 * search, newest-first cards with one dominant action each, association
 * chips and "Load more" pagination for large libraries. Every read works on
 * the free plan; nothing here is behind an entitlement gate.
 */
export interface LibraryListProps {
    type?: string;
}

const KIND_ICON: Record<LibraryKind, React.ReactNode> = {
    cv: <FileText />, report: <ClipboardCheck />, headshot: <ImageIcon />, 'cover-letter': <ScrollText />, story: <BookOpen />, evidence: <Sparkles />,
};

const KIND_LABEL: Record<LibraryKind, [string, string]> = {
    cv: ['careeros.document.kind.cv', 'CV'],
    report: ['careeros.document.kind.report', 'Report'],
    headshot: ['careeros.document.kind.headshot', 'Headshot'],
    'cover-letter': ['careeros.document.kind.coverLetter', 'Cover letter'],
    story: ['careeros.document.kind.story', 'Interview story'],
    evidence: ['careeros.document.kind.evidence', 'Evidence'],
};

type OpenDialog =
    | { kind: 'headshot'; storagePath: string; createdAt: string }
    | { kind: 'report'; id: string }
    | { kind: 'versions'; resumeId: string; title: string }
    | null;

export const LibraryList: React.FC<LibraryListProps> = ({ type }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    const online = useOnline();
    const library = useLibraryAssets();
    const [query, setQuery] = useState('');
    const [pages, setPages] = useState(1);
    const [dialog, setDialog] = useState<OpenDialog>(null);
    const searchId = useId();
    const activeType = isLibraryKind(type) ? type : undefined;

    const data = library.data;
    const all = useMemo(() => (data ? sortNewest(data.assets) : []), [data]);
    const counts = useMemo(() => countByKind(all), [all]);
    const filtered = useMemo(() => filterAssets(all, { type: activeType, query }), [all, activeType, query]);
    const page = useMemo(() => paginate(filtered, pages), [filtered, pages]);
    const appById = useMemo(() => new Map((data?.applications ?? []).map((a) => [a.id, a])), [data]);
    const { plan } = useSubscription();
    // The legacy resume manager's create / duplicate / rename / delete, with
    // the same plan limit, primary-resume guard and server backstop.
    const resumes = useResumeActions({
        userId: userId ?? '',
        count: counts.cv,
        limit: plan.limits.resumes,
        onEdit: (id) => navigate(careerPath.toCvEdit(id)),
        onUpgrade: () => navigate({ view: 'pricing' }),
        refresh: library.refresh,
    });

    const opened = useCallback((asset: LibraryAsset) => {
        if (!userId) return;
        void track(userId, 'library_asset_opened', { subjectRefs: { asset: asset.id }, payload: { kind: asset.kind, hasApplication: Boolean(asset.applicationId) } });
    }, [userId]);

    const setType = (next: LibraryKind | undefined) => {
        setPages(1);
        navigate(next ? careerPath.toLibrary(next) : careerPath.toLibrary());
    };

    const actionFor = (asset: LibraryAsset): { action: EntityCardAction; secondary?: EntityCardAction } => {
        switch (asset.kind) {
            case 'cv':
                return {
                    action: { label: t('careeros.library.openEditor', 'Open in editor'), onClick: () => { opened(asset); navigate(careerPath.toCvEdit(asset.id)); } },
                    secondary: { label: t('careeros.library.versions', 'Versions'), onClick: () => setDialog({ kind: 'versions', resumeId: asset.id, title: asset.title }) },
                };
            case 'report':
                return { action: { label: t('careeros.library.openReport', 'Open report'), onClick: () => { opened(asset); setDialog({ kind: 'report', id: asset.id }); } } };
            case 'headshot':
                return { action: { label: t('careeros.library.view', 'View'), onClick: () => { opened(asset); setDialog({ kind: 'headshot', storagePath: asset.extra.storagePath ?? '', createdAt: asset.updatedAt }); } } };
            case 'cover-letter':
                return { action: { label: t('careeros.library.openApplication', 'Open in application'), onClick: () => { opened(asset); if (asset.applicationId) navigate(careerPath.toApplication(asset.applicationId, 'cover-letter')); } } };
            case 'story':
                return { action: { label: t('careeros.library.openAchievements', 'Open achievements'), onClick: () => { opened(asset); navigate(careerPath.toCareer('achievements')); } } };
            default:
                return { action: { label: t('careeros.library.openEvidence', 'Open evidence'), onClick: () => { opened(asset); navigate(careerPath.toCareer('evidence')); } } };
        }
    };

    const kindLabel = (k: LibraryKind) => t(KIND_LABEL[k][0], KIND_LABEL[k][1]);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center gap-1">
                <Button variant="primary" size="sm" className="mr-2" icon={<Plus size={14} strokeWidth={2} />} loading={resumes.busy} onClick={() => { void resumes.create(); }}>{resumes.canCreate ? t('careeros.library.newCv', 'New CV') : t('resumeMgr.upgradeForMore', 'Upgrade for more resumes')}</Button>
                <Button variant="quiet" size="sm" icon={<LayoutTemplate size={14} strokeWidth={2} />} onClick={() => navigate(careerPath.toLibraryTool('templates'))}>{t('dash.tab.templateGallery', 'Template gallery')}</Button>
                <Button variant="quiet" size="sm" icon={<Wand2 size={14} strokeWidth={2} />} onClick={() => navigate(careerPath.toLibraryTool('tailor'))}>{t('mobile.prismTailor', 'PRISM Tailor')}</Button>
                <Button variant="quiet" size="sm" icon={<Sparkles size={14} strokeWidth={2} />} onClick={() => navigate(careerPath.toLibraryTool('ats'))}>{t('mobile.atsChecker', 'ATS Checker')}</Button>
                <Button variant="quiet" size="sm" icon={<Award size={14} strokeWidth={2} />} onClick={() => navigate(careerPath.toStudio())}>{t('mobile.smartStudio', 'Smart Studio')}</Button>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <label htmlFor={searchId} className="sr-only">{t('careeros.library.search', 'Search your library')}</label>
                    <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" aria-hidden="true" />
                    <input
                        id={searchId}
                        type="search"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value.slice(0, 64)); setPages(1); }}
                        placeholder={t('careeros.library.searchPlaceholder', 'Search titles, companies, labels')}
                        maxLength={64}
                        className="tap-target w-full rounded-xl border border-border-strong bg-surface-panel py-2 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    />
                </div>
            </div>

            <div role="group" aria-label={t('careeros.library.filter', 'Filter by type')} className="mb-4 flex flex-wrap gap-2">
                <button type="button" aria-pressed={!activeType} onClick={() => setType(undefined)} className={`tap-target rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${!activeType ? 'border-action-primary/40 bg-action-primary/10 text-action-primary' : 'border-border-default bg-surface-panel text-content-secondary hover:bg-surface-canvas'}`}>
                    {t('careeros.library.all', 'All')} · {counts.all}
                </button>
                {LIBRARY_KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={activeType === k} onClick={() => setType(k)} className={`tap-target rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${activeType === k ? 'border-action-primary/40 bg-action-primary/10 text-action-primary' : 'border-border-default bg-surface-panel text-content-secondary hover:bg-surface-canvas'}`}>
                        {kindLabel(k)} · {counts[k]}
                        {k === 'evidence' && counts.toReview > 0 && <span className="ml-1 text-[11px] font-normal">({t('careeros.library.toReview', '{count} to review').replace('{count}', String(counts.toReview))})</span>}
                    </button>
                ))}
            </div>

            {activeType === 'cv' && (
                <p className="mb-3 text-[13px] text-content-secondary">{t('careeros.library.cvExportNote', 'PDF, DOCX and JSON exports run from the editor, where the document preview renders. Export keeps every format it has today.')}</p>
            )}

            {library.error !== null ? (
                <StatePanel kind={online ? 'error' : 'offline'} onRetry={() => { void library.refresh(); }} />
            ) : data === null ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
            ) : (
                <>
                    {data.failed.length > 0 && (
                        <StatePanel kind="partial" compact className="mb-3" description={t('careeros.library.partial', 'Could not load: {sources}. The rest of your library is shown.').replace('{sources}', data.failed.join(', '))} onRetry={() => { void library.refresh(); }} />
                    )}
                    {data.applicationsCapped && (
                        <p className="mb-3 text-xs text-content-muted">{t('careeros.library.coverLetterCap', 'Cover letters are listed for your {cap} most recent applications; older ones open from their application workspace.').replace('{cap}', String(APPLICATION_CAP))}</p>
                    )}
                    {all.length === 0 ? (
                        <StatePanel
                            kind="empty"
                            title={t('careeros.library.firstUse', 'Your library is empty')}
                            description={t('careeros.library.firstUseDescription', 'CVs, ATS reports, headshots, cover letters, interview stories and evidence appear here as you create them.')}
                            action={{ label: t('careeros.library.newCv', 'New CV'), onClick: () => { void resumes.create(); } }}
                        />
                    ) : filtered.length === 0 ? (
                        <StatePanel kind="empty" title={t('careeros.library.noMatches', 'Nothing matches')} description={t('careeros.library.noMatchesDescription', 'Try another word or clear the type filter.')} action={query ? { label: t('careeros.library.clearSearch', 'Clear search'), onClick: () => setQuery('') } : undefined} />
                    ) : (
                        <>
                            <p className="mb-2 text-xs text-content-muted" role="status">{t('careeros.library.showing', 'Showing {shown} of {total}').replace('{shown}', String(page.items.length)).replace('{total}', String(filtered.length))}</p>
                            <ul className="cos-list" aria-label={t('careeros.space.library', 'Library')}>
                                {page.items.map((asset) => {
                                    const { action, secondary } = actionFor(asset);
                                    const app = asset.applicationId ? appById.get(asset.applicationId) : undefined;
                                    const label = applicationLabel(app);
                                    const statusChip: Record<string, { label: string; tone: Tone }> = {
                                        draft: { label: t('careeros.document.status.draft', 'Draft'), tone: 'neutral' },
                                        reviewed: { label: t('careeros.document.status.reviewed', 'Reviewed'), tone: 'success' },
                                        snapshot: { label: t('careeros.document.status.snapshot', 'Submitted snapshot'), tone: 'info' },
                                    };
                                    const metaLine = asset.kind === 'cv' && label
                                        ? t('careeros.library.tailoredFor', 'Tailored for {application}').replace('{application}', label)
                                        : label ? t('careeros.document.forApplication', 'For {application}').replace('{application}', label) : asset.meta;
                                    return (
                                        <li key={asset.key}>
                                            <EntityCard
                                                kind={kindLabel(asset.kind)}
                                                kindIcon={KIND_ICON[asset.kind]}
                                                title={asset.title}
                                                meta={metaLine}
                                                chips={
                                                    <>
                                                        {asset.status && <StatusChip label={statusChip[asset.status].label} tone={statusChip[asset.status].tone} />}
                                                        {asset.stale && <StatusChip label={t('careeros.document.stale', 'Out of date')} tone="warning" />}
                                                    </>
                                                }
                                                footnote={asset.updatedAt ? t('careeros.library.updated', 'Updated {date}').replace('{date}', dateLabel(asset.updatedAt)) : undefined}
                                                action={action}
                                                secondaryAction={secondary}
                                                menu={asset.kind === 'cv' ? <CvManageMenu asset={asset} actions={resumes} /> : undefined}
                                            >
                                                <AssetChips asset={asset} showMeta={Boolean(label) && Boolean(asset.meta)} />
                                            </EntityCard>
                                        </li>
                                    );
                                })}
                            </ul>
                            {page.hasMore && (
                                <div className="mt-4 flex justify-center">
                                    <Button variant="secondary" onClick={() => setPages((n) => n + 1)}>{t('careeros.library.loadMore', 'Load more')}</Button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {dialog?.kind === 'headshot' && userId && <HeadshotDialog userId={userId} storagePath={dialog.storagePath} createdAt={dialog.createdAt} onClose={() => setDialog(null)} />}
            {dialog?.kind === 'report' && userId && <ReportDialog userId={userId} reportId={dialog.id} onClose={() => setDialog(null)} />}
            {dialog?.kind === 'versions' && userId && <VersionsDialog userId={userId} resumeId={dialog.resumeId} title={dialog.title} onClose={() => setDialog(null)} />}
            {resumes.dialogs}
        </div>
    );
};

/** Duplicate / rename / delete for one CV — the legacy resume manager's row actions, behind the row's More menu. */
const CvManageMenu: React.FC<{ asset: LibraryAsset; actions: ResumeActions }> = ({ asset, actions }) => {
    const { t } = useTranslation();
    const ref = { id: asset.id, title: asset.title, isPrimary: Boolean(asset.extra.isPrimary) };
    return (
        <RowMenu
            label={t('careeros.cvw.more', 'More for {title}').replace('{title}', asset.title)}
            items={[
                { key: 'duplicate', label: t('resumeMgr.duplicate', 'Duplicate'), Icon: Copy, disabled: actions.busy, onSelect: () => { void actions.duplicate(asset.id); } },
                { key: 'rename', label: t('resumeMgr.rename', 'Rename'), Icon: Pencil, onSelect: () => actions.requestRename(ref) },
                { key: 'delete', label: t('btn.delete', 'Delete'), Icon: Trash2, danger: true, onSelect: () => actions.requestDelete(ref) },
            ]}
        />
    );
};

const AssetChips: React.FC<{ asset: LibraryAsset; showMeta?: boolean }> = ({ asset, showMeta = false }) => {
    const { t } = useTranslation();
    const chips: React.ReactNode[] = [];
    if (showMeta && asset.meta) chips.push(<span key="meta" className="text-[13px] text-content-secondary">{asset.meta}</span>);
    if (asset.kind === 'cv' && asset.extra.isPrimary) chips.push(<Pill key="primary" tone="accent">{t('careeros.library.primaryCv', 'Primary')}</Pill>);
    if (asset.kind === 'cv' && asset.extra.origin === 'prism') chips.push(<Pill key="origin" mono>{t('careeros.library.originPrism', 'PRISM')}</Pill>);
    if (asset.kind === 'report') chips.push(<StatusChip key="score" label={asset.extra.score === null || asset.extra.score === undefined ? t('careeros.library.notScored', 'Not scored') : t('careeros.library.score', 'Score {score}/100').replace('{score}', String(asset.extra.score))} tone={asset.extra.score === null || asset.extra.score === undefined ? 'neutral' : asset.extra.score >= 75 ? 'success' : asset.extra.score >= 50 ? 'warning' : 'danger'} />);
    if ((asset.kind === 'story' || asset.kind === 'evidence') && asset.extra.confirmationState) chips.push(<Pill key="conf" tone={asset.extra.confirmationState === 'verified' || asset.extra.confirmationState === 'user_confirmed' ? 'success' : asset.extra.confirmationState === 'inferred' ? 'warning' : 'neutral'}>{confirmationLabel(t, asset.extra.confirmationState)}</Pill>);
    if (asset.kind === 'evidence' && asset.extra.reviewState && asset.extra.reviewState !== 'reviewed') chips.push(<Pill key="review" tone="warning">{asset.extra.reviewState === 'conflict' ? t('careeros.library.conflict', 'Conflict') : t('careeros.library.candidate', 'Needs review')}</Pill>);
    if (asset.kind === 'story') chips.push(<Pill key="usage" mono>{t('careeros.library.storyUsage', 'Used in {count} interview preps').replace('{count}', String(asset.extra.usageCount ?? 0))}</Pill>);
    if (asset.goalId) chips.push(<Pill key="goal" mono>{t('careeros.context.goal', 'Goal')}</Pill>);
    if (chips.length === 0) return null;
    return <div className="flex flex-wrap items-center gap-1.5">{chips}</div>;
};

export default LibraryList;
