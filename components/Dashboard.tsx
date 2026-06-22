
import React, { useState, useEffect, useRef } from 'react';
import { DocumentIcon, HomeIcon, TemplateIcon, SparklesIcon } from './common/icons';
import { AVAILABLE_TEMPLATES } from '../constants';
import type { ResumeData, TemplateId, SectionId, ResumeSettings } from '../types';
import { exampleData } from '../exampleData';
import { useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';
import { UserProfileForm } from './UserProfileForm';
import { SmartStudio } from './SmartStudio';
import { useSubscription } from './SubscriptionProvider';
import AtsAnalyzer from './ats/AtsAnalyzer';
import BillingDashboard from './billing/BillingDashboard';

// Import all templates for rendering previews
import GsbExecutiveTemplate from './templates/GsbExecutiveTemplate';
import IvyEliteTemplate from './templates/IvyEliteTemplate';
import VanguardClassicTemplate from './templates/VanguardClassicTemplate';
import EecsMitTemplate from './templates/EecsMitTemplate';
import CalBerkeleyTemplate from './templates/CalBerkeleyTemplate';
import LambdaTechTemplate from './templates/LambdaTechTemplate';
import StanfordDschoolTemplate from './templates/StanfordDschoolTemplate';
import SynergyStartupTemplate from './templates/SynergyStartupTemplate';
import MinimalistEdgeTemplate from './templates/MinimalistEdgeTemplate';
import ResumePreview from './ResumePreview';
import TealTemplate from './templates/TealTemplate';
import ProfessionalTemplate from './templates/ProfessionalTemplate';
import CreativeTemplate from './templates/CreativeTemplate';
import ExecutiveTemplate from './templates/ExecutiveTemplate';
import CorporateTemplate from './templates/CorporateTemplate';
import ModernTemplate from './templates/ModernTemplate';
import ProfessionalV2Template from './templates/ProfessionalV2Template';
import CreativeV2Template from './templates/CreativeV2Template';
import ExecutiveV2Template from './templates/ExecutiveV2Template';
import CorporateV2Template from './templates/CorporateV2Template';
import TechTemplate from './templates/TechTemplate';
import TechV2Template from './templates/TechV2Template';
import TechBlueTemplate from './templates/TechBlueTemplate';
import TecAtsTemplate from './templates/TecAtsTemplate';
import EscobarTemplate from './templates/EscobarTemplate';
import HarvardTemplate from './templates/HarvardTemplate';
import MidnightTemplate from './templates/MidnightTemplate';
import SwissTemplate from './templates/SwissTemplate';
import ErasmusTemplate from './templates/ErasmusTemplate';
import MinimalistTemplate from './templates/MinimalistTemplate';
import ImpactTemplate from './templates/ImpactTemplate';
import GlitchTemplate from './templates/GlitchTemplate';
import VogueTemplate from './templates/VogueTemplate';
import OnyxTemplate from './templates/OnyxTemplate';
import BloomTemplate from './templates/BloomTemplate';
import TimelineTemplate from './templates/TimelineTemplate';
import AmsterdamTemplate from './templates/AmsterdamTemplate';
import KyotoTemplate from './templates/KyotoTemplate';
import NeoMemphisTemplate from './templates/NeoMemphisTemplate';
import NordicTemplate from './templates/NordicTemplate';
import MetropolitanTemplate from './templates/MetropolitanTemplate';
import CyberGridTemplate from './templates/CyberGridTemplate';
import MelbourneTemplate from './templates/MelbourneTemplate';
import OakTemplate from './templates/OakTemplate';
import LeafyTemplate from './templates/LeafyTemplate';
import RedwoodTemplate from './templates/RedwoodTemplate';
import DesignerTemplate from './templates/DesignerTemplate';
import GoldenTemplate from './templates/GoldenTemplate';
import CobaltTemplate from './templates/CobaltTemplate';
import BerlinTemplate from './templates/BerlinTemplate';
import BerlinIITemplate from './templates/BerlinIITemplate';
import UrbanTemplate from './templates/UrbanTemplate';
import ClassicTemplate from './templates/ClassicTemplate';
import CleanTemplate from './templates/CleanTemplate';
import CompactTemplate from './templates/CompactTemplate';
import SimpleTemplate from './templates/SimpleTemplate';
import FunctionalTemplate from './templates/FunctionalTemplate';
import DirectTemplate from './templates/DirectTemplate';
import GlobalTemplate from './templates/GlobalTemplate';
import ModernIITemplate from './templates/ModernIITemplate';
import TokyoTemplate from './templates/TokyoTemplate';
import BarcelonaTemplate from './templates/BarcelonaTemplate';
import SubwayTemplate from './templates/SubwayTemplate';
import MonacoTemplate from './templates/MonacoTemplate';
import AustinTemplate from './templates/AustinTemplate';
import OxfordTemplate from './templates/OxfordTemplate';
import VancouverTemplate from './templates/VancouverTemplate';
import ChicagoTemplate from './templates/ChicagoTemplate';
import ReykjavikTemplate from './templates/ReykjavikTemplate';
import BerlinV3Template from './templates/BerlinV3Template';
import MilanTemplate from './templates/MilanTemplate';
import SiliconTemplate from './templates/SiliconTemplate';
import GenevaTemplate from './templates/GenevaTemplate';
import SaoPauloTemplate from './templates/SaoPauloTemplate';
import CasablancaTemplate from './templates/CasablancaTemplate';

export type DashboardTab = 'dashboard' | 'resumes' | 'templates' | 'profile' | 'smart-studio' | 'ats' | 'billing';

interface DashboardProps {
    onCreateNew: (templateId?: TemplateId) => void;
    onEditExisting: () => void;
    onBackToLanding?: () => void;
    onViewResources?: () => void;
    onViewPricing?: () => void;
    initialTab?: DashboardTab;
}

const templateMap: Record<string, React.FC<any>> = {
    'gsb-executive': GsbExecutiveTemplate,
    'ivy-elite': IvyEliteTemplate,
    'vanguard-classic': VanguardClassicTemplate,
    'eecs-mit': EecsMitTemplate,
    'cal-berkeley': CalBerkeleyTemplate,
    'lambda-tech': LambdaTechTemplate,
    'stanford-dschool': StanfordDschoolTemplate,
    'synergy-startup': SynergyStartupTemplate,
    'minimalist-edge': MinimalistEdgeTemplate,
    default: ResumePreview,
    classic: ClassicTemplate,
    clean: CleanTemplate,
    compact: CompactTemplate,
    simple: SimpleTemplate,
    functional: FunctionalTemplate,
    direct: DirectTemplate,
    global: GlobalTemplate,
    urban: UrbanTemplate,
    berlin: BerlinTemplate,
    'berlin-ii': BerlinIITemplate,
    cobalt: CobaltTemplate,
    designer: DesignerTemplate,
    golden: GoldenTemplate,
    teal: TealTemplate,
    professional: ProfessionalTemplate,
    creative: CreativeTemplate,
    executive: ExecutiveTemplate,
    corporate: CorporateTemplate,
    modern: ModernTemplate,
    'professional-v2': ProfessionalV2Template,
    'creative-v2': CreativeV2Template,
    'executive-v2': ExecutiveV2Template,
    'corporate-v2': CorporateV2Template,
    tech: TechTemplate,
    'tech-v2': TechV2Template,
    'tech-blue': TechBlueTemplate,
    'tec-ats': TecAtsTemplate,
    escobar: EscobarTemplate,
    harvard: HarvardTemplate,
    midnight: MidnightTemplate,
    swiss: SwissTemplate,
    erasmus: ErasmusTemplate,
    minimalist: MinimalistTemplate,
    impact: ImpactTemplate,
    glitch: GlitchTemplate,
    vogue: VogueTemplate,
    onyx: OnyxTemplate,
    bloom: BloomTemplate,
    timeline: TimelineTemplate,
    amsterdam: AmsterdamTemplate,
    kyoto: KyotoTemplate,
    neomemphis: NeoMemphisTemplate,
    nordic: NordicTemplate,
    metropolitan: MetropolitanTemplate,
    cybergrid: CyberGridTemplate,
    melbourne: MelbourneTemplate,
    oak: OakTemplate,
    leafy: LeafyTemplate,
    redwood: RedwoodTemplate,
    'modern-ii': ModernIITemplate,
    tokyo: TokyoTemplate,
    barcelona: BarcelonaTemplate,
    subway: SubwayTemplate,
    monaco: MonacoTemplate,
    austin: AustinTemplate,
    oxford: OxfordTemplate,
    vancouver: VancouverTemplate,
    chicago: ChicagoTemplate,
    reykjavik: ReykjavikTemplate,
    'berlin-v3': BerlinV3Template,
    milan: MilanTemplate,
    silicon: SiliconTemplate,
    geneva: GenevaTemplate,
    'sao-paulo': SaoPauloTemplate,
    casablanca: CasablancaTemplate,
};

// Lazy Loaded Preview Component
const LazyTemplatePreview: React.FC<{ templateId: string }> = ({ templateId }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '200px' });

        if (ref.current) observer.observe(ref.current);
        
        return () => observer.disconnect();
    }, []);

    const Component = templateMap[templateId] || ResumePreview;
    
    const defaultSettings: ResumeSettings = {
        themeColor: '#008080',
        fontSize: 'small',
        fontFamily: 'Arial, sans-serif'
    };
    const allSections: SectionId[] = ['contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

    return (
        <div ref={ref} className="w-full h-full bg-gray-100 relative overflow-hidden flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            {isVisible ? (
                // Scale container to fit the A4 height (1123px) into the card height (~320px)
                // 320 / 1123 approx 0.28
                <div 
                    className="origin-center transform scale-[0.28] shadow-2xl pointer-events-none select-none bg-white transition-transform duration-500 ease-out group-hover:scale-[0.29]"
                    style={{ width: '794px', height: '1123px' }}
                >
                    <Component 
                        formData={exampleData} 
                        isCardPreview={true} 
                        visibleSections={allSections} 
                        settings={defaultSettings} 
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center w-full h-full">
                    <span className="material-symbols-outlined text-gray-300 animate-pulse text-4xl">image</span>
                </div>
            )}
        </div>
    );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 group ${active ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
    >
        <span className={`transition-transform duration-300 ${active ? 'scale-110 text-secondary' : 'group-hover:scale-110'}`}>
            {icon}
        </span>
        <span className="font-medium text-sm">{label}</span>
    </div>
);

