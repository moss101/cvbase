import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, Menu, User } from 'lucide-react';
import { useTranslation } from '../../services/translationService';
import { careerPath, useNavigation, type CareerRoute } from '../NavigationProvider';
import { useAuth } from '../AuthProvider';
import { useMobileShell } from '../../lib/useMobileShell';
import { AuthModal } from '../AuthModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import MobileTopBar from '../mobile/MobileTopBar';
import { SpaceHeader, StatePanel } from './primitives';
import { CareerOsProvider, useCareerOs } from './shell/CareerOsProvider';
import DesktopSidebar from './shell/DesktopSidebar';
import { CareerTabBar, MoreSheet } from './shell/MobileNav';
import { ALL_SPACES, MOBILE_TABS, activeSpaceKey } from './shell/spaces';
import { CommandPalette, useCommandPaletteShortcut } from './search/CommandPalette';
import '../dashboard.css';

/**
 * The six-space Career OS shell (COS-008). One information architecture on
 * every platform: the desktop sidebar and the mobile tab bar are driven by
 * the same descriptors, every space is a lazy chunk so navigation never pays
 * for the editor, PDF or AI modules, and the shell itself needs no AI call.
 *
 * Existing screens are composed, not rewritten: the CV editor, PRISM wizard,
 * ATS analyzer, template gallery, settings, billing and admin all keep their
 * components and open inside these spaces (IA ledger MOVE/MERGE rows).
 */

const TodaySpace = lazy(() => import('./spaces/TodaySpace'));
const CareerSpace = lazy(() => import('./spaces/CareerSpace'));
const OpportunitiesSpace = lazy(() => import('./spaces/OpportunitiesSpace'));
const CampaignsSpace = lazy(() => import('./spaces/CampaignsSpace'));
const ApplicationsSpace = lazy(() => import('./spaces/ApplicationsSpace'));
const CoachSpace = lazy(() => import('./spaces/CoachSpace'));
const LibrarySpace = lazy(() => import('./spaces/LibrarySpace'));
const SearchSpace = lazy(() => import('./spaces/SearchSpace'));
const NotificationsSpace = lazy(() => import('./spaces/NotificationsSpace'));
const SettingsSpace = lazy(() => import('./spaces/SettingsSpace'));
const BillingDashboard = lazy(() => import('../billing/BillingDashboard'));
const AdminPanel = lazy(() => import('../admin/AdminPanel'));
// The CV editor owns the whole viewport (its own chrome, sheets and back
// handling); it is rendered without the shell chrome.
const ResumeBuilder = lazy(() => import('../ResumeBuilder'));

const Loader: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div role="status" aria-live="polite" className="grid min-h-[40vh] place-items-center">
            <LoaderCircle size={22} strokeWidth={1.75} className="animate-spin text-content-muted" aria-hidden="true" />
            <span className="sr-only">{t('label.loading', 'Loading')}</span>
        </div>
    );
};

/** Routes that render a full-viewport screen with their own chrome. */
const isFullScreen = (route: CareerRoute): boolean => route.space === 'library' && route.sub === 'cvs';

/** Detail routes on mobile show a back arrow instead of the tab bar. */
const isPushedScreen = (route: CareerRoute): boolean =>
    Boolean(route.id) || (route.space === 'career' && !!route.sub && route.sub !== 'overview')
    || (route.space === 'library' && !!route.sub) || (route.space === 'settings' && !!route.sub)
    || !MOBILE_TABS.some((tab) => tab.key === activeSpaceKey(route));

const NotFound: React.FC = () => {
    const { t } = useTranslation();
    const { reset } = useNavigation();
    return (
        <div className="mx-auto w-full max-w-3xl">
            <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={t('careeros.space.notFound', 'Not found')} />
            <StatePanel
                kind="empty"
                title={t('careeros.notFound.title', 'There is nothing at this address')}
                description={t('careeros.notFound.description', 'The link may be out of date, or it points at something that is not in your account. Nothing else was opened in its place.')}
                action={{ label: t('careeros.notFound.backToToday', 'Go to Today'), onClick: () => reset(careerPath.toSpace('today')) }}
            />
        </div>
    );
};

