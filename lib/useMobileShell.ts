import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * True when the app should render the native-feeling mobile shell (bottom tab
 * bar, push navigation, sheets) instead of the desktop sidebar/toolbar layout.
 *
 * Native platforms always get the mobile shell, at any window size — a
 * tablet-size packaged app is still a native app, not a desktop browser.
 * On the web, it tracks the same `lg` (1024px) breakpoint the existing
 * sidebar drawers already switch on, so there's no width band running a third,
 * in-between layout.
 */
const BREAKPOINT_QUERY = '(max-width: 1023px)';

const isNarrowViewport = (): boolean => {
    try {
        return window.matchMedia(BREAKPOINT_QUERY).matches;
    } catch {
        return false;
    }
};

export const useMobileShell = (): boolean => {
    const isNative = useMemo(() => Capacitor.isNativePlatform(), []);
    const [isNarrow, setIsNarrow] = useState(isNarrowViewport);

    useEffect(() => {
        if (isNative) return; // native is always mobile-shell; no listener needed
        let media: MediaQueryList;
        try {
            media = window.matchMedia(BREAKPOINT_QUERY);
        } catch {
            return;
        }
        const onChange = () => setIsNarrow(media.matches);
        onChange();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [isNative]);

    return isNative || isNarrow;
};
