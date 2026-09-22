import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CampaignMilestone, CareerGoal } from '../../../services/careerOs/types';
import { newId } from '../../../services/careerOs/util';
import { Dialog } from '../../common/Dialog';
import { Button } from '../primitives';
import { Select, TextInput } from '../application/fields';

/**
 * Campaign name, the goal it pursues and its milestones. Goals are the
 * person's own active goals (optional but recommended); milestones are
 * plain rows with a state and an optional due date — nothing is inferred.
 */
export interface CampaignFormValue {
    name: string;
    goalId: string | null;
    milestones: CampaignMilestone[];
}

export interface CampaignFormProps {
    open: boolean;
    title: string;
    goals: CareerGoal[];
    initial?: CampaignFormValue;
    pending?: boolean;
    onClose: () => void;
    onSubmit: (value: CampaignFormValue) => void;
}

export const MilestoneEditor: React.FC<{ milestones: CampaignMilestone[]; onChange: (next: CampaignMilestone[]) => void }> = ({ milestones, onChange }) => {
    const { t } = useTranslation();
    const stateOptions = [
        { value: 'todo', label: t('careeros.milestone.todo', 'To do') },
        { value: 'doing', label: t('careeros.milestone.doing', 'In progress') },
        { value: 'done', label: t('careeros.milestone.done', 'Done') },
    ];
    const update = (id: string, patch: Partial<CampaignMilestone>) => onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    return (
        <div>
            <ul className="space-y-3">
                {milestones.map((m, index) => (
                    <li key={m.id} className="rounded-xl border border-border-default p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_150px]">
                            <TextInput label={t('careeros.milestone.title', 'Milestone {n}').replace('{n}', String(index + 1))} value={m.title} onChange={(event) => update(m.id, { title: event.target.value })} />
                            <Select label={t('careeros.milestone.state', 'State')} options={stateOptions} value={m.state} onChange={(event) => update(m.id, { state: event.target.value as CampaignMilestone['state'] })} />
                            <TextInput label={t('careeros.milestone.due', 'Due')} optional={t('careeros.common.optional', 'optional')} type="date" value={m.dueDate ?? ''} onChange={(event) => update(m.id, { dueDate: event.target.value || undefined })} />
                        </div>
                        <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="quiet" icon={<Trash2 size={14} />} onClick={() => onChange(milestones.filter((x) => x.id !== m.id))} aria-label={t('careeros.milestone.remove', 'Remove milestone {n}').replace('{n}', String(index + 1))}>
                                {t('careeros.common.remove', 'Remove')}
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
            <Button size="sm" variant="secondary" className="mt-3" icon={<Plus size={14} />} onClick={() => onChange([...milestones, { id: newId(), title: '', state: 'todo' }])}>
                {t('careeros.milestone.add', 'Add milestone')}
            </Button>
        </div>
    );
};

export const CampaignForm: React.FC<CampaignFormProps> = ({ open, title, goals, initial, pending = false, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [goalId, setGoalId] = useState('');
    const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);

    useEffect(() => {
        if (!open) return;
        setName(initial?.name ?? '');
        setGoalId(initial?.goalId ?? (goals.find((g) => g.isPrimary)?.id ?? ''));
        setMilestones(initial?.milestones ?? []);
    }, [open, initial, goals]);

    const valid = name.trim().length > 0 && milestones.every((m) => m.title.trim().length > 0);

    return (
        <Dialog
            open={open}
            onClose={pending ? () => undefined : onClose}
            title={title}
            panelClassName="max-w-2xl max-h-[92vh]"
            bodyClassName="overflow-y-auto"
            footer={
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
                    <Button variant="quiet" onClick={onClose} disabled={pending}>{t('btn.cancel', 'Cancel')}</Button>
                    <Button variant="primary" loading={pending} disabled={!valid} onClick={() => onSubmit({ name: name.trim(), goalId: goalId || null, milestones: milestones.map((m) => ({ ...m, title: m.title.trim() })) })}>
                        {initial ? t('careeros.common.save', 'Save') : t('careeros.campaign.create', 'Create campaign')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <TextInput label={t('careeros.campaign.name', 'Campaign name')} value={name} onChange={(event) => setName(event.target.value)} required placeholder={t('careeros.campaign.namePlaceholder', 'e.g. Senior product roles, autumn')} />
                <Select
                    label={t('careeros.campaign.goal', 'Goal')}
                    hint={goals.length === 0 ? t('careeros.campaign.noGoals', 'You have no active goals yet. A campaign can be created without one, but fit and Today work better with a goal.') : t('careeros.campaign.goalHint', 'Optional but recommended: the goal this campaign pursues.')}
                    options={[{ value: '', label: t('careeros.campaign.noGoalOption', 'No goal') }, ...goals.map((g) => ({ value: g.id, label: g.title || g.role }))]}
                    value={goalId}
                    onChange={(event) => setGoalId(event.target.value)}
                />
                <div>
                    <p className="text-[13px] font-semibold text-content-primary">{t('careeros.campaign.milestones', 'Milestones')}</p>
                    <p className="mb-2 text-xs text-content-secondary">{t('careeros.campaign.milestonesHint', 'Milestone state and funnel counts stand in for a progress percentage.')}</p>
                    <MilestoneEditor milestones={milestones} onChange={setMilestones} />
                </div>
            </div>
        </Dialog>
    );
};

export default CampaignForm;
