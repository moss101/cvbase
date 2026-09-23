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
import CvWorkspace from '../library/CvWorkspace';
import TemplateGallery from '../library/TemplateGallery';
import DocumentDetail from '../library/DocumentDetail';
import { readGuestDraft, guestDraftLabel } from '../guest/guestDraft';
import { FileText, LayoutTemplate, Sparkles, Award, Wand2 } from 'lucide-react';

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
        // Signed out: the tools read the CV being built on this device, as the old dashboard did.
        if (!userId) { setResume(readGuestDraft()); setError(false); return; }
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
    const { userId } = useCareerOs();
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
                trackerNotice={userId && (
                    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-panel p-4 text-[13px] text-content-secondary sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-2xl">{t('careeros.library.studioTrackerNotice', 'Jobs in this pipeline are the same records as your applications. Open one from Applications to prepare it with readiness, Coach and interview prep.')}</p>
                        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate(careerPath.toSpace('applications'))}>{t('careeros.space.applications', 'Applications')}</Button>
                    </div>
                )}
            />
        </Suspense>
    );
};

/** Library for a signed-out visitor: the CV on this device and the tools that need no account. */
const GuestLibrary: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { openAuth } = useCareerOs();
    const draft = readGuestDraft();
    const label = guestDraftLabel(draft);
    const tools: Array<{ key: string; label: string; Icon: typeof FileText; onClick: () => void }> = [
        { key: 'templates', label: t('dash.tab.templateGallery', 'Template gallery'), Icon: LayoutTemplate, onClick: () => navigate(careerPath.toLibraryTool('templates')) },
        { key: 'ats', label: t('mobile.atsChecker', 'ATS Checker'), Icon: Sparkles, onClick: () => navigate(careerPath.toLibraryTool('ats')) },
        { key: 'studio', label: t('mobile.smartStudio', 'Smart Studio'), Icon: Award, onClick: () => navigate(careerPath.toStudio()) },
        { key: 'tailor', label: t('mobile.prismTailor', 'PRISM Tailor'), Icon: Wand2, onClick: () => navigate(careerPath.toLibraryTool('tailor')) },
    ];
    return (
        <div className="mx-auto w-full max-w-5xl">
            <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={t('careeros.space.library', 'Library')} description={t('careeros.guest.libraryDescription', 'Without an account, your CV lives on this device. Sign in to keep several CVs, reports and letters together.')} />
            <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-panel p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-action-primary/10 text-action-primary"><FileText size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{t('careeros.guest.onThisDevice', 'On this device')}</p>
                        <p className="mt-1 truncate font-semibold text-content-primary">{draft ? (label?.name || t('dash.untitled', 'Untitled')) : t('dash.noDraftYet', 'No draft yet')}</p>
                        <p className="text-sm text-content-secondary">{draft ? (label?.title || t('mobile.continueEditing', 'Continue where you left off')) : t('dash.firstDraftWillAppear', 'Your first draft will appear here')}</p>
                    </div>
                </div>
                <Button variant="primary" className="shrink-0" onClick={() => navigate(careerPath.toNewCv())}>{draft ? t('careeros.library.openEditor', 'Open in editor') : t('dash.startBuilding', 'Start building')}</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {tools.map((tool) => (
                    <Button key={tool.key} variant="secondary" size="sm" icon={<tool.Icon size={14} strokeWidth={2} />} onClick={tool.onClick}>{tool.label}</Button>
                ))}
            </div>
            <StatePanel className="mt-6" kind="empty" compact title={t('careeros.guest.libraryAccountTitle', 'Keep more than one CV')} description={t('careeros.guest.libraryAccountDescription', 'An account keeps every CV version, ATS report, headshot and cover letter, synced across devices.')} action={{ label: t('dash.signInSync', 'Sign In / Sync'), onClick: openAuth }} />
        </div>
    );
};

const GuestPrism: React.FC = () => {
    const { t } = useTranslation();
    const { openAuth } = useCareerOs();
    return <StatePanel kind="denied" title={t('careeros.guest.prismTitle', 'PRISM tailoring needs an account')} description={t('careeros.guest.prismDescription', 'PRISM saves each tailored CV as its own version and meters AI use, so it runs on a signed-in account.')} action={{ label: t('dash.signInSync', 'Sign In / Sync'), onClick: openAuth }} />;
};

const LibrarySpace: React.FC<SpaceProps> = ({ route }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    const guestTool = route.sub === 'templates' || route.sub === 'studio' || route.sub === 'ats' || route.sub === 'tailor';
    if (!userId && !guestTool) return <GuestLibrary />;

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
                    {userId ? <TailorTool /> : <GuestPrism />}
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
            // The editor itself is rendered by the shell; without an id this is the CV Builder workspace home.
            return <CvWorkspace />;
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
