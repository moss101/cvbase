import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, STUDIO_TOOLS, type CareerRoute, type StudioTool } from '../../NavigationProvider';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import { isPrismEnabled } from '../../../services/repos/prismRepo';
import type { ResumeData } from '../../../types';
import { AVAILABLE_TEMPLATES } from '../../../constants';
import { Button, Skeleton, SpaceHeader, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import LibraryList from '../library/LibraryList';
import TemplateGallery from '../library/TemplateGallery';
import DocumentDetail from '../library/DocumentDetail';

/**
 * Library (REQ-22, COS-028): the unified asset list plus the existing tools
 * that keep their entry points inside the shell — template gallery, the
 * standalone PRISM tailor, the ATS checker and Smart Studio's five tools
 * (legacy `smart-studio` MERGE) — and the read-only document view. The heavy
 * tools are lazy chunks so the list never pays for them.
 */
const PrismWizard = lazy(() => import('../../prism/PrismWizard'));
const AtsAnalyzer = lazy(() => import('../../ats/AtsAnalyzer'));
const SmartStudio = lazy(() => import('../../SmartStudio').then((m) => ({ default: m.SmartStudio })));

export interface SpaceProps {
    route: CareerRoute;
}

const ToolLoader: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">{t('label.loading', 'Loading')}</span>
            <Skeleton variant="title" width="40%" />
            <Skeleton variant="block" className="h-40" />
        </div>
    );
};

const TailorTool: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setEnabled(null);
        setError(false);
        isPrismEnabled(userId)
            .then((on) => { if (!cancelled) setEnabled(on); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [userId, attempt]);

    if (error) return <StatePanel kind="error" onRetry={() => setAttempt((n) => n + 1)} />;
    if (enabled === null) return <ToolLoader />;
    if (!enabled) {
        return (
            <StatePanel
                kind="denied"
                title={t('careeros.library.prismOff', 'PRISM tailoring is not enabled for your account')}
                description={t('careeros.library.prismOffDescription', 'Tailoring is rolling out gradually. Your CVs and the ATS checker are unaffected.')}
                action={{ label: t('careeros.library.backToLibrary', 'Back to Library'), onClick: () => navigate(careerPath.toLibrary()) }}
            />
        );
    }
    return (
        <Suspense fallback={<ToolLoader />}>
            <PrismWizard onEditResume={(id) => navigate(careerPath.toCvEdit(id))} onUpgrade={() => navigate({ view: 'pricing' })} />
        </Suspense>
    );
};

/** The primary CV's data (null when there is none), as the legacy dashboard passed it to its tools. */
function usePrimaryResume(): { resume: ResumeData | null | undefined; error: boolean; retry: () => void } {
    const { userId } = useCareerOs();
    const [resume, setResume] = useState<ResumeData | null | undefined>(undefined);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        setResume(undefined);
        setError(false);
        resumeRepo.getPrimary(userId)
            .then((row) => { if (!cancelled) setResume(row?.data ?? null); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [userId, attempt]);

    return { resume, error, retry: () => setAttempt((n) => n + 1) };
}

const AtsTool: React.FC = () => {
    const { navigate } = useNavigation();
    const { resume, error, retry } = usePrimaryResume();

    if (error) return <StatePanel kind="error" onRetry={retry} />;
    if (resume === undefined) return <ToolLoader />;
    return (
        <Suspense fallback={<ToolLoader />}>
            <AtsAnalyzer savedResume={resume} onUpgrade={() => navigate({ view: 'pricing' })} />
        </Suspense>
    );
};

const StudioTool: React.FC<{ route: CareerRoute }> = ({ route }) => {
    const { t } = useTranslation();
    const { navigate, replace } = useNavigation();
    const { resume, error, retry } = usePrimaryResume();
    const requested = route.query?.tool;
    const tool: StudioTool | undefined = (STUDIO_TOOLS as readonly string[]).includes(requested ?? '') ? requested as StudioTool : undefined;

    if (error) return <StatePanel kind="error" onRetry={retry} />;
    if (resume === undefined) return <ToolLoader />;
    return (
        <Suspense fallback={<ToolLoader />}>
            <SmartStudio
                resumeData={resume}
                initialTool={tool}
                onToolChange={(next: StudioTool) => replace(careerPath.toStudio(next))}
                trackerNotice={(
                    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-panel p-4 text-[13px] text-content-secondary sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-2xl">{t('careeros.library.studioTrackerNotice', 'Jobs in this pipeline are the same records as your applications. Open one from Applications to prepare it with readiness, Coach and interview prep.')}</p>
                        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate(careerPath.toSpace('applications'))}>{t('careeros.space.applications', 'Applications')}</Button>
                    </div>
                )}
            />
        </Suspense>
    );
};