const SpaceContent: React.FC<{ route: CareerRoute; onViewPricing: () => void }> = ({ route, onViewPricing }) => {
    const { isAdmin } = useCareerOs();
    const { t } = useTranslation();
    switch (route.space) {
        case 'today': return <TodaySpace route={route} />;
        case 'career': return <CareerSpace route={route} />;
        case 'opportunities': return <OpportunitiesSpace route={route} />;
        case 'campaigns': return <CampaignsSpace route={route} />;
        case 'applications': return <ApplicationsSpace route={route} />;
        case 'coach': return <CoachSpace route={route} />;
        case 'library': return <LibrarySpace route={route} />;
        case 'search': return <SearchSpace route={route} />;
        case 'notifications': return <NotificationsSpace route={route} />;
        case 'settings': return <SettingsSpace route={route} />;
        case 'billing':
            return (
                <div className="mx-auto w-full max-w-5xl">
                    <BillingDashboard onChangePlan={onViewPricing} />
                </div>
            );
        case 'admin':
            return isAdmin
                ? <div className="mx-auto w-full max-w-6xl"><AdminPanel /></div>
                : <StatePanel kind="denied" title={t('careeros.shell.adminOnly', 'Operators only')} description={t('careeros.shell.adminOnlyDescription', 'This console is limited to operator accounts.')} />;
        default:
            return <NotFound />;
    }
};

/** Signed-out gate: the shell is account-only, like the native dashboard. */
const SignedOut: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
    const { t } = useTranslation();
    return (
        <div className="mx-auto w-full max-w-3xl">
            <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={t('careeros.shell.signInTitle', 'Sign in to open your Career OS')} />
            <StatePanel
                kind="denied"
                title={t('careeros.shell.signInTitle', 'Sign in to open your Career OS')}
                description={t('careeros.shell.signInDescription', 'Your goals, opportunities, applications and coach live in your account. Anonymous CV drafts stay on this device until you claim them.')}
                action={{ label: t('dash.signInSync', 'Sign In / Sync'), onClick: onOpenAuth }}
            />
        </div>
    );
};

interface CareerShellProps {
    route: CareerRoute;
}

