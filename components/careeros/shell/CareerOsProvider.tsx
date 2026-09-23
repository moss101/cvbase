import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../AuthProvider';
import { useNavigation, type CareerRoute } from '../../NavigationProvider';
import { fetchIsAdmin } from '../../../services/adminApi';
import * as careerProfileRepo from '../../../services/careerOs/careerProfileRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as notificationRepo from '../../../services/careerOs/notificationRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import { resolveContext, type ContextDeps } from '../../../services/careerOs/careerContext';
import { contextRouteFor } from './contextRoute';

export { contextRouteFor };
import type { CareerContext, CareerProfile } from '../../../services/careerOs/types';
import { NotFoundError } from '../../../services/careerOs/types';
import { clearOwnedQueries, invalidateOwnedQueries } from '../data/useOwnedQuery';
import { captureException } from '../../../lib/monitoring';

/**
 * Shell-level state for the Career OS: the signed-in user's career profile
 * (with the idempotent legacy backfill), the context resolved from the
 * current route, the admin flag and the inbox count. Screens read this
 * instead of resolving context themselves, so every consumer agrees on which
 * application/opportunity/goal is "current" (REQ-02, COS-006/COS-008).
 *
 * Nothing here holds document text. Selection and cache status live in this
 * provider; persisted rows stay in their repositories; unsaved inputs stay in
 * the screens that own them.
 */

export type MigrationState = 'idle' | 'running' | 'done' | 'failed';

export interface CareerOsValue {
    route: CareerRoute;
    userId: string | null;
    /** Career aggregate row; null while loading or signed out. */
    profile: CareerProfile | null;
    profileError: unknown;
    migration: MigrationState;
    /** Context resolved from the route's owned subject + validated hints. */
    context: CareerContext | null;
    contextLoading: boolean;
    contextError: unknown;
    isAdmin: boolean;
    unreadCount: number;
    refreshProfile: () => Promise<void>;
    refreshContext: () => Promise<void>;
    refreshInbox: () => Promise<void>;
    /** Invalidate cached reads after a durable write (prefix = cache key family). */
    invalidate: (prefix?: string) => void;
    openAuth: () => void;
}

const CareerOsContext = createContext<CareerOsValue | undefined>(undefined);

export const useCareerOs = (): CareerOsValue => {
    const value = useContext(CareerOsContext);
    if (!value) throw new Error('useCareerOs must be used within a CareerOsProvider');
    return value;
};

/** Repository surface handed to the resolver (owner-scoped, throws NotFoundError). */
const contextDeps: ContextDeps = {
    profile: { get: (userId) => careerProfileRepo.get(userId) },
    goals: { get: goalRepo.get, getPrimary: goalRepo.getPrimary },
    campaigns: { get: campaignRepo.get, listOpportunityIds: campaignRepo.listOpportunityIds },
    opportunities: { get: opportunityRepo.get },
    applications: { get: applicationRepo.get },
    documents: {
        get: async (userId, id) => {
            const resume = await resumeRepo.get(userId, id);
            if (!resume || !resume.id) throw new NotFoundError('document', id);
            return { id: resume.id, title: resume.title, revision: resume.revision ?? 0, applicationId: resume.applicationId ?? null };
        },
    },
};

interface ProviderProps {
    route: CareerRoute;
    onOpenAuth: () => void;
    children: React.ReactNode;
}