const LibrarySpace: React.FC<SpaceProps> = ({ route }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    if (!userId) return null;

    const eyebrow = t('careeros.shell.eyebrow', 'Career OS');
    const back = <Button variant="quiet" size="sm" onClick={() => navigate(careerPath.toLibrary())}>{t('careeros.library.backToLibrary', 'Back to Library')}</Button>;

    switch (route.sub) {
        case 'templates':
            return (
                <div className="mx-auto w-full max-w-6xl">
                    <SpaceHeader eyebrow={eyebrow} title={t('dash.tab.templateGallery', 'Template gallery')} description={t('dash.designLibraryLayouts', 'Design library · {count} layouts').replace('{count}', String(AVAILABLE_TEMPLATES.length))} action={back} />
                    <TemplateGallery />
                </div>
            );
        case 'tailor':
            return (
                <div className="mx-auto w-full max-w-5xl">
                    <SpaceHeader eyebrow={eyebrow} title={t('mobile.prismTailor', 'PRISM Tailor')} description={t('careeros.library.tailorDescription', 'Tailor a CV to a job description in a reviewed, grounded flow. From an application, tailoring binds to that application; here it runs standalone.')} action={back} />
                    <TailorTool />
                </div>
            );
        case 'studio':
            return (
                <div className="mx-auto w-full max-w-6xl">
                    <SpaceHeader eyebrow={eyebrow} title={t('mobile.smartStudio', 'Smart Studio')} description={t('dash.smartStudioBlurb', 'Turn job requirements into a stronger profile, cover letter, and application plan.')} action={back} />
                    <StudioTool route={route} />
                </div>
            );
        case 'ats':
            return (
                <div className="mx-auto w-full max-w-5xl">
                    <SpaceHeader eyebrow={eyebrow} title={t('mobile.atsChecker', 'ATS Checker')} description={t('careeros.library.atsDescription', 'Check a CV against a job description. Reports are saved to your library.')} action={back} />
                    <AtsTool />
                </div>
            );
        case 'documents':
            if (route.id) {
                return (
                    <div className="mx-auto w-full max-w-3xl">
                        <SpaceHeader eyebrow={eyebrow} title={t('careeros.library.document', 'Document')} action={back} compact />
                        <DocumentDetail documentId={route.id} />
                    </div>
                );
            }
            break;
        case 'cvs':
            // The editor owns the viewport (CareerShell renders it); reaching here means no id — show the CV list.
            return (
                <div className="mx-auto w-full max-w-5xl">
                    <SpaceHeader eyebrow={eyebrow} title={t('careeros.space.library', 'Library')} />
                    <LibraryList type="cv" />
                </div>
            );
        default:
            break;
    }

    return (
        <div className="mx-auto w-full max-w-5xl">
            <SpaceHeader
                eyebrow={eyebrow}
                title={t('careeros.space.library', 'Library')}
                description={t('careeros.library.description', 'Every professional asset in one place: CVs and their versions, ATS reports, headshots, cover letters, interview stories and evidence.')}
            />
            <LibraryList type={route.query?.type} />
        </div>
    );
};

export default LibrarySpace;
