import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../NavigationProvider';

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
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, heightClassName }) => {
    useBackHandler(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
            <div
                className="absolute inset-0 bg-dark/40 sheet-backdrop-enter"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={`relative flex flex-col rounded-t-[28px] bg-white shadow-2xl sheet-panel-enter ${heightClassName ?? 'max-h-[80vh]'}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
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
                            aria-label="Close"
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