const BentoCard: React.FC<{
    className?: string;
    onClick?: () => void;
    children: React.ReactNode;
    title?: string;
    description?: string;
    bgImage?: string;
    icon?: string;
    accentColor?: string;
}> = ({ className, onClick, children, title, description, bgImage, icon, accentColor = 'text-primary' }) => (
    <div 
        onClick={onClick}
        className={`glass-card rounded-3xl p-6 relative overflow-hidden group cursor-pointer ${className}`}
    >
        {bgImage && (
            <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}></div>
        )}
        <div className="relative z-10 flex flex-col h-full">
            {icon && (
                <div className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm mb-4 ${accentColor}`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
            )}
            {title && <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-primary transition-colors">{title}</h3>}
            {description && <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>}
            <div className="mt-auto">
                {children}
            </div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onCreateNew, onEditExisting, onBackToLanding, onViewResources, onViewPricing, initialTab = 'dashboard' }) => {
    const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [savedResume, setSavedResume] = useState<ResumeData | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [greeting, setGreeting] = useState("Welcome back");
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, userProfile, logout } = useAuth();
    const { plan, billing } = useSubscription();
    const [lastAtsScore, setLastAtsScore] = useState<{ atsScore: number; matchScore: number | null; date: string } | null>(null);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('cvbase-last-ats-score');
            if (raw) setLastAtsScore(JSON.parse(raw));
        } catch { /* no previous scan */ }
    }, [activeTab]);

    useEffect(() => {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

        let parsed: ResumeData | null = null;
        const saved = localStorage.getItem('cvbase-resume-data');
        if (saved) {
            try {
                parsed = JSON.parse(saved);
                setSavedResume(parsed);
            } catch (e) {
                /* corrupt draft — ignore */
            }
        }

        if (userProfile && userProfile.firstName) {
            setGreeting(`${timeGreeting}, ${userProfile.firstName}`);
        } else if (user && user.email) {
            setGreeting(`${timeGreeting}, ${user.email.split('@')[0]}`);
        } else if (parsed?.contact?.firstName) {
            setGreeting(`${timeGreeting}, ${parsed.contact.firstName}`);
        } else {
            setGreeting(timeGreeting);
        }
    }, [user, userProfile]);

    const categories = ['All', ...Array.from(new Set(AVAILABLE_TEMPLATES.map(t => t.category)))];
    
    const filteredTemplates = selectedCategory === 'All' 
        ? AVAILABLE_TEMPLATES 
        : AVAILABLE_TEMPLATES.filter(t => t.category === selectedCategory);

    return (
        <div className="flex h-screen font-sans overflow-hidden relative">
            {/* Mobile Sidebar Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-25 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Glass Sidebar */}
            <aside className={`w-[280px] bg-[#1e293b]/95 backdrop-blur-2xl text-white flex flex-col h-full shadow-2xl z-30 shrink-0 border-r border-white/5 fixed lg:static top-0 left-0 transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-8 flex items-center justify-between shrink-0">
                    <div 
                        onClick={() => { onBackToLanding?.(); setIsMobileMenuOpen(false); }} 
                        className="font-bold text-2xl flex items-center gap-3 cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 group"
                        title="Back to Homepage"
                    >
                         <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-all">
                            <span className="material-symbols-outlined text-white text-xl">layers</span>
                         </div>
                        <span className="tracking-tight text-white group-hover:translate-x-0.5 transition-all">CVBase</span>
                    </div>

                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition cursor-pointer flex items-center justify-center"
                        title="Close Menu"
                    >
                        <span className="material-symbols-outlined text-lg leading-none">close</span>
                    </button>
                </div>
                
                <nav className="px-4 space-y-2 flex-1 overflow-y-auto">
                    <SidebarItem 
                        icon={<HomeIcon />} 
                        label="Home" 
                        active={activeTab === 'dashboard'} 
                        onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem 
                        icon={<DocumentIcon />} 
                        label="My Documents" 
                        active={activeTab === 'resumes'} 
                        onClick={() => { setActiveTab('resumes'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem
                        icon={<span className="material-symbols-outlined text-xl text-emerald-400">radar</span>}
                        label="ATS Checker"
                        active={activeTab === 'ats'}
                        onClick={() => { setActiveTab('ats'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem
                        icon={<span className="material-symbols-outlined text-xl">workspace_premium</span>}
                        label="Smart Studio [AI]"
                        active={activeTab === 'smart-studio'}
                        onClick={() => { setActiveTab('smart-studio'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem
                        icon={<span className="material-symbols-outlined text-xl text-amber-300">credit_card</span>}
                        label="Billing & Plans"
                        active={activeTab === 'billing'}
                        onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem
                        icon={<span className="material-symbols-outlined text-xl text-indigo-400">auto_stories</span>} 
                        label="Career Resources" 
                        onClick={() => { onViewResources?.(); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem 
                        icon={<TemplateIcon />} 
                        label="Gallery" 
                        active={activeTab === 'templates'} 
                        onClick={() => { setActiveTab('templates'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem 
                        icon={<span className="material-symbols-outlined text-xl">badge</span>} 
                        label="Create Profile" 
                        active={activeTab === 'profile'} 
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            if (!user) {
                                setIsAuthModalOpen(true);
                            } else {
                                setActiveTab('profile');
                            }
                        }}
                    />
                    <div className="pt-4 border-t border-white/5 my-2 mx-2" />
                    <SidebarItem 
                        icon={<span className="material-symbols-outlined text-xl">arrow_back</span>} 
                        label="Exit to Website" 
                        onClick={() => { onBackToLanding?.(); setIsMobileMenuOpen(false); }}
                    />
                </nav>

                <div className="mx-4 mt-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="material-symbols-outlined text-base text-secondary">workspace_premium</span>
                        <span className="text-xs font-extrabold text-white truncate">{plan.name} plan</span>
                        {billing.subscription.cancelAtPeriodEnd && (
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full shrink-0">Ending</span>
                        )}
                    </div>
                    {plan.id === 'free' ? (
                        <button
                            onClick={() => { onViewPricing?.(); setIsMobileMenuOpen(false); }}
                            className="text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-primary to-secondary text-white px-2.5 py-1 rounded-lg hover:opacity-90 transition shrink-0"
                        >
                            Upgrade
                        </button>
                    ) : (
                        <button
                            onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }}
                            className="text-[10px] font-bold text-slate-300 hover:text-white transition shrink-0"
                        >
                            Manage
                        </button>
                    )}
                </div>

                <div className="p-5 m-4 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5">
                    {user ? (
                        <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
                             <div className="flex items-center gap-3 overflow-hidden">
                                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-[2px] shrink-0">
                                    <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-sm font-bold text-white">
                                        {userProfile?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                 </div>
                                 <div className="overflow-hidden">
                                     <p className="text-xs font-bold text-white truncate">{userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : (user.email ? user.email.split('@')[0] : 'User')}</p>
                                     <p className="text-[10px] text-primary-light truncate">{user.email}</p>
                                 </div>
                             </div>
                             <button 
                                 onClick={logout}
                                 className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-all shrink-0"
                                 title="Sign Out"
                             >
                                 <span className="material-symbols-outlined text-base">logout</span>
                             </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-[10px] text-slate-400 mb-2 font-medium">To keep resume profiles in sync across sessions:</p>
                            <button 
                                onClick={() => setIsAuthModalOpen(true)}
                                className="w-full py-2.5 px-3 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5"
                                id="header-auth-trigger"
                            >
                                <span className="material-symbols-outlined text-xs">login</span>
                                Sign In / Sync
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Mobile Header Toggle Bar */}
                <div className="lg:hidden sticky top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-20 text-white select-none">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition cursor-pointer flex items-center justify-center"
                            title="Open Main Menu"
                        >
                            <span className="material-symbols-outlined text-xl leading-none">menu</span>
                        </button>
                        <span className="font-extrabold text-lg tracking-tight bg-clip-text bg-gradient-to-r from-white to-gray-300 text-transparent">CVBase</span>
                    </div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest bg-slate-800/80 border border-white/10 px-3 py-1.5 rounded-xl text-primary-light">
                        {activeTab === 'dashboard' ? 'Overview' : activeTab === 'smart-studio' ? 'Smart AI Studio' : activeTab === 'ats' ? 'ATS Checker' : activeTab === 'billing' ? 'Billing & Plans' : activeTab}
                    </div>
                </div>

                {/* Gradient Blobs for background ambiance */}
                <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
                <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[80px] pointer-events-none mix-blend-multiply"></div>

                <div className="max-w-7xl mx-auto p-8 md:p-12 relative z-10">
                    
                    {/* DASHBOARD VIEW (Bento Grid) */}
                    {activeTab === 'dashboard' && (
                        <div className="animate-fade-in">
                            <header className="mb-10 flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-2">
                                        {greeting}
                                    </h1>
                                    <p className="text-gray-500 font-medium">Ready to take the next leap in your career?</p>
                                </div>
                                <button className="glass-button px-4 py-2 rounded-full text-sm font-semibold text-primary flex items-center gap-2 hover:bg-white">
                                    <span className="material-symbols-outlined text-sm">settings</span>
                                    Settings
                                </button>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-auto gap-6">
                                
                                {/* 1. Create New - Large Featured Card */}
                                <BentoCard 
                                    className="md:col-span-2 md:row-span-2 min-h-[320px] bg-gradient-to-br from-primary/10 to-white"
                                    onClick={() => onCreateNew()}
                                    title="Build New Resume"
                                    description="Create a professional, ATS-optimized resume in minutes with AI assistance."
                                    icon="add_circle"
                                >
                                    <div className="mt-4 flex gap-2">
                                        <div className="px-3 py-1 rounded-full bg-white/60 text-xs font-bold text-primary border border-primary/20">AI Powered</div>
                                        <div className="px-3 py-1 rounded-full bg-white/60 text-xs font-bold text-secondary border border-secondary/20">ATS Friendly</div>
                                    </div>
                                    <div className="absolute bottom-[-20px] right-[-20px] opacity-10 transform rotate-12">
                                        <span className="material-symbols-outlined text-[180px] text-primary">description</span>
                                    </div>
                                    <button className="mt-8 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2">
                                        Start Building <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                </BentoCard>

                                {/* 2. Recent Work - Tall Card */}
                                <BentoCard 
                                    className="md:col-span-1 md:row-span-2 bg-white/50"
                                    title="Recent Work"
                                    icon="history"
                                    accentColor="text-secondary"
                                >
                                    {savedResume ? (
                                        <div onClick={onEditExisting} className="mt-2 group/item">
                                            <div className="aspect-[3/4] w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative mb-3">
                                                <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-10 backdrop-blur-sm">
                                                    <span className="bg-white text-dark px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">Continue Editing</span>
                                                </div>
                                                {/* Use specific template or default for preview, lazy loaded */}
                                                <LazyTemplatePreview templateId="modern" />
                                            </div>
                                            <h4 className="font-bold text-gray-800 text-sm truncate">{savedResume.contact.firstName} Resume</h4>
                                            <p className="text-xs text-gray-500">Last edited just now</p>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-gray-400">draft</span>
                                            <p className="text-sm">No drafts yet</p>
                                        </div>
                                    )}
                                </BentoCard>

                                {/* 3. ATS Score (from the last real scan) */}
                                <BentoCard
                                    className="md:col-span-1 md:row-span-1 bg-secondary/5"
                                    onClick={() => setActiveTab('ats')}
                                    title="ATS Score"
                                    icon="analytics"
                                    accentColor="text-green-500"
                                >
                                    {lastAtsScore ? (
                                        <>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="text-4xl font-black text-gray-800">{lastAtsScore.atsScore}</div>
                                                <div className="text-xs text-gray-500 leading-tight">
                                                    {lastAtsScore.matchScore !== null ? <>Job match<br/><strong className="text-gray-700">{lastAtsScore.matchScore}%</strong></> : <>Compatibility<br/>score</>}
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4 overflow-hidden">
                                                <div className="bg-gradient-to-r from-primary to-green-400 h-1.5 rounded-full" style={{ width: `${lastAtsScore.atsScore}%` }}></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-gray-500 mt-2">No scan yet — check how your resume performs against real ATS parsing.</p>
                                            <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary">Run first scan <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
                                        </>
                                    )}
                                </BentoCard>

                                {/* 4. Plan / billing shortcut */}
                                <BentoCard
                                    className="md:col-span-1 md:row-span-1 bg-white/60"
                                    onClick={() => (plan.id === 'free' ? onViewPricing?.() : setActiveTab('billing'))}
                                    title={plan.id === 'free' ? 'Go Pro' : `${plan.name} plan`}
                                    icon="workspace_premium"
                                    accentColor="text-amber-500"
                                >
                                    <p className="text-xs text-gray-500 mt-2">
                                        {plan.id === 'free'
                                            ? 'Unlimited ATS scans, live re-scoring & all templates.'
                                            : 'Manage subscription, invoices & payment methods.'}
                                    </p>
                                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-amber-600">
                                        {plan.id === 'free' ? 'View plans' : 'Open billing'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </span>
                                </BentoCard>

                                {/* 5. Templates Gallery Link */}
                                <BentoCard 
                                    className="md:col-span-2 md:row-span-1 bg-gradient-to-r from-slate-800 to-slate-900 text-white group"
                                    onClick={() => setActiveTab('templates')}
                                >
                                    <div className="flex justify-between items-center h-full">
                                        <div>
                                            <h3 className="text-xl font-bold mb-1 group-hover:text-secondary transition-colors">Templates Gallery</h3>
                                            <p className="text-sm text-gray-400">Explore {AVAILABLE_TEMPLATES.length}+ professional designs.</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                            <span className="material-symbols-outlined text-2xl">grid_view</span>
                                        </div>
                                    </div>
                                </BentoCard>

                                {/* 6. ATS Checker */}
                                <BentoCard
                                    className="md:col-span-2 md:row-span-1 bg-gradient-to-r from-secondary/10 to-primary/10"
                                    onClick={() => setActiveTab('ats')}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-secondary">
                                                <SparklesIcon />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">ATS Checker & Job Match</h3>
                                                <p className="text-xs text-gray-500">Scan your resume against any job description — score, missing keywords & fixes.</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-2xl text-secondary-dark hidden sm:block">radar</span>
                                    </div>
                                </BentoCard>

                            </div>
                        </div>
                    )}

                    {/* RESUMES VIEW */}
                    {activeTab === 'resumes' && (
                        <div className="animate-fade-in">
                             <header className="flex justify-between items-center mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-800 mb-2">My Documents</h1>
                                    <p className="text-gray-500">Manage and edit your saved documents.</p>
                                </div>
                                <button 
                                    onClick={() => onCreateNew()}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all hover:-translate-y-0.5"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                    Create New
                                </button>
                            </header>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {/* New Resume Card */}
                                <div 
                                    onClick={() => onCreateNew()}
                                    className="glass-card h-[320px] flex flex-col items-center justify-center cursor-pointer group border-dashed border-2 border-gray-300 hover:border-primary bg-transparent hover:bg-primary/5"
                                >
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl text-primary">add</span>
                                    </div>
                                    <p className="font-bold text-gray-500 group-hover:text-primary">Create New Resume</p>
                                </div>

                                {/* Saved Resume Card */}
                                {savedResume && (
                                    <div 
                                        onClick={onEditExisting}
                                        className="glass-card h-[320px] flex flex-col p-0 overflow-hidden group"
                                    >
                                        <div className="h-[200px] bg-gray-50 relative overflow-hidden border-b border-gray-100 group-hover:bg-gray-100 transition-colors">
                                            {/* Preview abstraction */}
                                            <LazyTemplatePreview templateId="modern" />
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col relative">
                                            <h3 className="font-bold text-lg text-gray-800 mb-1 truncate">
                                                {savedResume.contact.firstName || 'Untitled'} Resume
                                            </h3>
                                            <p className="text-xs text-gray-500 mb-4">
                                                {savedResume.contact.jobTitle || 'No Job Title'}
                                            </p>
                                            <div className="mt-auto flex justify-between items-center">
                                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wide">Draft</span>
                                                <div className="text-xs text-gray-400">Edited just now</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TEMPLATES VIEW */}
                    {activeTab === 'templates' && (
                        <div className="animate-fade-in">
                            <header className="mb-8">
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">Templates Gallery</h1>
                                <p className="text-gray-500">Professionally designed templates for every career path.</p>
                            </header>

                            {/* Glass Filters */}
                            <div className="flex flex-wrap gap-3 pb-6 mb-4">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all backdrop-blur-md ${
                                            selectedCategory === cat 
                                            ? 'bg-dark text-white shadow-lg' 
                                            : 'bg-white/50 text-gray-600 border border-white/40 hover:bg-white'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredTemplates.map(template => (
                                    <div 
                                        key={template.id}
                                        className="glass-card p-0 overflow-hidden group cursor-pointer h-[400px]"
                                        onClick={() => onCreateNew(template.id as TemplateId)}
                                    >
                                        <div className="h-[320px] bg-gray-100 relative overflow-hidden flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                            {/* Lazy loaded preview scaled to fit */}
                                            <LazyTemplatePreview templateId={template.id} />
                                            
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/10 transition-colors flex items-center justify-center backdrop-blur-[2px] opacity-0 group-hover:opacity-100 duration-300 z-10">
                                                <button className="px-8 py-3 bg-white text-dark font-bold rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                    Use Template
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-5 border-t border-gray-100 bg-white/80 backdrop-blur-md relative z-20 h-[80px] flex items-center justify-between">
                                            <h3 className="font-bold text-lg text-gray-800">{template.name}</h3>
                                            <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded-md text-gray-500 uppercase tracking-wider">
                                                {template.category}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PROFILE VIEW */}
                    {activeTab === 'profile' && (
                        <div className="animate-fade-in">
                            <UserProfileForm />
                        </div>
                    )}

                    {/* SMART STUDIO VIEW */}
                    {activeTab === 'smart-studio' && (
                        <div className="animate-fade-in">
                            <SmartStudio resumeData={savedResume} />
                        </div>
                    )}

                    {/* ATS CHECKER VIEW */}
                    {activeTab === 'ats' && (
                        <div className="animate-fade-in">
                            <AtsAnalyzer savedResume={savedResume} onUpgrade={() => onViewPricing?.()} />
                        </div>
                    )}

                    {/* BILLING VIEW */}
                    {activeTab === 'billing' && (
                        <div className="animate-fade-in">
                            <BillingDashboard onChangePlan={() => onViewPricing?.()} />
                        </div>
                    )}
                </div>
            </main>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
};

export default Dashboard;
