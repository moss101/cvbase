import React, { useState } from 'react';
import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import { adminApi, type AdminProvider } from '../../services/adminApi';
import ConfirmDialog from '../common/ConfirmDialog';
import ProviderEditor, { EMPTY_PROVIDER } from './ProviderEditor';
import { Badge, EmptyState } from './ui';

const ProvidersSection: React.FC<{
    providers: AdminProvider[];
    onChanged: () => void;
    onError: (message: string) => void;
}> = ({ providers, onChanged, onError }) => {
    const [editing, setEditing] = useState<Partial<AdminProvider> | null>(null);
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);

    const removeProvider = async (providerId: string) => {
        setPendingDelete(null);
        try {
            await adminApi.deleteProvider(providerId);
            onChanged();
        } catch {
            onError('Could not delete that provider.');
        }
    };

    return (
        <div className="space-y-5">
            <ConfirmDialog
                open={pendingDelete !== null}
                title={`Delete ${pendingDelete ?? 'provider'}?`}
                description="Its stored keys are removed with it. Generation falls back to the next configured provider, or to the environment secrets."
                confirmLabel="Delete provider"
                destructive
                onConfirm={() => pendingDelete && void removeProvider(pendingDelete)}
                onCancel={() => setPendingDelete(null)}
            />
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-soft">
                    Routing is live: saving a provider changes generation immediately, with no
                    redeploy.
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
                        onChanged();
                    }}
                />
            )}

            {providers.length === 0 && !editing && (
                <EmptyState>
                    No providers configured. The router is using the values from
                    <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">
                        supabase secrets
                    </code>
                    until you add one here.
                </EmptyState>
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
                                <Badge>{p.dialect}</Badge>
                                {p.role !== 'off' && <Badge tone="accent">{p.role}</Badge>}
                                {!p.enabled && <Badge>disabled</Badge>}
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
                                onClick={() => setPendingDelete(p.provider_id)}
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
    );
};

export default ProvidersSection;
