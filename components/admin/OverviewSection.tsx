import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { fetchHealth, type AdminStats, type HealthReport } from '../../services/adminApi';
import { Badge, StatTile, fmtDateTime, fmtRelative } from './ui';

/**
 * The health card polls the unauthenticated `/health` probe — the same URL an
 * uptime monitor watches — so what the admin sees is what the monitor sees.
 */
const HealthCard: React.FC = () => {
    const [report, setReport] = useState<HealthReport | null | undefined>(undefined);
    const [checkedAt, setCheckedAt] = useState<Date | null>(null);
    const [busy, setBusy] = useState(false);

    const check = useCallback(async () => {
        setBusy(true);
        setReport(await fetchHealth());
        setCheckedAt(new Date());
        setBusy(false);
    }, []);

    useEffect(() => {
        void check();
    }, [check]);

    const state: 'checking' | 'ok' | 'degraded' | 'down' =
        report === undefined ? 'checking' : report === null ? 'down' : report.ok ? (report.llm > 0 ? 'ok' : 'degraded') : 'down';

    const dot =
        state === 'ok'
            ? 'bg-primary'
            : state === 'degraded'
              ? 'bg-warning'
              : state === 'down'
                ? 'bg-danger'
                : 'bg-slate-300';

    return (
        <section className="rounded-2xl border border-border p-5" aria-labelledby="admin-health-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="admin-health-heading" className="inline-flex items-center gap-2 font-semibold text-dark">
                    <Activity size={16} strokeWidth={1.75} aria-hidden="true" />
                    Health
                    <span className={`ml-1 inline-block h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
                    <span className="text-sm font-medium text-slate-500">
                        {state === 'checking'
                            ? 'Checking…'
                            : state === 'ok'
                              ? 'All good'
                              : state === 'degraded'
                                ? 'Up, no LLM provider configured'
                                : 'Unreachable'}
                    </span>
                </h2>
                <button type="button" onClick={() => void check()} className="dashboard-secondary-button" disabled={busy}>
                    <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" className={busy ? 'animate-spin' : ''} />
                    Check now
                </button>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">Database</dt>
                    <dd className="mt-1">
                        {report ? (
                            <Badge tone={report.db === 'ok' ? 'accent' : 'danger'}>{report.db}</Badge>
                        ) : (
                            <Badge tone={report === null ? 'danger' : 'neutral'}>{report === null ? 'unknown' : '…'}</Badge>
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">LLM providers</dt>
                    <dd className="mt-1 text-dark">{report ? report.llm : '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">Version</dt>
                    <dd className="mt-1 font-mono text-xs text-dark">{report?.version ?? '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">Checked</dt>
                    <dd className="mt-1 text-dark" title={checkedAt ? fmtDateTime(checkedAt.toISOString()) : undefined}>
                        {checkedAt ? fmtRelative(checkedAt.toISOString()) : '—'}
                    </dd>
                </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
                Same probe an uptime monitor should poll: <code className="rounded bg-slate-100 px-1 py-0.5">GET /functions/v1/health</code>{' '}
                answers 200 when the database responds and 503 when it does not.
            </p>
        </section>
    );
};

const OverviewSection: React.FC<{ stats: AdminStats | null }> = ({ stats }) => (
    <div className="space-y-5">
        <HealthCard />
        {stats && (
            <dl className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Users" value={stats.users.toLocaleString()} />
                <StatTile label="Admins" value={stats.admins.toLocaleString()} />
                <StatTile
                    label="Configured providers"
                    value={stats.providers.toLocaleString()}
                    hint={stats.providers === 0 ? 'Routing from environment secrets' : undefined}
                />
            </dl>
        )}
    </div>
);

export default OverviewSection;
