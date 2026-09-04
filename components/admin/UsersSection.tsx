import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, LoaderCircle, Search, X } from 'lucide-react';
import { adminApi, type AdminUser, type AdminUserUsage } from '../../services/adminApi';
import { useMobileShell } from '../../lib/useMobileShell';
import {
    Badge,
    EmptyState,
    Spinner,
    StatTile,
    Table,
    errorMessage,
    fmtDate,
    fmtDateTime,
    fmtNumber,
    inputClass,
    statusTone,
} from './ui';

const PAGE = 50;

const UsageDetail: React.FC<{ userId: string; onBack: () => void }> = ({ userId, onBack }) => {
    const [usage, setUsage] = useState<AdminUserUsage | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setUsage(null);
        setError(null);
        adminApi
            .userUsage(userId)
            .then((u) => {
                if (!cancelled) setUsage(u);
            })
            .catch((err) => {
                if (!cancelled) setError(errorMessage(err, 'Could not load usage.'));
            });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="dashboard-secondary-button">
                <ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" />
                All users
            </button>

            {error && (
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                </p>
            )}
            {!usage && !error && <Spinner />}

            {usage && (
                <>
                    <div className="rounded-2xl border border-border p-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-xl font-medium tracking-tight text-dark">
                                {usage.user.email}
                            </h2>
                            {usage.user.is_admin && <Badge tone="accent">admin</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            {`${usage.user.first_name} ${usage.user.last_name}`.trim() || '—'} · joined{' '}
                            {fmtDate(usage.user.created_at)}
                        </p>
                        <p className="mt-2 font-mono text-xs text-slate-400">{usage.user.id}</p>
                    </div>

                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatTile
                            label="Plan"
                            value={usage.subscription?.plan_id ?? 'free'}
                            hint={
                                usage.subscription
                                    ? `${usage.subscription.status}${usage.subscription.cancel_at_period_end ? ' · cancels at period end' : ''}${usage.subscription.current_period_end ? ` · renews ${fmtDate(usage.subscription.current_period_end)}` : ''}`
                                    : 'No subscription row'
                            }
                        />
                        <StatTile label="Resumes" value={fmtNumber(usage.resumes)} />
                        <StatTile
                            label="PRISM runs"
                            value={fmtNumber(usage.prism.total)}
                            hint={`${usage.prism.completed} completed · ${usage.prism.failed} failed · ${fmtNumber(usage.prism.tokens)} tokens`}
                            tone={usage.prism.failed > 0 ? 'warning' : 'neutral'}
                        />
                        <StatTile label="Last PRISM run" value={usage.prism.last_at ? fmtDate(usage.prism.last_at) : '—'} hint={fmtDateTime(usage.prism.last_at)} />
                    </dl>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Monthly counters
                            </h3>
                            {usage.usage.length === 0 ? (
                                <EmptyState>No usage recorded.</EmptyState>
                            ) : (
                                <Table
                                    minWidth={320}
                                    columns={[
                                        { key: 'month', label: 'Month' },
                                        { key: 'ats', label: 'ATS scans', align: 'right' },
                                        { key: 'ai', label: 'AI actions', align: 'right' },
                                    ]}
                                    rows={usage.usage.map((m) => ({
                                        month: m.month,
                                        ats: fmtNumber(m.ats_scans),
                                        ai: fmtNumber(m.ai_actions),
                                    }))}
                                    rowKey={(r) => String(r.month)}
                                />
                            )}
                        </section>
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                AI calls, last 30 days
                            </h3>
                            {usage.ai_calls_30d.length === 0 ? (
                                <EmptyState>No AI calls in the window.</EmptyState>
                            ) : (
                                <Table
                                    minWidth={320}
                                    columns={[
                                        { key: 'fn', label: 'Function' },
                                        { key: 'calls', label: 'Calls', align: 'right' },
                                        { key: 'errors', label: 'Errors', align: 'right' },
                                    ]}
                                    rows={usage.ai_calls_30d.map((c) => ({
                                        fn: c.function,
                                        calls: fmtNumber(c.calls),
                                        errors: c.errors > 0 ? <Badge tone={statusTone('error')}>{c.errors}</Badge> : '0',
                                    }))}
                                    rowKey={(r) => String(r.fn)}
                                />
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
};

const UsersSection: React.FC = () => {
    const isMobileShell = useMobileShell();
    const [query, setQuery] = useState('');
    const [submitted, setSubmitted] = useState('');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    const load = useCallback(async (q: string, from: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminApi.listUsers(q, PAGE, from);
            setUsers(res.users);
            setTotal(res.total);
            setOffset(from);
        } catch (err) {
            setError(errorMessage(err, 'Could not load users.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(submitted, 0);
    }, [load, submitted]);

    if (selected) return <UsageDetail userId={selected} onBack={() => setSelected(null)} />;

    const roleCell = (u: AdminUser) =>
        u.is_admin ? <Badge tone="accent">admin</Badge> : <span className="text-slate-500">user</span>;

    return (
        <div className="space-y-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(query.trim());
                }}
                className="flex gap-2"
                role="search"
            >
                <div className="relative flex-1">
                    <Search
                        size={15}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        className={`${inputClass} pl-9 pr-9`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Email prefix or user id"
                        aria-label="Search users"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => {
                                setQuery('');
                                setSubmitted('');
                            }}
                            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:text-dark"
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <button type="submit" className="dashboard-secondary-button" disabled={loading}>
                    {loading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : null}
                    Search
                </button>
            </form>

            {error && (
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {!loading && users.length === 0 && (
                <EmptyState>{submitted ? `No user matches "${submitted}".` : 'No users yet.'}</EmptyState>
            )}

            {users.length > 0 && isMobileShell && (
                <ul className="divide-y divide-border rounded-2xl border border-border">
                    {users.map((u) => (
                        <li key={u.id}>
                            <button
                                type="button"
                                onClick={() => setSelected(u.id)}
                                className="flex w-full items-start justify-between gap-3 p-4 text-left"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-dark">{u.email}</p>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        {`${u.first_name} ${u.last_name}`.trim() || '—'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">Joined {fmtDate(u.created_at)}</p>
                                </div>
                                <span className="shrink-0">{roleCell(u)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {users.length > 0 && !isMobileShell && (
                <Table
                    columns={[
                        { key: 'email', label: 'Email' },
                        { key: 'name', label: 'Name' },
                        { key: 'role', label: 'Role' },
                        { key: 'joined', label: 'Joined' },
                        { key: 'usage', label: '', align: 'right' },
                    ]}
                    rows={users.map((u) => ({
                        id: u.id,
                        email: u.email,
                        name: <span className="text-slate-500">{`${u.first_name} ${u.last_name}`.trim() || '—'}</span>,
                        role: roleCell(u),
                        joined: <span className="text-slate-500">{fmtDate(u.created_at)}</span>,
                        usage: (
                            <button
                                type="button"
                                onClick={() => setSelected(u.id)}
                                className="text-sm font-semibold text-primary hover:underline"
                            >
                                Usage
                            </button>
                        ),
                    }))}
                    rowKey={(r) => String(r.id)}
                />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                    {total === 0
                        ? ''
                        : `${offset + 1}–${Math.min(offset + users.length, total)} of ${fmtNumber(total)}`}
                </span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="dashboard-secondary-button"
                        disabled={loading || offset === 0}
                        onClick={() => void load(submitted, Math.max(0, offset - PAGE))}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="dashboard-secondary-button"
                        disabled={loading || offset + PAGE >= total}
                        onClick={() => void load(submitted, offset + PAGE)}
                    >
                        Next
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-500">
                Read-only, and every search and usage view is written to the audit log. Granting
                admin is deliberately not possible from the app — it is a database-level change,
                so a compromised admin session cannot mint more admins.
            </p>
        </div>
    );
};

export default UsersSection;
