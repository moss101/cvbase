import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import {
    adminApi,
    type OpsAlert,
    type OpsLlmCalls,
    type OpsPrismRuns,
} from '../../services/adminApi';
import {
    Badge,
    EmptyState,
    Spinner,
    StatTile,
    SubTabs,
    Table,
    errorMessage,
    fmtDateTime,
    fmtMs,
    fmtNumber,
    fmtRelative,
    statusTone,
} from './ui';

/**
 * Ops — the read-only operational views: alert history, the last 24 hours of
 * LLM calls rolled up per provider, and recent PRISM runs. Nothing here shows
 * user content; the server never selects CV, JD or prompt text for these
 * routes.
 */

type OpsTab = 'alerts' | 'llm' | 'prism';

const OPS_TABS: { id: OpsTab; label: string }[] = [
    { id: 'alerts', label: 'Alerts' },
    { id: 'llm', label: 'LLM calls' },
    { id: 'prism', label: 'PRISM runs' },
];

const ALERT_KIND_LABEL: Record<string, string> = {
    failure_rate: 'Failure rate',
    p95_latency: 'p95 latency',
    stuck_runs: 'Stuck runs',
};

const AlertsView: React.FC<{ alerts: OpsAlert[] }> = ({ alerts }) => {
    if (alerts.length === 0) {
        return <EmptyState>No alerts fired. The scan runs every 10 minutes when pg_cron is enabled.</EmptyState>;
    }
    const recent = alerts.filter((a) => Date.now() - new Date(a.created_at).getTime() < 24 * 3600_000);
    return (
        <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
                <StatTile
                    label="Fired in last 24 h"
                    value={fmtNumber(recent.length)}
                    tone={recent.length > 0 ? 'warning' : 'neutral'}
                />
                <StatTile label="Most recent" value={fmtRelative(alerts[0]?.created_at)} hint={fmtDateTime(alerts[0]?.created_at)} />
            </dl>
            <Table
                columns={[
                    { key: 'when', label: 'When' },
                    { key: 'kind', label: 'Kind' },
                    { key: 'observed', label: 'Observed', align: 'right' },
                    { key: 'threshold', label: 'Threshold', align: 'right' },
                    { key: 'detail', label: 'Detail' },
                ]}
                rows={alerts.map((a) => ({
                    id: a.id,
                    when: (
                        <span className="whitespace-nowrap text-slate-500" title={fmtDateTime(a.created_at)}>
                            {fmtRelative(a.created_at)}
                        </span>
                    ),
                    kind: (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
                            <TriangleAlert size={14} className="text-warning" aria-hidden="true" />
                            {ALERT_KIND_LABEL[a.kind] ?? a.kind}
                        </span>
                    ),
                    observed: fmtNumber(Number(a.observed)),
                    threshold: <span className="text-slate-500">{fmtNumber(Number(a.threshold))}</span>,
                    detail: <span className="text-slate-500">{a.detail || '—'}</span>,
                }))}
                rowKey={(r) => String(r.id)}
            />
        </div>
    );
};

const LlmView: React.FC<{ data: OpsLlmCalls }> = ({ data }) => {
    const totals = data.providers.reduce(
        (acc, p) => ({ calls: acc.calls + p.calls, errors: acc.errors + p.errors, fallback: acc.fallback + p.fallback }),
        { calls: 0, errors: 0, fallback: 0 },
    );
    const errorPct = totals.calls === 0 ? 0 : Math.round((totals.errors / totals.calls) * 1000) / 10;
    return (
        <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-3">
                <StatTile
                    label={`Calls, last ${data.window_hours} h`}
                    value={fmtNumber(totals.calls)}
                    hint={data.truncated ? `Sampled: the newest ${fmtNumber(data.sampled)} rows` : undefined}
                />
                <StatTile
                    label="Error rate"
                    value={`${errorPct}%`}
                    hint={`${fmtNumber(totals.errors)} failed`}
                    tone={errorPct >= 10 ? 'danger' : errorPct >= 2 ? 'warning' : 'neutral'}
                />
                <StatTile
                    label="Fell back"
                    value={fmtNumber(totals.fallback)}
                    hint="Primary failed, fallback answered"
                    tone={totals.fallback > 0 ? 'warning' : 'neutral'}
                />
            </dl>

            {data.providers.length === 0 ? (
                <EmptyState>No LLM calls in the window.</EmptyState>
            ) : (
                <Table
                    columns={[
                        { key: 'provider', label: 'Provider' },
                        { key: 'calls', label: 'Calls', align: 'right' },
                        { key: 'errors', label: 'Errors', align: 'right' },
                        { key: 'fallback', label: 'Fallback', align: 'right' },
                        { key: 'avg', label: 'Avg', align: 'right' },
                        { key: 'p95', label: 'p95', align: 'right' },
                        { key: 'tokens', label: 'Tokens', align: 'right' },
                        { key: 'models', label: 'Models' },
                    ]}
                    rows={data.providers.map((p) => ({
                        provider: <span className="font-medium">{p.provider}</span>,
                        calls: fmtNumber(p.calls),
                        errors:
                            p.errors > 0 ? (
                                <Badge tone={p.error_rate_pct >= 10 ? 'danger' : 'warning'}>
                                    {p.errors} · {p.error_rate_pct}%
                                </Badge>
                            ) : (
                                '0'
                            ),
                        fallback: fmtNumber(p.fallback),
                        avg: fmtMs(p.avg_latency_ms),
                        p95: fmtMs(p.p95_latency_ms),
                        tokens: fmtNumber(p.tokens),
                        models: <span className="text-xs text-slate-500">{p.models.join(', ') || '—'}</span>,
                    }))}
                    rowKey={(r, i) => `${i}`}
                    minWidth={760}
                />
            )}

            <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Most recent calls
                </h3>
                {data.recent.length === 0 ? (
                    <EmptyState>Nothing yet.</EmptyState>
                ) : (
                    <Table
                        columns={[
                            { key: 'when', label: 'When' },
                            { key: 'provider', label: 'Provider' },
                            { key: 'model', label: 'Model' },
                            { key: 'status', label: 'Status' },
                            { key: 'latency', label: 'Latency', align: 'right' },
                            { key: 'tokens', label: 'Tokens', align: 'right' },
                            { key: 'note', label: 'Note' },
                        ]}
                        rows={data.recent.map((c) => ({
                            id: c.id,
                            when: (
                                <span className="whitespace-nowrap text-slate-500" title={fmtDateTime(c.created_at)}>
                                    {fmtRelative(c.created_at)}
                                </span>
                            ),
                            provider: c.provider,
                            model: <span className="text-xs text-slate-500">{c.model || '—'}</span>,
                            status: <Badge tone={statusTone(c.status)}>{c.status}</Badge>,
                            latency: fmtMs(c.latency_ms),
                            tokens: fmtNumber(c.tokens),
                            note: (
                                <span className="text-xs text-slate-500">
                                    {c.used_fallback ? `fallback${c.fallback_reason ? `: ${c.fallback_reason}` : ''}` : ''}
                                    {c.key_slot !== null && c.key_slot !== undefined ? ` key #${c.key_slot}` : ''}
                                </span>
                            ),
                        }))}
                        rowKey={(r) => String(r.id)}
                        minWidth={720}
                    />
                )}
            </section>
        </div>
    );
};

