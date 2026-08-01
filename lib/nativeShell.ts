import { Capacitor } from '@capacitor/core';

/**
 * One-time native shell setup for the packaged Android/iOS apps.
 *
 * Every call is guarded and best-effort: on the web build `isNativePlatform()`
 * is false and this is a no-op, and on native a plugin failure must never stop
 * the app from rendering.
 */
export const initNativeShell = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    const platform = Capacitor.getPlatform();

    // Keyboard: resize the WebView rather than letting it scroll under the
    // keyboard, and drop iOS's accessory bar which does not match the design.
    try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
        await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        if (platform === 'ios') {
            await Keyboard.setAccessoryBarVisible({ isVisible: false });
        }
    } catch {
        /* keyboard tuning is cosmetic */
    }

    /**
     * Status bar handling differs per platform.
     *
     * On iOS the WebView must extend *under* the status bar. Insetting it
     * instead leaves a band of the window background above the page, which
     * renders as black and ignores the theme. The layout already reserves the
     * right amount of room through the safe-area insets, so overlaying gives an
     * edge-to-edge page whose own background runs to the top of the screen.
     *
     * Android's status bar has a settable background colour, so it stays inset
     * and is tinted by ThemeProvider to match the active theme instead.
     */
    try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: platform === 'ios' });
    } catch {
        /* ignore */
    }

    // Hide the splash only once React has painted, so there is no white flash
    // between the splash disappearing and the first frame.
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch {
        /* ignore */
    }
};
