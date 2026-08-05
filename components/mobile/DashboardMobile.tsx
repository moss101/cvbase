import React, { useEffect, useState } from 'react';
import { FileText, Plus, ChevronRight, Target, Sparkles, LayoutTemplate } from 'lucide-react';
import MobileTopBar from './MobileTopBar';
import BottomTabBar from './BottomTabBar';
import { useAuth } from '../AuthProvider';
import { useSubscription } from '../SubscriptionProvider';
import { UserProfileForm } from '../UserProfileForm';
import { SmartStudio } from '../SmartStudio';
import AtsAnalyzer from '../ats/AtsAnalyzer';
import BillingDashboard from '../billing/BillingDashboard';
import ResumeManager from '../ResumeManager';
import PrismWizard from '../prism/PrismWizard';
import SettingsPanel from '../SettingsPanel';
import AdminPanel from '../admin/AdminPanel';
import { LazyTemplatePreview } from '../templates/TemplatePreviewRegistry';
import { AVAILABLE_TEMPLATES } from '../../constants';
import * as resumeRepo from '../../services/repos/resumeRepo';
import type { StoredResume } from '../../services/repos/mappers';
import type { ResumeData, TemplateId } from '../../types';
import type { DashboardTab } from '../Dashboard';
import type { LegalTab } from '../LegalPage';

const PRIMARY_TABS: DashboardTab[] = ['dashboard', 'resumes', 'templates', 'profile'];
const PRIMARY_TITLES: Partial<Record<DashboardTab, string>> = {
    resumes: 'Resumes',
    templates: 'Templates',
    profile: 'Profile',
};
const SECONDARY_TITLES: Partial<Record<DashboardTab, string>> = {
    'smart-studio': 'Smart Studio',
    ats: 'ATS Checker',
    billing: 'Billing & Plans',
    prism: 'PRISM Tailor',
    admin: 'Admin',
    settings: 'Settings',
};

interface DashboardMobileProps {
    activeTab: DashboardTab;
    setActiveTab: (tab: DashboardTab) => void;
    savedResume: ResumeData | null;
    greeting: string;
    lastAtsScore: { atsScore: number; matchScore: number | null; date: string } | null;
    prismEnabled: boolean;
    isAdmin: boolean;
    categories: string[];
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    filteredTemplates: typeof AVAILABLE_TEMPLATES;
    onCreateNew: (templateId?: TemplateId) => void;
    onEditExisting: () => void;
    onEditResume?: (resumeId: string) => void;
    onViewResources?: () => void;
    onViewPricing?: () => void;
    onViewLegal?: (tab: LegalTab) => void;
    onOpenAuth: () => void;
}

/**
 * The mobile shell's root-tab surface (Home / Resumes / Templates / Profile)
 * plus the secondary screens reached from them (ATS, Smart Studio, Billing,
 * PRISM, Settings, Admin) — those render as "pushed" screens with the tab bar
 * hidden and a back arrow to Home, the same push pattern the resume builder
 * uses, rather than leaving the tab bar visible with nothing selected.
 *
 * Reuses every real feature component the desktop dashboard does
 * (ResumeManager, UserProfileForm, LazyTemplatePreview, ...) — only the
 * surrounding chrome (top bar, tab bar, Home's layout) is new.
 */
