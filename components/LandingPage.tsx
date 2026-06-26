import React from 'react';
import type { TemplateId } from '../types';
import Header from './landing/Header';
import HeroSection from './landing/HeroSection';
import TrustLogos from './landing/TrustLogos';
import TemplateShowcase from './landing/TemplateShowcase';
import FeaturesSection from './landing/FeaturesSection';
import HowItWorks from './landing/HowItWorks';
import WhyCVBase from './landing/WhyCVBase';
import Testimonials from './landing/Testimonials';
import FAQ from './landing/FAQ';
import FinalCTA from './landing/FinalCTA';
import Footer from './landing/Footer';

interface LandingPageProps {
    onStartBuilding: () => void;
    onUseTemplate?: (templateId: TemplateId) => void;
    onViewGallery: () => void;
    onEnterDashboard: () => void;
    onViewResources: () => void;
    onViewPricing: () => void;
    onViewLegal?: (tab: 'privacy' | 'terms') => void;
}

type NavTarget = 'templates' | 'builder' | 'examples' | 'resources' | 'pricing' | 'privacy' | 'terms';

const LandingPage: React.FC<LandingPageProps> = ({
    onStartBuilding,
    onUseTemplate,
    onViewGallery,
    onEnterDashboard,
    onViewResources,
    onViewPricing,
    onViewLegal,
}) => {
    const handleNavigate = (target: NavTarget) => {
        switch (target) {
            case 'templates':
            case 'examples':
                onViewGallery();
                break;
            case 'builder':
                onStartBuilding();
                break;
            case 'resources':
                onViewResources();
                break;
            case 'pricing':
                onViewPricing();
                break;
            case 'privacy':
                onViewLegal?.('privacy');
                break;
            case 'terms':
                onViewLegal?.('terms');
                break;
        }
    };

    return (
        <div className="min-h-screen bg-paper text-ink font-body antialiased overflow-x-clip selection:bg-ember/20 selection:text-ember-deep">
            {/* Film grain — fixed so it never repaints on scroll */}
            <div
                className="fixed inset-0 z-[55] pointer-events-none opacity-[0.05] mix-blend-multiply"
                aria-hidden="true"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
            />
            <Header
                onLogin={onEnterDashboard}
                onCreateCV={onStartBuilding}
                onNavigate={handleNavigate}
            />
            <main>
                <HeroSection onCreateCV={onStartBuilding} onViewTemplates={onViewGallery} />
                <TrustLogos />
                <TemplateShowcase onViewTemplates={onViewGallery} onUseTemplate={onUseTemplate} />
                <FeaturesSection />
                <HowItWorks />
                <WhyCVBase />
                <Testimonials />
                <FAQ />
                <FinalCTA onStartBuilding={onStartBuilding} />
            </main>
            <Footer onNavigate={handleNavigate} />
        </div>
    );
};

export default LandingPage;
