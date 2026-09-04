
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LoaderCircle } from 'lucide-react';
import LandingPage from './components/LandingPage';
import type { LegalTab } from './components/LegalPage';
import { exampleData } from './exampleData';
import type { TemplateId } from './types';
import { TranslationProvider } from './services/translationService';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { SubscriptionProvider, useSubscription } from './components/SubscriptionProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { NavigationProvider, useNavigation, type Route } from './components/NavigationProvider';
import { ToastProvider } from './components/common/Toast';
import { ErrorBoundary, ScreenErrorFallback } from './components/common/ErrorBoundary';
import { setUser as setMonitoringUser } from './lib/monitoring';
import { initNativeShell } from './lib/nativeShell';
import type { DashboardTab } from './components/Dashboard';

// Only the landing page ships in the entry chunk. Every other screen — and the
// editor, PDF and DOCX libraries behind them — loads when first navigated to.
const ResumeBuilder = lazy(() => import('./components/ResumeBuilder'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ResourcesPage = lazy(() => import('./components/ResourcesPage'));
const PricingPage = lazy(() => import('./components/billing/PricingPage'));
const LegalPage = lazy(() => import('./components/LegalPage'));
const AuthGate = lazy(() => import('./components/AuthGate'));
// The headless preview (?mode=preview) pulls in every template; the landing
// page must not pay for that.
const HeadlessPreview = lazy(() => import('./components/HeadlessPreview'));

/** Suspense fallback for a whole screen: a quiet spinner, nothing else moves. */
const RouteLoader: React.FC = () => (
    <div role="status" aria-live="polite" className="grid min-h-[60vh] place-items-center">
        <LoaderCircle size={22} strokeWidth={1.75} className="animate-spin text-ink-faint" aria-hidden="true" />
        <span className="sr-only">Loading</span>
    </div>
);

function AppContent() {
    const { route, direction, navigate, replace, reset, back } = useNavigation();
    const [previewMode, setPreviewMode] = useState<{template: TemplateId} | null>(null);
    const { startCheckout } = useSubscription();
    const { user } = useAuth();
    const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

    // Error reports carry the account id (never email) so one person's crash
    // can be followed across screens, and are anonymous again after sign-out.
    const userId = user?.id ?? null;
    useEffect(() => {
        setMonitoringUser(userId);
    }, [userId]);

    /**
     * In the packaged apps every call to action routes through sign-in first;
     * the dashboard and builder are account-only there. The web app is
     * unchanged — visitors can use it without an account.
     */
    const requireAuth = (destination: Route) => () => {
        if (isNative && !user) {
            navigate({ view: 'auth', next: destination });
            return;
        }
        navigate(destination);
    };

    // Once a session exists, continue to whatever the person was reaching for.
    useEffect(() => {
        if (route.view !== 'auth' || !user) return;
        replace(route.next ?? { view: 'dashboard', dashboardTab: 'dashboard' });
    }, [user, route, replace]);

    useEffect(() => {
        // specific route for puppeteer automation
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const template = params.get('template');

        if (mode === 'preview' && template) {
            setPreviewMode({ template: template as TemplateId });
        }
    }, []);

    // Splash / keyboard / status-bar setup for the packaged apps. No-op on web.
    useEffect(() => {
        void initNativeShell();
    }, []);

    const handleCreateNew = (templateId?: TemplateId) => {
        if (templateId) {
            try {
                localStorage.setItem('cvbase-selected-template', templateId);
            } catch (e) { /* storage unavailable — builder falls back to default */ }
        }
        requireAuth({ view: 'builder', resumeId: null })(); // fresh primary / local flow
    };
    const handleEditExisting = () => requireAuth({ view: 'builder', resumeId: null })();
    const handleEditResume = (resumeId: string) => requireAuth({ view: 'builder', resumeId })();
    const navigateToResources = () => navigate({ view: 'resources' });
    const navigateToPricing = () => navigate({ view: 'pricing' });
    const navigateToLegal = (tab: LegalTab) => navigate({ view: 'legal', legalTab: tab });

    const openDashboard = (tab: DashboardTab = 'dashboard') => {
        requireAuth({ view: 'dashboard', dashboardTab: tab })();
    };

    /**
     * In-app back affordances unwind the same stack as the hardware back button,
     * so the two can never disagree. The fallback covers a deep link that opened
     * straight onto this screen with nothing behind it.
     */
    const goBackTo = (fallback: () => void) => () => {
        if (!back()) fallback();
    };

    // Render headless preview for screenshot generation
    if (previewMode) {
        return (
            <Suspense fallback={null}>
                <HeadlessPreview templateId={previewMode.template} data={exampleData} />
            </Suspense>
        );
    }

    const content = (() => {
        switch (route.view) {
            case 'landing':
                return (
                    <LandingPage
                        onStartBuilding={requireAuth({ view: 'builder', resumeId: null })}
                        onUseTemplate={handleCreateNew}
                        onViewGallery={() => openDashboard('templates')}
                        onEnterDashboard={() => openDashboard('dashboard')}
                        onViewResources={navigateToResources}
                        onViewPricing={navigateToPricing}
                        onViewLegal={navigateToLegal}
                    />
                );
            case 'auth':
                return <AuthGate onBack={goBackTo(() => reset({ view: 'landing' }))} />;
            case 'dashboard':
                return (
                    <Dashboard
                        onCreateNew={handleCreateNew}
                        onEditExisting={handleEditExisting}
                        onEditResume={handleEditResume}
                        onBackToLanding={goBackTo(() => reset({ view: 'landing' }))}
                        onViewResources={navigateToResources}
                        onViewPricing={navigateToPricing}
                        onViewLegal={navigateToLegal}
                        initialTab={route.dashboardTab ?? 'dashboard'}
                    />
                );
            case 'resources':
                return (
                    <ResourcesPage
                        onBack={goBackTo(() => reset({ view: 'landing' }))}
                        onStartBuilding={requireAuth({ view: 'builder', resumeId: null })}
                    />
                );
            case 'pricing':
                return (
                    <PricingPage
                        standalone
                        onBack={goBackTo(() => reset({ view: 'landing' }))}
                        onCheckout={startCheckout}
                        onManageBilling={() => openDashboard('billing')}
                    />
                );
            case 'legal':
                return (
                    <LegalPage
                        onBack={goBackTo(() => reset({ view: 'landing' }))}
                        initialTab={route.legalTab ?? 'privacy'}
                    />
                );
            case 'builder':
            default:
                return (
                    <ResumeBuilder
                        onBack={goBackTo(() => reset({ view: 'dashboard', dashboardTab: 'dashboard' }))}
                        initialResumeId={route.resumeId ?? null}
                    />
                );
        }
    })();

    // Keying on the route restarts the enter animation on each navigation, and
    // the direction class makes going back read as going back. The dashboard
    // tab is deliberately not part of the key: switching tabs updates the URL
    // in place and must not remount the dashboard.
    const transitionKey = `${route.view}:${route.resumeId ?? ''}:${route.legalTab ?? ''}`;

    // Where a broken screen can escape to. The builder returns to the
    // dashboard; everything else returns home.
    const escapeRoute: Route =
        route.view === 'builder' ? { view: 'dashboard', dashboardTab: 'dashboard' } : { view: 'landing' };

    return (
        <div className="min-h-screen bg-light font-sans text-dark">
            <div
                key={transitionKey}
                className={direction === 'backward' ? 'view-enter-backward' : 'view-enter-forward'}
            >
                <ErrorBoundary
                    scope={`route:${route.view}`}
                    fallback={(props) => (
                        <ScreenErrorFallback
                            {...props}
                            hint="Try again, or head back and open it afresh."
                            secondaryAction={{
                                label: route.view === 'builder' ? 'Back to dashboard' : 'Back to home',
                                onClick: () => reset(escapeRoute),
                            }}
                        />
                    )}
                >
                    <Suspense fallback={<RouteLoader />}>{content}</Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <TranslationProvider>
                    <AuthProvider>
                        <SubscriptionProvider>
                            <NavigationProvider>
                                <AppContent />
                            </NavigationProvider>
                        </SubscriptionProvider>
                    </AuthProvider>
                </TranslationProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
