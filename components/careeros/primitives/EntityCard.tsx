import React, { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { SkeletonCard } from './Skeleton';

/**
 * The frame every record card shares: an eyebrow naming the kind of thing,
 * a title, a meta line, a row of chips, an optional body and a footer with one
 * dominant action. The six entity cards compose this rather than repeating
 * it, so a change to how a card reads changes every card.
 *
 * The dominant action is a button, not the whole card: a card full of text is
 * a poor click target and swallows text selection. `compact` is the list-row
 * form used on mobile and in side panels.
 */
export interface EntityCardAction {
    label: string;
    onClick: () => void;
    /** Shown instead of firing `onClick`; the button is disabled with the reason visible. */
    disabledReason?: string;
    loading?: boolean;
}

export interface EntityCardProps {
    /** What kind of record this is, e.g. "Opportunity". */
    kind: string;
    kindIcon?: React.ReactNode;
    title: string;
    /** One line beneath the title: company, organisation, goal … */
    meta?: string;
    /** Status, evidence and other chips, rendered after the eyebrow. */
    chips?: React.ReactNode;
    children?: React.ReactNode;
    action?: EntityCardAction;
    /** A quiet secondary action beside the dominant one. */
    secondaryAction?: EntityCardAction;
    /** Small footer text (dates, counts) at the left of the actions. */
    footnote?: React.ReactNode;
    loading?: boolean;
    compact?: boolean;
    /** Marks the card as the current selection (e.g. the primary goal). */
    selected?: boolean;
    className?: string;
}

export const EntityCard: React.FC<EntityCardProps> = ({
    kind,
    kindIcon,
    title,
    meta,
    chips,
    children,
    action,
    secondaryAction,
    footnote,
    loading = false,
    compact = false,
    selected = false,
    className = '',
}) => {
    const titleId = useId();

    if (loading) return <SkeletonCard compact={compact} action={Boolean(action)} className={className} />;

    return (
        <article
            aria-labelledby={titleId}
            className={`rounded-2xl border bg-surface-panel ${compact ? 'p-4' : 'p-5'} ${
                selected ? 'border-action-primary ring-1 ring-action-primary/30' : 'border-border-default'
            } ${className}`}
        >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <p className="inline-flex items-center gap-1 text-[12px] font-medium text-content-muted">
                    {kindIcon && <span className="inline-flex [&>svg]:h-3 [&>svg]:w-3" aria-hidden="true">{kindIcon}</span>}
                    {kind}
                </p>
                {chips}
            </div>
            <h3 id={titleId} className={`mt-2 font-semibold text-content-primary ${compact ? 'text-[15px]' : 'text-base'}`}>
                {title}
            </h3>
            {meta && <p className="mt-0.5 text-sm text-content-secondary">{meta}</p>}
            {children && <div className={compact ? 'mt-2' : 'mt-3'}>{children}</div>}
            {(action || secondaryAction || footnote) && (
                <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'mt-3' : 'mt-4'}`}>
                    <div className="min-w-0 text-xs text-content-muted">
                        {footnote}
                        {action?.disabledReason && <p className="text-status-warning">{action.disabledReason}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                        {secondaryAction && (
                            <Button
                                variant="quiet"
                                size="sm"
                                onClick={secondaryAction.onClick}
                                disabled={Boolean(secondaryAction.disabledReason)}
                                loading={secondaryAction.loading}
                            >
                                {secondaryAction.label}
                            </Button>
                        )}
                        {action && (
                            <Button
                                variant="primary"
                                size={compact ? 'sm' : 'md'}
                                onClick={action.onClick}
                                disabled={Boolean(action.disabledReason)}
                                loading={action.loading}
                                trailingIcon={<ArrowRight size={16} strokeWidth={2} />}
                            >
                                {action.label}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};

export default EntityCard;
