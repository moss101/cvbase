import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Capacitor } from '@capacitor/core';
import type { DashboardTab } from './Dashboard';
import type { LegalTab } from './LegalPage';
import { APPLICATION_SECTIONS, type ApplicationSection } from '../services/careerOs/types';

/**
 * Navigation stack shared by the web app and the packaged mobile apps.
 *
 * The app previously held a single `currentView` string plus a `prevView`
 * fallback. That has two consequences on mobile: the Android hardware back
 * button is not wired to anything, so it closes the app from any screen, and
 * browser/gesture back leaves the site entirely. This keeps a real stack, mirrors
 * it into `window.history` so platform back gestures work, and lets transient UI
 * (modals, the mobile drawer) intercept back before the stack unwinds.
 */

/** The screens that predate Career OS. Their routes are unchanged. */
export type LegacyViewState =
    | 'landing'
    | 'auth'
    | 'dashboard'
    | 'builder'
    | 'resources'
    | 'pricing'
    | 'legal';

export type ViewState = LegacyViewState | 'career';

export interface LegacyRoute {
    view: LegacyViewState;
    /** Active dashboard segment, when view === 'dashboard'. */
    dashboardTab?: DashboardTab;
    /** Resume being edited, when view === 'builder'. null means a fresh CV. */
    resumeId?: string | null;
    /** Active legal document, when view === 'legal'. */
    legalTab?: LegalTab;
    /**
     * Where to continue once signing in succeeds, when view === 'auth'. Sending
     * someone to the screen they actually asked for beats dumping everyone on
     * the dashboard after login.
     */
    next?: Route;
}

/**
 * The Career OS spaces (docs/career-os/CAREER_OS_INFORMATION_ARCHITECTURE.md).
 * Six primary spaces, the nested application workspace, the utilities, and an
 * owned-context-safe not-found for anything under /app that does not parse.
 */
export type CareerSpace =
    | 'today'
    | 'career'
    | 'opportunities'
    | 'campaigns'
    | 'applications'
    | 'coach'
    | 'library'
    | 'search'
    | 'notifications'
    | 'settings'
    | 'billing'
    | 'admin'
    | 'not-found';

/** Only ids travel in URLs — never CV text, emails or tokens. */
export type CareerContextHints = {
    goal?: string;
    campaign?: string;
    opportunity?: string;
    application?: string;
};

export interface CareerRoute {
    view: 'career';
    space: CareerSpace;
    /**
     * career: overview|experience|achievements|skills|education|evidence|goals|profile;
     * library: templates|tailor|ats|cvs|documents; settings: integrations.
     */
    sub?: string;
    /** Owned subject id: goalId, opportunityId, campaignId, applicationId, conversationId, resumeId, documentId. */
    id?: string;
    /** Application section (ApplicationSection), or 'edit' for /library/cvs/:id/edit and 'new' for /library/cvs/new. */
    section?: string;
    /** Validated context hints: only ids, only these keys. A resolver decides whether they apply. */
    context?: CareerContextHints;
    /** View filters for list spaces, e.g. opportunities `view=saved`, library `type=cv`. */
    query?: Record<string, string>;
}

export type Route = LegacyRoute | CareerRoute;

export const isCareerRoute = (route: Route): route is CareerRoute => route.view === 'career';

/** Returns true if the handler consumed the back action. */
export type BackHandler = () => boolean;

