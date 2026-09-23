import React, { useId, useMemo } from 'react';
import { Award, BookOpen, ChevronRight, Compass, FileText, LayoutTemplate, MessageCircle, Route as RouteIcon, Sparkles, Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type Route } from '../../NavigationProvider';
import { AVAILABLE_TEMPLATES } from '../../../constants';
import { Button } from '../primitives';
import { OrientationHeader } from '../today/OrientationHeader';
import { guestDraftLabel, readGuestDraft } from './guestDraft';

/**
 * Today for a signed-out visitor: the CV they are building on this device (or
 * a start), the tools that work without an account, and what a free account
 * adds. Nothing is invented — no goals, counts or actions without records.
 */
interface ToolRow {
    key: string;
    label: string;
    detail: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>;
    route: Route;
}

export const GuestToday: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const toolsId = useId();
    const accountId = useId();
    const draft = useMemo(() => readGuestDraft(), []);
    const label = guestDraftLabel(draft);

    const tools: ToolRow[] = [
        { key: 'ats', label: t('mobile.atsChecker', 'ATS Checker'), detail: t('dash.seeHowTrackingReads', 'See how tracking systems read your resume.'), Icon: Target, route: careerPath.toLibraryTool('ats') },
        { key: 'studio', label: t('mobile.smartStudio', 'Smart Studio'), detail: t('dash.smartStudioBlurb', 'Turn job requirements into a stronger profile, cover letter, and application plan.'), Icon: Award, route: careerPath.toStudio() },
        { key: 'templates', label: t('dash.tab.templateGallery', 'Template gallery'), detail: `${t('dash.exploreTemplates', 'Explore templates')} · ${AVAILABLE_TEMPLATES.length}`, Icon: LayoutTemplate, route: careerPath.toLibraryTool('templates') },
        { key: 'resources', label: t('mobile.careerResources', 'Career resources'), detail: t('careeros.guest.resourcesDetail', 'Guides on CVs, applications and interviews.'), Icon: BookOpen, route: { view: 'resources' } },
    ];
    const unlocks: Array<{ key: string; label: string; detail: string; Icon: ToolRow['Icon'] }> = [
        { key: 'career', label: t('careeros.space.career', 'Career'), detail: t('careeros.guest.unlockCareer', 'Your experience and goals as reusable, confirmed facts.'), Icon: Compass },
        { key: 'opportunities', label: t('careeros.space.opportunities', 'Opportunities'), detail: t('careeros.guest.unlockOpportunities', 'Saved roles with an honest fit check.'), Icon: Target },
        { key: 'campaigns', label: t('careeros.space.campaigns', 'Campaigns'), detail: t('careeros.guest.unlockCampaigns', 'Applications, readiness and interviews in one place.'), Icon: RouteIcon },
        { key: 'coach', label: t('careeros.space.coach', 'Coach'), detail: t('careeros.guest.unlockCoach', 'Advice grounded in your own records.'), Icon: MessageCircle },
    ];

    return (
        <div className="mx-auto w-full max-w-5xl">
            <OrientationHeader name={null} data={null} loading={false} />
            <p className="-mt-3 mb-6 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
                {t('careeros.guest.intro', 'Build and check a CV right now — no account needed. Sign in when you want CVBase to keep your goals, applications and interviews together.')}
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="min-w-0 space-y-6">
                    <section className="rounded-2xl border border-border-default bg-surface-panel p-5" aria-label={t('careeros.guest.yourCv', 'Your CV')}>
                        <div className="flex items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-action-primary/10 text-action-primary"><FileText size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{draft ? t('careeros.guest.onThisDevice', 'On this device') : t('careeros.guest.yourCv', 'Your CV')}</p>
                                <h2 className="mt-1 text-lg font-semibold text-content-primary">
                                    {draft
                                        ? (label?.name || t('dash.untitled', 'Untitled'))
                                        : t('careeros.guest.startTitle', 'Start your CV')}
                                </h2>
                                <p className="mt-1 text-sm text-content-secondary">
                                    {draft
                                        ? (label?.title || t('mobile.continueEditing', 'Continue where you left off'))
                                        : t('careeros.guest.startDetail', 'Pick a layout, fill in your details, and export a PDF or DOCX.')}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="primary" onClick={() => navigate(careerPath.toNewCv())}>{draft ? t('mobile.continueEditing', 'Continue where you left off') : t('dash.startBuilding', 'Start building')}</Button>
                            <Button variant="secondary" onClick={() => navigate(careerPath.toLibraryTool('templates'))}>{t('dash.tab.templateGallery', 'Template gallery')}</Button>
                        </div>
                    </section>

                    <section aria-labelledby={toolsId} className="rounded-2xl border border-border-default bg-surface-panel p-5">
                        <h2 id={toolsId} className="text-base font-semibold text-content-primary">{t('careeros.guest.toolsTitle', 'Tools you can use now')}</h2>
                        <ul className="mt-3 divide-y divide-border-default">
                            {tools.map((row) => (
                                <li key={row.key}>
                                    <button type="button" onClick={() => navigate(row.route)} className="tap-target flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                                        <row.Icon size={18} strokeWidth={1.75} className="shrink-0 text-content-muted" aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium text-content-primary">{row.label}</span>
                                            <span className="block text-[13px] text-content-secondary">{row.detail}</span>
                                        </span>
                                        <ChevronRight size={16} className="shrink-0 text-content-muted" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                <section aria-labelledby={accountId} className="min-w-0 self-start rounded-2xl border border-action-primary/30 bg-action-primary/5 p-5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-panel text-action-primary"><Sparkles size={18} strokeWidth={1.75} aria-hidden="true" /></span>
                    <h2 id={accountId} className="mt-3 text-base font-semibold text-content-primary">{t('careeros.guest.accountTitle', 'A free account adds your Career OS')}</h2>
                    <ul className="mt-3 space-y-3">
                        {unlocks.map((u) => (
                            <li key={u.key} className="flex gap-3">
                                <u.Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-action-primary" aria-hidden="true" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-content-primary">{u.label}</span>
                                    <span className="block text-[13px] text-content-secondary">{u.detail}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Button variant="primary" className="mt-5" fullWidth onClick={onOpenAuth}>{t('dash.signInSync', 'Sign In / Sync')}</Button>
                    <p className="mt-2 text-xs text-content-muted">{t('careeros.guest.draftSafe', 'A CV you started on this device stays here until you choose to keep it in your account.')}</p>
                </section>
            </div>
        </div>
    );
};

export default GuestToday;
