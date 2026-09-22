import React, { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CareerGoal, CompPeriod, GoalConstraint, GoalInput, GoalPriority, RemotePreference } from '../../../services/careerOs/types';
import { newId } from '../../../services/careerOs/util';
import { Button } from '../primitives';
import { FIELD_CLASS, LABEL_CLASS } from './FactEditor';
import { PRIORITY_KEYS, priorityLabel, type Translate } from './factFormat';

/**
 * The structured goal form (REQ-14) used by onboarding and the Goals view.
 * Everything is optional except a role or title: a partial goal is still a
 * goal. Compensation is a range with currency and period; constraints are
 * hard or soft; priorities carry a weight the fit and scenario engines read.
 */
export interface GoalFormValues {
    title: string;
    role: string;
    level: string;
    industry: string;
    location: string;
    remotePreference: RemotePreference | '';
    compMin: string;
    compMax: string;
    compCurrency: string;
    compPeriod: CompPeriod | '';
    targetDate: string;
    targetEmployers: string;
    constraints: GoalConstraint[];
    priorities: Record<GoalPriority['key'], number>;
}

export interface GoalFormErrors {
    role?: string;
    compCurrency?: string;
    compRange?: string;
    targetDate?: string;
}

export const emptyGoalValues = (): GoalFormValues => ({
    title: '', role: '', level: '', industry: '', location: '', remotePreference: '', compMin: '', compMax: '', compCurrency: '', compPeriod: '',
    targetDate: '', targetEmployers: '', constraints: [],
    priorities: { compensation: 0, growth: 0, stability: 0, flexibility: 0, mission: 0, learning: 0, location: 0, title: 0 },
});

export const goalToValues = (goal: CareerGoal): GoalFormValues => {
    const values = emptyGoalValues();
    values.title = goal.title;
    values.role = goal.role;
    values.level = goal.level;
    values.industry = goal.industry;
    values.location = goal.location;
    values.remotePreference = goal.remotePreference ?? '';
    values.compMin = goal.compMin === null ? '' : String(goal.compMin);
    values.compMax = goal.compMax === null ? '' : String(goal.compMax);
    values.compCurrency = goal.compCurrency ?? '';
    values.compPeriod = goal.compPeriod ?? '';
    values.targetDate = goal.targetDate ? goal.targetDate.slice(0, 10) : '';
    values.targetEmployers = goal.targetEmployers.join(', ');
    values.constraints = goal.constraints.map((c) => ({ ...c }));
    for (const p of goal.priorities) values.priorities[p.key] = Math.round(p.weight * 5);
    return values;
};

/** Pure validation so tests can exercise it without a DOM. */
export const validateGoal = (values: GoalFormValues, t: Translate): GoalFormErrors => {
    const errors: GoalFormErrors = {};
    if (!values.role.trim() && !values.title.trim()) errors.role = t('careeros.goal.form.roleRequired', 'Give the goal a role or a title.');
    const currency = values.compCurrency.trim();
    if (currency && !/^[A-Za-z]{3}$/.test(currency)) errors.compCurrency = t('careeros.goal.form.currencyInvalid', 'Use a three-letter currency code such as GBP or USD.');
    const min = values.compMin.trim() === '' ? null : Number(values.compMin);
    const max = values.compMax.trim() === '' ? null : Number(values.compMax);
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) errors.compRange = t('careeros.goal.form.compInvalid', 'Compensation must be a number.');
    else if (min !== null && max !== null && min > max) errors.compRange = t('careeros.goal.form.compOrder', 'The minimum cannot be higher than the maximum.');
    if ((min !== null || max !== null) && !currency) errors.compCurrency = errors.compCurrency ?? t('careeros.goal.form.currencyRequired', 'Add the currency for the range.');
    if (values.targetDate && Number.isNaN(Date.parse(values.targetDate))) errors.targetDate = t('careeros.goal.form.dateInvalid', 'Enter a valid date.');
    return errors;
};

