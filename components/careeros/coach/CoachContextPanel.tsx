import React, { useEffect, useId, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import type { CoachConversation } from '../../../services/careerOs/types';
import Dialog from '../../common/Dialog';
import { Button, ContextSwitcher, Skeleton, StatePanel, type ContextRefSummary } from '../primitives';
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
        <section aria-label={t('careeros.coach.context.title', 'Coach context')} className="rounded-2xl border border-border-default bg-surface-panel p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="text-[12px] font-medium text-content-muted">{t('careeros.coach.context.title', 'Coach context')}</h2>
                    {expanded
                        ? <p className="mt-0.5 text-xs text-content-secondary">{t('careeros.coach.context.hint', 'Answers cite the records in this context. Change it any time.')}</p>
                        : <p className="mt-0.5 truncate text-[13px] text-content-primary">{summary}</p>}
                </div>
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={regionId}
                    onClick={() => setExpanded((v) => !v)}
                    className="tap-target inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-content-secondary hover:bg-surface-canvas hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                    {expanded ? t('careeros.coach.context.collapse', 'Hide') : t('careeros.coach.context.expand', 'Change')}
                    {expanded ? <ChevronUp size={14} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />}
                </button>
            </div>
            <div id={regionId} hidden={!expanded} className="mt-2">
                {labels === null && !labelsError ? (
                    <div className="flex flex-wrap gap-2" aria-busy="true">
                        <Skeleton variant="block" className="h-12 w-40" />
                        <Skeleton variant="block" className="h-12 w-40" />
                    </div>
                ) : (
                    <ContextSwitcher refs={refs} compact />
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
                <StatePanel kind="error" compact onRetry={() => setAttempt((n) => n + 1)} />
            ) : options === null ? (
                <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <Skeleton variant="block" className="h-12" />
                    <Skeleton variant="block" className="h-12" />
                </div>
            ) : options.length === 0 ? (
                <StatePanel kind="empty" compact title={t('careeros.coach.context.noneAvailable', 'Nothing to choose from yet')} description={t('careeros.coach.context.noneAvailableDescription', 'Create one in its own space first; the coach can only work with records in your account.')} />
            ) : (
                <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label={title}>
                    {options.map((option) => {
                        const selected = option.id === selectedId;
                        return (
                            <li key={option.id}>
                                <button
                                    type="button"
                                    disabled={saving}
                                    aria-pressed={selected}
                                    onClick={() => onPick(option.id)}
                                    className={`tap-target flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${selected ? 'border-action-primary bg-action-primary/10' : 'border-border-default bg-surface-panel hover:bg-surface-canvas'}`}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-content-primary">{option.label}</span>
                                        {option.meta && <span className="block truncate text-xs text-content-secondary">{option.meta}</span>}
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
