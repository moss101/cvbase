import { useCallback, useEffect, useRef, useState } from 'react';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as coachRepo from '../coach/coachRepo';
import { track } from '../../../services/careerOs/careerEvents';
import type { CareerFact } from '../../../services/careerOs/types';
import { careerPath, type Route } from '../../NavigationProvider';
import { ALL_SPACES, type SpaceDescriptor } from '../shell/spaces';
import { destinationToRoute } from '../career/factFormat';
import { captureException } from '../../../lib/monitoring';

/**
 * Command search (REQ-23, COS-029): navigation plus bounded, owner-scoped
 * searches over the person's own records. Every query goes through the
 * repositories (RLS-filtered), results are capped per group, stale
 * responses are dropped by a request token, and fact snippets carry the
 * title and organisation only — never narrative text — so a revoked or
 * deleted claim can never surface (facts are `active` only).
 */
export type SearchGroup =
    | 'navigate' | 'actions' | 'opportunities' | 'applications' | 'goals' | 'campaigns' | 'facts' | 'documents' | 'conversations';

export const SEARCH_GROUPS: readonly SearchGroup[] = ['navigate', 'actions', 'opportunities', 'applications', 'goals', 'campaigns', 'facts', 'documents', 'conversations'];

export interface SearchResult {
    id: string;
    group: SearchGroup;
    title: string;
    subtitle?: string;
    route: Route;
}

export interface SearchGroupResult {
    group: SearchGroup;
    items: SearchResult[];
    /** Matches before the per-group cap. */
    total: number;
    /** The group's source could not be read. */
    failed?: boolean;
}

export const MIN_QUERY = 2;
export const MAX_QUERY = 64;
export const GROUP_CAP = 8;
export const DEBOUNCE_MS = 200;
export const SEARCH_QUERY_STORAGE = 'cvbase-search-query';

export const normaliseQuery = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);

export const matches = (haystack: Array<string | null | undefined>, q: string): boolean => {
    const needle = q.toLowerCase();
    return haystack.some((part) => typeof part === 'string' && part.toLowerCase().includes(needle));
};

const cap = (group: SearchGroup, items: SearchResult[], failed = false): SearchGroupResult =>
    ({ group, items: items.slice(0, GROUP_CAP), total: items.length, ...(failed ? { failed: true } : {}) });

export type Translate = (key: string, fallback: string) => string;

/** The six spaces and utilities from the shell descriptors, matched on their translated label. */
export function navigateResults(q: string, t: Translate, opts: { isAdmin?: boolean } = {}): SearchGroupResult {
    const items = ALL_SPACES
        .filter((s: SpaceDescriptor) => !s.adminOnly || opts.isAdmin)
        .filter((s) => matches([t(s.labelKey, s.label), s.key, s.label], q))
        .map((s): SearchResult => ({ id: `space:${s.key}`, group: 'navigate', title: t(s.labelKey, s.label), route: s.route }));
    return cap('navigate', items);
}

/** Snippet policy for facts: title and organisation only. */
export const factSnippet = (fact: Pick<CareerFact, 'title' | 'organization' | 'kind'>): { title: string; subtitle?: string } =>
    ({ title: fact.title || fact.kind, ...(fact.organization ? { subtitle: fact.organization } : {}) });

export interface SearchDeps {
    actions: typeof actionRepo.listEligible;
    opportunities: typeof opportunityRepo.list;
    applications: typeof applicationRepo.list;
    goals: typeof goalRepo.list;
    campaigns: typeof campaignRepo.list;
    facts: typeof factRepo.list;
    resumes: typeof resumeRepo.list;
    conversations: typeof coachRepo.listConversations;
}

export const defaultSearchDeps: SearchDeps = {
    actions: actionRepo.listEligible,
    opportunities: opportunityRepo.list,
    applications: applicationRepo.list,
    goals: goalRepo.list,
    campaigns: campaignRepo.list,
    facts: factRepo.list,
    resumes: resumeRepo.list,
    conversations: coachRepo.listConversations,
};

async function settle<T>(loader: () => Promise<T>, fallback: T, context: string): Promise<{ value: T; failed: boolean }> {
    try {
        return { value: await loader(), failed: false };
    } catch (err) {
        captureException(err, { context });
        return { value: fallback, failed: true };
    }
}

