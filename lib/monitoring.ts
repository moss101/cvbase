/**
 * Error monitoring facade.
 *
 * Sentry is only loaded — and only talks to the network — when a DSN is
 * configured (`VITE_SENTRY_DSN` / `SENTRY_DSN`). Without one every call here is
 * a no-op, apart from a `console.error` in dev so failures are still visible
 * while working locally. The SDK is imported lazily so it never sits in the
 * entry chunk of the packaged apps or the landing page.
 */

import { getClientEnv } from '../config/env';

type SentryModule = typeof import('@sentry/react');

let sentryPromise: Promise<SentryModule | null> | null = null;
let enabled = false;

function isDev(): boolean {
    try {
        return Boolean(import.meta.env.DEV);
    } catch {
        return false;
    }
}

function readDsn(): string {
    try {
        return getClientEnv().sentryDsn;
    } catch {
        // Missing Supabase env is reported elsewhere; monitoring must never be
        // the thing that takes the app down.
        return '';
    }
}

/** Starts Sentry when a DSN is present. Safe to call more than once. */
export function initMonitoring(): void {
    if (sentryPromise) return;
    const dsn = readDsn();
    if (!dsn) {
        sentryPromise = Promise.resolve(null);
        return;
    }
    enabled = true;
    sentryPromise = import('@sentry/react')
        .then((Sentry) => {
            Sentry.init({
                dsn,
                environment: isDev() ? 'development' : 'production',
                // Errors only — no performance tracing, no session replay.
                tracesSampleRate: 0,
                sendDefaultPii: false,
            });
            return Sentry;
        })
        .catch((err) => {
            enabled = false;
            if (isDev()) console.error('[monitoring] Sentry failed to load', err);
            return null;
        });
}

/** Whether a DSN was configured and the SDK is (being) loaded. */
export function isMonitoringEnabled(): boolean {
    return enabled;
}

/**
 * Reports an exception with optional structured context. Calls made before
 * the SDK finishes loading are queued behind the import.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
    if (isDev()) console.error('[monitoring]', err, context ?? '');
    if (!enabled || !sentryPromise) return;
    void sentryPromise.then((Sentry) => {
        if (!Sentry) return;
        Sentry.captureException(err, context ? { extra: context } : undefined);
    });
}

/** Associates subsequent reports with a user id (or clears it on sign-out). */
export function setUser(id: string | null): void {
    if (!enabled || !sentryPromise) return;
    void sentryPromise.then((Sentry) => {
        if (!Sentry) return;
        Sentry.setUser(id ? { id } : null);
    });
}

/** Test-only: forget the loaded SDK so init can run again. */
export function __resetMonitoringForTests(): void {
    sentryPromise = null;
    enabled = false;
}
