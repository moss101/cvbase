import React, { useState } from 'react';
import type { StoredVersion } from '../../services/repos/mappers';
import Dialog from './Dialog';
import { History, Hourglass, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from '../../services/translationService';

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
    const { t } = useTranslation();
    const [label, setLabel] = useState('');

    const handleSave = () => {
        onSave(label.trim());
        setLabel('');
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            panelClassName="max-w-lg max-h-[85vh]"
            bodyClassName="flex flex-col"
            title={
                <>
                    <History className="w-[1em] h-[1em] text-primary" aria-hidden="true" />
                    {t('finalizeForm.versionHistory', 'Version history')}
                </>
            }
        >
                <p className="text-gray-600 text-sm mb-4">
                    {t('versionHistory.desc', 'Save a snapshot of your resume before tailoring it to a job, then restore any earlier version anytime.')}
                </p>

                {/* Save current */}
                <div className="flex gap-2 mb-5">
                    <input
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !saving) handleSave(); }}
                        placeholder={t('versionHistory.labelPlaceholder', 'Label (e.g. “Before FAANG edits”)')}
                        aria-label={t('versionHistory.labelAria', 'Version label')}
                        maxLength={80}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                        {saving
                            ? <Hourglass className="w-4 h-4" aria-hidden="true" />
                            : <Save className="w-4 h-4" aria-hidden="true" />}
                        {t('versionHistory.saveVersion', 'Save version')}
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto custom-scrollbar -mx-1 px-1">
                    {loading ? (
                        <p className="text-sm text-gray-400 text-center py-8">{t('versionHistory.loading', 'Loading versions…')}</p>
                    ) : versions.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">{t('versionHistory.noneYet', 'No saved versions yet. Save one above to start a history.')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {versions.map(v => (
                                <li key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/60">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-800 truncate">{v.label || t('versionHistory.untitled', 'Untitled version')}</p>
                                        <p className="text-xs text-gray-400">{fmt(v.createdAt)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRestore(v)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                                        {t('versionHistory.restore', 'Restore')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { if (v.id) onDelete(v.id); }}
                                        aria-label={t('versionHistory.deleteVersion', 'Delete version')}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
        </Dialog>
    );
};

export default VersionHistoryModal;
