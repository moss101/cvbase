import React from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../NavigationProvider';
import { useDialog } from '../../lib/useDialog';
import { useTranslation } from '../../services/translationService';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** Overrides the default `max-h-[80vh]` (e.g. a taller sheet for a full preview). */
    heightClassName?: string;
}

/**
 * Generic backdrop + slide-up panel. Registers with the navigation stack's
 * back-handler chain so an in-app back tap, the browser/gesture back, and the
 * Android hardware back button all close the sheet before popping a screen.
 * `useDialog` adds the keyboard side: Escape, a Tab trap, focus in/restore and
 * the body scroll lock.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, heightClassName }) => {
    const { t } = useTranslation();
    useBackHandler(isOpen, onClose);
    const dialog = useDialog({ open: isOpen, onClose, label: title ?? t('label.sheet', 'Sheet') });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
            <div
                className="absolute inset-0 bg-dark/40 sheet-backdrop-enter"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                {...dialog.panelProps}
                className={`relative flex flex-col rounded-t-[28px] bg-white shadow-2xl outline-none sheet-panel-enter ${heightClassName ?? 'max-h-[80vh]'}`}
            >
                <div className="flex shrink-0 justify-center pb-1 pt-2.5">
                    <span className="h-1 w-9 rounded-full bg-border" />
                </div>
                {title && (
                    <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-1">
                        <h2 className="text-[15px] font-bold text-dark">{title}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('btn.close', 'Close')}
                            className="tap-target -mr-2 flex items-center justify-center rounded-full text-gray-400 transition hover:text-dark active:scale-95"
                        >
                            <X size={20} strokeWidth={1.75} />
                        </button>
                    </div>
                )}
                <div className="overflow-y-auto pb-safe">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BottomSheet;
