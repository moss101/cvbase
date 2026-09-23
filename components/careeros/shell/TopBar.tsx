import React from 'react';
import { Bell, Briefcase, ChevronRight, Compass, FileText, Search, Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import type { CareerContextProjection } from '../../../services/careerOs/types';
import { ALL_SPACES, activeSpaceKey } from './spaces';
import { isMacPlatform } from './DesktopSidebar';

/**
 * The top bar is where the career context stays visible across every space:
 * where you are (space › record), what you are working toward (goal,
 * campaign) and on (application or opportunity), each one click from its own
 * space. Ask CVbase and the inbox sit at the right, the same on every screen.
 */
export interface TopBarProps {
    route: CareerRoute;
    projection: CareerContextProjection | null;
    unreadCount: number;
    signedIn: boolean;
    onOpenPalette: () => void;
}

export function spaceTitle(route: CareerRoute, t: (key: string, fallback: string) => string): string {
    if (route.space === 'applications') return route.id ? t('careeros.crumb.application', 'Application') : t('careeros.space.applications', 'Applications');
    const key = activeSpaceKey(route);
    const entry = ALL_SPACES.find((s) => s.key === key);
    return entry ? t(entry.labelKey, entry.label) : t('careeros.shell.eyebrow', 'Career OS');
}

/** The record the route names, when the context resolved it. */
function recordLabel(route: CareerRoute, p: CareerContextProjection | null, t: (key: string, fallback: string) => string): string | null {
    if (route.space === 'library' && route.sub === 'cvs') {
        if (route.section === 'new') return t('careeros.crumb.newCv', 'New CV');
        return p?.document?.title ?? null;
    }
    if (!route.id || !p) return null;
    switch (route.space) {
        case 'applications': return p.application ? `${p.application.jobTitle}${p.application.company ? ` · ${p.application.company}` : ''}` : null;
        case 'opportunities': return p.opportunity?.title ?? null;
        case 'campaigns': return p.campaign?.name ?? null;
        case 'career': return route.sub === 'goals' ? (p.goal?.title || p.goal?.role || null) : null;
        default: return null;
    }
}

export const TopBar: React.FC<TopBarProps> = ({ route, projection: p, unreadCount, signedIn, onOpenPalette }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const title = spaceTitle(route, t);
    const record = recordLabel(route, p, t);
    const isMac = isMacPlatform();

    // Context chips: skip whatever the breadcrumb already names.
    const chips: Array<{ key: string; label: string; Icon: typeof Target; onClick: () => void; title: string }> = [];
    if (p?.goal && !(route.space === 'career' && route.sub === 'goals')) {
        chips.push({ key: 'goal', label: p.goal.title || p.goal.role, Icon: Target, title: t('careeros.context.goal', 'Goal'), onClick: () => navigate(careerPath.toGoal(p.goal!.id)) });
    }
    if (p?.campaign && route.space !== 'campaigns') {
        chips.push({ key: 'campaign', label: p.campaign.name, Icon: Compass, title: t('careeros.context.campaign', 'Campaign'), onClick: () => navigate(careerPath.toCampaign(p.campaign!.id)) });
    }
    if (p?.application && route.space !== 'applications') {
        chips.push({ key: 'application', label: `${p.application.jobTitle}${p.application.company ? ` · ${p.application.company}` : ''}`, Icon: FileText, title: t('careeros.context.application', 'Application'), onClick: () => navigate(careerPath.toApplication(p.application!.id)) });
    } else if (p?.opportunity && !p.application && route.space !== 'opportunities') {
        chips.push({ key: 'opportunity', label: p.opportunity.title, Icon: Briefcase, title: t('careeros.context.opportunity', 'Opportunity'), onClick: () => navigate(careerPath.toOpportunity(p.opportunity!.id)) });
    }

    return (
        <header className="cos-topbar">
            <nav aria-label={t('careeros.crumb.label', 'You are here')} className="flex min-w-0 shrink items-center gap-1.5">
                {record ? (
                    <>
                        <button type="button" className="cos-crumb hover:text-content-primary" onClick={() => {
                            const key = activeSpaceKey(route);
                            const entry = ALL_SPACES.find((s) => s.key === key);
                            if (route.space === 'applications') navigate(careerPath.toSpace('applications'));
                            else if (entry) navigate(entry.route);
                        }}>{title}</button>
                        <ChevronRight size={14} className="shrink-0 text-content-muted" aria-hidden="true" />
                        <span className="cos-crumb-current truncate" aria-current="page">{record}</span>
                    </>
                ) : (
                    <span className="cos-crumb-current truncate" aria-current="page">{title}</span>
                )}
            </nav>

            {chips.length > 0 && (
                <ul className="hidden min-w-0 items-center gap-1.5 overflow-hidden lg:flex" aria-label={t('careeros.context.label', 'Working context')}>
                    {chips.map((c) => (
                        <li key={c.key} className="min-w-0">
                            <button type="button" onClick={c.onClick} className="cos-chip" title={`${c.title}: ${c.label}`}>
                                <c.Icon size={13} strokeWidth={1.9} aria-hidden="true" />
                                <span className="sr-only">{c.title}: </span>
                                <span className="truncate">{c.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
                <button type="button" onClick={onOpenPalette} className="cos-topbar-btn" aria-label={t('careeros.ask.label', 'Ask CVbase or search')} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
                    <Search size={15} strokeWidth={1.9} aria-hidden="true" />
                    <span className="hidden xl:inline">{t('careeros.ask.short', 'Ask or search')}</span>
                    <span className="cos-kbd-light hidden xl:inline">{isMac ? '⌘K' : 'Ctrl K'}</span>
                </button>
                {signedIn && (
                    <button
                        type="button"
                        onClick={() => navigate(careerPath.toSpace('notifications'))}
                        className="cos-topbar-btn relative w-[34px] justify-center px-0"
                        aria-label={unreadCount > 0 ? t('careeros.nav.inboxUnread', 'Inbox, {n} unread').replace('{n}', String(unreadCount)) : t('careeros.space.notifications', 'Inbox')}
                    >
                        <Bell size={16} strokeWidth={1.9} aria-hidden="true" />
                        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-action-primary px-1 text-[10px] font-bold text-white cos-num" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </button>
                )}
            </div>
        </header>
    );
};

export default TopBar;
