import { useEffect, useState } from 'react';
import { getSupabase } from '../supabase';

/**
 * Client-side feature gate for the Career OS rollout.
 *
 * Mirrors the server gate (`enabled` + rollout bucket) that PRISM already uses:
 * a flag row in `feature_flags` and an FNV-1a bucket of the user id, so the
 * same person lands on the same side of every percentage in the client and in
 * every edge function. The gate fails closed — no user, no row, a network
 * error or a thrown client all mean "off" — because the legacy screen is
 * always a safe place to land and a half-rendered new one is not.
 */

export const CAREER_OS_FLAG = 'career_os';

/** FNV-1a over the user id, reduced to a 0–99 percentage bucket. */
export function rolloutBucket(userId: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < userId.length; i++) {
        h ^= userId.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % 100;
}

/**
 * Whether `flag` is on for this user. Never throws; anything unexpected is `false`.
 * A signed-out visitor has no rollout bucket, so they get the flag only once it
 * is fully rolled out (100%) — a partial rollout never reaches anonymous traffic.
 */
export async function isFlagEnabled(flag: string, userId: string | null): Promise<boolean> {
    try {
        const { data } = await getSupabase()
            .from('feature_flags')
            .select('enabled,rollout_pct')
            .eq('flag', flag)
            .maybeSingle();
        if (!data?.enabled) return false;
        const pct = typeof data.rollout_pct === 'number' ? data.rollout_pct : 0;
        if (!userId) return pct >= 100;
        return rolloutBucket(userId) < pct;
    } catch {
        return false;
    }
}

// One answer per flag+user for the life of the page. A flag is an operator
// decision, not live data: flipping it mid-session would swap someone's shell
// out from under them, so a reload is the deliberate way to pick it up.
const resolved = new Map<string, boolean>();
const pending = new Map<string, Promise<boolean>>();

const GUEST = 'guest';
const cacheKey = (flag: string, userId: string | null) => `${flag}:${userId ?? GUEST}`;

function resolveFlag(flag: string, userId: string | null): Promise<boolean> {
    const key = cacheKey(flag, userId);
    const known = resolved.get(key);
    if (known !== undefined) return Promise.resolve(known);
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const promise = isFlagEnabled(flag, userId).then((value) => {
        resolved.set(key, value);
        pending.delete(key);
        return value;
    });
    pending.set(key, promise);
    return promise;
}

/** Test hook: forgets every cached answer. */
export function __resetFlagCache(): void {
    resolved.clear();
    pending.clear();
}

/**
 * `true` once the Career OS flag is known to be on for this user, `false` when
 * it is off (or there is no user), and `null` while the first lookup for this
 * user is still in flight. A cached answer resolves on the first render, so a
 * tab switch never flashes the wrong shell.
 */
export function useCareerOsEnabled(userId: string | null): boolean | null {
    const [state, setState] = useState<{ userId: string | null; value: boolean | null }>(() => ({
        userId,
        value: resolved.get(cacheKey(CAREER_OS_FLAG, userId)) ?? null,
    }));

    useEffect(() => {
        const settle = (value: boolean | null) =>
            setState((prev) => (prev.userId === userId && prev.value === value ? prev : { userId, value }));
        const known = resolved.get(cacheKey(CAREER_OS_FLAG, userId));
        if (known !== undefined) {
            settle(known);
            return;
        }
        let cancelled = false;
        settle(null);
        void resolveFlag(CAREER_OS_FLAG, userId).then((value) => {
            if (!cancelled) settle(value);
        });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    // A stale answer for a previous account must never gate the next one.
    return state.userId === userId ? state.value : null;
}
