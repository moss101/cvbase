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
    listUsers: (limit = 50, offset = 0) =>
        adminFetch<{ users: AdminUser[]; total: number }>(`users?limit=${limit}&offset=${offset}`),
    listAudit: (limit = 100) => adminFetch<AdminAuditEntry[]>(`audit?limit=${limit}`),
};

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
