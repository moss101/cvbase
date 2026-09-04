import React from 'react';
import type { AdminAuditEntry } from '../../services/adminApi';
import { EmptyState, fmtDateTime } from './ui';

/** Compact detail line: `role=primary · keys_replaced=2`, never nested blobs. */
function summariseDetails(details: Record<string, unknown>): string {
    return Object.entries(details ?? {})
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join(' · ');
}

const AuditSection: React.FC<{ entries: AdminAuditEntry[] }> = ({ entries }) => {
    if (entries.length === 0) return <EmptyState>Nothing recorded yet.</EmptyState>;
    return (
        <ul className="space-y-2">
            {entries.map((entry) => {
                const detail = summariseDetails(entry.details);
                return (
                    <li key={entry.id} className="rounded-xl border border-border px-4 py-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                            <span className="font-medium text-dark">{entry.action}</span>
                            <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(entry.created_at)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-slate-500">
                            <span>{entry.target_id || entry.target_type}</span>
                            <span className="text-slate-300">·</span>
                            <span>{entry.actor_email}</span>
                        </div>
                        {detail && <p className="mt-1 break-all font-mono text-xs text-slate-500">{detail}</p>}
                    </li>
                );
            })}
        </ul>
    );
};

export default AuditSection;
