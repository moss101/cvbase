import React, { useCallback, useEffect, useState } from 'react';
import {
    Check,
    LoaderCircle,
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import {
    adminApi,
    type AdminAuditEntry,
    type AdminProvider,
    type AdminStats,
    type AdminUser,
} from '../../services/adminApi';

/**
 * Admin panel.
 *
 * Deliberately narrow: it covers the things Supabase Studio handles badly —
 * live LLM provider routing, and an audit trail of who changed what. User and
 * subscription *editing* is not here; Studio already does that well and every
 * extra write path is another thing to secure.
 *
 * Nothing in this file is a security boundary. The `admin` Edge Function
 * re-checks `profiles.is_admin` on every request; this only decides what to
 * draw.
 */

type Section = 'overview' | 'providers' | 'users' | 'audit';

const SECTIONS: { id: Section; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'providers', label: 'LLM providers' },
    { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit log' },
];

const EMPTY_PROVIDER = {
    provider_id: '',
    dialect: 'openai' as const,
    display_name: '',
    base_url: '',
    model_full: '',
    model_lite: '',
    enabled: true,
    role: 'off' as const,
};

const inputClass =
    'w-full rounded-lg border border-border bg-white px-3 py-2 text-[15px] text-dark outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25';

const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
    label,
    hint,
    children,
}) => (
    <div>
        <label className={labelClass}>{label}</label>
        {children}
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
);

const ProviderEditor: React.FC<{
    initial: Partial<AdminProvider>;
    onSaved: () => void;
    onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
    const [form, setForm] = useState({ ...EMPTY_PROVIDER, ...initial });
    // Blank means "leave the stored keys alone" — see saveProvider.
    const [keysText, setKeysText] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!form.provider_id.trim()) {
            setError('Provider id is required.');
            return;
        }
        setSaving(true);
        try {
            const keys = keysText
                .split(/[\n,]/)
                .map((k) => k.trim())
                .filter(Boolean);
            await adminApi.saveProvider({
                ...form,
                provider_id: form.provider_id.trim(),
                // Only send keys when the operator actually typed some.
                ...(keys.length > 0 ? { api_keys: keys } : {}),
            });
            onSaved();
        } catch (err) {
            const code = (err as { code?: string }).code;
            setError(
                code === 'role_already_assigned'
                    ? 'Another provider already holds that role. Set it to "off" first.'
                    : code || 'Could not save the provider.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-white p-5 md:p-6"
        >
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provider id" hint="Used by the router, e.g. custom, anthropic, groq.">
                    <input
                        className={inputClass}
                        value={form.provider_id}
                        onChange={(e) => set('provider_id', e.target.value)}
                        placeholder="custom"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                </Field>
                <Field label="Display name">
                    <input
                        className={inputClass}
                        value={form.display_name}
                        onChange={(e) => set('display_name', e.target.value)}
                        placeholder="My inference host"
                    />
                </Field>
                <Field label="Dialect" hint="Anthropic speaks its own wire format.">
                    <select
                        className={inputClass}
                        value={form.dialect}
                        onChange={(e) => set('dialect', e.target.value as 'openai' | 'anthropic')}
                    >
                        <option value="openai">OpenAI-compatible</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                </Field>
                <Field label="Routing role" hint="One primary and one fallback at a time.">
                    <select
                        className={inputClass}
                        value={form.role}
                        onChange={(e) =>
                            set('role', e.target.value as 'primary' | 'fallback' | 'off')
                        }
                    >
                        <option value="off">Off — never routed to</option>
                        <option value="primary">Primary</option>
                        <option value="fallback">Fallback</option>
                    </select>
                </Field>
                <div className="md:col-span-2">
                    <Field label="Base URL" hint="Leave blank to use the built-in default.">
                        <input
                            className={inputClass}
                            value={form.base_url}
                            onChange={(e) => set('base_url', e.target.value)}
                            placeholder="https://api.example.com/v1"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                    </Field>
                </div>
                <Field label="Model (full)">
                    <input
                        className={inputClass}
                        value={form.model_full}
                        onChange={(e) => set('model_full', e.target.value)}
                        placeholder="claude-opus-5"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                </Field>
                <Field label="Model (lite)" hint="Falls back to the full model when blank.">
                    <input
                        className={inputClass}
                        value={form.model_lite}
                        onChange={(e) => set('model_lite', e.target.value)}
                        placeholder="claude-haiku-4-5"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                </Field>
                <div className="md:col-span-2">
                    <Field
                        label="API keys"
                        hint="One per line. Multiple keys are pooled round-robin. Leave blank to keep the stored keys — they are never shown again once saved."
                    >
                        <textarea
                            className={`${inputClass} min-h-[84px] font-mono text-[13px]`}
                            value={keysText}
                            onChange={(e) => setKeysText(e.target.value)}
                            placeholder="sk-…"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                    </Field>
                </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-dark">
                <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => set('enabled', e.target.checked)}
                    className="h-4 w-4 accent-primary"
                />
                Enabled
            </label>

            {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-danger">
                    {error}
                </p>
            )}

            <div className="mt-5 flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving ? (
                        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                        <Check size={16} aria-hidden="true" />
                    )}
                    Save provider
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="tap-target rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-dark"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

