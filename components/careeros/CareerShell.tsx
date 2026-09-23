import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, LoaderCircle, Search } from 'lucide-react';
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
import { TopBar, spaceTitle } from './shell/TopBar';
import '../dashboard.css';
import './careeros.css';

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
const SettingsPanel = lazy(() => import('../SettingsPanel'));
const GuestToday = lazy(() => import('./guest/GuestToday'));
const GuestSignIn = lazy(() => import('./guest/GuestSignIn'));
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
/** The CV editor itself (a specific CV, or a new one) — not the CV Builder workspace home. */
const isCvEditor = (route: CareerRoute): boolean =>
    route.space === 'library' && route.sub === 'cvs' && (Boolean(route.id) || route.section === 'new');

/** Detail routes on mobile show a back arrow instead of the tab bar. */
const isPushedScreen = (route: CareerRoute): boolean =>
    Boolean(route.id) || (route.space === 'career' && !!route.sub && route.sub !== 'overview')
    || (route.space === 'library' && !!route.sub) || (route.space === 'settings' && !!route.sub)
    || !MOBILE_TABS.some((tab) => tab.key === activeSpaceKey(route));

const NotFound: React.FC = () => {
    const { t } = useTranslation();
    const { reset } = useNavigation();
    return (
        <div className="mx-auto w-full max-w-[1240px] [&>*]:max-w-3xl">
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
                <div className="mx-auto w-full max-w-[1240px]">
                    <BillingDashboard onChangePlan={onViewPricing} />
                </div>
            );
        case 'admin':
            return isAdmin
                ? <div className="mx-auto w-full max-w-[1240px]"><AdminPanel /></div>
                : <StatePanel kind="denied" title={t('careeros.shell.adminOnly', 'Operators only')} description={t('careeros.shell.adminOnlyDescription', 'This console is limited to operator accounts.')} />;
        default:
            return <NotFound />;
    }
};

/**
 * Signed-out visitors (guest mode): the same shell, with the pieces that work
 * without an account — Today's guest view, the CV builder on this device,
 * templates, the ATS checker, Smart Studio, resources and display settings.
 * Account-only spaces say what they are for and offer sign-in.
 */
const GuestContent: React.FC<{ route: CareerRoute; onOpenAuth: () => void }> = ({ route, onOpenAuth }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    switch (route.space) {
        case 'today': return <GuestToday onOpenAuth={onOpenAuth} />;
        case 'library': return <LibrarySpace route={route} />;
        case 'settings':
            return (
                <div className="mx-auto w-full max-w-[1240px] [&>*]:max-w-4xl">
                    <SpaceHeader title={t('mobile.settings', 'Settings')} />
                    <SettingsPanel embedded onViewLegal={(tab) => navigate({ view: 'legal', legalTab: tab })} onManageBilling={onOpenAuth} />
                </div>
            );
        case 'not-found': return <NotFound />;
        default: {
            const key = activeSpaceKey(route);
            const entry = ALL_SPACES.find((s) => s.key === key) ?? ALL_SPACES.find((s) => s.space === route.space);
            const label = entry ? t(entry.labelKey, entry.label) : t('careeros.shell.eyebrow', 'Career OS');
            return <GuestSignIn space={route.space} spaceLabel={label} onOpenAuth={onOpenAuth} />;
        }
    }
};

interface CareerShellProps {
    route: CareerRoute;
}

const RAIL_KEY = 'cvbase:sidebar-rail';
const readRail = (): boolean => { try { return window.localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };

/** True below `px` — tablets get the icon rail so the content keeps its width. */
function useNarrow(px: number): boolean {
    const query = `(max-width: ${px - 1}px)`;
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia(query);
        const on = () => setNarrow(mq.matches);
        on();
        mq.addEventListener?.('change', on);
        return () => mq.removeEventListener?.('change', on);
    }, [query]);
    return narrow;
}

