
import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LoaderCircle } from 'lucide-react';
import LandingPage from './components/LandingPage';
import ResumeBuilder from './components/ResumeBuilder';
import Dashboard from './components/Dashboard';
import HeadlessPreview from './components/HeadlessPreview';
import ResourcesPage from './components/ResourcesPage';
import PricingPage from './components/billing/PricingPage';
import LegalPage, { type LegalTab } from './components/LegalPage';
import { exampleData } from './exampleData';
import type { TemplateId } from './types';
import { TranslationProvider } from './services/translationService';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { SubscriptionProvider, useSubscription } from './components/SubscriptionProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { NavigationProvider, useNavigation, type Route } from './components/NavigationProvider';
import { initNativeShell } from './lib/nativeShell';
import AuthGate from './components/AuthGate';
import type { DashboardTab } from './components/Dashboard';

function AppContent() {
    const { route, direction, navigate, replace, reset, back } = useNavigation();
    const [previewMode, setPreviewMode] = useState<{template: TemplateId} | null>(null);
    const { startCheckout } = useSubscription();
    const { user } = useAuth();
    const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

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
        return <HeadlessPreview templateId={previewMode.template} data={exampleData} />;
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
    // the direction class makes going back read as going back.
    const transitionKey =
        `${route.view}:${route.dashboardTab ?? ''}:${route.resumeId ?? ''}:${route.legalTab ?? ''}`;

    return (
        <div className="min-h-screen bg-light font-sans text-dark">
            <div
                key={transitionKey}
                className={direction === 'backward' ? 'view-enter-backward' : 'view-enter-forward'}
            >
                {content}
            </div>
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <SubscriptionProvider>
                    <TranslationProvider>
                        <NavigationProvider>
                            <AppContent />
                        </NavigationProvider>
                    </TranslationProvider>
                </SubscriptionProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
