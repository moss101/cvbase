import React from 'react';
import { ArrowLeft, LogOut, LogIn } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useAuth } from '../../AuthProvider';
import { useSubscription } from '../../SubscriptionProvider';
import { useNavigation, type CareerRoute } from '../../NavigationProvider';
import { ACCOUNT_SPACES, LEGACY_TOOL_SPACES, PRIMARY_SPACES, UTILITY_SPACES, activeSpaceKey, type SpaceDescriptor } from './spaces';

interface DesktopSidebarProps {
    route: CareerRoute;
    isAdmin: boolean;
    onBackToLanding: () => void;
    onOpenAuth: () => void;
    onViewPricing: () => void;
    /** Unread inbox count for the Notifications entry badge. */
    unreadCount?: number;
}

const NavItem: React.FC<{ item: SpaceDescriptor; active: boolean; badge?: number; onClick: () => void }> = ({ item, active, badge, onClick }) => {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            onClick={onClick}
            className={`dashboard-nav-item group ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
        >
            <span className="dashboard-nav-icon"><item.Icon size={19} strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="text-[13px] font-semibold tracking-[-0.01em]">{t(item.labelKey, item.label)}</span>
            {badge ? (
                <span className="ml-auto rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={t('careeros.nav.unread', '{n} unread').replace('{n}', String(badge))}>{badge}</span>
            ) : active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        </button>
    );
};

/**
 * The six-space desktop navigation. Reuses the existing dashboard sidebar
 * styling (`dashboard-nav-item`) so the shell reads as the same product; the
 * legacy tools stay one click away until COS-041 retires them.
 */
const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ route, isAdmin, onBackToLanding, onOpenAuth, onViewPricing, unreadCount = 0 }) => {
    const { t } = useTranslation();
    const { user, userProfile, logout } = useAuth();
    const { plan, billing } = useSubscription();
    const { navigate } = useNavigation();
    const active = activeSpaceKey(route);

    const Group: React.FC<{ title: string; items: SpaceDescriptor[] }> = ({ title, items }) => (
        <>
            <p className="px-3 pb-2 pt-5 font-label text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</p>
            <div className="space-y-1">
                {items.filter((i) => !i.adminOnly || isAdmin).map((item) => (
                    <NavItem
                        key={item.key}
                        item={item}
                        active={active === item.key}
                        badge={item.key === 'notifications' ? unreadCount : undefined}
                        onClick={() => navigate(item.route)}
                    />
                ))}
            </div>
        </>
    );

    return (
        <aside className="dashboard-sidebar hidden h-full w-[264px] shrink-0 flex-col text-white lg:flex" aria-label={t('careeros.nav.primary', 'Career OS navigation')}>
            <div className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-3 pt-6">
                <button type="button" onClick={onBackToLanding} className="group flex select-none items-center gap-3 rounded-xl focus-visible:outline-none" title={t('dash.backToHomepage', 'Back to Homepage')}>
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/[0.07] font-display text-[15px] font-semibold text-paper-bright transition-transform group-hover:-rotate-3">CV</span>
                    <span className="text-left">
                        <span className="block font-display text-[20px] leading-none tracking-[-0.04em] text-paper-bright">CVbase.</span>
                        <span className="mt-1 block font-label text-[8px] uppercase tracking-[0.16em] text-stone-400">{t('careeros.nav.eyebrow', 'career os')}</span>
                    </span>
                </button>
            </div>
            <nav className="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-3.5">
                <Group title={t('careeros.nav.spaces', 'Spaces')} items={PRIMARY_SPACES} />
                <Group title={t('careeros.nav.utilities', 'Utilities')} items={UTILITY_SPACES} />
                <Group title={t('careeros.nav.tools', 'Tools')} items={LEGACY_TOOL_SPACES} />
                <Group title={t('dash.libraryAndAccount', 'Library & account')} items={ACCOUNT_SPACES} />
                <div className="my-4 border-t border-white/[0.07]" />
                <div className="space-y-1 pb-3">
                    <button type="button" onClick={onBackToLanding} className="dashboard-nav-item group">
                        <span className="dashboard-nav-icon"><ArrowLeft size={19} strokeWidth={1.75} aria-hidden="true" /></span>
                        <span className="text-[13px] font-semibold tracking-[-0.01em]">{t('dash.backToWebsite', 'Back to website')}</span>
                    </button>
                </div>
            </nav>
            <div className="relative z-10 mx-4 mt-1 flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.055] px-4 py-3">
                <span className="truncate text-xs font-semibold text-white">{t('dash.planSuffix', '{plan} plan').replace('{plan}', plan.name)}</span>
                {billing.subscription.cancelAtPeriodEnd && (
                    <span className="shrink-0 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">{t('dash.ending', 'Ending')}</span>
                )}
                {plan.id === 'free' ? (
                    <button type="button" onClick={onViewPricing} className="shrink-0 rounded-md bg-ember px-2.5 py-1.5 font-label text-[9px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-ember-deep">{t('dash.upgrade', 'Upgrade')}</button>
                ) : (
                    <button type="button" onClick={() => navigate(ACCOUNT_SPACES[2].route)} className="shrink-0 text-[10px] font-bold text-slate-300 transition hover:text-white">{t('dash.manage', 'Manage')}</button>
                )}
            </div>
            <div className="relative z-10 m-4 mt-3 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5">
                {user ? (
                    <div className="flex w-full items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-ember p-[1px]">
                                <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-ink text-sm font-semibold text-white">
                                    {userProfile?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>
                            <div className="overflow-hidden">
                                <p className="truncate text-xs font-semibold text-white">{userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : (user.email ? user.email.split('@')[0] : t('mobile.user', 'User'))}</p>
                                <p className="truncate text-[10px] text-stone-400">{user.email}</p>
                            </div>
                        </div>
                        <button type="button" onClick={logout} className="tap-target shrink-0 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-rose-400" title={t('dash.signOut', 'Sign Out')} aria-label={t('dash.signOut', 'Sign Out')}>
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={onOpenAuth} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-paper-bright px-3 py-2.5 text-xs font-semibold text-ink transition-all hover:bg-white">
                        <LogIn className="h-3 w-3" aria-hidden="true" />
                        {t('dash.signInSync', 'Sign In / Sync')}
                    </button>
                )}
            </div>
        </aside>
    );
};

export default DesktopSidebar;
