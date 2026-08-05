
import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon } from './common/icons';
import {
    ArrowLeft, BookOpen, CreditCard, FileText, IdCard, LayoutDashboard,
    LayoutTemplate, Menu, Settings as SettingsIcon, ShieldCheck, Sparkles, Target, User, Wand2,
} from 'lucide-react';
import { AVAILABLE_TEMPLATES } from '../constants';
import type { ResumeData, TemplateId } from '../types';
import { useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';
import { UserProfileForm } from './UserProfileForm';
import { SmartStudio } from './SmartStudio';
import { useSubscription } from './SubscriptionProvider';
import AtsAnalyzer from './ats/AtsAnalyzer';
import BillingDashboard from './billing/BillingDashboard';
import ResumeManager from './ResumeManager';
import PrismWizard from './prism/PrismWizard';
import { isPrismEnabled } from '../services/repos/prismRepo';
import './dashboard.css';

import { LazyTemplatePreview } from './templates/TemplatePreviewRegistry';
import SettingsPanel from './SettingsPanel';
import AdminPanel from './admin/AdminPanel';
import { fetchIsAdmin } from '../services/adminApi';
import type { LegalTab } from './LegalPage';
import { useMobileShell } from '../lib/useMobileShell';
import DashboardMobile from './mobile/DashboardMobile';

export type DashboardTab = 'dashboard' | 'resumes' | 'templates' | 'profile' | 'smart-studio' | 'ats' | 'billing' | 'prism' | 'settings' | 'admin';

interface DashboardProps {
    onCreateNew: (templateId?: TemplateId) => void;
    onEditExisting: () => void;
    /** Open a specific resume by id (multi-resume manager). */
    onEditResume?: (resumeId: string) => void;
    onBackToLanding?: () => void;
    onViewResources?: () => void;
    onViewPricing?: () => void;
    onViewLegal?: (tab: LegalTab) => void;
    initialTab?: DashboardTab;
}



const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`dashboard-nav-item group ${active ? 'is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
    >
        <span className="dashboard-nav-icon">
            {icon}
        </span>
        <span className="text-[13px] font-semibold tracking-[-0.01em]">{label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </button>
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
        className={`dashboard-card p-6 text-left group ${className}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(event) => {
            if (onClick && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                onClick();
            }
        }}
    >
        {bgImage && (
            <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}></div>
        )}
        <div className="relative z-10 flex flex-col h-full">
            {icon && (
                <div className={`w-10 h-10 rounded-xl bg-paper-deep flex items-center justify-center mb-4 ${accentColor}`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
            )}
            {title && <h3 className="text-xl font-semibold text-ink mb-1 transition-colors">{title}</h3>}
            {description && <p className="text-sm text-ink-soft/75 leading-relaxed mb-4 max-w-[38ch]">{description}</p>}
            <div className="mt-auto">
                {children}
            </div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onCreateNew, onEditExisting, onEditResume, onBackToLanding, onViewResources, onViewPricing, onViewLegal, initialTab = 'dashboard' }) => {
    const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [savedResume, setSavedResume] = useState<ResumeData | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [greeting, setGreeting] = useState("Welcome back");
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const { user, userProfile, logout, profileComplete, missingProfileFields} = useAuth();
    const { plan, billing } = useSubscription();
    const [lastAtsScore, setLastAtsScore] = useState<{ atsScore: number; matchScore: number | null; date: string } | null>(null);
    // PRISM ships behind a rollout feature flag; the tab only renders when the
    // user is in the rollout (the edge function enforces the same gate).
    const [prismEnabled, setPrismEnabled] = useState(false);
    // Decides whether to render the Admin entry point. The edge function
    // re-checks on every request, so this is presentation only.
    const [isAdmin, setIsAdmin] = useState(false);

    // Keyed on the user id, not the user object — the auth context may hand
    // out a fresh object per render and this must not refetch on every one.
    const prismUserId = user?.id ?? null;
    useEffect(() => {
        let cancelled = false;
        isPrismEnabled(prismUserId)
            .then((on) => { if (!cancelled) setPrismEnabled(on); })
            .catch(() => { /* flag unavailable — stay hidden (fail closed) */ });
        return () => { cancelled = true; };
    }, [prismUserId]);

    useEffect(() => {
        let cancelled = false;
        fetchIsAdmin(prismUserId)
            .then((on) => { if (!cancelled) setIsAdmin(on); })
            .catch(() => { /* not an admin — stay hidden (fail closed) */ });
        return () => { cancelled = true; };
    }, [prismUserId]);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [activeTab]);

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

    /**
     * First-run gate. A signed-in user whose profile is missing required
     * details is held on the profile page — the CV generator produces
     * nonsense without a name or a target role, so this is the one place the
     * app is opinionated about order. Re-asserted on every tab change rather
     * than only on mount, so tapping another nav item cannot slip past it.
     */
    useEffect(() => {
        if (user && !profileComplete && activeTab !== 'profile') {
            setActiveTab('profile');
        }
    }, [user, profileComplete, activeTab]);

    const activeTabLabel: Record<DashboardTab, string> = {
        dashboard: 'Dashboard',
        resumes: 'Resume',
        templates: 'Template gallery',
        profile: 'Profile',
        'smart-studio': 'Smart Studio',
        ats: 'ATS checker',
        billing: 'Billing & plans',
        prism: 'PRISM tailor',
        settings: 'Settings',
        admin: 'Admin',
    };

    const todayLabel = new Intl.DateTimeFormat('en', {
        weekday: 'short', month: 'short', day: 'numeric',
    }).format(new Date());

    const isMobileShell = useMobileShell();

    if (isMobileShell) {
        return (
            <div className="dashboard-shell h-[100dvh] w-full overflow-hidden relative">
                <DashboardMobile
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    savedResume={savedResume}
                    greeting={greeting}
                    lastAtsScore={lastAtsScore}
                    prismEnabled={prismEnabled}
                    isAdmin={isAdmin}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    filteredTemplates={filteredTemplates}
                    onCreateNew={onCreateNew}
                    onEditExisting={onEditExisting}
                    onEditResume={onEditResume}
                    onViewResources={onViewResources}
                    onViewPricing={onViewPricing}
                    onViewLegal={onViewLegal}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                />
                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            </div>
        );
    }

    return (
        <div className="dashboard-shell flex h-[100dvh] w-full overflow-hidden relative">
            {/* Mobile Sidebar Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-ink/65 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside className={`dashboard-sidebar w-[264px] max-w-[86vw] text-white flex flex-col h-full z-30 shrink-0 fixed lg:static top-0 left-0 transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="relative z-10 px-5 pt-6 pb-5 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={() => { onBackToLanding?.(); setIsMobileMenuOpen(false); }} 
                        className="flex items-center gap-3 select-none group rounded-xl focus-visible:outline-none"
                        title="Back to Homepage"
                    >
                        <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/[0.07] font-display text-[15px] font-semibold text-paper-bright transition-transform group-hover:-rotate-3">CV</span>
                        <span className="text-left">
                            <span className="block font-display text-[20px] leading-none tracking-[-0.04em] text-paper-bright">CVbase.</span>
                            <span className="mt-1 block font-label text-[8px] uppercase tracking-[0.16em] text-stone-400">career workspace</span>
                        </span>
                    </button>

                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
                        title="Close Menu"
                    >
                        <span className="material-symbols-outlined text-lg leading-none">close</span>
                    </button>
                </div>
                
                <nav className="relative z-10 px-3.5 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="px-3 pb-2 pt-2 font-label text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-500">Workspace</p>
                    <div className="space-y-1">
                    <SidebarItem 
                        icon={<LayoutDashboard size={19} strokeWidth={1.75} />} 
                        label="Dashboard" 
                        active={activeTab === 'dashboard'} 
                        onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem 
                        icon={<FileText size={19} strokeWidth={1.75} />} 
                        label="Resume" 
                        active={activeTab === 'resumes'} 
                        onClick={() => { setActiveTab('resumes'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem
                        icon={<Target size={19} strokeWidth={1.75} />}
                        label="ATS Checker"
                        active={activeTab === 'ats'}
                        onClick={() => { setActiveTab('ats'); setIsMobileMenuOpen(false); }}
                    />
                    </div>
                    <p className="px-3 pb-2 pt-5 font-label text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-500">Intelligence</p>
                    <div className="space-y-1">
                        <SidebarItem
                            icon={<Sparkles size={19} strokeWidth={1.75} />}
                            label="Smart Studio"
                            active={activeTab === 'smart-studio'}
                            onClick={() => { setActiveTab('smart-studio'); setIsMobileMenuOpen(false); }}
                        />
                    {prismEnabled && (
                        <SidebarItem
                            icon={<Wand2 size={19} strokeWidth={1.75} />}
                            label="PRISM Tailor"
                            active={activeTab === 'prism'}
                            onClick={() => { setActiveTab('prism'); setIsMobileMenuOpen(false); }}
                        />
                    )}
                    </div>
                    <p className="px-3 pb-2 pt-5 font-label text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-500">Library & account</p>
                    <div className="space-y-1">
                    <SidebarItem 
                        icon={<LayoutTemplate size={19} strokeWidth={1.75} />} 
                        label="Template gallery" 
                        active={activeTab === 'templates'} 
                        onClick={() => { setActiveTab('templates'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem
                        icon={<CreditCard size={19} strokeWidth={1.75} />}
                        label="Billing & plans"
                        active={activeTab === 'billing'}
                        onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem 
                        icon={<IdCard size={19} strokeWidth={1.75} />} 
                        label="Profile" 
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
                    <SidebarItem
                        icon={<SettingsIcon size={19} strokeWidth={1.75} />}
                        label="Settings"
                        active={activeTab === 'settings'}
                        onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                    />
                    {isAdmin && (
                        <SidebarItem
                            icon={<ShieldCheck size={19} strokeWidth={1.75} />}
                            label="Admin"
                            active={activeTab === 'admin'}
                            onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                        />
                    )}
                    </div>
                    <div className="my-4 border-t border-white/[0.07]" />
                    <div className="space-y-1 pb-3">
                    <SidebarItem
                        icon={<BookOpen size={19} strokeWidth={1.75} />}
                        label="Career resources"
                        onClick={() => { onViewResources?.(); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarItem 
                        icon={<ArrowLeft size={19} strokeWidth={1.75} />} 
                        label="Back to website" 
                        onClick={() => { onBackToLanding?.(); setIsMobileMenuOpen(false); }}
                    />
                    </div>
                </nav>

                <div className="relative z-10 mx-4 mt-1 px-4 py-3 rounded-xl bg-white/[0.055] border border-white/[0.08] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="material-symbols-outlined text-base text-[#ed8e78]">workspace_premium</span>
                        <span className="text-xs font-semibold text-white truncate">{plan.name} plan</span>
                        {billing.subscription.cancelAtPeriodEnd && (
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full shrink-0">Ending</span>
                        )}
                    </div>
                    {plan.id === 'free' ? (
                        <button
                            onClick={() => { onViewPricing?.(); setIsMobileMenuOpen(false); }}
                            className="text-[9px] font-label font-semibold uppercase tracking-[0.1em] bg-ember text-white px-2.5 py-1.5 rounded-md hover:bg-ember-deep transition shrink-0"
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

                <div className="relative z-10 p-3.5 m-4 mt-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    {user ? (
                        <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
                             <div className="flex items-center gap-3 overflow-hidden">
                                 <div className="w-9 h-9 rounded-lg bg-ember p-[1px] shrink-0">
                                    <div className="w-full h-full rounded-[7px] bg-ink flex items-center justify-center text-sm font-semibold text-white">
                                        {userProfile?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                 </div>
                                 <div className="overflow-hidden">
                                     <p className="text-xs font-semibold text-white truncate">{userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : (user.email ? user.email.split('@')[0] : 'User')}</p>
                                     <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
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
                            <p className="text-[10px] text-stone-400 mb-2 font-medium leading-relaxed">Sign in to sync your workspace across devices.</p>
                            <button 
                                onClick={() => setIsAuthModalOpen(true)}
                                className="w-full py-2.5 px-3 bg-paper-bright text-ink rounded-lg text-xs font-semibold hover:bg-white transition-all flex items-center justify-center gap-1.5"
                                id="header-auth-trigger"
                            >
                                <span className="material-symbols-outlined text-xs">login</span>
                                Sign In / Sync
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            <main ref={mainRef} className="dashboard-main flex-1 min-w-0 overflow-y-auto relative">
                <div className="dashboard-toolbar sticky top-0 z-20 h-16 flex items-center justify-between px-5 lg:px-8 select-none">
                    <div className="flex items-center gap-3 min-w-0">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-ink hover:bg-ink/5 active:scale-95 transition flex items-center justify-center"
                            title="Open Main Menu"
                        >
                            <Menu size={20} strokeWidth={1.75} />
                        </button>
                        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-ink-faint hidden sm:block">Workspace</span>
                        <span className="text-stone-300 hidden sm:block">/</span>
                        <span className="text-sm font-semibold text-ink truncate">{activeTabLabel[activeTab]}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className="hidden md:block font-label text-[9px] uppercase tracking-[0.13em] text-ink-faint">{todayLabel}</span>
                        <button
                            type="button"
                            onClick={() => user ? setActiveTab('profile') : setIsAuthModalOpen(true)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-paper-bright text-ink transition hover:border-ember/40 hover:text-ember-deep"
                            title="Open profile"
                        >
                            <User size={17} strokeWidth={1.75} />
                        </button>
                    </div>
                </div>

                <div className="dashboard-content p-6 md:p-10 xl:p-12 relative z-10">
                    
                    {/* DASHBOARD VIEW (Bento Grid) */}
                    {activeTab === 'dashboard' && (
                        <div className="animate-fade-in">
                            <header className="mb-9 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                                <div className="max-w-3xl">
                                    <p className="dashboard-eyebrow mb-3">Career workspace · {todayLabel}</p>
                                    <h1 className="dashboard-display text-[clamp(3rem,7vw,5.8rem)] text-ink">
                                        {greeting}<span className="text-ember">.</span>
                                    </h1>
                                    <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft/70">Your documents, job-fit signals, and writing tools—organized around the next application.</p>
                                </div>
                                <button onClick={() => onCreateNew()} className="dashboard-primary-button shrink-0">
                                    Create a resume
                                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                                </button>
                            </header>

                            <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-label="Career workspace overview">
                                <BentoCard 
                                    className="dashboard-card-dark min-h-[360px] lg:col-span-7 lg:row-span-2 p-7 md:p-9"
                                    onClick={() => onCreateNew()}
                                >
                                    <div className="relative flex h-full min-h-[300px] flex-col justify-between">
                                        <div className="relative z-10 max-w-md">
                                            <p className="font-label text-[9px] uppercase tracking-[0.16em] text-[#ed8e78]">Recommended next step</p>
                                            <h2 className="mt-5 font-display text-[clamp(2.6rem,5vw,4.6rem)] font-medium leading-[0.92] tracking-[-0.05em] text-paper-bright">Make the document fit the role.</h2>
                                            <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-stone-300">Start with a proven structure, then shape every line for the work you want.</p>
                                        </div>
                                        <div className="relative z-10 mt-8 flex items-center gap-4">
                                            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-paper-bright px-4 text-sm font-bold text-ink transition group-hover:bg-white">
                                                Start building <span className="material-symbols-outlined text-[17px]">north_east</span>
                                            </span>
                                            <span className="font-label text-[9px] uppercase tracking-[0.13em] text-stone-400">No card required</span>
                                        </div>
                                        <div className="pointer-events-none absolute -bottom-7 -right-5 hidden h-[250px] w-[190px] rotate-[7deg] rounded-[8px] border border-white/15 bg-[#f5f1e9] p-5 shadow-2xl 2xl:block">
                                            <div className="font-label text-[8px] uppercase tracking-[0.15em] text-ember-deep">CV / 01</div>
                                            <div className="mt-7 h-2 w-20 rounded bg-ink/80" />
                                            <div className="mt-2 h-1 w-12 rounded bg-ink/25" />
                                            <div className="mt-7 space-y-2">
                                                <div className="h-1 w-full rounded bg-ink/20" />
                                                <div className="h-1 w-[92%] rounded bg-ink/15" />
                                                <div className="h-1 w-[76%] rounded bg-ink/15" />
                                            </div>
                                            <div className="absolute bottom-5 left-5 right-5 border-t border-ink/15 pt-3 font-label text-[7px] uppercase tracking-[0.12em] text-ink-faint">Ready for the shortlist</div>
                                        </div>
                                    </div>
                                </BentoCard>

                                <BentoCard
                                    className="min-h-[170px] lg:col-span-5 p-6"
                                    onClick={() => setActiveTab('ats')}
                                >
                                    <div className="flex h-full items-start justify-between gap-5">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e4ece7] text-[#426a5a]"><Target size={19} strokeWidth={1.75} /></span>
                                                <p className="dashboard-eyebrow !text-[#426a5a]">ATS signal</p>
                                            </div>
                                            <h3 className="mt-5 text-xl font-semibold text-ink">{lastAtsScore ? 'Your latest scan' : 'Check before you send'}</h3>
                                            <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-soft/65">{lastAtsScore ? 'Review job match and the highest-impact fixes.' : 'See how tracking systems read your resume.'}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="dashboard-number font-display text-5xl font-medium tracking-[-0.05em] text-ink">{lastAtsScore?.atsScore ?? '—'}</div>
                                            <span className="mt-1 block font-label text-[8px] uppercase tracking-[0.12em] text-ink-faint">score / 100</span>
                                        </div>
                                    </div>
                                </BentoCard>

                                <BentoCard
                                    className="min-h-[170px] lg:col-span-5 p-6"
                                    onClick={() => setActiveTab('smart-studio')}
                                >
                                    <div className="flex h-full items-start justify-between gap-6">
                                        <div>
                                            <p className="dashboard-eyebrow">Writing tools</p>
                                            <h3 className="mt-5 text-xl font-semibold text-ink">Smart Studio</h3>
                                            <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-ink-soft/65">Turn job requirements into a stronger profile, cover letter, and application plan.</p>
                                        </div>
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ember/10 text-ember-deep transition-transform group-hover:rotate-3"><SparklesIcon /></span>
                                    </div>
                                </BentoCard>

                                <BentoCard
                                    className="min-h-[280px] lg:col-span-4 p-0"
                                    onClick={() => savedResume ? onEditExisting() : onCreateNew()}
                                >
                                    <div className="h-40 overflow-hidden border-b border-ink/10 bg-[#e9e3d9]">
                                        {savedResume ? <LazyTemplatePreview templateId="modern" /> : (
                                            <div className="flex h-full items-center justify-center">
                                                <span className="material-symbols-outlined text-5xl text-ink/20">draft</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <p className="dashboard-eyebrow">Recent document</p>
                                        <h3 className="mt-3 truncate text-lg font-semibold text-ink">{savedResume ? `${savedResume.contact.firstName || 'Untitled'} resume` : 'No draft yet'}</h3>
                                        <p className="mt-1 text-xs text-ink-faint">{savedResume ? 'Continue where you left off' : 'Your first draft will appear here'}</p>
                                    </div>
                                </BentoCard>

                                <BentoCard 
                                    className="dashboard-card-ember min-h-[280px] lg:col-span-4 p-6"
                                    onClick={() => setActiveTab('templates')}
                                >
                                    <div className="flex h-full flex-col justify-between">
                                        <div className="flex items-start justify-between">
                                            <p className="font-label text-[9px] uppercase tracking-[0.14em] text-white/70">Design library</p>
                                            <span className="font-display text-5xl font-medium tracking-[-0.06em] text-white/30">{AVAILABLE_TEMPLATES.length}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-display text-4xl font-medium leading-none tracking-[-0.05em]">Find your type.</h3>
                                            <p className="mt-3 max-w-[31ch] text-sm leading-relaxed text-white/75">Browse recruiter-ready layouts from quiet classic to sharp contemporary.</p>
                                            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Explore templates <span className="material-symbols-outlined text-[17px]">arrow_forward</span></span>
                                        </div>
                                    </div>
                                </BentoCard>

                                <BentoCard
                                    className="min-h-[280px] lg:col-span-4 p-6"
                                    onClick={() => (plan.id === 'free' ? onViewPricing?.() : setActiveTab('billing'))}
                                >
                                    <div className="flex h-full flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <p className="dashboard-eyebrow">Current plan</p>
                                                <span className="rounded-md border border-ink/10 bg-paper-deep px-2 py-1 font-label text-[8px] uppercase tracking-[0.12em] text-ink-soft">{plan.name}</span>
                                            </div>
                                            <h3 className="mt-7 font-display text-4xl font-medium leading-none tracking-[-0.05em] text-ink">Keep momentum.</h3>
                                            <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-ink-soft/65">{plan.id === 'free' ? 'Compare plans when you need more scans, AI actions, or document versions.' : 'Review usage, invoices, and payment details in one place.'}</p>
                                        </div>
                                        <span className="inline-flex items-center gap-2 text-sm font-bold text-ember-deep">{plan.id === 'free' ? 'Compare plans' : 'Manage billing'} <span className="material-symbols-outlined text-[17px]">arrow_forward</span></span>
                                    </div>
                                </BentoCard>
                            </section>
                        </div>
                    )}

                    {/* RESUMES VIEW */}
                    {activeTab === 'resumes' && user && onEditResume && (
                        <div className="dashboard-module animate-fade-in">
                            <ResumeManager
                                userId={user.id}
                                plan={plan}
                                onEdit={onEditResume}
                                onUpgrade={() => onViewPricing?.()}
                            />
                        </div>
                    )}
                    {activeTab === 'resumes' && !(user && onEditResume) && (
                        <div className="dashboard-module animate-fade-in">
                             <header className="flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-end mb-8">
                                <div>
                                    <p className="dashboard-eyebrow mb-3">Resume archive</p>
                                    <h1 className="mb-3">Your resumes.</h1>
                                    <p className="text-ink-soft/65">Build, revisit, and tailor every version from one place.</p>
                                </div>
                                <button
                                    onClick={() => onCreateNew()}
                                    className="dashboard-primary-button"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                    Create New
                                </button>
                            </header>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {/* New Resume Card */}
                                <div 
                                    onClick={() => onCreateNew()}
                                    className="glass-card h-[320px] flex flex-col items-center justify-center cursor-pointer group border-dashed border-2"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onCreateNew(); }}
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
                        <div className="dashboard-module animate-fade-in">
                            <header className="mb-8">
                                <p className="dashboard-eyebrow mb-3">Design library · {AVAILABLE_TEMPLATES.length} layouts</p>
                                <h1 className="mb-3">Find your type.</h1>
                                <p className="max-w-2xl text-ink-soft/65">Choose a recruiter-ready layout that fits the role, seniority, and tone of your application.</p>
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
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onCreateNew(template.id as TemplateId); }}
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
                    {activeTab === 'profile' && user && !profileComplete && (
                        <div
                            role="status"
                            className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-5"
                        >
                            <h2 className="font-semibold text-dark">
                                Finish your profile to continue
                            </h2>
                            <p className="mt-1.5 text-sm text-ink-soft">
                                We use these on every CV you generate, so they are worth getting
                                right once. Still needed:{' '}
                                <span className="font-semibold text-dark">
                                    {missingProfileFields.join(', ')}
                                </span>
                                .
                            </p>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="dashboard-module animate-fade-in">
                            <UserProfileForm />
                        </div>
                    )}

                    {/* SMART STUDIO VIEW */}
                    {activeTab === 'smart-studio' && (
                        <div className="dashboard-module animate-fade-in">
                            <SmartStudio resumeData={savedResume} />
                        </div>
                    )}

                    {/* ATS CHECKER VIEW */}
                    {activeTab === 'ats' && (
                        <div className="dashboard-module animate-fade-in">
                            <AtsAnalyzer savedResume={savedResume} onUpgrade={() => onViewPricing?.()} />
                        </div>
                    )}

                    {/* BILLING VIEW */}
                    {activeTab === 'billing' && (
                        <div className="dashboard-module animate-fade-in">
                            <BillingDashboard onChangePlan={() => onViewPricing?.()} />
                        </div>
                    )}

                    {/* PRISM TAILOR VIEW (feature-flag gated) */}
                    {activeTab === 'prism' && prismEnabled && (
                        <div className="dashboard-module animate-fade-in">
                            <PrismWizard onEditResume={onEditResume} onUpgrade={() => onViewPricing?.()} />
                        </div>
                    )}

                    {/* ADMIN VIEW (admin-only; the edge function enforces it) */}
                    {activeTab === 'admin' && isAdmin && (
                        <div className="animate-fade-in">
                            <AdminPanel />
                        </div>
                    )}

                    {/* SETTINGS & PERSONALIZATION VIEW */}
                    {activeTab === 'settings' && (
                        <div className="animate-fade-in">
                            <SettingsPanel
                                onViewLegal={onViewLegal}
                                onManageBilling={() => setActiveTab('billing')}
                            />
                        </div>
                    )}
                </div>
            </main>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
};

export default Dashboard;