const ShellFrame: React.FC<{ route: CareerRoute; onOpenAuth: () => void }> = ({ route, onOpenAuth }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { back, navigate, reset } = useNavigation();
    const { isAdmin, unreadCount, migration, profileError, refreshProfile, context } = useCareerOs();
    const isMobileShell = useMobileShell();
    const narrow = useNarrow(1100);
    const [moreOpen, setMoreOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [railPref, setRailPref] = useState<boolean>(readRail);
    const mainRef = useRef<HTMLElement>(null);
    const editor = isCvEditor(route);

    // Cmd/Ctrl-K opens Ask CVbase from any space (REQ-23).
    useCommandPaletteShortcut(() => setPaletteOpen(true));

    useEffect(() => { mainRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }, [route.space, route.id, route.sub, route.section]);

    const title = useMemo(() => spaceTitle(route, t), [route, t]);
    const onBackToLanding = () => reset({ view: 'landing' });
    const onViewPricing = () => navigate({ view: 'pricing' });
    const leaveEditor = () => { if (!back()) reset(careerPath.toCvWorkspace()); };
    const toggleRail = () => setRailPref((v) => {
        const next = !v;
        try { window.localStorage.setItem(RAIL_KEY, next ? '1' : '0'); } catch { /* preference only */ }
        return next;
    });

    // Phones keep the editor as a pushed, full-screen workspace with its own back bar.
    if (editor && isMobileShell) {
        return (
            <Suspense fallback={<Loader />}>
                <ResumeBuilder onBack={leaveEditor} initialResumeId={route.section === 'new' ? null : (route.id ?? null)} />
            </Suspense>
        );
    }

    const body = (
        <ErrorBoundary key={`${route.space}:${route.id ?? ''}:${route.sub ?? ''}`} scope={`careeros:${route.space}`}>
            <Suspense fallback={<Loader />}>
                {!user ? <GuestContent route={route} onOpenAuth={onOpenAuth} /> : (
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

    const palette = user ? <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /> : null;

    if (isMobileShell) {
        const pushed = isPushedScreen(route);
        const ask = (
            <button type="button" onClick={() => (user ? setPaletteOpen(true) : onOpenAuth())} className="tap-target grid h-10 w-10 place-items-center rounded-xl text-content-secondary" aria-label={t('careeros.ask.label', 'Ask CVbase or search')}>
                <Search size={19} strokeWidth={1.9} aria-hidden="true" />
            </button>
        );
        return (
            <div className="dashboard-shell cos-main flex h-[100dvh] w-full flex-col overflow-hidden">
                {pushed ? (
                    <MobileTopBar
                        onBack={() => { if (!back()) reset(careerPath.toSpace('today')); }}
                        center={<span className="text-[15.5px] font-semibold text-content-primary">{title}</span>}
                        trailing={ask}
                    />
                ) : (
                    <div className="flex shrink-0 items-center justify-between border-b border-border-default bg-surface-panel px-4 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top,0px))]">
                        <span className="cos-wordmark-name !text-content-primary" aria-hidden="true">CVbase.</span>
                        <div className="flex items-center gap-1">
                            {ask}
                            {user && (
                                <button type="button" onClick={() => navigate(careerPath.toSpace('notifications'))} className="tap-target relative grid h-10 w-10 place-items-center rounded-xl text-content-secondary" aria-label={unreadCount > 0 ? t('careeros.nav.inboxUnread', 'Inbox, {n} unread').replace('{n}', String(unreadCount)) : t('careeros.space.notifications', 'Inbox')}>
                                    <Bell size={19} strokeWidth={1.9} aria-hidden="true" />
                                    {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-action-primary" aria-hidden="true" />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <main ref={mainRef} className="cos-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">{body}</main>
                {!pushed && <CareerTabBar route={route} onOpenMore={() => setMoreOpen(true)} moreActive={moreOpen} />}
                <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} isAdmin={isAdmin} unreadCount={unreadCount} />
                {palette}
            </div>
        );
    }

    const collapsed = editor || narrow || railPref;
    return (
        <div className="dashboard-shell relative flex h-[100dvh] w-full overflow-hidden">
            <DesktopSidebar
                route={route}
                isAdmin={isAdmin}
                onBackToLanding={onBackToLanding}
                onOpenAuth={onOpenAuth}
                onViewPricing={onViewPricing}
                onOpenPalette={() => (user ? setPaletteOpen(true) : onOpenAuth())}
                unreadCount={unreadCount}
                collapsed={collapsed}
                canToggle={!editor && !narrow}
                onToggle={toggleRail}
            />
            <div className="cos-main relative">
                <TopBar route={route} projection={context?.projection ?? null} unreadCount={unreadCount} signedIn={Boolean(user)} onOpenPalette={() => (user ? setPaletteOpen(true) : onOpenAuth())} />
                {editor ? (
                    // The CV Builder is a workspace inside the shell: the existing editor, every
                    // section, preview, export and AI tool, sized to the space the shell leaves.
                    <div className="relative min-h-0 flex-1">
                        <ErrorBoundary key={`builder:${route.id ?? route.section ?? ''}`} scope="careeros:cv-builder">
                            <Suspense fallback={<Loader />}>
                                <ResumeBuilder embedded onBack={() => navigate(careerPath.toCvWorkspace())} initialResumeId={route.section === 'new' ? null : (route.id ?? null)} />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                ) : (
                    <main ref={mainRef} className="cos-scroll relative min-h-0 flex-1 overflow-y-auto">
                        <div className="px-6 pb-16 pt-8 md:px-10 xl:px-12">{body}</div>
                    </main>
                )}
            </div>
            {palette}
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