const PrismView: React.FC<{ data: OpsPrismRuns }> = ({ data }) => {
    const failPct = data.last_24h.total === 0 ? 0 : Math.round((data.last_24h.failed / data.last_24h.total) * 1000) / 10;
    return (
        <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
                <StatTile label="Runs, last 24 h" value={fmtNumber(data.last_24h.total)} />
                <StatTile
                    label="Failed"
                    value={fmtNumber(data.last_24h.failed)}
                    hint={`${failPct}% of runs`}
                    tone={failPct >= 20 ? 'danger' : data.last_24h.failed > 0 ? 'warning' : 'neutral'}
                />
            </dl>
            {data.runs.length === 0 ? (
                <EmptyState>No PRISM runs recorded.</EmptyState>
            ) : (
                <Table
                    columns={[
                        { key: 'when', label: 'Started' },
                        { key: 'status', label: 'Status' },
                        { key: 'template', label: 'Template' },
                        { key: 'tokens', label: 'Tokens', align: 'right' },
                        { key: 'error', label: 'Error' },
                        { key: 'user', label: 'User' },
                    ]}
                    rows={data.runs.map((r) => ({
                        id: r.id,
                        when: (
                            <span className="whitespace-nowrap text-slate-500" title={fmtDateTime(r.created_at)}>
                                {fmtRelative(r.created_at)}
                            </span>
                        ),
                        status: <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
                        template: <span className="text-slate-500">{r.template_id || '—'}</span>,
                        tokens: fmtNumber(r.tokens_used),
                        error: <span className="font-mono text-xs text-danger">{r.error_code || ''}</span>,
                        user: <span className="font-mono text-xs text-slate-500">{r.user_id.slice(0, 8)}…</span>,
                    }))}
                    rowKey={(r) => String(r.id)}
                    minWidth={640}
                />
            )}
        </div>
    );
};

const OpsSection: React.FC = () => {
    const [tab, setTab] = useState<OpsTab>('alerts');
    const [alerts, setAlerts] = useState<OpsAlert[] | null>(null);
    const [llm, setLlm] = useState<OpsLlmCalls | null>(null);
    const [prism, setPrism] = useState<OpsPrismRuns | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedAt, setLoadedAt] = useState<Date | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [a, l, p] = await Promise.all([
                adminApi.opsAlerts(100),
                adminApi.opsLlmCalls(),
                adminApi.opsPrismRuns(100),
            ]);
            setAlerts(a);
            setLlm(l);
            setPrism(p);
            setLoadedAt(new Date());
        } catch (err) {
            setError(errorMessage(err, 'Could not load ops data.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const recentAlerts = (alerts ?? []).filter(
        (a) => Date.now() - new Date(a.created_at).getTime() < 24 * 3600_000,
    ).length;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SubTabs
                    label="Ops views"
                    tabs={OPS_TABS.map((t) => (t.id === 'alerts' && recentAlerts > 0 ? { ...t, count: recentAlerts } : t))}
                    active={tab}
                    onChange={(id) => setTab(id as OpsTab)}
                />
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    {loadedAt && <span>Updated {loadedAt.toLocaleTimeString()}</span>}
                    <button type="button" onClick={() => void load()} className="dashboard-secondary-button" disabled={loading}>
                        <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {!error && alerts === null && <Spinner />}

            {tab === 'alerts' && alerts && <AlertsView alerts={alerts} />}
            {tab === 'llm' && llm && <LlmView data={llm} />}
            {tab === 'prism' && prism && <PrismView data={prism} />}
        </div>
    );
};

export default OpsSection;
