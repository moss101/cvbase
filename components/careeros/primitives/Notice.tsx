import React from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';

/**
 * A calm, inline notice: something the person should know about the record
 * in front of them (a draft built on older facts, an analysis gone out of
 * date, a note on how data is kept). It is a hairline row on the panel
 * surface; the tone lives in the icon, never in a tinted slab, and the one
 * thing to do sits at the right rather than centred beneath the text.
 *
 * For loading, empty and failure states use `StatePanel`; a notice is for a
 * page that works and has something worth saying.
 */
export type NoticeTone = 'neutral' | 'info' | 'warning' | 'success';

export interface NoticeProps {
    tone?: NoticeTone;
    title?: React.ReactNode;
    children?: React.ReactNode;
    /** The one thing to do from here: a Button (secondary or quiet). */
    action?: React.ReactNode;
    /** A single-line treatment for use inside a panel (no frame of its own). */
    inline?: boolean;
    /** Announce changes politely; on by default for warning notices. */
    live?: boolean;
    id?: string;
    className?: string;
}

const ICON: Record<NoticeTone, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>> = {
    neutral: Info,
    info: Info,
    warning: TriangleAlert,
    success: CircleCheck,
};

const TONE: Record<NoticeTone, string> = {
    neutral: 'text-content-muted',
    info: 'text-action-primary',
    warning: 'text-status-warning',
    success: 'text-status-success',
};

export const Notice: React.FC<NoticeProps> = ({ tone = 'neutral', title, children, action, inline = false, live, id, className = '' }) => {
    const Icon = ICON[tone];
    const announce = live ?? tone === 'warning';
    return (
        <section
            id={id}
            role={announce ? 'status' : undefined}
            aria-live={announce ? 'polite' : undefined}
            className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
                inline ? 'rounded-xl bg-surface-canvas px-3.5 py-2.5' : 'rounded-2xl border border-border-default bg-surface-panel px-5 py-4'
            } ${className}`}
        >
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <Icon size={inline ? 16 : 18} strokeWidth={1.9} className={`mt-0.5 shrink-0 ${TONE[tone]}`} aria-hidden="true" />
                <div className="min-w-0 text-[13.5px] leading-relaxed text-content-secondary">
                    {title && <p className="text-[14px] font-semibold text-content-primary">{title}</p>}
                    {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
                </div>
            </div>
            {action && <div className="shrink-0 sm:pl-2">{action}</div>}
        </section>
    );
};

export default Notice;
