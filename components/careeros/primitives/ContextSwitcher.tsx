import React from 'react';
import { Briefcase, Compass, FileText, Target, TriangleAlert } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ContextConflict } from '../../../services/careerOs/types';

/**
 * The context a screen is working in — goal, campaign, opportunity and
 * application — shown as a row of labelled references with a change button
 * each. Deliberately buttons rather than a listbox: choosing a context is a
 * navigation into a picker the caller owns, not a select control, so a plain
 * button announces exactly what it does. When a URL hint contradicted the
 * persisted relationship the conflict is shown beside the authoritative ref
 * rather than silently applied (CAREER_OS_CONTEXT_MODEL.md).
 */
export type ContextKind = 'goal' | 'campaign' | 'opportunity' | 'application';

export interface ContextRefSummary {
    kind: ContextKind;
    /** The record's title; `null` when nothing is selected. */
    label: string | null;
    /** Secondary line, e.g. company for an opportunity. */
    meta?: string;
    /** Called to change (or set) this reference; omit to render it read-only. */
    onChange?: () => void;
    /** Whether this reference is locked by a persisted relationship. */
    locked?: boolean;
}

export interface ContextSwitcherProps {
    refs: ContextRefSummary[];
    conflicts?: ContextConflict[];
    compact?: boolean;
    className?: string;
}

const ICON: Record<ContextKind, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>> = {
    goal: Target,
    campaign: Compass,
    opportunity: Briefcase,
    application: FileText,
};

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ refs, conflicts = [], compact = false, className = '' }) => {
    const { t } = useTranslation();

    const kindLabel: Record<ContextKind, string> = {
        goal: t('careeros.context.goal', 'Goal'),
        campaign: t('careeros.context.campaign', 'Campaign'),
        opportunity: t('careeros.context.opportunity', 'Opportunity'),
        application: t('careeros.context.application', 'Application'),
    };

    return (
        <nav aria-label={t('careeros.context.label', 'Working context')} className={className}>
            <ul className={`flex flex-wrap gap-2 ${compact ? '' : 'sm:gap-3'}`}>
                {refs.map((ref) => {
                    const Icon = ICON[ref.kind];
                    const conflict = conflicts.find((item) => item.field === ref.kind);
                    const hasValue = Boolean(ref.label);
                    const actionLabel = hasValue
                        ? t('careeros.context.change', 'Change {kind}').replace('{kind}', kindLabel[ref.kind].toLowerCase())
                        : t('careeros.context.choose', 'Choose {kind}').replace('{kind}', kindLabel[ref.kind].toLowerCase());
                    const inner = (
                        <>
                            <Icon size={16} strokeWidth={1.75} className="shrink-0 text-content-muted" aria-hidden="true" />
                            <span className="min-w-0 text-left">
                                <span className="block text-[12px] font-medium text-content-muted">{kindLabel[ref.kind]}</span>
                                <span className={`block truncate text-[13px] ${hasValue ? 'font-semibold text-content-primary' : 'text-content-secondary'}`}>
                                    {ref.label ?? t('careeros.context.none', 'None selected')}
                                </span>
                                {!compact && ref.meta && <span className="block truncate text-xs text-content-secondary">{ref.meta}</span>}
                            </span>
                        </>
                    );
                    return (
                        <li key={ref.kind} className="min-w-0 max-w-full">
                            {ref.onChange && !ref.locked ? (
                                <button
                                    type="button"
                                    onClick={ref.onChange}
                                    aria-label={hasValue ? `${actionLabel}: ${ref.label}` : actionLabel}
                                    className="tap-target flex max-w-full items-center gap-2 rounded-xl border border-border-default bg-surface-panel px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                                >
                                    {inner}
                                </button>
                            ) : (
                                <div className="tap-target flex max-w-full items-center gap-2 rounded-xl border border-border-default bg-surface-canvas px-3 py-2">
                                    {inner}
                                    {ref.locked && <span className="sr-only">{t('careeros.context.locked', '(fixed by this application)')}</span>}
                                </div>
                            )}
                            {conflict && (
                                <p role="status" className="mt-1 flex items-start gap-1 text-xs text-status-warning">
                                    <TriangleAlert size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    <span>{t('careeros.context.conflict', 'The link pointed at a different {kind}; keeping the one saved with this record.').replace('{kind}', kindLabel[ref.kind].toLowerCase())}</span>
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default ContextSwitcher;