const AdminPanel: React.FC = () => {
    const [section, setSection] = useState<Section>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [providers, setProviders] = useState<AdminProvider[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Partial<AdminProvider> | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, p, u, a] = await Promise.all([
                adminApi.stats(),
                adminApi.listProviders(),
                adminApi.listUsers(50, 0),
                adminApi.listAudit(50),
            ]);
            setStats(s);
            setProviders(p);
            setUsers(u.users);
            setAudit(a);
        } catch (err) {
            const code = (err as { code?: string }).code;
            setError(
                code === 'not_admin'
                    ? 'This account is not an administrator.'
                    : 'Could not load admin data.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const removeProvider = async (providerId: string) => {
        try {
            await adminApi.deleteProvider(providerId);
            await load();
        } catch {
            setError('Could not delete that provider.');
        }
    };

    if (loading) {
        return (
            <div className="dashboard-module grid min-h-[40vh] place-items-center" role="status">
                <LoaderCircle className="animate-spin text-primary" size={26} aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="dashboard-module">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="dashboard-display">Admin.</h1>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
                        <ShieldCheck size={15} strokeWidth={1.75} aria-hidden="true" />
                        Every action here is recorded in the audit log.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="dashboard-secondary-button"
                >
                    <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
                    Refresh
                </button>
            </header>

            {error && (
                <p
                    role="alert"
                    className="mb-5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
                >
                    {error}
                </p>
            )}

            <div
                role="tablist"
                aria-label="Admin sections"
                className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
            >
                {SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        role="tab"
                        aria-selected={section === s.id}
                        onClick={() => setSection(s.id)}
                        className={`tap-target rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                            section === s.id
                                ? 'bg-primary text-white'
                                : 'text-slate-500 hover:text-dark'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {section === 'overview' && stats && (
                <dl className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Users', value: stats.users },
                        { label: 'Admins', value: stats.admins },
                        { label: 'Configured providers', value: stats.providers },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border p-5">
                            <dt className="text-sm text-slate-500">{item.label}</dt>
                            <dd className="mt-1 font-display text-3xl font-medium tracking-tight text-dark">
                                {item.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {section === 'providers' && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-ink-soft">
                            Routing is live: saving a provider changes generation immediately, with
                            no redeploy.
                        </p>
                        {!editing && (
                            <button
                                type="button"
                                onClick={() => setEditing({ ...EMPTY_PROVIDER })}
                                className="dashboard-primary-button"
                            >
                                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                                Add provider
                            </button>
                        )}
                    </div>

                    {editing && (
                        <ProviderEditor
                            initial={editing}
                            onCancel={() => setEditing(null)}
                            onSaved={() => {
                                setEditing(null);
                                void load();
                            }}
                        />
                    )}

                    {providers.length === 0 && !editing && (
                        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                            <p className="text-sm text-ink-soft">
                                No providers configured. The router is using the values from
                                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">
                                    supabase secrets
                                </code>
                                until you add one here.
                            </p>
                        </div>
                    )}

                    <ul className="space-y-3">
                        {providers.map((p) => (
                            <li
                                key={p.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-dark">
                                            {p.display_name || p.provider_id}
                                        </span>
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                            {p.dialect}
                                        </span>
                                        {p.role !== 'off' && (
                                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                                                {p.role}
                                            </span>
                                        )}
                                        {!p.enabled && (
                                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                                disabled
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 truncate text-[13px] text-slate-500">
                                        {p.model_full || '—'}
                                        {p.base_url ? ` · ${p.base_url}` : ''}
                                    </p>
                                    <p className="mt-1 text-[13px] text-slate-500">
                                        {p.key_count === 0 ? (
                                            <span className="inline-flex items-center gap-1 text-warning">
                                                <TriangleAlert size={13} aria-hidden="true" />
                                                No keys stored — falls back to env
                                            </span>
                                        ) : (
                                            `${p.key_count} key${p.key_count === 1 ? '' : 's'}: ${p.key_previews.join(', ')}`
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditing(p)}
                                        className="dashboard-secondary-button"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void removeProvider(p.provider_id)}
                                        aria-label={`Delete ${p.provider_id}`}
                                        className="tap-target grid place-items-center rounded-xl border border-border px-3 text-slate-500 transition-colors hover:border-danger hover:text-danger"
                                    >
                                        <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {section === 'users' && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="border-b border-border text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="py-2 pr-4 font-semibold">Email</th>
                                <th className="py-2 pr-4 font-semibold">Name</th>
                                <th className="py-2 pr-4 font-semibold">Role</th>
                                <th className="py-2 font-semibold">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-border/60">
                                    <td className="py-2.5 pr-4 text-dark">{u.email}</td>
                                    <td className="py-2.5 pr-4 text-slate-500">
                                        {`${u.first_name} ${u.last_name}`.trim() || '—'}
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        {u.is_admin ? (
                                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                                                admin
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">user</span>
                                        )}
                                    </td>
                                    <td className="py-2.5 text-slate-500">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-4 text-xs text-slate-500">
                        Read-only. Granting admin is deliberately not possible from the app — it is
                        a database-level change, so a compromised admin session cannot mint more
                        admins.
                    </p>
                </div>
            )}

            {section === 'audit' && (
                <ul className="space-y-2">
                    {audit.length === 0 && (
                        <li className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-ink-soft">
                            Nothing recorded yet.
                        </li>
                    )}
                    {audit.map((entry) => (
                        <li
                            key={entry.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm"
                        >
                            <span className="font-medium text-dark">{entry.action}</span>
                            <span className="text-slate-500">
                                {entry.target_id || entry.target_type}
                            </span>
                            <span className="text-slate-500">{entry.actor_email}</span>
                            <span className="text-xs text-slate-400">
                                {new Date(entry.created_at).toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AdminPanel;
