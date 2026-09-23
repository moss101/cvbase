import React, { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { SkeletonCard } from './Skeleton';

/**
 * The frame every record shares: an icon tile for the kind of thing, the title
 * with its status chips on the same line, a meta line, an optional body and a
 * footer with the way in. The kind is announced to screen readers inside the
 * heading instead of being printed as a label above it. The six entity cards
 * compose this rather than repeating it, so a change to how a card reads
 * changes every card.
 *
 * Inside a `.cos-list` panel the card sheds its own frame and becomes a
 * divided row, so a list is one surface rather than a stack of cards. The way
 * in is a secondary button: a list never competes with the screen's single
 * emerald action. `compact` is the tighter form used on phones and in side
 * panels.
 */
export interface EntityCardAction {
    label: string;
    onClick: () => void;
    /** Shown instead of firing `onClick`; the button is disabled with the reason visible. */
    disabledReason?: string;
    loading?: boolean;
    /** Render as the context's one filled emerald button (e.g. the only record on a pane). */
    primary?: boolean;
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
    /** A RowMenu of less frequent actions, after the way in. */
    menu?: React.ReactNode;
    loading?: boolean;
    compact?: boolean;
    /** Marks the card as the current selection (e.g. the primary goal). */
    selected?: boolean;
    /** No frame of its own: the record sits directly on the panel that holds it. */
    flush?: boolean;
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
    menu,
    loading = false,
    compact = false,
    selected = false,
    flush = false,
    className = '',
}) => {
    const titleId = useId();

    if (loading) return <SkeletonCard compact={compact} action={Boolean(action)} className={className} />;

    const hasActions = Boolean(action || secondaryAction || menu);
    const actions = hasActions && (
        <div className="flex shrink-0 items-center gap-1">
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
                    variant={action.primary ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={action.onClick}
                    disabled={Boolean(action.disabledReason)}
                    loading={action.loading}
                    trailingIcon={<ArrowRight size={15} strokeWidth={2} />}
                >
                    {action.label}
                </Button>
            )}
            {menu}
        </div>
    );

    // Wide rows keep their way in at the right of the text; compact cards (phones,
    // board tiles, side panels) stack it beneath.
    return (
        <article
            aria-labelledby={titleId}
            className={`cos-entity ${flush ? '' : `rounded-2xl border border-border-default bg-surface-panel ${compact ? 'p-4' : 'p-5'}`} ${
                selected ? 'is-selected' : ''
            } ${className}`}
        >
            <div className="flex gap-4">
                {kindIcon && !compact && (
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-border-default bg-surface-canvas text-content-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
                        {kindIcon}
                    </span>
                )}
                <div className={`flex min-w-0 flex-1 flex-col gap-3 ${compact ? '' : 'sm:flex-row sm:items-center sm:gap-6'}`}>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                            <h3 id={titleId} className={`min-w-0 font-semibold text-content-primary ${compact ? 'text-[15px]' : 'text-[15.5px]'}`}>
                                <span className="sr-only">{kind}: </span>
                                {title}
                            </h3>
                            {chips}
                        </div>
                        {meta && <p className="mt-0.5 text-sm text-content-secondary">{meta}</p>}
                        {children && <div className={compact ? 'mt-2' : 'mt-2.5'}>{children}</div>}
                        {(footnote || action?.disabledReason) && (
                            <div className="mt-2 min-w-0 text-xs text-content-muted">
                                {footnote}
                                {action?.disabledReason && <p className="text-status-warning">{action.disabledReason}</p>}
                            </div>
                        )}
                    </div>
                    {actions}
                </div>
            </div>
        </article>
    );
};

export default EntityCard;