/* ----------------------------------------------------------------------------
 * URL <-> Route
 *
 *   landing    /
 *   auth       /sign-in?next=<path>
 *   dashboard  /app, /app/<tab>
 *   builder    /builder, /builder/<resumeId>
 *   resources  /resources
 *   pricing    /pricing
 *   legal      /legal/<tab>
 *
 *   career     /app/today
 *              /app/career[/<sub>], /app/career/goals/<goalId>
 *              /app/opportunities[/<id>]        ?view=for-you|saved|applied|watching|archived
 *              /app/campaigns[/<id>]            ?view=board|list
 *              /app/applications[/<id>[/<section>]]
 *              /app/coach[/<conversationId>]
 *              /app/library                     ?type=cv|report|headshot|cover-letter|story|evidence
 *              /app/library/templates|tailor|ats
 *              /app/library/cvs/new, /app/library/cvs/<resumeId>/edit
 *              /app/library/documents/<documentId>
 *              /app/search, /app/notifications, /app/settings/integrations
 *              + ?goal=&campaign=&opportunity=&application= context hints (ids only)
 *
 * The legacy dashboard tabs keep their exact paths: `/app/settings`,
 * `/app/billing` and `/app/admin` are KEEP dispositions in the IA ledger and
 * still parse as dashboard tabs, so the career form of those spaces serialises
 * to the same URL and comes back as the legacy route until cutover. Anything
 * else under /app that does not parse is an owned-context-safe not-found;
 * unknown top-level paths still resolve to the landing page. Query strings
 * other than the ones above are dropped (App.tsx reads `?mode=preview&template=`
 * from window.location itself).
 * ------------------------------------------------------------------------- */

// A Record rather than an array so the compiler flags a tab added to
// DashboardTab that is missing here.
const DASHBOARD_TABS: Record<DashboardTab, true> = {
    dashboard: true,
    resumes: true,
    templates: true,
    profile: true,
    'smart-studio': true,
    ats: true,
    billing: true,
    prism: true,
    settings: true,
    admin: true,
};

const LEGAL_TABS: Record<LegalTab, true> = { privacy: true, terms: true };

const isDashboardTab = (value: string): value is DashboardTab =>
    Object.prototype.hasOwnProperty.call(DASHBOARD_TABS, value);
const isLegalTab = (value: string): value is LegalTab =>
    Object.prototype.hasOwnProperty.call(LEGAL_TABS, value);

/**
 * What an owned-record id may look like in a URL. Anything else is treated as
 * text that should never have been in the address bar and the route becomes
 * not-found (or, for a query hint, the hint is dropped).
 */
export const ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
export const isValidRouteId = (value: string | undefined | null): value is string =>
    typeof value === 'string' && ID_PATTERN.test(value);

export const CAREER_SUBVIEWS = [
    'overview', 'experience', 'achievements', 'skills', 'education', 'evidence', 'goals', 'profile',
] as const;
export type CareerSubview = (typeof CAREER_SUBVIEWS)[number];

export const OPPORTUNITY_VIEWS = ['for-you', 'saved', 'applied', 'watching', 'archived'] as const;
export const CAMPAIGN_VIEWS = ['board', 'list'] as const;
export const LIBRARY_TYPES = ['cv', 'report', 'headshot', 'cover-letter', 'story', 'evidence'] as const;
const LIBRARY_TOOLS = ['templates', 'tailor', 'ats', 'studio'] as const;
/** Smart Studio's five tools; `?tool=` on the studio route opens one directly (legacy `smart-studio` MERGE). */
export const STUDIO_TOOLS = ['match', 'linkedin', 'cover', 'tracker', 'trajectory'] as const;
export type StudioTool = (typeof STUDIO_TOOLS)[number];
const CONTEXT_KEYS = ['goal', 'campaign', 'opportunity', 'application'] as const;

const includes = <T extends string>(list: readonly T[], value: string | undefined): value is T =>
    value !== undefined && (list as readonly string[]).includes(value);

const isApplicationSection = (value: string): value is ApplicationSection =>
    (APPLICATION_SECTIONS as readonly string[]).includes(value);

/** Which query filter each list space accepts, and the values it allows. */
const LIST_FILTERS: Partial<Record<CareerSpace, { key: 'view' | 'type'; values: readonly string[] }>> = {
    opportunities: { key: 'view', values: OPPORTUNITY_VIEWS },
    campaigns: { key: 'view', values: CAMPAIGN_VIEWS },
    library: { key: 'type', values: LIBRARY_TYPES },
};

const NOT_FOUND: CareerRoute = { view: 'career', space: 'not-found' };

/**
 * Reads the allowed query keys for a career route. Filters are kept only for
 * the list space they belong to and only with a known value; context hints are
 * kept only when they look like ids. Everything else is dropped, so nothing a
 * link can carry reaches a screen unvalidated.
 */
