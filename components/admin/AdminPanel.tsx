import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import {
    adminApi,
    type AdminAuditEntry,
    type AdminProvider,
    type AdminStats,
} from '../../services/adminApi';
import AuditSection from './AuditSection';
import OpsSection from './OpsSection';
import OverviewSection from './OverviewSection';
import ProvidersSection from './ProvidersSection';
import UsersSection from './UsersSection';
import { errorMessage } from './ui';

/**
 * Admin panel shell.
 *
 * Deliberately narrow: it covers the things Supabase Studio handles badly —
 * live LLM provider routing, an operational view (alerts, LLM calls, PRISM
 * runs, per-user usage), a health probe, and an audit trail of who changed
 * or looked at what. User and subscription *editing* is not here; Studio
 * already does that well and every extra write path is another thing to
 * secure.
 *
 * Nothing in this directory is a security boundary. The `admin` Edge Function
 * re-checks `profiles.is_admin` on every request; this only decides what to
 * draw. Each section owns its own fetches so a slow ops query never blocks the
 * provider editor.
 */

type Section = 'overview' | 'providers' | 'ops' | 'users' | 'audit';

const SECTIONS: { id: Section; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'providers', label: 'LLM providers' },
    { id: 'ops', label: 'Ops' },
    { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit log' },
];

const AdminPanel: React.FC = () => {
    const [section, setSection] = useState<Section>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [providers, setProviders] = useState<AdminProvider[]>([]);
    const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, p, a] = await Promise.all([
                adminApi.stats(),
                adminApi.listProviders(),
                adminApi.listAudit(100),
            ]);
            setStats(s);
            setProviders(p);
            setAudit(a);
        } catch (err) {
            setError(errorMessage(err, 'Could not load admin data.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !stats) {
        return (
            <div className="dashboard-module grid min-h-[40vh] place-items-center" role="status">
                <LoaderCircle className="animate-spin text-primary" size={26} aria-hidden="true" />
                <span className="sr-only">Loading admin panel</span>
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
                        Every action here — including reads of user data — is recorded in the audit log.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="dashboard-secondary-button"
                    disabled={loading}
                >
                    <RefreshCw
                        size={15}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className={loading ? 'animate-spin' : ''}
                    />
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
                        type="button"
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

            {section === 'overview' && <OverviewSection stats={stats} />}
            {section === 'providers' && (
                <ProvidersSection providers={providers} onChanged={() => void load()} onError={setError} />
            )}
            {section === 'ops' && <OpsSection />}
            {section === 'users' && <UsersSection />}
            {section === 'audit' && <AuditSection entries={audit} />}
        </div>
    );
};

export default AdminPanel;
