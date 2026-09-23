import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Ellipsis } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CareerFact } from '../../../services/careerOs/types';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';
import { Button, EvidenceBadge, StatusChip } from '../primitives';
import { kindLabel, periodLabel, sourceLabel } from './factFormat';

/**
 * One career fact as a card: the evidence badge, where it came from, its
 * period and narrative, and the actions the caller allows. Imported
 * narratives may be HTML; they are sanitised before rendering. Secondary
 * actions sit behind a disclosure so the card keeps one dominant action.
 */
export interface FactCardProps {
    fact: CareerFact;
    /** Label of the parent (e.g. the experience an achievement belongs to). */
    parentLabel?: string;
    /** "Used in N drafts" — shown when known. */
    usedIn?: number;
    primaryAction?: { label: string; onClick: () => void; loading?: boolean };
    secondaryActions?: Array<{ label: string; onClick: () => void; destructive?: boolean }>;
    children?: React.ReactNode;
    compact?: boolean;
    /** Name the kind (Experience, Skill…) in the meta line; off where the view already says it. */
    showKind?: boolean;
    className?: string;
}

const looksLikeHtml = (value: string): boolean => /<[a-z][\s\S]*>/i.test(value);

export const FactCard: React.FC<FactCardProps> = ({ fact, parentLabel, usedIn, primaryAction, secondaryActions = [], children, compact = false, showKind = true, className = '' }) => {
    const { t } = useTranslation();
    const [moreOpen, setMoreOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const moreId = useId();
    const titleId = useId();
    const period = periodLabel(t, fact);
    const level = typeof fact.payload.level === 'string' && fact.payload.level ? fact.payload.level : null;
    const narrative = fact.narrative.trim();
    const long = narrative.length > 280;

    return (
        <article aria-labelledby={titleId} className={`cos-entity rounded-2xl border border-border-default bg-surface-panel ${compact ? 'p-4' : 'p-5'} ${className}`}>
            <div className="flex items-start justify-between gap-3">
                {/* Title first, with its state chips on the same line — no label row above it. */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <h3 id={titleId} className={`min-w-0 font-semibold text-content-primary ${compact ? 'text-[15px]' : 'text-[15.5px]'}`}>
                        {showKind ? <span className="sr-only">{kindLabel(t, fact.kind)}: </span> : null}
                        {fact.title || t('careeros.career.untitled', 'Untitled')}
                        {level && <span className="ml-2 text-sm font-normal text-content-secondary">· {level}</span>}
                    </h3>
                    <EvidenceBadge state={fact.confirmationState} detail={fact.verification ? fact.verification.source : undefined} />
                    {fact.reviewState === 'candidate' && <StatusChip label={t('careeros.career.needsReview', 'Needs review')} tone="neutral" />}
                    {fact.reviewState === 'conflict' && <StatusChip label={t('careeros.career.inConflict', 'Conflicts with another fact')} tone="warning" />}
                    {fact.status === 'withdrawn' && <StatusChip label={t('careeros.career.withdrawn', 'Withdrawn')} tone="neutral" />}
                </div>
                {secondaryActions.length > 0 && (
                    <button
                        type="button"
                        aria-expanded={moreOpen}
                        aria-controls={moreId}
                        aria-label={t('careeros.action.moreOptions', 'More options')}
                        onClick={() => setMoreOpen((open) => !open)}
                        className="tap-target -mr-2 -mt-2 inline-flex shrink-0 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-canvas hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                        <Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                )}
            </div>
            {(fact.organization || period || fact.location || parentLabel || showKind) && (
                <p className="mt-0.5 text-sm text-content-secondary">
                    {[showKind ? kindLabel(t, fact.kind) : null, fact.organization, fact.location, period, parentLabel].filter(Boolean).join(' · ')}
                </p>
            )}
            {narrative && !compact && (
                <div className="mt-2">
                    {looksLikeHtml(narrative) ? (
                        <div
                            className={`prose prose-sm max-w-none text-[13px] leading-relaxed text-content-secondary ${!expanded && long ? 'line-clamp-4' : ''}`}
                            // Imported narratives may contain HTML; sanitised to the allowed subset.
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(narrative) }}
                        />
                    ) : (
                        <p className={`whitespace-pre-line text-[13px] leading-relaxed text-content-secondary ${!expanded && long ? 'line-clamp-4' : ''}`}>{narrative}</p>
                    )}
                    {long && (
                        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="tap-target mt-1 inline-flex items-center gap-1 text-xs font-semibold text-content-secondary hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                            {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                            {expanded ? t('careeros.career.showLess', 'Show less') : t('careeros.career.showMore', 'Show more')}
                        </button>
                    )}
                </div>
            )}
            {children && <div className="mt-3">{children}</div>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-content-muted">
                    {sourceLabel(t, fact.sourceKind)}
                    {typeof usedIn === 'number' && (
                        <>
                            <span aria-hidden="true"> · </span>
                            {usedIn === 0 ? t('careeros.career.usedInNone', 'Not used in any draft') : t('careeros.career.usedIn', 'Used in {count} drafts').replace('{count}', String(usedIn))}
                        </>
                    )}
                </p>
                {primaryAction && (
                    <Button variant={fact.reviewState === 'candidate' ? 'primary' : 'secondary'} size="sm" onClick={primaryAction.onClick} loading={primaryAction.loading}>{primaryAction.label}</Button>
                )}
            </div>
            {secondaryActions.length > 0 && (
                // `hidden` alone loses to a display utility, so the display class follows the state.
                <div id={moreId} hidden={!moreOpen} className={`${moreOpen ? 'flex' : 'hidden'} mt-3 flex-wrap gap-2 border-t border-border-default pt-3`}>
                    {secondaryActions.map((action) => (
                        <Button key={action.label} variant={action.destructive ? 'danger' : 'quiet'} size="sm" onClick={() => { setMoreOpen(false); action.onClick(); }}>{action.label}</Button>
                    ))}
                </div>
            )}
        </article>
    );
};

export default FactCard;