function parseCareerQuery(route: CareerRoute, search: string): CareerRoute {
    if (!search) return route;
    const params = new URLSearchParams(search);
    const result: CareerRoute = { ...route };

    // List filters belong to list routes; a campaign detail also keeps its
    // board/list choice in the URL so reload and back restore the same view.
    const filter = (!route.sub && !route.id) || (route.space === 'campaigns' && route.id && !route.sub)
        ? LIST_FILTERS[route.space]
        : undefined;
    if (filter) {
        const value = params.get(filter.key);
        if (value && filter.values.includes(value)) result.query = { [filter.key]: value };
    }
    // The studio tool keeps which of its five tools is open, so a legacy
    // deep link or reload lands on the same tool.
    if (route.space === 'library' && route.sub === 'studio') {
        const tool = params.get('tool') ?? undefined;
        if (includes(STUDIO_TOOLS, tool)) result.query = { tool };
    }

    const context: CareerContextHints = {};
    let hasContext = false;
    for (const key of CONTEXT_KEYS) {
        const value = params.get(key);
        if (value && isValidRouteId(value)) {
            context[key] = value;
            hasContext = true;
        }
    }
    if (hasContext) result.context = context;

    return result;
}

/** Query string for a career route, or '' — fixed key order so URLs are stable. */
function careerQueryString(route: CareerRoute): string {
    const params = new URLSearchParams();
    const filter = LIST_FILTERS[route.space];
    const filterValue = filter ? route.query?.[filter.key] : undefined;
    if (filter && filterValue && filter.values.includes(filterValue)) params.set(filter.key, filterValue);
    const tool = route.space === 'library' && route.sub === 'studio' ? route.query?.tool : undefined;
    if (includes(STUDIO_TOOLS, tool)) params.set('tool', tool);
    for (const key of CONTEXT_KEYS) {
        const value = route.context?.[key];
        if (isValidRouteId(value)) params.set(key, value);
    }
    const query = params.toString();
    return query ? `?${query}` : '';
}

const enc = encodeURIComponent;

/** Path (without query) for a career route. */
function careerPathname(route: CareerRoute): string {
    const { space, sub, id, section } = route;
    switch (space) {
        case 'today':
            return '/app/today';
        case 'career': {
            if (sub === 'goals' && id) return `/app/career/goals/${enc(id)}`;
            return !sub || sub === 'overview' ? '/app/career' : `/app/career/${enc(sub)}`;
        }
        case 'opportunities':
        case 'campaigns':
        case 'coach':
            return id ? `/app/${space}/${enc(id)}` : `/app/${space}`;
        case 'applications': {
            if (!id) return '/app/applications';
            const base = `/app/applications/${enc(id)}`;
            return section && section !== 'analysis' ? `${base}/${enc(section)}` : base;
        }
        case 'library': {
            if (!sub) return '/app/library';
            if (sub === 'cvs') {
                if (id) return `/app/library/cvs/${enc(id)}/edit`;
                return '/app/library/cvs/new';
            }
            if (sub === 'documents' && id) return `/app/library/documents/${enc(id)}`;
            return `/app/library/${enc(sub)}`;
        }
        case 'settings':
            return sub ? `/app/settings/${enc(sub)}` : '/app/settings';
        case 'not-found':
            return '/app/not-found';
        default:
            return `/app/${space}`;
    }
}

/** Serialises a route to the path (and query) that should appear in the URL. */
export function routeToPath(route: Route): string {
    switch (route.view) {
        case 'landing':
            return '/';
        case 'auth': {
            const next = route.next && route.next.view !== 'auth' ? routeToPath(route.next) : null;
            return next && next !== '/' ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in';
        }
        case 'dashboard': {
            const tab = route.dashboardTab ?? 'dashboard';
            return tab === 'dashboard' ? '/app' : `/app/${tab}`;
        }
        case 'builder':
            return route.resumeId ? `/builder/${encodeURIComponent(route.resumeId)}` : '/builder';
        case 'resources':
            return '/resources';
        case 'pricing':
            return '/pricing';
        case 'legal':
            return `/legal/${route.legalTab ?? 'privacy'}`;
        case 'career':
            return `${careerPathname(route)}${careerQueryString(route)}`;
        default:
            return '/';
    }
}