export const valuesToGoalInput = (values: GoalFormValues, source: GoalInput['source'], existing?: CareerGoal): GoalInput => {
    const min = values.compMin.trim() === '' ? null : Number(values.compMin);
    const max = values.compMax.trim() === '' ? null : Number(values.compMax);
    return {
        title: values.title.trim() || values.role.trim(),
        role: values.role.trim(),
        level: values.level.trim(),
        industry: values.industry.trim(),
        location: values.location.trim(),
        remotePreference: values.remotePreference || null,
        compMin: min,
        compMax: max,
        compCurrency: values.compCurrency.trim() ? values.compCurrency.trim().toUpperCase() : null,
        compPeriod: values.compPeriod || null,
        targetDate: values.targetDate || null,
        targetEmployers: values.targetEmployers.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        constraints: values.constraints.filter((c) => c.text.trim()).map((c) => ({ ...c, text: c.text.trim() })),
        priorities: PRIORITY_KEYS.filter((key) => values.priorities[key] > 0).map((key) => ({ key, weight: values.priorities[key] / 5 })),
        isPrimary: existing?.isPrimary ?? false,
        status: existing?.status ?? 'active',
        source: existing?.source ?? source,
    };
};

export interface GoalFormProps {
    initial?: GoalFormValues;
    onSubmit: (values: GoalFormValues) => Promise<void>;
    onCancel?: () => void;
    submitLabel: string;
    saving?: boolean;
    error?: string | null;
    /** Compact variant for the onboarding step (fewer sections open by default). */
    compact?: boolean;
}