const DashboardMobile: React.FC<DashboardMobileProps> = ({
    activeTab,
    setActiveTab,
    savedResume,
    greeting,
    lastAtsScore,
    prismEnabled,
    isAdmin,
    categories,
    selectedCategory,
    setSelectedCategory,
    filteredTemplates,
    onCreateNew,
    onEditExisting,
    onEditResume,
    onViewResources,
    onViewPricing,
    onViewLegal,
    onOpenAuth,
}) => {
    const { user, userProfile, logout, profileComplete, missingProfileFields } = useAuth();
    const { plan } = useSubscription();

    // The real multi-resume list, for Home's carousel and the Resumes tab.
    // `savedResume` (a single localStorage draft) remains the fallback for
    // anonymous/local-only use, matching the desktop dashboard's own fallback.
    const [resumes, setResumes] = useState<StoredResume[] | null>(null);
    const userId = user?.id ?? null;
    useEffect(() => {
        if (!userId) { setResumes(null); return; }
        let cancelled = false;
        resumeRepo.list(userId)
            .then((list) => { if (!cancelled) setResumes(list); })
            .catch(() => { if (!cancelled) setResumes([]); });
        return () => { cancelled = true; };
    }, [userId]);

    const carouselResumes = resumes ?? [];
    const heroSource = carouselResumes[0] ?? null;
    const heroResumeMeta = heroSource
        ? { title: heroSource.title, subtitle: heroSource.data?.contact?.jobTitle || 'Draft' }
        : savedResume
            ? {
                title: savedResume.contact.firstName ? `${savedResume.contact.firstName}'s resume` : 'Untitled resume',
                subtitle: savedResume.contact.jobTitle || 'Draft',
            }
            : null;
    const hasAnyResume = !!heroResumeMeta;

    const handleContinue = () => {
        if (heroSource?.id) { onEditResume?.(heroSource.id); return; }
        if (savedResume) { onEditExisting(); return; }
        onCreateNew();
    };

    const isPrimaryTab = PRIMARY_TABS.includes(activeTab);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-light">
            {!isPrimaryTab && (
                <MobileTopBar
                    onBack={() => setActiveTab('dashboard')}
                    center={<span className="text-[15.5px] font-bold text-dark">{SECONDARY_TITLES[activeTab]}</span>}
                />
            )}
            {isPrimaryTab && activeTab !== 'dashboard' && (
                <MobileTopBar
                    center={<span className="font-display text-[19px] font-semibold text-dark">{PRIMARY_TITLES[activeTab]}</span>}
                    trailing={activeTab === 'resumes' ? (
                        <button
                            type="button"
                            onClick={() => onCreateNew()}
                            aria-label="New resume"
                            className="tap-target flex items-center justify-center rounded-full text-dark transition active:scale-95"
                        >
                            <Plus size={20} strokeWidth={2} />
                        </button>
                    ) : undefined}
                />
            )}

            <main className="min-h-0 flex-1 overflow-y-auto">
                {/* ---------------- HOME ---------------- */}
                {activeTab === 'dashboard' && (
                    <div className="pb-6">
                        <div className="flex items-center justify-between px-4 pt-4">
                            <span className="text-[16px] font-bold text-dark">CV<span className="text-primary">Base</span></span>
                            <button
                                type="button"
                                onClick={() => onCreateNew()}
                                aria-label="New resume"
                                className="tap-target flex items-center justify-center rounded-full border border-border bg-white text-dark transition active:scale-95"
                            >
                                <Plus size={18} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="px-4 pt-3">
                            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] text-dark">{greeting}</h1>
                            <p className="mt-1 text-[13.5px] text-gray-500">
                                {hasAnyResume ? 'Pick up where you left off.' : "Let's build your first resume."}
                            </p>
                        </div>

                        {/* One primary action for this screen. */}
                        <div className="mx-4 mt-4 rounded-[20px] border border-border bg-white p-3.5">
                            {heroResumeMeta ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-[52px] w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-light text-primary">
                                        <FileText size={18} strokeWidth={1.75} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-bold text-dark">{heroResumeMeta.title}</p>
                                        <p className="truncate text-[12px] text-gray-500">{heroResumeMeta.subtitle}</p>
                                    </div>
                                    {lastAtsScore && (
                                        <span className="shrink-0 rounded-full bg-primary-light px-2 py-1 text-[11px] font-bold text-primary-dark">
                                            ATS {lastAtsScore.atsScore}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="px-1 py-2 text-[13.5px] leading-relaxed text-gray-500">
                                    Templates typeset like fine print, an AI editor, and an ATS-ready structure — in under ten minutes.
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handleContinue}
                                className="tap-target mt-3 flex w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-white shadow-sm transition active:scale-[0.98]"
                            >
                                {hasAnyResume ? 'Continue editing' : 'Start your resume'}
                            </button>
                        </div>

                        {carouselResumes.length > 0 && (
                            <>
                                <p className="mb-2.5 mt-6 px-4 text-[13px] font-bold text-dark">Your resumes</p>
                                <div className="flex gap-2.5 overflow-x-auto px-4 pb-1">
                                    {carouselResumes.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => r.id && onEditResume?.(r.id)}
                                            className="w-[116px] shrink-0 rounded-2xl border border-border bg-white p-3 text-left transition active:scale-[0.98]"
                                        >
                                            <div className="mb-2 flex h-16 w-full items-center justify-center rounded-lg bg-light text-primary">
                                                <FileText size={22} strokeWidth={1.5} />
                                            </div>
                                            <p className="truncate text-[12.5px] font-bold text-dark">{r.title}</p>
                                            <p className="truncate text-[11px] text-gray-500">
                                                {r.data?.contact?.jobTitle || AVAILABLE_TEMPLATES.find((t) => t.id === r.templateId)?.name || 'Draft'}
                                            </p>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => onCreateNew()}
                                        className="flex w-[116px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-primary transition active:scale-[0.98]"
                                    >
                                        <Plus size={20} strokeWidth={2} />
                                        <span className="text-[11.5px] font-bold">New resume</span>
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="mx-4 mt-6 divide-y divide-border border-t border-border">
                            <button type="button" onClick={() => setActiveTab('ats')} className="tap-target flex w-full items-center gap-3 py-3.5 text-left">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark"><Target size={16} strokeWidth={1.75} /></span>
                                <span className="flex-1 text-[14px] font-semibold text-dark">Check ATS compatibility</span>
                                {lastAtsScore && <span className="text-[12px] font-semibold text-gray-400">{lastAtsScore.atsScore}</span>}
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                            <button type="button" onClick={() => setActiveTab('smart-studio')} className="tap-target flex w-full items-center gap-3 py-3.5 text-left">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark"><Sparkles size={16} strokeWidth={1.75} /></span>
                                <span className="flex-1 text-[14px] font-semibold text-dark">Improve with AI</span>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                            <button type="button" onClick={() => setActiveTab('templates')} className="tap-target flex w-full items-center gap-3 py-3.5 text-left">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark"><LayoutTemplate size={16} strokeWidth={1.75} /></span>
                                <span className="flex-1 text-[14px] font-semibold text-dark">Browse templates</span>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ---------------- RESUMES ---------------- */}
                {activeTab === 'resumes' && (
                    <div className="p-4">
                        {user && onEditResume ? (
                            <ResumeManager userId={user.id} plan={plan} onEdit={onEditResume} onUpgrade={() => onViewPricing?.()} />
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <div
                                    onClick={() => onCreateNew()}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCreateNew(); }}
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white"
                                >
                                    <Plus size={22} className="mb-2 text-primary" strokeWidth={2} />
                                    <p className="font-bold text-gray-500">Create new resume</p>
                                </div>
                                {savedResume && (
                                    <div onClick={onEditExisting} className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-white">
                                        <div className="p-4">
                                            <h3 className="truncate text-[15px] font-bold text-dark">{savedResume.contact.firstName || 'Untitled'} resume</h3>
                                            <p className="mt-0.5 text-[12.5px] text-gray-500">{savedResume.contact.jobTitle || 'No job title'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------- TEMPLATES ---------------- */}
                {activeTab === 'templates' && (
                    <div className="px-4 pb-6 pt-3">
                        <div className="flex gap-2 overflow-x-auto pb-3">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${selectedCategory === cat ? 'bg-dark text-white' : 'border border-border bg-white text-gray-600'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3.5">
                            {filteredTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => onCreateNew(template.id as TemplateId)}
                                    className="overflow-hidden rounded-2xl border border-border bg-white text-left transition active:scale-[0.98]"
                                >
                                    <div className="flex h-[170px] items-center justify-center overflow-hidden bg-gray-50">
                                        <LazyTemplatePreview templateId={template.id} scale={0.17} />
                                    </div>
                                    <div className="p-2.5">
                                        <p className="truncate text-[12.5px] font-bold text-dark">{template.name}</p>
                                        <p className="truncate text-[10.5px] uppercase tracking-wide text-gray-400">{template.category}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---------------- PROFILE (+ account hub) ---------------- */}
                {activeTab === 'profile' && (
                    <div className="pb-8">
                        {user && !profileComplete && (
                            <div role="status" className="mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                                <h2 className="text-[14px] font-semibold text-dark">Finish your profile to continue</h2>
                                <p className="mt-1 text-[12.5px] text-ink-soft">
                                    Still needed: <span className="font-semibold text-dark">{missingProfileFields.join(', ')}</span>.
                                </p>
                            </div>
                        )}

                        {user ? (
                            <div className="flex items-center gap-3 px-4 pt-5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-light text-[15px] font-bold text-primary-dark">
                                    {(userProfile?.firstName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-[15px] font-bold text-dark">
                                        {userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName ?? ''}`.trim() : (user.email?.split('@')[0] ?? 'User')}
                                    </p>
                                    <p className="truncate text-[12.5px] text-gray-500">{user.email}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mx-4 mt-5 rounded-2xl border border-border bg-white p-4 text-center">
                                <p className="text-[13.5px] text-gray-500">Sign in to sync your resumes and profile across devices.</p>
                                <button
                                    type="button"
                                    onClick={onOpenAuth}
                                    className="tap-target mt-3 flex w-full items-center justify-center rounded-xl bg-dark text-[14px] font-bold text-white transition active:scale-[0.98]"
                                >
                                    Sign in
                                </button>
                            </div>
                        )}

                        <div className="mt-6 px-4">
                            <UserProfileForm />
                        </div>

                        {user && (
                            <div className="mx-4 mt-6 divide-y divide-border rounded-2xl border border-border bg-white">
                                <button type="button" onClick={() => setActiveTab('billing')} className="tap-target flex w-full items-center gap-3 px-4 text-left">
                                    <span className="flex-1 text-[14px] font-semibold text-dark">Billing &amp; plans</span>
                                    <span className="text-[12px] text-gray-400">{plan.name}</span>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </button>
                                <button type="button" onClick={() => setActiveTab('settings')} className="tap-target flex w-full items-center gap-3 px-4 text-left">
                                    <span className="flex-1 text-[14px] font-semibold text-dark">Settings</span>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </button>
                                {prismEnabled && (
                                    <button type="button" onClick={() => setActiveTab('prism')} className="tap-target flex w-full items-center gap-3 px-4 text-left">
                                        <span className="flex-1 text-[14px] font-semibold text-dark">PRISM Tailor</span>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </button>
                                )}
                                {isAdmin && (
                                    <button type="button" onClick={() => setActiveTab('admin')} className="tap-target flex w-full items-center gap-3 px-4 text-left">
                                        <span className="flex-1 text-[14px] font-semibold text-dark">Admin</span>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </button>
                                )}
                                {onViewResources && (
                                    <button type="button" onClick={onViewResources} className="tap-target flex w-full items-center gap-3 px-4 text-left">
                                        <span className="flex-1 text-[14px] font-semibold text-dark">Career resources</span>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </button>
                                )}
                                <button type="button" onClick={logout} className="tap-target flex w-full items-center justify-center px-4 text-[14px] font-bold text-danger">
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------- secondary / pushed screens ---------------- */}
                {activeTab === 'smart-studio' && (
                    <div className="p-4"><SmartStudio resumeData={savedResume} /></div>
                )}
                {activeTab === 'ats' && (
                    <div className="p-4"><AtsAnalyzer savedResume={savedResume} onUpgrade={() => onViewPricing?.()} /></div>
                )}
                {activeTab === 'billing' && (
                    <div className="p-4"><BillingDashboard onChangePlan={() => onViewPricing?.()} /></div>
                )}
                {activeTab === 'prism' && prismEnabled && (
                    <div className="p-4"><PrismWizard onEditResume={onEditResume} onUpgrade={() => onViewPricing?.()} /></div>
                )}
                {activeTab === 'admin' && isAdmin && (
                    <div className="p-4"><AdminPanel /></div>
                )}
                {activeTab === 'settings' && (
                    <div className="p-4">
                        <SettingsPanel onViewLegal={onViewLegal} onManageBilling={() => setActiveTab('billing')} />
                    </div>
                )}
            </main>

            {isPrimaryTab && <BottomTabBar active={activeTab} onChange={setActiveTab} />}
        </div>
    );
};

export default DashboardMobile;