const safeDecode = (segment: string): string => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
};

/**
 * Parses the segments after `/app/` that are not a legacy dashboard tab.
 * Every id is checked against ID_PATTERN; a section or subview must be one of
 * the known names. Anything that does not fit is not-found rather than a
 * guess at a neighbouring screen — a missing id must never open another record.
 */
function parseCareerPath(segments: string[], search: string): CareerRoute {
    const [space, second, third, fourth, ...rest] = segments;
    if (rest.length > 0) return NOT_FOUND;

    const done = (route: CareerRoute) => parseCareerQuery(route, search);
    const subject = (id: string | undefined, route: (id: string) => CareerRoute): CareerRoute =>
        isValidRouteId(id) ? done(route(id)) : NOT_FOUND;

    switch (space) {
        case 'today':
        case 'search':
        case 'notifications':
        case 'billing':
        case 'admin':
            return second === undefined ? done({ view: 'career', space }) : NOT_FOUND;
        case 'career': {
            if (second === undefined) return done({ view: 'career', space, sub: 'overview' });
            if (!includes(CAREER_SUBVIEWS, second)) return NOT_FOUND;
            if (third === undefined) return done({ view: 'career', space, sub: second });
            if (second !== 'goals' || fourth !== undefined) return NOT_FOUND;
            return subject(third, (id) => ({ view: 'career', space, sub: 'goals', id }));
        }
        case 'opportunities':
        case 'campaigns':
        case 'coach': {
            if (second === undefined) return done({ view: 'career', space });
            if (third !== undefined) return NOT_FOUND;
            return subject(second, (id) => ({ view: 'career', space, id }));
        }
        case 'applications': {
            if (second === undefined) return done({ view: 'career', space });
            if (fourth !== undefined) return NOT_FOUND;
            if (third !== undefined && !isApplicationSection(third)) return NOT_FOUND;
            const section = third ?? 'analysis';
            return subject(second, (id) => ({ view: 'career', space, id, section }));
        }
        case 'library': {
            if (second === undefined) return done({ view: 'career', space });
            if (includes(LIBRARY_TOOLS, second)) {
                return third === undefined ? done({ view: 'career', space, sub: second }) : NOT_FOUND;
            }
            if (second === 'cvs') {
                if (third === 'new' && fourth === undefined) {
                    return done({ view: 'career', space, sub: 'cvs', section: 'new' });
                }
                if (third !== undefined && fourth === 'edit') {
                    return subject(third, (id) => ({ view: 'career', space, sub: 'cvs', id, section: 'edit' }));
                }
                return NOT_FOUND;
            }
            if (second === 'documents' && third !== undefined && fourth === undefined) {
                return subject(third, (id) => ({ view: 'career', space, sub: 'documents', id }));
            }
            return NOT_FOUND;
        }
        case 'settings': {
            if (second === undefined) return done({ view: 'career', space });
            return second === 'integrations' && third === undefined
                ? done({ view: 'career', space, sub: 'integrations' })
                : NOT_FOUND;
        }
        default:
            return NOT_FOUND;
    }
}

/**
 * Parses a location into a route. `search` is consulted for `?next=` on the
 * sign-in path and for the validated filters/context hints of a career route.
 * Anything unrecognised at the top level lands on the landing page; anything
 * unrecognised under /app is a career not-found.
 */
export function pathToRoute(pathname: string, search = ''): Route {
    const segments = pathname.split('/').filter(Boolean).map(safeDecode);
    const [head, second, ...rest] = segments;

    if (!head) return { view: 'landing' };

    if (head === 'app') {
        if (!second) return { view: 'dashboard', dashboardTab: 'dashboard' };
        if (rest.length === 0 && isDashboardTab(second)) return { view: 'dashboard', dashboardTab: second };
        return parseCareerPath(segments.slice(1), search);
    }

    if (rest.length > 0) return { view: 'landing' };

    switch (head) {
        case 'sign-in': {
            if (second) return { view: 'landing' };
            const nextParam = new URLSearchParams(search).get('next');
            if (!nextParam || !nextParam.startsWith('/')) return { view: 'auth' };
            const [nextPath, nextSearch = ''] = nextParam.split('?', 2);
            const next = pathToRoute(nextPath, nextSearch ? `?${nextSearch}` : '');
            return next.view === 'auth' || next.view === 'landing' ? { view: 'auth' } : { view: 'auth', next };
        }
        case 'builder':
            return { view: 'builder', resumeId: second ?? null };
        case 'resources':
            return second ? { view: 'landing' } : { view: 'resources' };
        case 'pricing':
            return second ? { view: 'landing' } : { view: 'pricing' };
        case 'legal':
            if (!second) return { view: 'legal', legalTab: 'privacy' };
            return isLegalTab(second) ? { view: 'legal', legalTab: second } : { view: 'landing' };
        default:
            return { view: 'landing' };
    }
}

