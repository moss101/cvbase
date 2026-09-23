import React, { useMemo, useState } from 'react';
import { Award, Copy, History, IdCard, LayoutTemplate, Pencil, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { AVAILABLE_TEMPLATES } from '../../../constants';
import { useSubscription } from '../../SubscriptionProvider';
import { useResumeActions } from '../../resumes/useResumeActions';
import { Button, Pill, RowMenu, SpaceHeader, StatePanel, Skeleton } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from '../career/useOnline';
import { VersionsDialog } from './LibraryDialogs';
import { applicationLabel, dateLabel, sortNewest } from './libraryFormat';
import { useLibraryAssets } from './useLibraryAssets';

/**
 * The CV Builder workspace home — the classic CV dashboard, inside the shell:
 * every CV with its version, template, ATS signal and the application it is
 * tailored for; New CV (with the plan limit), templates and the CV tools; and
 * the one career profile every CV draws on. Opening a CV enters the editor
 * without leaving Career OS. No CV capability lives anywhere else.
 */
export const CvWorkspace: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    const { plan } = useSubscription();
    const online = useOnline();
    const library = useLibraryAssets();
    const [versions, setVersions] = useState<{ resumeId: string; title: string } | null>(null);
    const data = library.data;

    const cvs = useMemo(() => (data ? sortNewest(data.assets.filter((a) => a.kind === 'cv')) : []), [data]);
    const primaryFirst = useMemo(() => [...cvs].sort((a, b) => Number(Boolean(b.extra.isPrimary)) - Number(Boolean(a.extra.isPrimary))), [cvs]);
    const resumes = useMemo(() => new Map((data?.resumes ?? []).map((r) => [r.id, r])), [data]);
    const appById = useMemo(() => new Map((data?.applications ?? []).map((a) => [a.id, a])), [data]);
    const scoreFor = (id: string): number | null => {
        const report = sortNewest((data?.assets ?? []).filter((a) => a.kind === 'report' && a.extra.resumeId === id))[0];
        return typeof report?.extra.score === 'number' ? report.extra.score : null;
    };

    const actions = useResumeActions({
        userId: userId ?? '',
        count: cvs.length,
        limit: plan.limits.resumes,
        onEdit: (id) => navigate(careerPath.toCvEdit(id)),
        onUpgrade: () => navigate({ view: 'pricing' }),
        refresh: library.refresh,
    });

    const tools = [
        { key: 'templates', label: t('dash.tab.templateGallery', 'Template gallery'), detail: t('careeros.cvw.templatesDetail', '{count} layouts, all ATS-tested').replace('{count}', String(AVAILABLE_TEMPLATES.length)), Icon: LayoutTemplate, route: careerPath.toLibraryTool('templates') },
        { key: 'tailor', label: t('mobile.prismTailor', 'PRISM Tailor'), detail: t('careeros.cvw.tailorDetail', 'Tailor a CV to a job description'), Icon: Wand2, route: careerPath.toLibraryTool('tailor') },
        { key: 'ats', label: t('mobile.atsChecker', 'ATS Checker'), detail: t('careeros.cvw.atsDetail', 'See how parsers read a CV'), Icon: Sparkles, route: careerPath.toLibraryTool('ats') },
        { key: 'studio', label: t('mobile.smartStudio', 'Smart Studio'), detail: t('careeros.cvw.studioDetail', 'Match scan, LinkedIn, cover letters'), Icon: Award, route: careerPath.toStudio() },
    ];

    return (
        <div className="mx-auto w-full max-w-[1100px]">
            <SpaceHeader
                title={t('careeros.space.cvBuilder', 'CV Builder')}
                description={t('careeros.cvw.description', 'Every CV you have made, the editor, templates and CV tools in one workspace. All of them draw on one career profile.')}
                action={<Button variant="primary" icon={<Plus size={16} strokeWidth={2} />} loading={actions.busy} disabled={!online} onClick={() => { void actions.create(); }}>{actions.canCreate ? t('careeros.library.newCv', 'New CV') : t('resumeMgr.upgradeForMore', 'Upgrade for more resumes')}</Button>}
            />

            <nav aria-label={t('careeros.cvw.tools', 'CV tools')} className="cos-panel mb-6 grid grid-cols-1 divide-y divide-border-default overflow-hidden sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                {tools.map((tool, i) => (
                    <button key={tool.key} type="button" onClick={() => navigate(tool.route)} className={`flex items-start gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-surface-canvas ${i % 2 === 1 ? 'sm:border-l sm:border-border-default lg:border-l-0' : ''} ${i >= 2 ? 'sm:border-t sm:border-border-default lg:border-t-0' : ''}`}>
                        <tool.Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
                        <span className="min-w-0">
                            <span className="block text-[14px] font-semibold text-content-primary">{tool.label}</span>
                            <span className="block text-[12.5px] text-content-secondary">{tool.detail}</span>
                        </span>
                    </button>
                ))}
            </nav>

            <section aria-labelledby="cvw-list" className="cos-panel overflow-hidden">
                <div className="flex items-baseline justify-between gap-3 px-6 pb-2 pt-5">
                    <h2 id="cvw-list" className="text-[15px] font-semibold text-content-primary">{t('careeros.cvw.yourCvs', 'Your CVs')}</h2>
                    {data && <span className="text-[12.5px] text-content-muted cos-num">{plan.limits.resumes < 0 ? t('careeros.cvw.count', '{count} CVs').replace('{count}', String(cvs.length)) : t('careeros.cvw.countLimit', '{count} of {limit} on your plan').replace('{count}', String(cvs.length)).replace('{limit}', String(plan.limits.resumes))}</span>}
                </div>
                {library.error !== null ? (
                    <div className="p-6"><StatePanel kind={online ? 'error' : 'offline'} onRetry={() => { void library.refresh(); }} /></div>
                ) : data === null ? (
                    <div className="space-y-4 p-6" aria-busy="true"><Skeleton variant="text" lines={3} /><Skeleton variant="text" lines={3} /></div>
                ) : primaryFirst.length === 0 ? (
                    <div className="px-6 pb-6 pt-2">
                        <p className="text-[14px] text-content-secondary">{t('careeros.cvw.empty', 'No CVs yet. Start a new one, or pick a layout from the template gallery first.')}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border-default">
                        {primaryFirst.map((cv) => {
                            const resume = resumes.get(cv.id);
                            const template = AVAILABLE_TEMPLATES.find((tp) => tp.id === resume?.templateId)?.name;
                            const app = cv.applicationId ? appById.get(cv.applicationId) : undefined;
                            const score = scoreFor(cv.id);
                            const ref = { id: cv.id, title: cv.title, isPrimary: Boolean(cv.extra.isPrimary) };
                            return (
                                <li key={cv.key} className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center">
                                    <button type="button" onClick={() => navigate(careerPath.toCvEdit(cv.id))} className="group flex min-w-0 flex-1 items-start gap-4 text-left">
                                        <span className="relative mt-0.5 h-[58px] w-[46px] shrink-0 rounded-md border border-border-default bg-white" aria-hidden="true">
                                            <span className="absolute inset-x-2 top-2.5 h-[3px] rounded bg-slate-400/70" />
                                            <span className="absolute inset-x-2 top-[17px] h-[2px] rounded bg-slate-300" />
                                            <span className="absolute left-2 top-[23px] h-[2px] w-[55%] rounded bg-slate-300" />
                                            <span className="absolute inset-x-2 top-[31px] h-[2px] rounded bg-slate-200" />
                                            <span className="absolute left-2 top-[37px] h-[2px] w-[70%] rounded bg-slate-200" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-[15px] font-semibold text-content-primary group-hover:underline">{cv.title}</span>
                                                {cv.extra.isPrimary && <Pill tone="accent">{t('careeros.library.primaryCv', 'Primary')}</Pill>}
                                                {cv.extra.origin === 'prism' && <Pill>{t('careeros.library.originPrism', 'PRISM')}</Pill>}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[13px] text-content-secondary">
                                                {[cv.meta, app ? t('careeros.library.tailoredFor', 'Tailored for {application}').replace('{application}', applicationLabel(app) ?? '') : null, template].filter(Boolean).join(' · ')}
                                            </span>
                                            <span className="mt-1 block text-[12.5px] text-content-muted cos-num">
                                                {[typeof resume?.revision === 'number' ? t('careeros.today.work.version', 'version {n}').replace('{n}', String(resume.revision)) : null,
                                                    cv.updatedAt ? t('careeros.library.updated', 'Updated {date}').replace('{date}', dateLabel(cv.updatedAt)) : null,
                                                    score !== null ? t('careeros.library.score', 'Score {score}/100').replace('{score}', String(score)) : null].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                    </button>
                                    <div className="flex shrink-0 flex-wrap items-center gap-1 md:justify-end" role="group" aria-label={t('careeros.library.manageCv', 'Manage {title}').replace('{title}', cv.title)}>
                                        <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toCvEdit(cv.id))}>{t('careeros.cvw.open', 'Open')}</Button>
                                        <RowMenu
                                            label={t('careeros.cvw.more', 'More for {title}').replace('{title}', cv.title)}
                                            items={[
                                                { key: 'versions', label: t('careeros.library.versions', 'Versions'), Icon: History, onSelect: () => setVersions({ resumeId: cv.id, title: cv.title }) },
                                                { key: 'duplicate', label: t('resumeMgr.duplicate', 'Duplicate'), Icon: Copy, disabled: actions.busy, onSelect: () => { void actions.duplicate(cv.id); } },
                                                { key: 'rename', label: t('resumeMgr.rename', 'Rename'), Icon: Pencil, onSelect: () => actions.requestRename(ref) },
                                                { key: 'delete', label: t('btn.delete', 'Delete'), Icon: Trash2, danger: true, onSelect: () => actions.requestDelete(ref) },
                                            ]}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section aria-labelledby="cvw-profile" className="mt-6 flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-canvas px-6 py-5 md:flex-row md:items-center">
                <IdCard size={20} strokeWidth={1.75} className="shrink-0 text-content-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <h2 id="cvw-profile" className="text-[14px] font-semibold text-content-primary">{t('careeros.cvw.profileTitle', 'One career profile behind every CV')}</h2>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-content-secondary">{t('careeros.cvw.profileBody', 'Your name, contact details and target role come from Career → Profile, and the experience you confirm in Career can be reused in any CV. There is no second profile to keep in sync.')}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toCareer('profile'))}>{t('careeros.cvw.editProfile', 'Edit profile')}</Button>
                    <Button variant="quiet" size="sm" onClick={() => navigate(careerPath.toCareer('evidence'))}>{t('careeros.cvw.reviewFacts', 'Career facts')}</Button>
                </div>
            </section>

            {versions && userId && <VersionsDialog userId={userId} resumeId={versions.resumeId} title={versions.title} onClose={() => setVersions(null)} />}
            {actions.dialogs}
        </div>
    );
};

export default CvWorkspace;
