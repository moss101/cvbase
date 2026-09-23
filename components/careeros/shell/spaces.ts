import type React from 'react';
import {
    BookOpen, Briefcase, Compass, CreditCard, FileText, Home, LayoutTemplate, Library, MessageCircle, Search,
    Settings, ShieldCheck, Sparkles, Target, Bell, Wand2, IdCard, Route as RouteIcon, Award, FilePen,
} from 'lucide-react';
import { careerPath, type CareerRoute, type CareerSpace, type Route } from '../../NavigationProvider';

/**
 * One list of destinations drives the desktop sidebar, the mobile tab bar,
 * the More sheet and the command palette, so the two shells can never drift
 * into different products (docs/career-os/CAREER_OS_INFORMATION_ARCHITECTURE.md).
 */
export interface SpaceDescriptor {
    key: string;
    space: CareerSpace;
    /** Usually a career route; public pages that stay outside the shell (resources) use their own. */
    route: Route;
    /** Translation key + English default. */
    labelKey: string;
    label: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>;
    /** Where the entry appears. */
    group: 'primary' | 'utility' | 'legacy' | 'account';
    /** Present on the mobile bottom bar (five entries). */
    mobileTab?: boolean;
    /** Requires the admin role. */
    adminOnly?: boolean;
}

export const PRIMARY_SPACES: SpaceDescriptor[] = [
    { key: 'today', space: 'today', route: careerPath.toSpace('today'), labelKey: 'careeros.space.today', label: 'Today', Icon: Home, group: 'primary', mobileTab: true },
    { key: 'career', space: 'career', route: careerPath.toCareer(), labelKey: 'careeros.space.career', label: 'Career', Icon: Compass, group: 'primary' },
    { key: 'opportunities', space: 'opportunities', route: careerPath.toSpace('opportunities'), labelKey: 'careeros.space.opportunities', label: 'Opportunities', Icon: Target, group: 'primary', mobileTab: true },
    { key: 'campaigns', space: 'campaigns', route: careerPath.toSpace('campaigns'), labelKey: 'careeros.space.campaigns', label: 'Campaigns', Icon: RouteIcon, group: 'primary', mobileTab: true },
    { key: 'coach', space: 'coach', route: careerPath.toCoach(), labelKey: 'careeros.space.coach', label: 'Coach', Icon: MessageCircle, group: 'primary', mobileTab: true },
    { key: 'library', space: 'library', route: careerPath.toLibrary(), labelKey: 'careeros.space.library', label: 'Library', Icon: Library, group: 'primary' },
];

export const UTILITY_SPACES: SpaceDescriptor[] = [
    { key: 'search', space: 'search', route: careerPath.toSpace('search'), labelKey: 'careeros.space.search', label: 'Search', Icon: Search, group: 'utility' },
    { key: 'notifications', space: 'notifications', route: careerPath.toSpace('notifications'), labelKey: 'careeros.space.notifications', label: 'Inbox', Icon: Bell, group: 'utility' },
];

/**
 * Workspaces: the tools people open to produce something. The CV Builder is
 * first — the existing editor, templates, exports and CV actions as one
 * workspace inside the shell — followed by the other existing tools.
 */
export const WORKSPACE_SPACES: SpaceDescriptor[] = [
    { key: 'cvs', space: 'library', route: careerPath.toCvWorkspace(), labelKey: 'careeros.space.cvBuilder', label: 'CV Builder', Icon: FilePen, group: 'legacy' },
    { key: 'applications', space: 'applications', route: careerPath.toSpace('applications'), labelKey: 'careeros.space.applications', label: 'Applications', Icon: Briefcase, group: 'legacy' },
    { key: 'tailor', space: 'library', route: careerPath.toLibraryTool('tailor'), labelKey: 'mobile.prismTailor', label: 'PRISM Tailor', Icon: Wand2, group: 'legacy' },
    { key: 'ats', space: 'library', route: careerPath.toLibraryTool('ats'), labelKey: 'mobile.atsChecker', label: 'ATS Checker', Icon: Sparkles, group: 'legacy' },
    { key: 'studio', space: 'library', route: careerPath.toStudio(), labelKey: 'mobile.smartStudio', label: 'Smart Studio', Icon: Award, group: 'legacy' },
    { key: 'templates', space: 'library', route: careerPath.toLibraryTool('templates'), labelKey: 'dash.tab.templateGallery', label: 'Template gallery', Icon: LayoutTemplate, group: 'legacy' },
];
/** Earlier name for the workspace group. */
export const LEGACY_TOOL_SPACES = WORKSPACE_SPACES;

export const ACCOUNT_SPACES: SpaceDescriptor[] = [
    { key: 'profile', space: 'career', route: careerPath.toCareer('profile'), labelKey: 'tabbar.profile', label: 'Profile', Icon: IdCard, group: 'account' },
    { key: 'settings', space: 'settings', route: careerPath.toSpace('settings'), labelKey: 'mobile.settings', label: 'Settings', Icon: Settings, group: 'account' },
    { key: 'billing', space: 'billing', route: careerPath.toSpace('billing'), labelKey: 'mobile.billingPlansLink', label: 'Billing & plans', Icon: CreditCard, group: 'account' },
    { key: 'resources', space: 'library', route: { view: 'resources' }, labelKey: 'mobile.careerResources', label: 'Career resources', Icon: BookOpen, group: 'account' },
    { key: 'admin', space: 'admin', route: careerPath.toSpace('admin'), labelKey: 'mobile.admin', label: 'Admin', Icon: ShieldCheck, group: 'account', adminOnly: true },
];

export const ALL_SPACES: SpaceDescriptor[] = [...PRIMARY_SPACES, ...UTILITY_SPACES, ...WORKSPACE_SPACES, ...ACCOUNT_SPACES];

/** The five mobile entries: Today, Opportunities, Campaigns, CVs, More. Coach is one tap away through Ask. */
export const MOBILE_TABS: SpaceDescriptor[] = [
    PRIMARY_SPACES[0], PRIMARY_SPACES[2], PRIMARY_SPACES[3],
    { ...WORKSPACE_SPACES[0], labelKey: 'careeros.space.cvs', label: 'CVs' },
];

/** Which primary space a route belongs to, for highlighting navigation. */
export function activeSpaceKey(route: CareerRoute): string {
    switch (route.space) {
        case 'applications':
            return 'campaigns';
        case 'career':
            return route.sub === 'profile' ? 'profile' : 'career';
        case 'library':
            if (route.sub === 'cvs') return 'cvs';
            if (route.sub === 'templates') return 'templates';
            if (route.sub === 'tailor') return 'tailor';
            if (route.sub === 'ats') return 'ats';
            if (route.sub === 'studio') return 'studio';
            return 'library';
        default:
            return route.space;
    }
}
