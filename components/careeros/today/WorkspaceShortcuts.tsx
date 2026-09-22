import React, { useId } from 'react';
import { Award, ChevronRight, CreditCard, FileText, LayoutTemplate, Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type Route } from '../../NavigationProvider';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as atsReportRepo from '../../../services/repos/atsReportRepo';
import type { StoredResume } from '../../../services/repos/mappers';
import type { AtsReportSummary } from '../../../services/repos/atsReportRepo';
import { AVAILABLE_TEMPLATES } from '../../../constants';
import { useSubscription } from '../../SubscriptionProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { Skeleton } from '../primitives';

/**
 * The legacy dashboard's home cards, kept on Today so nothing people relied
 * on disappears: continue the most recently edited CV, the latest ATS score,
 * Smart Studio, the template library and the current plan. Reads owned
 * records (not the old localStorage draft/score), and each source fails on
 * its own so one outage never hides the rest.
 */
export interface WorkspaceData {
    recent: StoredResume | null;
    latestReport: AtsReportSummary | null;
    failed: Array<'resumes' | 'reports'>;
}

export async function loadWorkspace(userId: string): Promise<WorkspaceData> {
    const failed: WorkspaceData['failed'] = [];
    const [resumes, reports] = await Promise.all([
        Promise.resolve().then(() => resumeRepo.list(userId)).catch(() => { failed.push('resumes'); return [] as StoredResume[]; }),
        Promise.resolve().then(() => atsReportRepo.listRecent(userId, 1)).catch(() => { failed.push('reports'); return [] as AtsReportSummary[]; }),
    ]);
    const recent = [...(resumes ?? [])].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0] ?? null;
    return { recent, latestReport: reports?.[0] ?? null, failed };
}

interface Row {
    key: string;
    label: string;
    value: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>;
    route: Route;
}

export const WorkspaceShortcuts: React.FC<{ userId: string }> = ({ userId }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { plan } = useSubscription();
    const headingId = useId();
    const query = useOwnedQuery(userId, 'today:workspace', () => loadWorkspace(userId), [userId]);
    const data = query.data;

    let body: React.ReactNode;
    if (!data) {
        body = <div className="space-y-2" aria-busy="true"><Skeleton variant="text" lines={5} /></div>;
    } else {
        const unavailable = t('careeros.today.workspace.unavailable', 'Could not load right now');
        const score = data.latestReport?.score;
        const rows: Row[] = [
            {
                key: 'recent',
                label: t('dash.recentDocument', 'Recent document'),
                value: data.failed.includes('resumes')
                    ? unavailable
                    : data.recent
                        ? `${data.recent.title} · ${t('mobile.continueEditing', 'Continue where you left off')}`
                        : t('dash.firstDraftWillAppear', 'Your first draft will appear here'),
                Icon: FileText,
                route: data.recent?.id ? careerPath.toCvEdit(data.recent.id) : careerPath.toLibrary('cv'),
            },
            {
                key: 'ats',
                label: t('dash.atsSignal', 'ATS signal'),
                value: data.failed.includes('reports')
                    ? unavailable
                    : data.latestReport
                        ? (score === null || score === undefined
                            ? t('careeros.library.notScored', 'Not scored')
                            : t('careeros.library.score', 'Score {score}/100').replace('{score}', String(score)))
                        : t('dash.checkBeforeYouSend', 'Check before you send'),
                Icon: Target,
                route: careerPath.toLibraryTool('ats'),
            },
            {
                key: 'studio',
                label: t('mobile.smartStudio', 'Smart Studio'),
                value: t('dash.smartStudioBlurb', 'Turn job requirements into a stronger profile, cover letter, and application plan.'),
                Icon: Award,
                route: careerPath.toStudio(),
            },
            {
                key: 'templates',
                label: t('dash.designLibrary', 'Design library'),
                value: `${t('dash.exploreTemplates', 'Explore templates')} · ${AVAILABLE_TEMPLATES.length}`,
                Icon: LayoutTemplate,
                route: careerPath.toLibraryTool('templates'),
            },
            {
                key: 'plan',
                label: t('dash.currentPlan', 'Current plan'),
                value: `${plan.name} · ${plan.id === 'free' ? t('dash.comparePlans', 'Compare plans') : t('dash.manageBilling', 'Manage billing')}`,
                Icon: CreditCard,
                route: plan.id === 'free' ? { view: 'pricing' } : careerPath.toSpace('billing'),
            },
        ];
        body = (
            <ul className="divide-y divide-border-default">
                {rows.map((row) => (
                    <li key={row.key}>
                        <button
                            type="button"
                            onClick={() => navigate(row.route)}
                            className="tap-target flex w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                            <row.Icon size={16} strokeWidth={2} className="shrink-0 text-content-muted" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-content-primary">{row.label}</span>
                                <span className="block truncate text-[13px] text-content-secondary">{row.value}</span>
                            </span>
                            <ChevronRight size={16} className="shrink-0 text-content-muted" aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <section aria-labelledby={headingId} className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <h2 id={headingId} className="text-base font-semibold text-content-primary">{t('careeros.today.workspace.title', 'Documents & tools')}</h2>
            <p className="mt-0.5 text-xs text-content-muted">{t('careeros.today.workspace.hint', 'Your CVs and the tools you already use.')}</p>
            <div className="mt-3">{body}</div>
        </section>
    );
};

export default WorkspaceShortcuts;
