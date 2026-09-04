import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useTranslation } from '../../services/translationService';

interface UndoRedoButtonsProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    /** Slightly smaller, borderless variant for the mobile top bar's trailing
     *  icon row (matches its Eye/MoreHorizontal buttons). */
    compact?: boolean;
    className?: string;
}

/** Small icon-button pair for the resume builder's undo/redo history
 *  (lib/builder/useHistory.ts). Lives in its own file because it is used in
 *  both the desktop header row and the mobile top bar's trailing slot. */
const UndoRedoButtons: React.FC<UndoRedoButtonsProps> = ({ canUndo, canRedo, onUndo, onRedo, compact, className }) => {
    const { t } = useTranslation();
    const buttonClass = compact
        ? 'tap-target flex items-center justify-center rounded-full text-dark transition active:scale-95 disabled:opacity-30'
        : 'tap-target flex items-center justify-center rounded-xl border-2 border-border bg-white text-dark shadow-sm transition hover:border-primary hover:text-primary hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:text-dark';
    const iconSize = compact ? 20 : 18;

    return (
        <div className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
            <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label={t('undoRedo.undo', 'Undo')}
                title={t('undoRedo.undoTitle', 'Undo (Ctrl+Z)')}
                className={buttonClass}
            >
                <Undo2 size={iconSize} strokeWidth={1.75} />
            </button>
            <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label={t('undoRedo.redo', 'Redo')}
                title={t('undoRedo.redoTitle', 'Redo (Ctrl+Shift+Z)')}
                className={buttonClass}
            >
                <Redo2 size={iconSize} strokeWidth={1.75} />
            </button>
        </div>
    );
};

export default UndoRedoButtons;
