import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Bell, ChevronsUpDown, LogIn, LogOut, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useAuth } from '../../AuthProvider';
import { useSubscription } from '../../SubscriptionProvider';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { ACCOUNT_SPACES, PRIMARY_SPACES, WORKSPACE_SPACES, activeSpaceKey, type SpaceDescriptor } from './spaces';

interface DesktopSidebarProps {
    route: CareerRoute;
    isAdmin: boolean;
    onBackToLanding: () => void;
    onOpenAuth: () => void;
    onViewPricing: () => void;
    onOpenPalette: () => void;
    /** Unread inbox count for the Inbox entry badge. */
    unreadCount?: number;
    /** Icon rail instead of the full sidebar (user choice, or forced by the CV editor). */
    collapsed: boolean;
    /** Whether the person may expand it (false while the CV editor needs the width). */
    canToggle: boolean;
    onToggle: () => void;
}

export const isMacPlatform = (): boolean =>
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The Career OS sidebar: Ask CVbase (command + search) first, the six career
 * spaces, then the workspaces people open to produce something — CV Builder
 * leading — and the account at the foot. The ink surface, emerald accent and
 * wordmark are the classic dashboard's; the structure is the new one. As a
 * 64px rail it keeps every destination one click away with a tooltip.
 */
const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
    route, isAdmin, onBackToLanding, onOpenAuth, onViewPricing, onOpenPalette, unreadCount = 0, collapsed, canToggle, onToggle,
}) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const active = activeSpaceKey(route);
    const isMac = isMacPlatform();

    const item = (entry: SpaceDescriptor) => {
        const label = t(entry.labelKey, entry.label);
        const isActive = active === entry.key;
        return (
            <li key={entry.key}>
                <button
                    type="button"
                    onClick={() => navigate(entry.route)}
                    className={`cos-nav-item ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                >
                    <entry.Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    {!collapsed && <span className="truncate">{label}</span>}
                </button>
            </li>
        );
    };

    return (
        <aside
            className={`cos-sidebar hidden h-full shrink-0 flex-col md:flex ${collapsed ? 'is-rail' : ''}`}
            aria-label={t('careeros.nav.primary', 'Career OS navigation')}
        >
            <div className="cos-sidebar-head">
                <button type="button" onClick={onBackToLanding} className="cos-wordmark" title={t('dash.backToHomepage', 'Back to Homepage')} aria-label={collapsed ? t('dash.backToHomepage', 'Back to Homepage') : undefined}>
                    <span className="cos-wordmark-mark" aria-hidden="true">CV</span>
                    {!collapsed && <span className="cos-wordmark-name">CVbase.</span>}
                </button>
                {canToggle && !collapsed && (
                    <button type="button" onClick={onToggle} className="cos-icon-btn" title={t('careeros.nav.collapse', 'Collapse sidebar')} aria-label={t('careeros.nav.collapse', 'Collapse sidebar')}>
                        <PanelLeftClose size={17} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                )}
            </div>

            <div className="px-3">
                <button type="button" onClick={onOpenPalette} className="cos-ask" title={collapsed ? t('careeros.ask.label', 'Ask CVbase or search') : undefined} aria-label={t('careeros.ask.label', 'Ask CVbase or search')} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
                    <Search size={16} strokeWidth={1.9} aria-hidden="true" />
                    {!collapsed && (
                        <>
                            <span className="flex-1 truncate text-left">{t('careeros.ask.short', 'Ask or search')}</span>
                            <kbd className="cos-kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
                        </>
                    )}
                </button>
            </div>

            <nav className="cos-sidebar-nav custom-scrollbar">
                <ul className="space-y-0.5">{PRIMARY_SPACES.map(item)}</ul>
                {collapsed
                    ? <div className="cos-rail-rule" aria-hidden="true" />
                    : <p className="cos-nav-group">{t('careeros.nav.workspaces', 'Workspaces')}</p>}
                <ul className="space-y-0.5">{WORKSPACE_SPACES.map(item)}</ul>
            </nav>

            <div className="cos-sidebar-foot">
                <button
                    type="button"
                    onClick={() => navigate(careerPath.toSpace('notifications'))}
                    className={`cos-nav-item ${active === 'notifications' ? 'is-active' : ''}`}
                    aria-current={active === 'notifications' ? 'page' : undefined}
                    title={collapsed ? t('careeros.space.notifications', 'Inbox') : undefined}
                    aria-label={collapsed ? t('careeros.space.notifications', 'Inbox') : undefined}
                >
                    <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
                    {!collapsed && <span className="truncate">{t('careeros.space.notifications', 'Inbox')}</span>}
                    {unreadCount > 0 && <span className="cos-nav-badge" aria-label={t('careeros.nav.unread', '{n} unread').replace('{n}', String(unreadCount))}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>
                <AccountMenu collapsed={collapsed} isAdmin={isAdmin} onOpenAuth={onOpenAuth} onViewPricing={onViewPricing} onBackToLanding={onBackToLanding} />
                {canToggle && collapsed && (
                    <button type="button" onClick={onToggle} className="cos-icon-btn mx-auto mt-2" title={t('careeros.nav.expand', 'Expand sidebar')} aria-label={t('careeros.nav.expand', 'Expand sidebar')}>
                        <PanelLeftOpen size={17} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                )}
            </div>
        </aside>
    );
};

/** Profile, settings, plan, resources, admin and sign-out, disclosed from the account row. */
const AccountMenu: React.FC<{ collapsed: boolean; isAdmin: boolean; onOpenAuth: () => void; onViewPricing: () => void; onBackToLanding: () => void }> = ({ collapsed, isAdmin, onOpenAuth, onViewPricing, onBackToLanding }) => {
    const { t } = useTranslation();
    const { user, userProfile, logout } = useAuth();
    const { plan, billing } = useSubscription();
    const { navigate } = useNavigation();
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    if (!user) {
        return (
            <button type="button" onClick={onOpenAuth} className={`cos-signin ${collapsed ? 'is-rail' : ''}`} title={collapsed ? t('dash.signInSync', 'Sign In / Sync') : undefined} aria-label={t('dash.signInSync', 'Sign In / Sync')}>
                <LogIn size={16} strokeWidth={1.9} aria-hidden="true" />
                {!collapsed && <span>{t('dash.signInSync', 'Sign In / Sync')}</span>}
            </button>
        );
    }

    const name = userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName ?? ''}`.trim() : (user.email?.split('@')[0] ?? t('mobile.user', 'User'));
    const initial = (userProfile?.firstName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase();
    const go = (fn: () => void) => { setOpen(false); fn(); };

    return (
        <div ref={ref} className="relative mt-1">
            {open && (
                <div id={menuId} role="menu" aria-label={t('careeros.nav.accountMenu', 'Account')} className={`cos-menu ${collapsed ? 'left-0 w-60' : 'inset-x-0'}`}>
                    {ACCOUNT_SPACES.filter((s) => !s.adminOnly || isAdmin).map((s) => (
                        <button key={s.key} type="button" role="menuitem" className="cos-menu-item" onClick={() => go(() => navigate(s.route))}>
                            <s.Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                            <span>{t(s.labelKey, s.label)}</span>
                        </button>
                    ))}
                    <div className="my-1 border-t border-border-default" />
                    <button type="button" role="menuitem" className="cos-menu-item" onClick={() => go(onBackToLanding)}>
                        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>{t('dash.backToWebsite', 'Back to website')}</span>
                    </button>
                    <button type="button" role="menuitem" className="cos-menu-item is-danger" onClick={() => go(logout)}>
                        <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>{t('dash.signOut', 'Sign Out')}</span>
                    </button>
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`cos-account ${collapsed ? 'is-rail' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={t('careeros.nav.account', 'Account: {name}').replace('{name}', name)}
            >
                <span className="cos-avatar" aria-hidden="true">{initial}</span>
                {!collapsed && (
                    <>
                        <span className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-[13px] font-semibold text-slate-100">{name}</span>
                            <span className="block truncate text-[11.5px] text-slate-400">
                                {t('dash.planSuffix', '{plan} plan').replace('{plan}', plan.name)}
                                {billing.subscription.cancelAtPeriodEnd ? ` · ${t('dash.ending', 'Ending')}` : ''}
                            </span>
                        </span>
                        <ChevronsUpDown size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
                    </>
                )}
            </button>
            {!collapsed && plan.id === 'free' && (
                <button type="button" onClick={onViewPricing} className="cos-upgrade">{t('careeros.nav.comparePlans', 'Compare plans')}</button>
            )}
        </div>
    );
};

export default DesktopSidebar;