/* ----------------------------------------------------------------------------
 * Career route builders and the legacy <-> career ledger
 * ------------------------------------------------------------------------- */

const career = (route: Omit<CareerRoute, 'view'>): CareerRoute => ({ view: 'career', ...route });

/**
 * Typed builders for the routes a screen can send someone to. They return
 * routes (pass them to `navigate`); `routeToPath` turns one into a URL.
 */
export const careerPath = {
    toSpace: (space: CareerSpace, query?: Record<string, string>): CareerRoute =>
        career(query ? { space, query } : { space }),
    toCareer: (sub: CareerSubview = 'overview'): CareerRoute => career({ space: 'career', sub }),
    toGoal: (goalId: string): CareerRoute => career({ space: 'career', sub: 'goals', id: goalId }),
    toOpportunity: (opportunityId: string, context?: CareerContextHints): CareerRoute =>
        career(context ? { space: 'opportunities', id: opportunityId, context } : { space: 'opportunities', id: opportunityId }),
    toCampaign: (campaignId: string): CareerRoute => career({ space: 'campaigns', id: campaignId }),
    toApplication: (
        applicationId: string,
        section: ApplicationSection = 'analysis',
        context?: CareerContextHints,
    ): CareerRoute =>
        career(
            context
                ? { space: 'applications', id: applicationId, section, context }
                : { space: 'applications', id: applicationId, section },
        ),
    toCoach: (conversationId?: string, context?: CareerContextHints): CareerRoute =>
        career({
            space: 'coach',
            ...(conversationId ? { id: conversationId } : {}),
            ...(context ? { context } : {}),
        }),
    toLibrary: (type?: (typeof LIBRARY_TYPES)[number]): CareerRoute =>
        career(type ? { space: 'library', query: { type } } : { space: 'library' }),
    toLibraryTool: (tool: (typeof LIBRARY_TOOLS)[number]): CareerRoute => career({ space: 'library', sub: tool }),
    toStudio: (tool?: StudioTool): CareerRoute => career(tool ? { space: 'library', sub: 'studio', query: { tool } } : { space: 'library', sub: 'studio' }),
    toNewCv: (): CareerRoute => career({ space: 'library', sub: 'cvs', section: 'new' }),
    toCvEdit: (resumeId: string, context?: CareerContextHints): CareerRoute =>
        career(
            context
                ? { space: 'library', sub: 'cvs', id: resumeId, section: 'edit', context }
                : { space: 'library', sub: 'cvs', id: resumeId, section: 'edit' },
        ),
    toDocument: (documentId: string): CareerRoute => career({ space: 'library', sub: 'documents', id: documentId }),
    toIntegrations: (): CareerRoute => career({ space: 'settings', sub: 'integrations' }),
    notFound: (): CareerRoute => NOT_FOUND,
};

/**
 * The IA ledger's canonical destination for each legacy dashboard tab. This
 * documents where a tab goes once its replacement is qualified; nothing applies
 * it automatically — during rollout the old view stays functional.
 */
export const LEGACY_TO_CAREER: Record<DashboardTab, CareerRoute> = {
    dashboard: career({ space: 'today' }),
    resumes: career({ space: 'library', query: { type: 'cv' } }),
    templates: career({ space: 'library', sub: 'templates' }),
    profile: career({ space: 'career', sub: 'profile' }),
    'smart-studio': career({ space: 'library', sub: 'studio' }),
    ats: career({ space: 'library', sub: 'ats' }),
    billing: career({ space: 'billing' }),
    prism: career({ space: 'library', sub: 'tailor' }),
    settings: career({ space: 'settings' }),
    admin: career({ space: 'admin' }),
};

