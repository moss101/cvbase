import React from 'react';

/**
 * Loading placeholders that follow the real layout: a card skeleton has the
 * eyebrow, title, two lines and a button of the card it stands in for, so
 * nothing jumps when the data arrives. Skeletons are decorative — the parent
 * `StatePanel` or region carries the loading announcement.
 */
export type SkeletonVariant = 'text' | 'title' | 'circle' | 'block' | 'button';

export interface SkeletonProps {
    variant?: SkeletonVariant;
    /** Any CSS width, e.g. '60%' or '8rem'. */
    width?: string;
    /** For `text`: how many lines; the last one is shorter. */
    lines?: number;
    className?: string;
}

const SHAPE: Record<SkeletonVariant, string> = {
    text: 'h-3.5 rounded',
    title: 'h-5 rounded-md',
    circle: 'h-10 w-10 rounded-full',
    block: 'h-24 rounded-xl',
    button: 'h-11 w-32 rounded-lg',
};

const TONE = 'bg-content-muted/15 animate-pulse motion-reduce:animate-none';

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', width, lines = 1, className = '' }) => {
    if (variant === 'text' && lines > 1) {
        return (
            <div className={`space-y-2 ${className}`} aria-hidden="true">
                {Array.from({ length: lines }, (_, index) => (
                    <div
                        key={index}
                        className={`${SHAPE.text} ${TONE}`}
                        style={{ width: index === lines - 1 ? '70%' : width ?? '100%' }}
                    />
                ))}
            </div>
        );
    }
    return <div className={`${SHAPE[variant]} ${TONE} ${className}`} style={width ? { width } : undefined} aria-hidden="true" />;
};

export interface SkeletonCardProps {
    /** Tighter spacing for list rows. */
    compact?: boolean;
    /** Whether the card it mirrors has a button. */
    action?: boolean;
    className?: string;
}

/** Mirrors the layout of the entity cards (eyebrow, title, copy, action). */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({ compact = false, action = true, className = '' }) => (
    <div
        className={`rounded-2xl border border-border-default bg-surface-panel ${compact ? 'p-4' : 'p-5'} ${className}`}
        aria-hidden="true"
    >
        <Skeleton variant="text" width="5rem" className="h-2.5" />
        <Skeleton variant="title" width="60%" className="mt-3" />
        <Skeleton variant="text" lines={compact ? 1 : 2} className="mt-3" />
        {action && <Skeleton variant="button" className={compact ? 'mt-3 h-9' : 'mt-4'} />}
    </div>
);

export default Skeleton;
