import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Appearance and personalization preferences, shared by the whole app.
 *
 * The `.dark` class this writes onto <html> is what drives the entire theme:
 * every colour in tailwind.config.js resolves to a CSS variable, and
 * styles/theme.css redefines those variables under `.dark`. Nothing else has to
 * know a theme exists.
 *
 * Preferences are stored in localStorage rather than @capacitor/preferences
 * because the inline bootstrap script in index.html has to read them
 * synchronously before first paint to avoid a flash of the wrong theme, and the
 * Capacitor Preferences API is async.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type TextScale = 'small' | 'default' | 'large' | 'xlarge';

const THEME_KEY = 'cvbase-theme';
const MOTION_KEY = 'cvbase-reduce-motion';
const TEXT_SCALE_KEY = 'cvbase-text-scale';

/** Root font size per scale. Tailwind sizing is rem-based, so this scales the
 *  whole UI. Resume templates are px-based and stay pixel-exact for export. */
const TEXT_SCALE_PX: Record<TextScale, number> = {
    small: 15,
    default: 16,
    large: 18,
    xlarge: 20,
};

export const TEXT_SCALE_LABELS: Record<TextScale, string> = {
    small: 'Small',
    default: 'Default',
    large: 'Large',
    xlarge: 'Extra large',
};

/** Matches the `paper` / `ui-light` surfaces in styles/theme.css. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
    light: '#FAF7F2',
    dark: '#15130F',
};

interface ThemeContextValue {
    /** What the user chose, including 'system'. */
    mode: ThemeMode;
    /** What is actually being displayed right now. */
    resolvedTheme: ResolvedTheme;
    setMode: (mode: ThemeMode) => void;
    /** Cycles light -> dark -> system, for the header button. */
    cycleMode: () => void;
    reduceMotion: boolean;
    setReduceMotion: (value: boolean) => void;
    textScale: TextScale;
    setTextScale: (scale: TextScale) => void;
    /** True inside the packaged Android/iOS apps. */
    isNative: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readStored = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    try {
        const value = localStorage.getItem(key);
        return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
    } catch {
        // Storage can be unavailable in private mode or a locked-down WebView.
        return fallback;
    }
};

const write = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* preference simply will not persist */
    }
};

const prefersDark = (): boolean => {
    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
        return false;
    }
};

const resolve = (mode: ThemeMode): ResolvedTheme =>
    mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<ThemeMode>(() =>
        readStored(THEME_KEY, ['light', 'dark', 'system'] as const, 'system'),
    );
    const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
        try {
            return localStorage.getItem(MOTION_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [textScale, setTextScaleState] = useState<TextScale>(() =>
        readStored(TEXT_SCALE_KEY, ['small', 'default', 'large', 'xlarge'] as const, 'default'),
    );
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(mode));

    const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

    // Re-resolve when the OS theme changes, but only while following 'system'.
    useEffect(() => {
        setResolvedTheme(resolve(mode));
        if (mode !== 'system') return;

        let media: MediaQueryList;
        try {
            media = window.matchMedia('(prefers-color-scheme: dark)');
        } catch {
            return;
        }
        const onChange = () => setResolvedTheme(prefersDark() ? 'dark' : 'light');
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [mode]);

    // Apply the theme to the document and the native status bar.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', resolvedTheme === 'dark');

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLOR[resolvedTheme]);

        if (!isNative) return;
        // Loaded lazily so the browser build never pulls in native plugin code.
        void (async () => {
            try {
                const { StatusBar, Style } = await import('@capacitor/status-bar');
                // `Style.Dark` means *light text on a dark bar*.
                await StatusBar.setStyle({
                    style: resolvedTheme === 'dark' ? Style.Dark : Style.Light,
                });
                if (Capacitor.getPlatform() === 'android') {
                    await StatusBar.setBackgroundColor({ color: THEME_COLOR[resolvedTheme] });
                }
            } catch {
                /* status bar is cosmetic — never break rendering over it */
            }
        })();
    }, [resolvedTheme, isNative]);

    useEffect(() => {
        const root = document.documentElement;
        if (reduceMotion) {
            root.setAttribute('data-reduce-motion', 'true');
        } else {
            root.removeAttribute('data-reduce-motion');
        }
    }, [reduceMotion]);

    useEffect(() => {
        document.documentElement.style.fontSize = `${TEXT_SCALE_PX[textScale]}px`;
    }, [textScale]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        write(THEME_KEY, next);
    }, []);

    const cycleMode = useCallback(() => {
        setModeState((current) => {
            const next: ThemeMode =
                current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
            write(THEME_KEY, next);
            return next;
        });
    }, []);

    const setReduceMotion = useCallback((value: boolean) => {
        setReduceMotionState(value);
        write(MOTION_KEY, String(value));
    }, []);

    const setTextScale = useCallback((scale: TextScale) => {
        setTextScaleState(scale);
        write(TEXT_SCALE_KEY, scale);
    }, []);

    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            resolvedTheme,
            setMode,
            cycleMode,
            reduceMotion,
            setReduceMotion,
            textScale,
            setTextScale,
            isNative,
        }),
        [
            mode,
            resolvedTheme,
            setMode,
            cycleMode,
            reduceMotion,
            setReduceMotion,
            textScale,
            setTextScale,
            isNative,
        ],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