const ShellFrame: React.FC<{ route: CareerRoute; onOpenAuth: () => void }> = ({ route, onOpenAuth }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { back, navigate, reset } = useNavigation();
    const { isAdmin, unreadCount, migration, profileError, refreshProfile } = useCareerOs();
    const isMobileShell = useMobileShell();
    const [moreOpen, setMoreOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);

    // Cmd/Ctrl-K opens the command palette from any space (REQ-23).
    useCommandPaletteShortcut(() => setPaletteOpen(true));

    useEffect(() => { mainRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }, [route.space, route.id, route.sub, route.section]);

    const title = useMemo(() => {
        // The application workspace is a nested context, not a seventh space:
        // its bar says what it is rather than the Campaigns entry that owns it.
        if (route.space === 'applications') return t('careeros.space.applications', route.id ? 'Application' : 'Applications');
        const key = activeSpaceKey(route);
        const item = ALL_SPACES.find((s) => s.key === key);
        return item ? t(item.labelKey, item.label) : t('careeros.shell.eyebrow', 'Career OS');
    }, [route, t]);

    const onBackToLanding = () => reset({ view: 'landing' });
    const onViewPricing = () => navigate({ view: 'pricing' });

    if (isFullScreen(route)) {
        return (
            <Suspense fallback={<Loader />}>
                <ResumeBuilder
                    onBack={() => { if (!back()) reset(careerPath.toLibrary('cv')); }}
                    initialResumeId={route.section === 'new' ? null : (route.id ?? null)}
                />
            </Suspense>
        );
    }

    const body = (
        <ErrorBoundary key={`${route.space}:${route.id ?? ''}:${route.sub ?? ''}`} scope={`careeros:${route.space}`}>
            <Suspense fallback={<Loader />}>
                {!user ? <SignedOut onOpenAuth={onOpenAuth} /> : (
                    <>
                        {migration === 'failed' && (
                            <div className="mx-auto mb-4 w-full max-w-5xl">
                                <StatePanel
                                    kind="partial"
                                    compact
                                    title={t('careeros.shell.migrationFailed', 'Some of your existing records could not be linked yet')}
                                    description={t('careeros.shell.migrationFailedDescription', 'Your CVs and tracker entries are unchanged and still open from the Library. Try again to link them into Career OS.')}
                                    onRetry={() => { void refreshProfile(); }}
                                />
                            </div>
                        )}
                        {profileError !== null && (
                            <div className="mx-auto mb-4 w-full max-w-5xl">
                                <StatePanel kind="error" compact title={t('careeros.shell.profileError', 'Career OS could not load your profile')} onRetry={() => { void refreshProfile(); }} />
                            </div>
                        )}
                        <SpaceContent route={route} onViewPricing={onViewPricing} />
                    </>
                )}
            </Suspense>
        </ErrorBoundary>
    );

    if (isMobileShell) {
        const pushed = isPushedScreen(route);
        return (
            <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-light">
                {pushed && (
                    <MobileTopBar
                        onBack={() => { if (!back()) reset(careerPath.toSpace('today')); }}
                        center={<span className="text-[15.5px] font-bold text-dark">{title}</span>}
                    />
                )}
                <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">{body}</main>
                {!pushed && <CareerTabBar route={route} onOpenMore={() => setMoreOpen(true)} moreActive={moreOpen} />}
                <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} isAdmin={isAdmin} unreadCount={unreadCount} />
                {user && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
            </div>
        );
    }

    return (
        <div className="dashboard-shell relative flex h-[100dvh] w-full overflow-hidden">
            {drawerOpen && <div className="fixed inset-0 z-20 bg-ink/65 backdrop-blur-sm lg:hidden" onClick={() => setDrawerOpen(false)} />}
            <DesktopSidebar route={route} isAdmin={isAdmin} onBackToLanding={onBackToLanding} onOpenAuth={onOpenAuth} onViewPricing={onViewPricing} unreadCount={unreadCount} />
            <main ref={mainRef} className="dashboard-main relative min-w-0 flex-1 overflow-y-auto">
                <div className="dashboard-toolbar sticky top-0 z-20 flex h-16 select-none items-center justify-between px-5 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <button type="button" onClick={() => setDrawerOpen(true)} className="tap-target flex items-center justify-center rounded-lg p-2 text-ink transition hover:bg-ink/5 active:scale-95 lg:hidden" title={t('dash.openMainMenu', 'Open Main Menu')} aria-label={t('dash.openMainMenu', 'Open Main Menu')}>
                            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <span className="hidden font-label text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:block">{t('careeros.shell.eyebrow', 'Career OS')}</span>
                        <span className="hidden text-stone-300 sm:block" aria-hidden="true">/</span>
                        <span className="truncate text-sm font-semibold text-ink">{title}</span>
                    </div>
                    <button type="button" onClick={() => (user ? navigate(careerPath.toCareer('profile')) : onOpenAuth())} className="tap-target grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-paper-bright text-ink transition hover:border-ember/40 hover:text-ember-deep" title={t('dash.openProfile', 'Open profile')} aria-label={t('dash.openProfile', 'Open profile')}>
                        <User size={17} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                </div>
                <div className="dashboard-content relative z-10 p-6 md:p-10 xl:p-12">{body}</div>
            </main>
            {user && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
        </div>
    );
};

const CareerShell: React.FC<CareerShellProps> = ({ route }) => {
    const [authOpen, setAuthOpen] = useState(false);
    const openAuth = () => setAuthOpen(true);
    return (
        <CareerOsProvider route={route} onOpenAuth={openAuth}>
            <ShellFrame route={route} onOpenAuth={openAuth} />
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        </CareerOsProvider>
    );
};

export default CareerShell;
