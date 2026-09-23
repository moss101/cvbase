import React, { useState } from 'react';
import { Archive, ArchiveRestore, Brain, CheckSquare, Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CoachConversation } from '../../../services/careerOs/types';
import Dialog from '../../common/Dialog';
import ConfirmDialog from '../../common/ConfirmDialog';
import { Button } from '../primitives';

/**
 * Memory controls for one conversation (REQ-21: clear/export/delete history
 * and selective memory). Rename, archive/reopen, export as JSON, forget the
 * derived summary, delete selected messages and delete the conversation.
 * Every destructive action confirms first; nothing runs on menu open.
 */
export interface MemoryMenuProps {
    conversation: CoachConversation;
    busy?: boolean;
    onRename: (title: string) => void;
    onArchive: () => void;
    onReopen: () => void;
    onExport: () => void;
    onForgetSummary: () => void;
    onStartSelect: () => void;
    onDelete: () => void;
}

export const MemoryMenu: React.FC<MemoryMenuProps> = ({ conversation, busy = false, onRename, onArchive, onReopen, onExport, onForgetSummary, onStartSelect, onDelete }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState<'rename' | 'delete' | 'forget' | null>(null);

    const close = () => setOpen(false);
    const item = (label: string, icon: React.ReactNode, onClick: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
        <li>
            <button
                type="button"
                disabled={busy || opts.disabled}
                onClick={() => { close(); onClick(); }}
                className={`tap-target flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition-colors duration-150 hover:bg-surface-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${opts.danger ? 'text-status-danger' : 'text-content-primary'}`}
            >
                <span className={`inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${opts.danger ? '' : 'text-content-muted'}`} aria-hidden="true">{icon}</span>
                <span>{label}</span>
            </button>
        </li>
    );

    return (
        <>
            <Button variant="quiet" size="sm" className="shrink-0" icon={<MoreHorizontal size={16} strokeWidth={2} />} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} title={t('careeros.coach.memoryTitle', 'Conversation memory')}>
                {/* Icon-only on phones so the thread header stays on one row. */}
                <span className="max-sm:sr-only">{t('careeros.coach.memory', 'Memory')}</span>
            </Button>
            <Dialog open={open} onClose={close} title={t('careeros.coach.memoryTitle', 'Conversation memory')} panelClassName="max-w-sm">
                <p className="mb-3 text-[13px] text-content-secondary">{t('careeros.coach.memoryDescription', 'This conversation is stored in your account. You decide what stays.')}</p>
                <ul className="-mx-2 space-y-0.5">
                    {item(t('careeros.coach.rename', 'Rename'), <Pencil />, () => setConfirm('rename'))}
                    {conversation.status === 'archived'
                        ? item(t('careeros.coach.reopen', 'Reopen'), <ArchiveRestore />, onReopen)
                        : item(t('careeros.coach.archive', 'Archive'), <Archive />, onArchive)}
                    {item(t('careeros.coach.export', 'Export as JSON'), <Download />, onExport)}
                    {item(t('careeros.coach.selectMessages', 'Delete selected messages…'), <CheckSquare />, onStartSelect)}
                    {item(t('careeros.coach.forgetSummary', 'Forget derived summary'), <Brain />, () => setConfirm('forget'), { disabled: !conversation.summary })}
                    {item(t('careeros.coach.deleteConversation', 'Delete conversation'), <Trash2 />, () => setConfirm('delete'), { danger: true })}
                </ul>
            </Dialog>
            <ConfirmDialog
                open={confirm === 'rename'}
                mode="prompt"
                title={t('careeros.coach.renameTitle', 'Rename conversation')}
                inputLabel={t('careeros.coach.renameLabel', 'Title')}
                defaultValue={conversation.title}
                required
                confirmLabel={t('btn.save', 'Save')}
                onConfirm={(value) => { setConfirm(null); if (value) onRename(value); }}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmDialog
                open={confirm === 'forget'}
                title={t('careeros.coach.forgetTitle', 'Forget the derived summary?')}
                description={t('careeros.coach.forgetDescription', 'The summary the coach derived from earlier messages is cleared. Your messages and your career facts are not changed.')}
                confirmLabel={t('careeros.coach.forgetConfirm', 'Forget summary')}
                onConfirm={() => { setConfirm(null); onForgetSummary(); }}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmDialog
                open={confirm === 'delete'}
                destructive
                title={t('careeros.coach.deleteTitle', 'Delete this conversation?')}
                description={t('careeros.coach.deleteDescription', 'All of its messages, citations and the derived summary are deleted. Records it cited (facts, applications, documents) are not touched. This cannot be undone.')}
                confirmLabel={t('careeros.coach.deleteConfirm', 'Delete conversation')}
                onConfirm={() => { setConfirm(null); onDelete(); }}
                onCancel={() => setConfirm(null)}
            />
        </>
    );
};

export default MemoryMenu;
