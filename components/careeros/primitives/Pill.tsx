import React from 'react';

/**
 * Small inline labels. A `Pill` is a neutral tag (a source, a type, a count);
 * a `StatusChip` carries a tone and, when asked, announces itself so a change
 * of status is read out rather than only recoloured. Colour never carries the
 * meaning on its own — the text (and optional icon) does.
 */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONE: Record<Tone, string> = {
    neutral: 'border-border-default bg-surface-canvas text-content-secondary',
    success: 'border-status-success/30 bg-status-success/10 text-status-success',
    warning: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
    danger: 'border-status-danger/30 bg-status-danger/10 text-status-danger',
    info: 'border-status-info/30 bg-status-info/10 text-status-info',
    accent: 'border-action-primary/30 bg-action-primary/10 text-action-primary',
};

const BASE =
    'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4';

export interface PillProps {
    children: React.ReactNode;
    tone?: Tone;
    icon?: React.ReactNode;
    /** Monospace label treatment for source/type tags. */
    mono?: boolean;
    className?: string;
    title?: string;
}

export const Pill: React.FC<PillProps> = ({ children, tone = 'neutral', icon, mono = false, className = '', title }) => (
    <span className={`${BASE} ${TONE[tone]} ${mono ? 'font-label uppercase tracking-[0.08em]' : ''} ${className}`} title={title}>
        {icon && <span className="inline-flex shrink-0 [&>svg]:h-3 [&>svg]:w-3" aria-hidden="true">{icon}</span>}
        <span className="truncate">{children}</span>
    </span>
);

export interface StatusChipProps {
    label: string;
    tone?: Tone;
    icon?: React.ReactNode;
    /** Adds role="status" so assistive tech announces the label when it changes. */
    announce?: boolean;
    className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, tone = 'neutral', icon, announce = false, className = '' }) => (
    <span role={announce ? 'status' : undefined} className={`${BASE} ${TONE[tone]} ${className}`}>
        {icon && <span className="inline-flex shrink-0 [&>svg]:h-3 [&>svg]:w-3" aria-hidden="true">{icon}</span>}
        <span className="truncate">{label}</span>
    </span>
);

export default Pill;
