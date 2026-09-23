import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

/**
 * The "More" menu at the end of a record row: the less frequent actions
 * (duplicate, rename, delete…) one click behind a quiet icon button, so a row
 * shows its way in and nothing else. Closes on outside click and Escape.
 */
export interface RowMenuItem { key: string; label: string; Icon: LucideIcon; onSelect: () => void; disabled?: boolean; danger?: boolean }

/** Secondary CV actions behind one quiet "More" button, so each row has a single visible action. */
export const RowMenu: React.FC<{ label: string; items: RowMenuItem[] }> = ({ label, items }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const menuId = useId();
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);
    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={label}
                title={label}
                className="grid h-9 w-9 place-items-center rounded-lg text-content-secondary transition-colors duration-150 hover:bg-surface-canvas hover:text-content-primary"
            >
                <MoreHorizontal size={18} strokeWidth={1.9} aria-hidden="true" />
            </button>
            {open && (
                <div id={menuId} role="menu" aria-label={label} className="cos-menu is-below">
                    {items.map((item) => (
                        <button key={item.key} type="button" role="menuitem" disabled={item.disabled} className={`cos-menu-item ${item.danger ? 'is-danger' : ''} disabled:opacity-50`} onClick={() => { setOpen(false); item.onSelect(); }}>
                            <item.Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RowMenu;
