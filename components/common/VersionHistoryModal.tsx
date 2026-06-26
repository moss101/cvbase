import React, { useState } from 'react';
import type { StoredVersion } from '../../services/repos/mappers';

interface VersionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    versions: StoredVersion[];
    loading: boolean;
    saving: boolean;
    /** Snapshot the current resume under a label. */
    onSave: (label: string) => void;
    /** Load a saved snapshot back into the editor. */
    onRestore: (version: StoredVersion) => void;
    onDelete: (versionId: string) => void;
}

const fmt = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
    isOpen, onClose, versions, loading, saving, onSave, onRestore, onDelete,
}) => {
    const [label, setLabel] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(label.trim());
        setLabel('');
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span>
                        Version history
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                <p className="text-gray-600 text-sm mb-4">
                    Save a snapshot of your resume before tailoring it to a job, then restore any earlier version anytime.
                </p>

                {/* Save current */}
                <div className="flex gap-2 mb-5">
                    <input
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !saving) handleSave(); }}
                        placeholder="Label (e.g. “Before FAANG edits”)"
                        maxLength={80}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                        <span className="material-symbols-outlined text-base">{saving ? 'hourglass_top' : 'save'}</span>
                        Save version
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto custom-scrollbar -mx-1 px-1">
                    {loading ? (
                        <p className="text-sm text-gray-400 text-center py-8">Loading versions…</p>
                    ) : versions.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No saved versions yet. Save one above to start a history.</p>
                    ) : (
                        <ul className="space-y-2">
                            {versions.map(v => (
                                <li key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/60">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-800 truncate">{v.label || 'Untitled version'}</p>
                                        <p className="text-xs text-gray-400">{fmt(v.createdAt)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRestore(v)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">restore</span>
                                        Restore
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { if (v.id) onDelete(v.id); }}
                                        aria-label="Delete version"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VersionHistoryModal;