/** Owner-scoped search across the record groups. Groups without matches are omitted. */
export async function searchOwnedRecords(userId: string, q: string, deps: SearchDeps = defaultSearchDeps): Promise<SearchGroupResult[]> {
    const [actions, opportunities, applications, goals, campaigns, facts, resumes, conversations] = await Promise.all([
        settle(() => deps.actions(userId), [], 'search-actions'),
        settle(() => deps.opportunities(userId, 'all'), [], 'search-opportunities'),
        settle(() => deps.applications(userId), [], 'search-applications'),
        settle(() => deps.goals(userId, 'active'), [], 'search-goals'),
        settle(() => deps.campaigns(userId, 'any'), [], 'search-campaigns'),
        settle(() => deps.facts(userId, { status: 'active' }), [], 'search-facts'),
        settle(() => deps.resumes(userId), [], 'search-documents'),
        settle(() => deps.conversations(userId, { status: 'any', limit: 100 }), [], 'search-conversations'),
    ]);

    const groups: SearchGroupResult[] = [
        cap('actions', actions.value.filter((a) => matches([a.title, a.reason, a.actionType], q)).map((a) => ({
            id: `action:${a.id}`, group: 'actions', title: a.title, subtitle: a.reason || undefined, route: destinationToRoute(a.destination),
        })), actions.failed),
        cap('opportunities', opportunities.value.filter((o) => matches([o.title, o.company, o.location], q)).map((o) => ({
            id: `opportunity:${o.id}`, group: 'opportunities', title: o.title, subtitle: o.company || undefined, route: careerPath.toOpportunity(o.id),
        })), opportunities.failed),
        cap('applications', applications.value.filter((a) => matches([a.jobTitle, a.company], q)).map((a) => ({
            id: `application:${a.id}`, group: 'applications', title: a.jobTitle || a.company, subtitle: a.company || undefined, route: careerPath.toApplication(a.id),
        })), applications.failed),
        cap('goals', goals.value.filter((g) => matches([g.title, g.role, g.industry, g.location], q)).map((g) => ({
            id: `goal:${g.id}`, group: 'goals', title: g.title || g.role, subtitle: g.role || undefined, route: careerPath.toGoal(g.id),
        })), goals.failed),
        cap('campaigns', campaigns.value.filter((c) => matches([c.name], q)).map((c) => ({
            id: `campaign:${c.id}`, group: 'campaigns', title: c.name, route: careerPath.toCampaign(c.id),
        })), campaigns.failed),
        cap('facts', facts.value
            .filter((f) => f.status === 'active')
            .filter((f) => matches([f.title, f.organization, f.kind], q))
            .map((f) => ({ id: `fact:${f.id}`, group: 'facts', ...factSnippet(f), route: careerPath.toCareer(f.kind === 'achievement' ? 'achievements' : 'evidence') })), facts.failed),
        cap('documents', resumes.value.filter((r) => r.id && matches([r.title], q)).map((r) => ({
            id: `document:${r.id}`, group: 'documents', title: r.title, route: careerPath.toCvEdit(r.id as string),
        })), resumes.failed),
        cap('conversations', conversations.value.filter((c) => matches([c.title], q)).map((c) => ({
            id: `conversation:${c.id}`, group: 'conversations', title: c.title || 'Untitled conversation', route: careerPath.toCoach(c.id),
        })), conversations.failed),
    ];
    return groups.filter((g) => g.items.length > 0 || g.failed);
}

export interface CommandSearchState {
    groups: SearchGroupResult[];
    loading: boolean;
    error: unknown;
    /** The query the current `groups` answer. */
    answered: string;
    retry: () => void;
}

/**
 * Debounced, cancellable search. A response for a query that is no longer
 * current is discarded, so fast typing never shows stale results.
 */
export function useCommandSearch(userId: string | null, rawQuery: string, opts: { enabled: boolean; t: Translate; isAdmin?: boolean; deps?: SearchDeps }): CommandSearchState {
    const [groups, setGroups] = useState<SearchGroupResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [answered, setAnswered] = useState('');
    const [attempt, setAttempt] = useState(0);
    const token = useRef(0);
    const q = normaliseQuery(rawQuery);
    const { enabled, t, isAdmin, deps } = opts;
    const tRef = useRef(t);
    tRef.current = t;

    useEffect(() => {
        if (!enabled || !userId || q.length < MIN_QUERY) {
            token.current += 1;
            setGroups([]);
            setLoading(false);
            setError(null);
            setAnswered('');
            return;
        }
        const mine = ++token.current;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const nav = navigateResults(q, tRef.current, { isAdmin });
                const records = await searchOwnedRecords(userId, q, deps);
                if (mine !== token.current) return;
                const all = [...(nav.items.length > 0 ? [nav] : []), ...records];
                setGroups(all);
                setError(null);
                setAnswered(q);
                void track(userId, 'career_search_used', { payload: { groups: all.length, results: all.reduce((n, g) => n + g.items.length, 0), queryLength: q.length } });
            } catch (err) {
                if (mine !== token.current) return;
                setError(err);
            } finally {
                if (mine === token.current) setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => { clearTimeout(timer); };
    }, [userId, q, enabled, isAdmin, deps, attempt]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    return { groups, loading, error, answered, retry };
}

export const rememberSearchQuery = (q: string): void => {
    try { sessionStorage.setItem(SEARCH_QUERY_STORAGE, q); } catch { /* storage unavailable */ }
};
export const recallSearchQuery = (): string => {
    try { return sessionStorage.getItem(SEARCH_QUERY_STORAGE) ?? ''; } catch { return ''; }
};
