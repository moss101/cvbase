import React, { useEffect, useId, useState } from 'react';
import { Briefcase, Check, ChevronDown, ChevronUp, Compass, FileText, Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import type { CoachConversation } from '../../../services/careerOs/types';
import Dialog from '../../common/Dialog';
import { Button, Skeleton, StatePanel, type ContextRefSummary } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { CONTEXT_KEYS, type ContextIds, type ContextKey, type ContextLabels } from './useCoach';

/**
 * The visible, editable context of one conversation (REQ-21): goal,
 * campaign, opportunity and application as labelled references with a
 * picker each. Picking an application fixes the other three from the
 * application's persisted relations — a URL or a picker can never override
 * what the application record says (CAREER_OS_CONTEXT_MODEL.md).
 */
export interface CoachContextPanelProps {
    conversation: CoachConversation;
    labels: ContextLabels | null;
    /** Called with the full id map after a pick; the caller persists it. */
    onChange: (ids: ContextIds) => Promise<void>;
    /** Load labels failed (the refs are still shown by id). */
    labelsError?: boolean;
    disabled?: boolean;
    /** Start collapsed to a one-line summary (mobile); the switcher expands on demand. */
    defaultCollapsed?: boolean;
}

interface PickerOption { id: string; label: string; meta?: string }

// The picker reads the signed-in owner from the shell so it never lists
// another account's rows.
const useUserIdForPicker = (): string | null => useCareerOs().userId;

const CoachContextPanel: React.FC<CoachContextPanelProps> = ({ conversation, labels, onChange, labelsError = false, disabled = false, defaultCollapsed = false }) => {
    const { t } = useTranslation();
    const [picker, setPicker] = useState<ContextKey | null>(null);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(!defaultCollapsed);
    const regionId = useId();

    const lockedByApplication = Boolean(conversation.contextRefs.application);
    const kindLabel: Record<ContextKey, string> = {
        goal: t('careeros.context.goal', 'Goal'),
        campaign: t('careeros.context.campaign', 'Campaign'),
        opportunity: t('careeros.context.opportunity', 'Opportunity'),
        application: t('careeros.context.application', 'Application'),
    };

    const refs: ContextRefSummary[] = CONTEXT_KEYS.map((kind) => {
        const ref = conversation.contextRefs[kind];
        const label = labels?.[kind];
        const locked = lockedByApplication && kind !== 'application';
        return {
            kind,
            label: ref ? (label?.missing ? t('careeros.coach.context.unavailable', 'Unavailable record') : label?.label ?? (labelsError ? ref.id : null)) : null,
            meta: ref && locked ? t('careeros.coach.context.fixedByApplication', 'Fixed by the application') : label?.meta,
            locked,
            onChange: disabled ? undefined : () => setPicker(kind),
        };
    });

    const currentIds = (): ContextIds => {
        const out: ContextIds = {};
        for (const k of CONTEXT_KEYS) if (conversation.contextRefs[k]?.id) out[k] = conversation.contextRefs[k]?.id;
        return out;
    };

    const pick = async (kind: ContextKey, id: string | null) => {
        setSaving(true);
        try {
            const next = currentIds();
            if (id) next[kind] = id; else delete next[kind];
            await onChange(next);
            setPicker(null);
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = refs.filter((r) => r.label).length;
    const summary = selectedCount === 0
        ? t('careeros.coach.context.noneSummary', 'No context selected')
        : refs.filter((r) => r.label).map((r) => `${kindLabel[r.kind as ContextKey]}: ${r.label}`).join(' · ');

    return (
        <section aria-label={t('careeros.coach.context.title', 'Coach context')} className="border-y border-border-default py-1.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h2 className="shrink-0 text-[12.5px] font-semibold text-content-muted">{t('careeros.coach.context.title', 'Coach context')}</h2>
                    {expanded
                        ? <p className="min-w-0 text-[12.5px] text-content-muted">{t('careeros.coach.context.hint', 'Answers cite the records in this context. Change it any time.')}</p>
                        : <p className="min-w-0 flex-1 truncate text-[13px] text-content-secondary">{summary}</p>}
                </div>
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={regionId}
                    onClick={() => setExpanded((v) => !v)}
                    className="tap-target inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-content-secondary transition-colors hover:bg-surface-panel hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                    {expanded ? t('careeros.coach.context.collapse', 'Hide') : t('careeros.coach.context.expand', 'Change')}
                    {expanded ? <ChevronUp size={14} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />}
                </button>
            </div>
            <div id={regionId} hidden={!expanded} className="pb-1">
                {labels === null && !labelsError ? (
                    <div className="flex flex-wrap gap-2 py-1.5" aria-busy="true">
                        <span className="h-8 w-36 rounded-full bg-content-muted/15 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                        <span className="h-8 w-36 rounded-full bg-content-muted/15 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                    </div>
                ) : (
                    <ContextChips refs={refs} kindLabel={kindLabel} />
                )}
            </div>
            {picker && (
                <ContextPicker
                    kind={picker}
                    title={t('careeros.context.choose', 'Choose {kind}').replace('{kind}', kindLabel[picker].toLowerCase())}
                    selectedId={conversation.contextRefs[picker]?.id ?? null}
                    saving={saving}
                    onClose={() => setPicker(null)}
                    onPick={(id) => { void pick(picker, id); }}
                />
            )}
        </section>
    );
};

const KIND_ICON: Record<ContextKey, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>> = {
    goal: Target,
    campaign: Compass,
    opportunity: Briefcase,
    application: FileText,
};

/**
 * The context as one wrap of compact chips: icon, then the value (the kind
 * stays in the accessible name). An empty reference shows its kind in muted
 * text; a reference fixed by the application, or a read-only conversation,
 * drops the chip frame so it does not look pressable. Each chip keeps a 44px
 * hit area around a 32px visual.
 */
const ContextChips: React.FC<{ refs: ContextRefSummary[]; kindLabel: Record<ContextKey, string> }> = ({ refs, kindLabel }) => {
    const { t } = useTranslation();
    return (
        <nav aria-label={t('careeros.context.label', 'Working context')}>
            <ul className="flex flex-wrap items-center gap-x-2">
                {refs.map((ref) => {
                    const kind = ref.kind as ContextKey;
                    const Icon = KIND_ICON[kind];
                    const hasValue = Boolean(ref.label);
                    const lower = kindLabel[kind].toLowerCase();
                    const actionLabel = hasValue
                        ? t('careeros.context.change', 'Change {kind}').replace('{kind}', lower)
                        : t('careeros.context.choose', 'Choose {kind}').replace('{kind}', lower);
                    const text = hasValue ? (
                        <span className="min-w-0 truncate font-medium text-content-primary">
                            <span className="sr-only">{kindLabel[kind]}: </span>{ref.label}
                        </span>
                    ) : (
                        <span className="min-w-0 truncate text-content-muted">
                            {kindLabel[kind]}<span className="sr-only">: {t('careeros.context.none', 'None selected')}</span>
                        </span>
                    );
                    const icon = <Icon size={14} strokeWidth={1.9} className={`shrink-0 ${hasValue ? 'text-content-secondary' : 'text-content-muted'}`} aria-hidden="true" />;
                    return (
                        <li key={ref.kind} className="min-w-0 max-w-full">
                            {ref.onChange && !ref.locked ? (
                                <button
                                    type="button"
                                    onClick={ref.onChange}
                                    aria-label={hasValue ? `${actionLabel}: ${ref.label}` : actionLabel}
                                    title={ref.meta ? `${ref.label} · ${ref.meta}` : actionLabel}
                                    className="group tap-target inline-flex max-w-full items-center focus-visible:outline-none"
                                >
                                    <span className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border-default bg-surface-panel px-3 text-[13px] transition-colors duration-150 group-hover:border-border-strong group-focus-visible:ring-2 group-focus-visible:ring-focus-ring">
                                        {icon}
                                        {text}
                                    </span>
                                </button>
                            ) : (
                                <span className="inline-flex h-11 max-w-full items-center gap-1.5 px-1 text-[13px]" title={ref.meta}>
                                    {icon}
                                    {text}
                                    {ref.locked && <span className="sr-only">{t('careeros.context.locked', '(fixed by this application)')}</span>}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

interface ContextPickerProps {
    kind: ContextKey;
    title: string;
    selectedId: string | null;
    saving: boolean;
    onClose: () => void;
    onPick: (id: string | null) => void;
}

/** Owned lists only: everything comes from the owner-scoped repositories. */
async function loadOptions(userId: string, kind: ContextKey): Promise<PickerOption[]> {
    switch (kind) {
        case 'goal': return (await goalRepo.list(userId, 'active')).map((g) => ({ id: g.id, label: g.title || g.role, meta: g.role }));
        case 'campaign': return (await campaignRepo.list(userId, 'any')).filter((c) => c.status !== 'closed').map((c) => ({ id: c.id, label: c.name }));
        case 'opportunity': return (await opportunityRepo.list(userId, 'all')).filter((o) => o.status !== 'archived' && o.status !== 'not_interested').map((o) => ({ id: o.id, label: o.title, meta: o.company }));
        case 'application': return (await applicationRepo.list(userId)).map((a) => ({ id: a.id, label: a.jobTitle || a.company, meta: a.company }));
        default: return [];
    }
}

export const ContextPicker: React.FC<ContextPickerProps> = ({ kind, title, selectedId, saving, onClose, onPick }) => {
    const { t } = useTranslation();
    const [options, setOptions] = useState<PickerOption[] | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [attempt, setAttempt] = useState(0);
    const userId = useUserIdForPicker();

    useEffect(() => {
        let cancelled = false;
        setOptions(null);
        setError(null);
        if (!userId) return;
        loadOptions(userId, kind)
            .then((list) => { if (!cancelled) setOptions(list); })
            .catch((err: unknown) => { if (!cancelled) setError(err); });
        return () => { cancelled = true; };
    }, [userId, kind, attempt]);

    return (
        <Dialog open onClose={onClose} title={title} panelClassName="max-w-md max-h-[85vh]" bodyClassName="flex min-h-0 flex-col">
            {error !== null ? (
                <StatePanel kind="error" compact className="!border-0 !bg-transparent !px-0 !py-2" onRetry={() => setAttempt((n) => n + 1)} />
            ) : options === null ? (
                <div className="space-y-5 py-2" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <Skeleton variant="text" lines={2} width="80%" />
                    <Skeleton variant="text" lines={2} width="65%" />
                </div>
            ) : options.length === 0 ? (
                <StatePanel kind="empty" compact className="!border-0 !bg-transparent !px-0 !py-2" title={t('careeros.coach.context.noneAvailable', 'Nothing to choose from yet')} description={t('careeros.coach.context.noneAvailableDescription', 'Create one in its own space first; the coach can only work with records in your account.')} />
            ) : (
                <ul className="-mx-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto" aria-label={title}>
                    {options.map((option) => {
                        const selected = option.id === selectedId;
                        return (
                            <li key={option.id}>
                                <button
                                    type="button"
                                    disabled={saving}
                                    aria-pressed={selected}
                                    onClick={() => onPick(option.id)}
                                    className={`tap-target flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60 ${selected ? 'bg-surface-canvas' : 'hover:bg-surface-canvas'}`}
                                >
                                    <span className="min-w-0">
                                        <span className={`block truncate text-[14px] ${selected ? 'font-semibold' : 'font-medium'} text-content-primary`}>{option.label}</span>
                                        {option.meta && <span className="block truncate text-[12.5px] text-content-muted">{option.meta}</span>}
                                    </span>
                                    {selected && <Check size={16} strokeWidth={2} className="shrink-0 text-action-primary" aria-hidden="true" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-border-default pt-3">
                <Button variant="quiet" size="sm" disabled={saving || !selectedId} onClick={() => onPick(null)}>
                    {t('careeros.coach.context.clear', 'Clear selection')}
                </Button>
                <Button variant="secondary" size="sm" onClick={onClose}>{t('btn.cancel', 'Cancel')}</Button>
            </div>
        </Dialog>
    );
};

export default CoachContextPanel;
