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

export type ViewState =
    | 'landing'
    | 'auth'
    | 'dashboard'
    | 'builder'
    | 'resources'
    | 'pricing'
    | 'legal';

export interface Route {
    view: ViewState;
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
 * Unknown paths resolve to the landing page. Query strings other than `next`
 * are left alone (App.tsx reads `?mode=preview&template=` itself).
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
 * Parses a location into a route. `search` is only consulted for `?next=` on
 * the sign-in path. Anything unrecognised lands on the landing page.
 */
export function pathToRoute(pathname: string, search = ''): Route {
    const segments = pathname.split('/').filter(Boolean).map(safeDecode);
    const [head, second, ...rest] = segments;

    if (!head) return { view: 'landing' };
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
        case 'app':
            if (!second) return { view: 'dashboard', dashboardTab: 'dashboard' };
            return isDashboardTab(second) ? { view: 'dashboard', dashboardTab: second } : { view: 'landing' };
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
