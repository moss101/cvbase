
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeBuilder from './components/ResumeBuilder';
import Dashboard from './components/Dashboard';
import HeadlessPreview from './components/HeadlessPreview';
import ResourcesPage from './components/ResourcesPage';
import PricingPage from './components/billing/PricingPage';
import { exampleData } from './exampleData';
import type { TemplateId } from './types';
import { TranslationProvider } from './services/translationService';
import { AuthProvider } from './components/AuthProvider';
import { SubscriptionProvider, useSubscription } from './components/SubscriptionProvider';
import type { DashboardTab } from './components/Dashboard';

type ViewState = 'landing' | 'dashboard' | 'builder' | 'resources' | 'pricing';

function AppContent() {
    const [currentView, setCurrentView] = useState<ViewState>('landing');
    const [prevView, setPrevView] = useState<ViewState>('landing');
    const [previewMode, setPreviewMode] = useState<{template: TemplateId} | null>(null);
    const [dashboardTab, setDashboardTab] = useState<DashboardTab>('dashboard');
    const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
    const { startCheckout } = useSubscription();

    useEffect(() => {
        // specific route for puppeteer automation
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const template = params.get('template');

        if (mode === 'preview' && template) {
            setPreviewMode({ template: template as TemplateId });
        }
    }, []);

    const navigate = (view: ViewState) => {
        setPrevView(currentView);
        setCurrentView(view);
        window.scrollTo(0, 0);
    };

    const handleCreateNew = (templateId?: TemplateId) => {
        if (templateId) {
            try {
                localStorage.setItem('cvbase-selected-template', templateId);
            } catch (e) { /* storage unavailable — builder falls back to default */ }
        }
        setActiveResumeId(null); // fresh primary / local flow
        navigate('builder');
    };
    const handleEditExisting = () => { setActiveResumeId(null); navigate('builder'); };
    const handleEditResume = (resumeId: string) => { setActiveResumeId(resumeId); navigate('builder'); };
    const handleBackToDashboard = () => setCurrentView('dashboard');
    const navigateToResources = () => navigate('resources');
    const navigateToPricing = () => navigate('pricing');

    const openDashboard = (tab: DashboardTab = 'dashboard') => {
        setDashboardTab(tab);
        navigate('dashboard');
    };

    // Render headless preview for screenshot generation
    if (previewMode) {
        return <HeadlessPreview templateId={previewMode.template} data={exampleData} />;
    }

    return (
        <div className="min-h-screen bg-light font-sans text-dark animate-fade-in">
            {currentView === 'landing' ? (
                <LandingPage
                    onStartBuilding={() => navigate('builder')}
                    onUseTemplate={handleCreateNew}
                    onViewGallery={() => openDashboard('templates')}
                    onEnterDashboard={() => openDashboard('dashboard')}
                    onViewResources={navigateToResources}
                    onViewPricing={navigateToPricing}
                />
            ) : currentView === 'dashboard' ? (
                <Dashboard
                    onCreateNew={handleCreateNew}
                    onEditExisting={handleEditExisting}
                    onEditResume={handleEditResume}
                    onBackToLanding={() => navigate('landing')}
                    onViewResources={navigateToResources}
                    onViewPricing={navigateToPricing}
                    initialTab={dashboardTab}
                />
            ) : currentView === 'resources' ? (
                <ResourcesPage
                    onBack={() => setCurrentView(prevView)}
                    onStartBuilding={() => navigate('builder')}
                />
            ) : currentView === 'pricing' ? (
                <PricingPage
                    standalone
                    onBack={() => setCurrentView(prevView)}
                    onCheckout={startCheckout}
                    onManageBilling={() => openDashboard('billing')}
                />
            ) : (
                <ResumeBuilder onBack={handleBackToDashboard} initialResumeId={activeResumeId} />
            )}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <SubscriptionProvider>
                <TranslationProvider>
                    <AppContent />
                </TranslationProvider>
            </SubscriptionProvider>
        </AuthProvider>
    );
}

export default App;
