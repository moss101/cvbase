import React from 'react';

/**
 * The top of every Career OS space: an eyebrow naming where you are, the one
 * `h1` on the page, a sentence on what the space is for and a slot for the
 * screen's single dominant action. Keeping the heading level here means a
 * screen reader's heading list always starts with the space.
 */
export interface SpaceHeaderProps {
    /** Small label above the title, e.g. the space or parent record. */
    eyebrow?: string;
    title: string;
    description?: string;
    /** The dominant action for the screen; one button, not a toolbar. */
    action?: React.ReactNode;
    /** Breadcrumb or context strip rendered beneath the header. */
    children?: React.ReactNode;
    compact?: boolean;
    className?: string;
}

export const SpaceHeader: React.FC<SpaceHeaderProps> = ({ eyebrow, title, description, action, children, compact = false, className = '' }) => (
    <header className={`${compact ? 'pb-4' : 'pb-6'} ${className}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && <p className="font-label text-[10px] uppercase tracking-[0.14em] text-content-muted">{eyebrow}</p>}
                <h1 className={`${eyebrow ? 'mt-2' : ''} font-semibold tracking-tight text-content-primary ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
                    {title}
                </h1>
                {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-content-secondary">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
    </header>
);

export default SpaceHeader;
