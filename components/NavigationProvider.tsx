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

export type ViewState = 'landing' | 'dashboard' | 'builder' | 'resources' | 'pricing' | 'legal';

export interface Route {
    view: ViewState;
    /** Active dashboard segment, when view === 'dashboard'. */
    dashboardTab?: DashboardTab;
    /** Resume being edited, when view === 'builder'. null means a fresh CV. */
    resumeId?: string | null;
    /** Active legal document, when view === 'legal'. */
    legalTab?: LegalTab;
}

/** Returns true if the handler consumed the back action. */
export type BackHandler = () => boolean;

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

const ROOT: Route = { view: 'landing' };

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stack, setStack] = useState<Route[]>([ROOT]);
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

    // Read by listeners that are registered once and must not capture stale state.
    const stackRef = useRef(stack);
    stackRef.current = stack;

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
        setStack((current) => {
            try {
                window.history.pushState({ cvbaseDepth: current.length + 1 }, '');
            } catch {
                /* history unavailable — in-memory stack still works */
            }
            return [...current, route];
        });
        window.scrollTo(0, 0);
    }, []);

    const replace = useCallback((route: Route) => {
        setDirection('forward');
        setStack((current) => [...current.slice(0, -1), route]);
        window.scrollTo(0, 0);
    }, []);

    /** Pops the in-memory stack. Kept separate so popstate does not re-enter history. */
    const popStack = useCallback((): boolean => {
        if (stackRef.current.length <= 1) return false;
        setDirection('backward');
        setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
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
        setStack([route]);
        window.scrollTo(0, 0);
    }, []);

    // Browser / gesture back.
    useEffect(() => {
        const onPopState = () => {
            if (runBackHandlers()) {
                // A modal consumed it — restore the entry the browser just removed.
                try {
                    window.history.pushState({ cvbaseDepth: stackRef.current.length }, '');
                } catch {
                    /* ignore */
                }
                return;
            }
            popStack();
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
