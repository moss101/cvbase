import { getSupabase } from './supabase';
import { getClientEnv } from '../config/env';
import type { FnError } from './api';

/**
 * Client for the `admin` Edge Function.
 *
 * Every call is authorised server-side against `profiles.is_admin` — nothing
 * here is a security boundary, it is only the transport. The panel hides itself
 * from non-admins for tidiness; the function is what actually refuses them.
 *
 * `api.ts` only does POST-with-JSON-body, but the admin routes are REST-ish
 * (GET reads, POST writes, path segments), so this has its own small caller
 * rather than bending that one out of shape.
 */

export interface AdminProvider {
    id: string;
    provider_id: string;
    dialect: 'openai' | 'anthropic';
    display_name: string;
    base_url: string;
    model_full: string;
    model_lite: string;
    enabled: boolean;
    role: 'primary' | 'fallback' | 'off';
    updated_at: string;
    /** How many pooled keys are stored. The keys themselves never come back. */
    key_count: number;
    /** Masked previews, e.g. `sk-a••••1f9c` — enough to recognise, not to use. */
    key_previews: string[];
}

export interface AdminUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
    created_at: string;
}

export interface AdminAuditEntry {
    id: string;
    actor_email: string;
    action: string;
    target_type: string;
    target_id: string;
    details: Record<string, unknown>;
    created_at: string;
}

export interface AdminStats {
    users: number;
    admins: number;
    providers: number;
}

export interface AdminUserUsage {
    user: AdminUser;
    subscription: {
        plan_id: string;
        status: string;
        cycle: string | null;
        current_period_end: string | null;
        cancel_at_period_end: boolean | null;
    } | null;
    /** Most recent month first. */
    usage: { month: string; ats_scans: number; ai_actions: number }[];
    resumes: number;
    prism: { total: number; completed: number; failed: number; tokens: number; last_at: string | null };
    ai_calls_30d: { function: string; calls: number; errors: number }[];
}

export interface OpsAlert {
    id: string;
    kind: string;
    observed: number;
    threshold: number;
    detail: string;
    created_at: string;
}

export interface LlmProviderStats {
    provider: string;
    calls: number;
    ok: number;
    errors: number;
    error_rate_pct: number;
    fallback: number;
    tokens: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    max_latency_ms: number;
    models: string[];
}

export interface LlmCallRow {
    id: string;
    provider: string;
    model: string | null;
    status: string;
    latency_ms: number | null;
    tokens: number | null;
    used_fallback: boolean | null;
    fallback_reason: string | null;
    key_slot: number | null;
    created_at: string;
}

export interface OpsLlmCalls {
    window_hours: number;
    since: string;
    sampled: number;
    /** True when the window held more rows than were read; stats are a sample. */
    truncated: boolean;
    providers: LlmProviderStats[];
    recent: LlmCallRow[];
}

export interface PrismRunRow {
    id: string;
    user_id: string;
    status: string;
    template_id: string | null;
    tokens_used: number | null;
    error_code: string | null;
    created_at: string;
    updated_at: string;
}

export interface OpsPrismRuns {
    runs: PrismRunRow[];
    last_24h: { total: number; failed: number };
}

export interface HealthReport {
    ok: boolean;
    version: string;
    db: 'ok' | 'fail';
    llm: number;
    ts: string;
}

async function adminFetch<T>(
    route: string,
    init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
    const { supabaseUrl, supabaseAnonKey } = getClientEnv();
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
        const err = new Error('not_signed_in') as FnError;
        err.code = 'not_signed_in';
        err.status = 401;
        throw err;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/admin/${route}`, {
        method: init.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${token}`,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const err = new Error(
            (typeof json.error === 'string' && json.error) || `admin_error_${res.status}`,
        ) as FnError;
        err.code = typeof json.error === 'string' ? json.error : undefined;
        err.status = res.status;
        throw err;
    }
    return (json.data ?? json) as T;
}

export const adminApi = {
    stats: () => adminFetch<AdminStats>('stats'),
    listProviders: () => adminFetch<AdminProvider[]>('providers'),
    /**
     * Omit `api_keys` to leave the stored keys untouched — that is what makes
     * editing a base URL or model safe without retyping secrets.
     */
    saveProvider: (provider: Partial<AdminProvider> & { provider_id: string; api_keys?: string[] }) =>
        adminFetch<{ id: string; provider_id: string }>('providers', {
            method: 'POST',
            body: provider,
        }),
    deleteProvider: (providerId: string) =>
        adminFetch<{ deleted: string }>('providers/delete', {
            method: 'POST',
            body: { provider_id: providerId },
        }),
    /** `q` is a UUID (exact id) or an email prefix; blank lists everyone. */
    listUsers: (q = '', limit = 50, offset = 0) =>
        adminFetch<{ users: AdminUser[]; total: number }>(
            `users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
        ),
    userUsage: (userId: string) => adminFetch<AdminUserUsage>(`users/${userId}/usage`),
    listAudit: (limit = 100) => adminFetch<AdminAuditEntry[]>(`audit?limit=${limit}`),
    opsAlerts: (limit = 50) => adminFetch<OpsAlert[]>(`ops/alerts?limit=${limit}`),
    opsLlmCalls: () => adminFetch<OpsLlmCalls>('ops/llm-calls'),
    opsPrismRuns: (limit = 50) => adminFetch<OpsPrismRuns>(`ops/prism-runs?limit=${limit}`),
};

/**
 * The unauthenticated health probe. Not part of `adminApi` because it needs
 * no session: it is the same URL an uptime monitor would poll. A 503 still
 * carries a body, so the report is returned either way; only a network
 * failure resolves to `null`.
 */
export async function fetchHealth(): Promise<HealthReport | null> {
    const { supabaseUrl, supabaseAnonKey } = getClientEnv();
    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/health`, {
            headers: { apikey: supabaseAnonKey },
            cache: 'no-store',
        });
        const json = (await res.json()) as Partial<HealthReport>;
        if (typeof json.ok !== 'boolean') return null;
        return {
            ok: json.ok,
            version: String(json.version ?? 'unversioned'),
            db: json.db === 'ok' ? 'ok' : 'fail',
            llm: Number(json.llm) || 0,
            ts: String(json.ts ?? ''),
        };
    } catch {
        return null;
    }
}

/**
 * Whether the signed-in user is an admin.
 *
 * Reads `profiles.is_admin` directly — the row is already readable under the
 * user's own-row policy, so this needs no privileged call. Used purely to
 * decide whether to render the panel's entry point.
 */
export async function fetchIsAdmin(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false;
    try {
        const { data, error } = await getSupabase()
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .maybeSingle();
        if (error) return false;
        return Boolean(data?.is_admin);
    } catch {
        return false;
    }
}