/**
 * The closest legacy tab for a career space, used while the Career OS flag is
 * off so a nested link still opens something useful instead of a missing
 * screen ("disabled destinations retain legacy fallback").
 */
export function legacyTabForSpace(space: CareerSpace): DashboardTab {
    switch (space) {
        case 'library':
            return 'resumes';
        case 'career':
            return 'profile';
        case 'settings':
            return 'settings';
        case 'billing':
            return 'billing';
        case 'admin':
            return 'admin';
        default:
            return 'dashboard';
    }
}

const readDepth = (state: unknown): number | null => {
    const depth = (state as { cvbaseDepth?: unknown } | null)?.cvbaseDepth;
    return typeof depth === 'number' && Number.isFinite(depth) ? depth : null;
};

/**
 * Writes an entry to window.history with the route's URL. If the platform
 * refuses a path (file:// origins, some embedded WebViews) it retries with no
 * URL so the in-memory stack and the platform back stack still stay in step.
 */
function writeHistory(method: 'pushState' | 'replaceState', depth: number, route: Route): void {
    const state = { cvbaseDepth: depth };
    try {
        window.history[method](state, '', routeToPath(route));
    } catch {
        try {
            window.history[method](state, '');
        } catch {
            /* history unavailable — in-memory stack still works */
        }
    }
}

interface NavigationContextValue {
    route: Route;
    /** 'forward' on push, 'backward' on pop — drives the page transition. */
    direction: 'forward' | 'backward';
    canGoBack: boolean;
    navigate: (route: Route) => void;
    /** Replaces the current entry instead of stacking a new one. */
    replace: (route: Route) => void;
    /** Unwinds one entry. Returns false when already at the root. */
    back: () => boolean;
    /** Returns to the root entry (used by "back to landing" affordances). */
    reset: (route: Route) => void;
    /**
     * Registers a handler that receives back actions before the stack does.
     * The most recently registered handler runs first. Returns an unsubscribe.
     */
    registerBackHandler: (handler: BackHandler) => () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

/**
 * The app opens on the marketing page on both web and native. Someone who has
 * just installed the app still needs to be told what it does before being asked
 * to create an account — a cold sign-in screen gives them no reason to sign up.
 * Auth happens when they act on a call to action (see `requireAuth` in App.tsx).
 */
const ROOT: Route = { view: 'landing' };

/** The route the page was opened on. Deep links work; junk lands on ROOT. */
const initialRoute = (): Route => {
    try {
        return pathToRoute(window.location.pathname, window.location.search);
    } catch {
        return ROOT;
    }
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stack, setStack] = useState<Route[]>(() => [initialRoute()]);
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

    // Read by listeners that are registered once and must not capture stale state.
    const stackRef = useRef(stack);
    stackRef.current = stack;

    // Stamp the entry the page opened on so popstate can tell it apart from
    // entries we pushed. The URL is left exactly as opened (query included —
    // App.tsx reads ?mode=preview from it).
    useEffect(() => {
        try {
            window.history.replaceState({ cvbaseDepth: 1 }, '');
        } catch {
            /* history unavailable */
        }
    }, []);

    const backHandlersRef = useRef<BackHandler[]>([]);

    const registerBackHandler = useCallback((handler: BackHandler) => {
        backHandlersRef.current.push(handler);
        return () => {
            backHandlersRef.current = backHandlersRef.current.filter((h) => h !== handler);
        };
    }, []);

    /** Runs interceptors newest-first. True means one of them consumed the action. */
    const runBackHandlers = useCallback((): boolean => {
        const handlers = [...backHandlersRef.current].reverse();
        return handlers.some((handler) => handler());
    }, []);

    const navigate = useCallback((route: Route) => {
        setDirection('forward');
        const next = [...stackRef.current, route];
        stackRef.current = next;
        writeHistory('pushState', next.length, route);
        setStack(next);
        window.scrollTo(0, 0);
    }, []);

