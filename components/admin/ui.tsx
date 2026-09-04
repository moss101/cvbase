import React from 'react';
import { LoaderCircle } from 'lucide-react';

/**
 * Small presentational pieces shared by the admin sections.
 *
 * Everything here follows the app chrome: hairline borders for structure, the
 * emerald accent only where something is active or actionable, and the themed
 * `white` / `dark` / slate tokens so the panel reads the same in both themes.
 */

export const inputClass =
    'w-full rounded-lg border border-border bg-white px-3 py-2 text-[15px] text-dark outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25';

export const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500';

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
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

export type Tone = 'neutral' | 'accent' | 'warning' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    accent: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({
    tone = 'neutral',
    children,
}) => (
    <span
        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${TONE_CLASS[tone]}`}
    >
        {children}
    </span>
);

/** Status → tone, shared by the run and call tables so colours mean one thing. */
export function statusTone(status: string): Tone {
    if (status === 'ok' || status === 'completed' || status === 'success') return 'accent';
    if (status === 'failed' || status === 'error') return 'danger';
    if (status === 'review' || status === 'running' || status === 'pending') return 'warning';
    return 'neutral';
}

export const StatTile: React.FC<{
    label: string;
    value: React.ReactNode;
    hint?: string;
    tone?: Tone;
}> = ({ label, value, hint, tone = 'neutral' }) => (
    <div className="rounded-2xl border border-border p-5">
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd
            className={`mt-1 font-display text-3xl font-medium tracking-tight ${
                tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-dark'
            }`}
        >
            {value}
        </dd>
        {hint && <dd className="mt-1 text-xs text-slate-500">{hint}</dd>}
    </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-ink-soft">
        {children}
    </div>
);

export const Spinner: React.FC<{ size?: number }> = ({ size = 22 }) => (
    <div className="grid min-h-[20vh] place-items-center" role="status">
        <LoaderCircle className="animate-spin text-primary" size={size} aria-hidden="true" />
        <span className="sr-only">Loading</span>
    </div>
);

export const SubTabs: React.FC<{
    label: string;
    tabs: { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}> = ({ label, tabs, active, onChange }) => (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-border p-1">
        {tabs.map((t) => (
            <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active === t.id}
                onClick={() => onChange(t.id)}
                className={`tap-target inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active === t.id ? 'bg-primary text-white' : 'text-slate-500 hover:text-dark'
                }`}
            >
                {t.label}
                {t.count !== undefined && (
                    <span
                        className={`rounded-md px-1.5 text-[11px] ${
                            active === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        {t.count}
                    </span>
                )}
            </button>
        ))}
    </div>
);

/** A hairline table: header row, hairline row dividers, horizontal scroll on narrow screens. */
export const Table: React.FC<{
    columns: { key: string; label: string; align?: 'left' | 'right'; className?: string }[];
    rows: Record<string, React.ReactNode>[];
    rowKey: (row: Record<string, React.ReactNode>, index: number) => string;
    minWidth?: number;
}> = ({ columns, rows, rowKey, minWidth = 560 }) => (
    <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
            <thead className="border-b border-border text-xs uppercase tracking-wider text-slate-500">
                <tr>
                    {columns.map((c) => (
                        <th
                            key={c.key}
                            className={`px-4 py-2.5 font-semibold ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}
                        >
                            {c.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={rowKey(row, i)} className="border-b border-border/60 last:border-b-0">
                        {columns.map((c) => (
                            <td
                                key={c.key}
                                className={`px-4 py-2.5 align-top text-dark ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.className ?? ''}`}
                            >
                                {row[c.key]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const fmtDateTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString() : '—';

export const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString() : '—';

export const fmtNumber = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : n.toLocaleString();

export const fmtMs = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : `${Math.round(n).toLocaleString()} ms`;

/** "3 minutes ago" without pulling in a date library. */
export function fmtRelative(iso: string | null | undefined): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '—';
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 48) return `${h} h ago`;
    return `${Math.round(h / 24)} d ago`;
}

export function errorMessage(err: unknown, fallback: string): string {
    const code = (err as { code?: string }).code;
    if (code === 'not_admin') return 'This account is not an administrator.';
    if (code === 'not_signed_in') return 'Sign in again to use the admin panel.';
    return code ? `${fallback} (${code})` : fallback;
}
