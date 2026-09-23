import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A deliberately small read cache for Career OS screens. Every entry is keyed
 * by the signed-in user plus the caller's own key (which should include the
 * entity id and, where known, the revision), so an account switch can never
 * serve another person's rows and a stale revision never shadows a fresh one.
 *
 * It is not a general query library: no background refetching, no
 * deduplicated mutations. Screens call `invalidate(prefix)` after a durable
 * write and re-run their loaders. `clearOwnedQueries()` runs on sign-out.
 */

interface Entry<T> {
    value: T;
    at: number;
}

const cache = new Map<string, Entry<unknown>>();
const listeners = new Set<(key: string) => void>();

const scoped = (userId: string | null, key: string): string => `${userId ?? 'anon'}::${key}`;

/** Drops every cached entry whose key starts with `prefix` for that user. */
export function invalidateOwnedQueries(userId: string | null, prefix = ''): void {
    const head = scoped(userId, prefix);
    for (const key of [...cache.keys()]) {
        if (key.startsWith(head)) {
            cache.delete(key);
            listeners.forEach((l) => l(key));
        }
    }
}

/** Sign-out / account switch: nothing may survive into the next session. */
export function clearOwnedQueries(): void {
    cache.clear();
    listeners.forEach((l) => l('*'));
}

export interface OwnedQuery<T> {
    data: T | null;
    error: unknown;
    loading: boolean;
    /** Re-run the loader, bypassing the cache. */
    refresh: () => Promise<void>;
    /** Optimistically replace the cached value (after a confirmed write). */
    setData: (next: T) => void;
}

/**
 * @param userId  Owner scope; `null` disables loading (signed-out).
 * @param key     Cache key such as `application:${id}` — include revisions when known.
 * @param loader  Async loader; errors are surfaced, never swallowed.
 * @param deps    Extra dependencies that should re-run the loader.
 */
export function useOwnedQuery<T>(
    userId: string | null,
    key: string | null,
    loader: () => Promise<T>,
    deps: unknown[] = [],
): OwnedQuery<T> {
    const fullKey = key ? scoped(userId, key) : null;
    const cached = fullKey ? (cache.get(fullKey) as Entry<T> | undefined) : undefined;
    const [data, setDataState] = useState<T | null>(cached?.value ?? null);
    const [error, setError] = useState<unknown>(null);
    const [loading, setLoading] = useState<boolean>(!!fullKey && !cached);
    const loaderRef = useRef(loader);
    loaderRef.current = loader;
    const versionRef = useRef(0);

    const run = useCallback(async (force: boolean) => {
        if (!fullKey || !userId) {
            setDataState(null);
            setLoading(false);
            return;
        }
        const hit = cache.get(fullKey) as Entry<T> | undefined;
        if (hit && !force) {
            setDataState(hit.value);
            setLoading(false);
            return;
        }
        const version = ++versionRef.current;
        setLoading(true);
        setError(null);
        try {
            const value = await loaderRef.current();
            if (version !== versionRef.current) return; // superseded by a newer run
            cache.set(fullKey, { value, at: Date.now() });
            setDataState(value);
        } catch (err) {
            if (version !== versionRef.current) return;
            setError(err);
        } finally {
            if (version === versionRef.current) setLoading(false);
        }
    }, [fullKey, userId]);

    useEffect(() => {
        void run(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, ...deps]);

    // Re-run when this key (or everything) is invalidated elsewhere.
    useEffect(() => {
        if (!fullKey) return;
        const onInvalidate = (key: string) => {
            if (key === '*' || key === fullKey) void run(true);
        };
        listeners.add(onInvalidate);
        return () => { listeners.delete(onInvalidate); };
    }, [fullKey, run]);

    const refresh = useCallback(() => run(true), [run]);
    const setData = useCallback((next: T) => {
        if (fullKey) cache.set(fullKey, { value: next, at: Date.now() });
        setDataState(next);
    }, [fullKey]);

    return { data, error, loading, refresh, setData };
}