    const replace = useCallback((route: Route) => {
        setDirection('forward');
        const next = [...stackRef.current.slice(0, -1), route];
        stackRef.current = next;
        writeHistory('replaceState', next.length, route);
        setStack(next);
        window.scrollTo(0, 0);
    }, []);

    /** Pops the in-memory stack. Kept separate so popstate does not re-enter history. */
    const popStack = useCallback((): boolean => {
        if (stackRef.current.length <= 1) return false;
        const next = stackRef.current.slice(0, -1);
        stackRef.current = next;
        setDirection('backward');
        setStack(next);
        window.scrollTo(0, 0);
        return true;
    }, []);

    const back = useCallback((): boolean => {
        if (runBackHandlers()) return true;
        if (stackRef.current.length <= 1) return false;
        // Delegates to history so the platform's own back stack stays in step;
        // the popstate listener performs the actual pop.
        try {
            window.history.back();
        } catch {
            popStack();
        }
        return true;
    }, [popStack, runBackHandlers]);

    const reset = useCallback((route: Route) => {
        setDirection('backward');
        stackRef.current = [route];
        writeHistory('replaceState', 1, route);
        setStack([route]);
        window.scrollTo(0, 0);
    }, []);

    // Browser / gesture back (and forward). Each entry we push carries its
    // depth, so a popstate can be classified: a lower depth unwinds the stack
    // to that point, anything else (forward button, an entry we did not
    // write) is read from the URL.
    useEffect(() => {
        const onPopState = (event: PopStateEvent) => {
            if (runBackHandlers()) {
                // A modal consumed it — restore the entry the browser just removed.
                writeHistory('pushState', stackRef.current.length, stackRef.current[stackRef.current.length - 1]);
                return;
            }
            const current = stackRef.current;
            const depth = readDepth(event.state);
            if (depth !== null && depth < current.length) {
                if (depth === current.length - 1) {
                    popStack();
                    return;
                }
                const next = current.slice(0, Math.max(1, depth));
                stackRef.current = next;
                setDirection('backward');
                setStack(next);
                window.scrollTo(0, 0);
                return;
            }
            const route = pathToRoute(window.location.pathname, window.location.search);
            const next = depth !== null && depth > current.length ? [...current, route] : [...current.slice(0, -1), route];
            stackRef.current = next;
            setDirection('forward');
            setStack(next);
            window.scrollTo(0, 0);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [popStack, runBackHandlers]);

    // Android hardware back button.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let remove: (() => void) | undefined;
        let cancelled = false;

        void (async () => {
            try {
                const { App: CapacitorApp } = await import('@capacitor/app');
                const handle = await CapacitorApp.addListener('backButton', () => {
                    if (runBackHandlers()) return;
                    if (stackRef.current.length > 1) {
                        try {
                            window.history.back();
                        } catch {
                            popStack();
                        }
                        return;
                    }
                    // At the root screen, back exits — the platform convention.
                    void CapacitorApp.exitApp();
                });
                if (cancelled) {
                    void handle.remove();
                } else {
                    remove = () => void handle.remove();
                }
            } catch {
                /* plugin unavailable — web build keeps using popstate only */
            }
        })();

        return () => {
            cancelled = true;
            remove?.();
        };
    }, [popStack, runBackHandlers]);

    const route = stack[stack.length - 1];

    const value = useMemo<NavigationContextValue>(
        () => ({
            route,
            direction,
            canGoBack: stack.length > 1,
            navigate,
            replace,
            back,
            reset,
            registerBackHandler,
        }),
        [route, direction, stack.length, navigate, replace, back, reset, registerBackHandler],
    );

    return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationContextValue => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

/**
 * Lets a modal or drawer consume the back action while it is open.
 *
 * @param active  Whether the surface is currently open.
 * @param onBack  Called instead of navigating back.
 */
export const useBackHandler = (active: boolean, onBack: () => void): void => {
    const { registerBackHandler } = useNavigation();
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;

    useEffect(() => {
        if (!active) return;
        return registerBackHandler(() => {
            onBackRef.current();
            return true;
        });
    }, [active, registerBackHandler]);
};
