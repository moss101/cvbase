import { Capacitor } from '@capacitor/core';
import { getSupabase } from './supabase';

/**
 * Passwordless auth plumbing shared by web and the packaged apps.
 *
 * Three methods, no passwords: a 6-digit email code, a magic link, and Google.
 *
 * ## Why the code and the link arrive in the same email
 *
 * `signInWithOtp` does not choose between them — the *email template* does.
 * Supabase sends a magic link unless the template renders `{{ .Token }}`, in
 * which case it sends a code. There is no per-request flag, so two separate
 * flows would need two templates, which a project does not have.
 *
 * The template therefore renders both: a 6-digit code and a link built from
 * `{{ .TokenHash }}`. One email, and the user takes whichever is convenient —
 * typing the code on the device they requested it from, or tapping the link
 * from their mail app. `verifyOtp` accepts either. See docs/AUTH.md for the
 * template.
 *
 * ## Why PKCE
 *
 * The implicit flow returns tokens in the URL fragment, which never reaches the
 * app on a native deep link and leaks into history on the web. PKCE returns a
 * short-lived `code` in the query string that is exchanged for a session, which
 * works identically in both places.
 */

/** Scheme registered by the native apps. Must match capacitor.config.ts appId. */
export const NATIVE_AUTH_SCHEME = 'ai.cvbase.app';
export const NATIVE_AUTH_REDIRECT = `${NATIVE_AUTH_SCHEME}://auth-callback`;

/**
 * Where the provider should send the user back to.
 *
 * On the web this is an https origin the SDK can complete in-page; on device it
 * is the custom scheme, which the OS routes back into the app as an
 * `appUrlOpen` event. Both must be listed in the Supabase redirect allow list.
 */
export function authRedirectUrl(): string {
    if (Capacitor.isNativePlatform()) return NATIVE_AUTH_REDIRECT;
    return `${window.location.origin}/`;
}

/**
 * Sends the sign-in email. The same call covers both the code and the link —
 * see the note above.
 *
 * @param createIfMissing false turns this into sign-in-only, which is what the
 *   admin flows want; the default true is the normal "sign in or sign up in one
 *   step" behaviour a passwordless product needs.
 */
export async function sendEmailAuth(email: string, createIfMissing = true): Promise<void> {
    const { error } = await getSupabase().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
            shouldCreateUser: createIfMissing,
            emailRedirectTo: authRedirectUrl(),
        },
    });
    if (error) throw error;
}

/** Exchanges the 6-digit code for a session. */
export async function verifyEmailCode(email: string, token: string): Promise<void> {
    const { error } = await getSupabase().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        // 'email' covers both the code and the magic-link token hash.
        type: 'email',
    });
    if (error) throw error;
}

/**
 * Google sign-in.
 *
 * On the web the SDK can navigate the page itself. On device it must not:
 * Google refuses OAuth inside an embedded WebView (`disallowed_useragent`), so
 * the consent screen is opened in the system browser and the result comes back
 * through the deep link handled by `completeAuthFromUrl`.
 */
export async function signInWithGoogle(): Promise<void> {
    const supabase = getSupabase();
    const native = Capacitor.isNativePlatform();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: authRedirectUrl(),
            skipBrowserRedirect: native,
        },
    });
    if (error) throw error;
    if (!native || !data?.url) return;

    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
}

/**
 * Completes a redirect that arrived as a deep link.
 *
 * Returns true when a session was established, so the caller knows whether the
 * URL was actually an auth callback. Handles both shapes we can receive:
 * a PKCE `code`, and `access_token`/`refresh_token` in the fragment (which a
 * recovery or invite link can still use).
 */
export async function completeAuthFromUrl(rawUrl: string): Promise<boolean> {
    const supabase = getSupabase();
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return false;
    }

    const code = url.searchParams.get('code');
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return true;
    }

    // Fragment form: #access_token=...&refresh_token=...
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        if (error) throw error;
        return true;
    }

    // An `error_description` here means the provider rejected the attempt.
    const providerError = url.searchParams.get('error_description') ?? fragment.get('error_description');
    if (providerError) throw new Error(providerError);

    return false;
}

/**
 * Routes native deep links into `completeAuthFromUrl` and closes the system
 * browser once a session exists. No-op on the web, where the SDK's
 * `detectSessionInUrl` already handles the return trip.
 *
 * @returns an unsubscribe function.
 */
export function listenForAuthDeepLinks(onError?: (message: string) => void): () => void {
    if (!Capacitor.isNativePlatform()) return () => {};

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
        try {
            const { App } = await import('@capacitor/app');
            const handle = await App.addListener('appUrlOpen', ({ url }) => {
                void (async () => {
                    try {
                        const signedIn = await completeAuthFromUrl(url);
                        if (signedIn) {
                            const { Browser } = await import('@capacitor/browser');
                            await Browser.close().catch(() => {
                                /* already closed by the user */
                            });
                        }
                    } catch (err) {
                        onError?.(err instanceof Error ? err.message : 'Sign-in could not be completed.');
                    }
                })();
            });
            if (cancelled) void handle.remove();
            else removeListener = () => void handle.remove();
        } catch {
            /* plugin unavailable — nothing to listen to */
        }
    })();

    return () => {
        cancelled = true;
        removeListener?.();
    };
}
