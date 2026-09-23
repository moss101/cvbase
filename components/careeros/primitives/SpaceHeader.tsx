import React from 'react';

/**
 * The top of every Career OS space: the one `h1` on the page, a sentence on
 * what the space is for and a slot for the screen's single dominant action.
 * Where you are is the shell's top bar (space › record) — the heading carries
 * its own weight, so no label sits above it. Keeping the heading level here
 * means a screen reader's heading list always starts with the space.
 */
export interface SpaceHeaderProps {
    /** Kept for callers; location now lives in the shell's breadcrumb, so it is not rendered. */
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

export const SpaceHeader: React.FC<SpaceHeaderProps> = ({ title, description, action, children, compact = false, className = '' }) => (
    <header className={`${compact ? 'pb-4' : 'pb-7'} ${className}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className={`font-semibold tracking-[-0.02em] text-content-primary ${compact ? 'text-[20px]' : 'text-[26px] leading-tight sm:text-[28px]'}`}>
                    {title}
                </h1>
                {description && <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-content-secondary">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
    </header>
);

export default SpaceHeader;