export const CareerOsProvider: React.FC<ProviderProps> = ({ route, onOpenAuth, children }) => {
    const { user } = useAuth();
    const { replace } = useNavigation();
    const userId = user?.id ?? null;

    const [profile, setProfile] = useState<CareerProfile | null>(null);
    const [profileError, setProfileError] = useState<unknown>(null);
    const [migration, setMigration] = useState<MigrationState>('idle');
    const [context, setContext] = useState<CareerContext | null>(null);
    const [contextLoading, setContextLoading] = useState(false);
    const [contextError, setContextError] = useState<unknown>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Sign-out / account switch: nothing from the previous account may be
    // visible, cached or resolved for the next one.
    const previousUser = useRef<string | null>(null);
    useEffect(() => {
        if (previousUser.current !== userId) {
            clearOwnedQueries();
            setProfile(null);
            setContext(null);
            setMigration('idle');
            setUnreadCount(0);
            setIsAdmin(false);
            previousUser.current = userId;
        }
    }, [userId]);

    // Career profile + idempotent legacy backfill (expand/backfill step of the
    // migration plan). Repeating it is a no-op on the server, so a failed or
    // interrupted run simply runs again on the next visit.
    const loadProfile = useCallback(async () => {
        if (!userId) return;
        try {
            const row = await careerProfileRepo.ensure(userId);
            setProfile(row);
            setProfileError(null);
            if (row.migrationVersion < 1) {
                setMigration('running');
                try {
                    await careerProfileRepo.runMigration(userId);
                    const migrated = await careerProfileRepo.get(userId);
                    if (migrated) setProfile(migrated);
                    invalidateOwnedQueries(userId);
                    setMigration('done');
                } catch (err) {
                    captureException(err, { context: 'career-os-migration' });
                    setMigration('failed');
                }
            } else {
                setMigration('done');
            }
        } catch (err) {
            captureException(err, { context: 'career-os-profile' });
            setProfileError(err);
        }
    }, [userId]);

    useEffect(() => { void loadProfile(); }, [loadProfile]);

    useEffect(() => {
        let cancelled = false;
        fetchIsAdmin(userId)
            .then((on) => { if (!cancelled) setIsAdmin(on); })
            .catch(() => { /* not an admin — stay hidden (fail closed) */ });
        return () => { cancelled = true; };
    }, [userId]);

    const refreshInbox = useCallback(async () => {
        if (!userId) return;
        try {
            const unread = await notificationRepo.list(userId, { unreadOnly: true, limit: 50 });
            setUnreadCount(unread.length);
        } catch { /* inbox count is best-effort */ }
    }, [userId]);
    useEffect(() => { void refreshInbox(); }, [refreshInbox]);

    // Context resolution keyed on the route's subject ids and hints only, so
    // switching an application section never re-resolves and a refresh
    // resolves exactly the same subject.
    const subject = contextRouteFor(route);
    const subjectKey = JSON.stringify([subject, route.context ?? {}]);
    // Re-resolve once the backfill has linked legacy rows, not on every
    // intermediate migration state.
    const migrated = migration === 'done';
    const resolveVersion = useRef(0);
    const runResolve = useCallback(async () => {
        if (!userId) { setContext(null); return; }
        const version = ++resolveVersion.current;
        setContextLoading(true);
        setContextError(null);
        try {
            const resolved = await resolveContext(userId, subject, route.context ?? {}, contextDeps, 'route');
            if (version !== resolveVersion.current) return;
            setContext(resolved);
        } catch (err) {
            if (version !== resolveVersion.current) return;
            captureException(err, { context: 'career-os-context' });
            setContextError(err);
        } finally {
            if (version === resolveVersion.current) setContextLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, subjectKey, migrated]);
    useEffect(() => { void runResolve(); }, [runResolve]);

    // Application relations outrank inconsistent query hints: when the
    // resolver reports a conflict, rewrite the URL to the authoritative
    // relation so a reload cannot re-apply the stale hint.
    useEffect(() => {
        if (!context || context.conflicts.length === 0 || !route.context) return;
        const next = { ...route.context };
        let changed = false;
        for (const conflict of context.conflicts) {
            if (conflict.field === 'document') continue;
            if (next[conflict.field] !== undefined) { delete next[conflict.field]; changed = true; }
        }
        if (changed) replace({ ...route, context: Object.keys(next).length ? next : undefined });
    }, [context, route, replace]);

    const invalidate = useCallback((prefix = '') => invalidateOwnedQueries(userId, prefix), [userId]);

    const value = useMemo<CareerOsValue>(() => ({
        route, userId, profile, profileError, migration, context, contextLoading, contextError, isAdmin, unreadCount,
        refreshProfile: loadProfile, refreshContext: runResolve, refreshInbox, invalidate, openAuth: onOpenAuth,
    }), [route, userId, profile, profileError, migration, context, contextLoading, contextError, isAdmin, unreadCount, loadProfile, runResolve, refreshInbox, invalidate, onOpenAuth]);

    return <CareerOsContext.Provider value={value}>{children}</CareerOsContext.Provider>;
};