export const GoalForm: React.FC<GoalFormProps> = ({ initial, onSubmit, onCancel, submitLabel, saving = false, error = null, compact = false }) => {
    const { t } = useTranslation();
    const id = useId();
    const [values, setValues] = useState<GoalFormValues>(initial ?? emptyGoalValues());
    const [errors, setErrors] = useState<GoalFormErrors>({});
    const [showMore, setShowMore] = useState(!compact);

    const set = <K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const next = validateGoal(values, t);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit(values);
    };

    const remoteOptions: Array<{ value: RemotePreference | ''; label: string }> = [
        { value: '', label: t('careeros.goal.form.remote.unset', 'No preference recorded') },
        { value: 'remote', label: t('careeros.goal.form.remote.remote', 'Remote') },
        { value: 'hybrid', label: t('careeros.goal.form.remote.hybrid', 'Hybrid') },
        { value: 'onsite', label: t('careeros.goal.form.remote.onsite', 'On site') },
        { value: 'any', label: t('careeros.goal.form.remote.any', 'Any') },
    ];
    const periodOptions: Array<{ value: CompPeriod | ''; label: string }> = [
        { value: '', label: t('careeros.goal.form.period.unset', 'Period') },
        { value: 'year', label: t('careeros.goal.form.period.year', 'per year') },
        { value: 'month', label: t('careeros.goal.form.period.month', 'per month') },
        { value: 'day', label: t('careeros.goal.form.period.day', 'per day') },
        { value: 'hour', label: t('careeros.goal.form.period.hour', 'per hour') },
    ];

    return (
        <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-role`} className={LABEL_CLASS}>{t('careeros.goal.form.role', 'Target role')}</label>
                    <input id={`${id}-role`} value={values.role} onChange={(e) => set('role', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} aria-invalid={errors.role ? true : undefined} aria-describedby={errors.role ? `${id}-role-error` : undefined} placeholder={t('careeros.goal.form.rolePlaceholder', 'e.g. Senior product designer')} />
                    {errors.role && <p id={`${id}-role-error`} className="mt-1 text-xs text-status-danger">{errors.role}</p>}
                </div>
                <div>
                    <label htmlFor={`${id}-level`} className={LABEL_CLASS}>{t('careeros.goal.form.level', 'Level')}</label>
                    <input id={`${id}-level`} value={values.level} onChange={(e) => set('level', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder={t('careeros.goal.form.levelPlaceholder', 'e.g. senior, lead')} />
                </div>
                <div>
                    <label htmlFor={`${id}-industry`} className={LABEL_CLASS}>{t('careeros.goal.form.industry', 'Industry')}</label>
                    <input id={`${id}-industry`} value={values.industry} onChange={(e) => set('industry', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} />
                </div>
                <div>
                    <label htmlFor={`${id}-location`} className={LABEL_CLASS}>{t('careeros.goal.form.location', 'Location')}</label>
                    <input id={`${id}-location`} value={values.location} onChange={(e) => set('location', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} />
                </div>
                <div>
                    <label htmlFor={`${id}-remote`} className={LABEL_CLASS}>{t('careeros.goal.form.remoteLabel', 'Remote preference')}</label>
                    <select id={`${id}-remote`} value={values.remotePreference} onChange={(e) => set('remotePreference', e.target.value as RemotePreference | '')} className={`${FIELD_CLASS} mt-1`} disabled={saving}>
                        {remoteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${id}-date`} className={LABEL_CLASS}>{t('careeros.goal.form.targetDate', 'Target date')}</label>
                    <input id={`${id}-date`} type="date" value={values.targetDate} onChange={(e) => set('targetDate', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} aria-invalid={errors.targetDate ? true : undefined} />
                    {errors.targetDate && <p className="mt-1 text-xs text-status-danger">{errors.targetDate}</p>}
                </div>
            </div>

            <fieldset>
                <legend className={LABEL_CLASS}>{t('careeros.goal.form.compensation', 'Compensation range (optional)')}</legend>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                        <label htmlFor={`${id}-min`} className="sr-only">{t('careeros.goal.form.compMin', 'Minimum')}</label>
                        <input id={`${id}-min`} inputMode="numeric" value={values.compMin} onChange={(e) => set('compMin', e.target.value)} className={FIELD_CLASS} disabled={saving} placeholder={t('careeros.goal.form.compMin', 'Minimum')} aria-invalid={errors.compRange ? true : undefined} />
                    </div>
                    <div>
                        <label htmlFor={`${id}-max`} className="sr-only">{t('careeros.goal.form.compMax', 'Maximum')}</label>
                        <input id={`${id}-max`} inputMode="numeric" value={values.compMax} onChange={(e) => set('compMax', e.target.value)} className={FIELD_CLASS} disabled={saving} placeholder={t('careeros.goal.form.compMax', 'Maximum')} aria-invalid={errors.compRange ? true : undefined} />
                    </div>
                    <div>
                        <label htmlFor={`${id}-currency`} className="sr-only">{t('careeros.goal.form.currency', 'Currency')}</label>
                        <input id={`${id}-currency`} value={values.compCurrency} onChange={(e) => set('compCurrency', e.target.value)} className={FIELD_CLASS} disabled={saving} placeholder="GBP" maxLength={3} aria-invalid={errors.compCurrency ? true : undefined} aria-describedby={errors.compCurrency ? `${id}-currency-error` : undefined} />
                    </div>
                    <div>
                        <label htmlFor={`${id}-period`} className="sr-only">{t('careeros.goal.form.period.label', 'Period')}</label>
                        <select id={`${id}-period`} value={values.compPeriod} onChange={(e) => set('compPeriod', e.target.value as CompPeriod | '')} className={FIELD_CLASS} disabled={saving}>
                            {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
                {errors.compRange && <p className="mt-1 text-xs text-status-danger">{errors.compRange}</p>}
                {errors.compCurrency && <p id={`${id}-currency-error`} className="mt-1 text-xs text-status-danger">{errors.compCurrency}</p>}
            </fieldset>

            {!showMore ? (
                <Button variant="quiet" size="sm" onClick={() => setShowMore(true)} aria-expanded={false}>{t('careeros.goal.form.more', 'Add employers, constraints and priorities')}</Button>
            ) : (
                <>
                    <div>
                        <label htmlFor={`${id}-title`} className={LABEL_CLASS}>{t('careeros.goal.form.title', 'Goal name (optional)')}</label>
                        <input id={`${id}-title`} value={values.title} onChange={(e) => set('title', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder={t('careeros.goal.form.titlePlaceholder', 'Defaults to the role')} />
                    </div>
                    <div>
                        <label htmlFor={`${id}-employers`} className={LABEL_CLASS}>{t('careeros.goal.form.employers', 'Target employers (comma separated)')}</label>
                        <input id={`${id}-employers`} value={values.targetEmployers} onChange={(e) => set('targetEmployers', e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} />
                    </div>

                    <fieldset>
                        <legend className={LABEL_CLASS}>{t('careeros.goal.form.constraints', 'Constraints')}</legend>
                        <p className="mt-0.5 text-xs text-content-muted">{t('careeros.goal.form.constraintsHint', 'Hard constraints can hide roles that break them; soft ones are preferences.')}</p>
                        <ul className="mt-2 space-y-2">
                            {values.constraints.map((constraint, index) => (
                                <li key={constraint.id} className="flex flex-wrap gap-2 sm:flex-nowrap">
                                    <label htmlFor={`${id}-c-kind-${index}`} className="sr-only">{t('careeros.goal.form.constraintKind', 'Constraint kind')}</label>
                                    <select
                                        id={`${id}-c-kind-${index}`}
                                        value={constraint.kind}
                                        onChange={(e) => set('constraints', values.constraints.map((c, i) => (i === index ? { ...c, kind: e.target.value as 'hard' | 'soft' } : c)))}
                                        className={`${FIELD_CLASS} sm:w-32`}
                                        disabled={saving}
                                    >
                                        <option value="hard">{t('careeros.goal.form.hard', 'Must')}</option>
                                        <option value="soft">{t('careeros.goal.form.soft', 'Prefer')}</option>
                                    </select>
                                    <label htmlFor={`${id}-c-text-${index}`} className="sr-only">{t('careeros.goal.form.constraintText', 'Constraint')}</label>
                                    <input
                                        id={`${id}-c-text-${index}`}
                                        value={constraint.text}
                                        onChange={(e) => set('constraints', values.constraints.map((c, i) => (i === index ? { ...c, text: e.target.value } : c)))}
                                        className={`${FIELD_CLASS} flex-1`}
                                        disabled={saving}
                                        placeholder={t('careeros.goal.form.constraintPlaceholder', 'e.g. no more than 2 days on site')}
                                    />
                                    <button type="button" onClick={() => set('constraints', values.constraints.filter((_, i) => i !== index))} aria-label={t('careeros.goal.form.removeConstraint', 'Remove constraint')} className="tap-target inline-flex items-center justify-center rounded-lg text-content-secondary hover:bg-surface-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring" disabled={saving}>
                                        <X size={16} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <Button variant="quiet" size="sm" icon={<Plus size={14} />} onClick={() => set('constraints', [...values.constraints, { id: newId(), kind: 'soft', text: '' }])} disabled={saving} className="mt-2">
                            {t('careeros.goal.form.addConstraint', 'Add constraint')}
                        </Button>
                    </fieldset>

                    <fieldset>
                        <legend className={LABEL_CLASS}>{t('careeros.goal.form.priorities', 'Priorities (0 = not a priority, 5 = most important)')}</legend>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {PRIORITY_KEYS.map((key) => (
                                <div key={key}>
                                    <label htmlFor={`${id}-p-${key}`} className="block text-xs text-content-secondary">{priorityLabel(t, key)}</label>
                                    <select
                                        id={`${id}-p-${key}`}
                                        value={values.priorities[key]}
                                        onChange={(e) => set('priorities', { ...values.priorities, [key]: Number(e.target.value) })}
                                        className={`${FIELD_CLASS} mt-1`}
                                        disabled={saving}
                                    >
                                        {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </fieldset>
                </>
            )}

            {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" loading={saving}>{submitLabel}</Button>
                {onCancel && <Button variant="quiet" onClick={onCancel} disabled={saving}>{t('btn.cancel', 'Cancel')}</Button>}
            </div>
        </form>
    );
};

export default GoalForm;
