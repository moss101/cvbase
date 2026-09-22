import React, { useId, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import type { FactPatch } from '../../../services/careerOs/mappers';
import type { CareerFact, FactKind } from '../../../services/careerOs/types';
import { stripHtml } from '../../../services/careerOs/util';
import { Button } from '../primitives';

/**
 * Plain-field editor for a fact. The narrative is edited as text: an imported
 * narrative may carry HTML, which is flattened here so the person edits what
 * they can see. Saving records the exact fields that changed; the caller
 * decides what a change means for dependent drafts.
 */
export interface FactEditorProps {
    fact: CareerFact;
    /** Experience facts the achievement can be linked to (achievements only). */
    experienceOptions?: Array<{ id: string; label: string }>;
    /** Facts selectable as evidence references (achievements only). */
    evidenceOptions?: Array<{ id: string; label: string }>;
    onSave: (patch: FactPatch) => Promise<void>;
    onCancel: () => void;
    saving?: boolean;
    error?: string | null;
}

export const FIELD_CLASS = 'w-full rounded-xl border border-border-default bg-surface-panel px-3 py-2.5 text-sm text-content-primary focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-60';
export const LABEL_CLASS = 'block text-xs font-semibold text-content-secondary';

const hasDates = (kind: FactKind): boolean => !['skill', 'language', 'profile_field', 'summary'].includes(kind);
const hasOrganization = (kind: FactKind): boolean => ['experience', 'education', 'award', 'training', 'publication', 'volunteer', 'certification'].includes(kind);

export const FactEditor: React.FC<FactEditorProps> = ({ fact, experienceOptions = [], evidenceOptions = [], onSave, onCancel, saving = false, error = null }) => {
    const { t } = useTranslation();
    const id = useId();
    const [title, setTitle] = useState(fact.title);
    const [organization, setOrganization] = useState(fact.organization);
    const [location, setLocation] = useState(fact.location);
    const [startDate, setStartDate] = useState(fact.startDate);
    const [endDate, setEndDate] = useState(fact.endDate);
    const [narrative, setNarrative] = useState(() => (/<[a-z][\s\S]*>/i.test(fact.narrative) ? stripHtml(fact.narrative) : fact.narrative));
    const [level, setLevel] = useState(typeof fact.payload.level === 'string' ? fact.payload.level : '');
    const [metric, setMetric] = useState(fact.payload.metric ?? '');
    const [unit, setUnit] = useState(fact.payload.unit ?? '');
    const [period, setPeriod] = useState(fact.payload.period ?? '');
    const [parentFactId, setParentFactId] = useState(fact.parentFactId ?? '');
    const [evidenceFactIds, setEvidenceFactIds] = useState<string[]>(Array.isArray(fact.payload.evidenceFactIds) ? (fact.payload.evidenceFactIds as string[]) : []);
    const [titleError, setTitleError] = useState<string | null>(null);

    const isAchievement = fact.kind === 'achievement';
    const isSkill = fact.kind === 'skill';

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!title.trim()) {
            setTitleError(t('careeros.career.editor.titleRequired', 'A title is required.'));
            return;
        }
        setTitleError(null);
        const patch: FactPatch = {};
        if (title !== fact.title) patch.title = title.trim();
        if (organization !== fact.organization) patch.organization = organization.trim();
        if (location !== fact.location) patch.location = location.trim();
        if (startDate !== fact.startDate) patch.startDate = startDate.trim();
        if (endDate !== fact.endDate) patch.endDate = endDate.trim();
        if (narrative !== fact.narrative) patch.narrative = narrative;
        const payload = { ...fact.payload };
        let payloadChanged = false;
        if (isSkill && level !== (typeof fact.payload.level === 'string' ? fact.payload.level : '')) { payload.level = level.trim(); payloadChanged = true; }
        if (isAchievement) {
            if (metric !== (fact.payload.metric ?? '')) { payload.metric = metric.trim(); payloadChanged = true; }
            if (unit !== (fact.payload.unit ?? '')) { payload.unit = unit.trim(); payloadChanged = true; }
            if (period !== (fact.payload.period ?? '')) { payload.period = period.trim(); payloadChanged = true; }
            const before = Array.isArray(fact.payload.evidenceFactIds) ? (fact.payload.evidenceFactIds as string[]) : [];
            if (before.join(',') !== evidenceFactIds.join(',')) { payload.evidenceFactIds = evidenceFactIds; payloadChanged = true; }
            if ((parentFactId || null) !== fact.parentFactId) patch.parentFactId = parentFactId || null;
        }
        if (payloadChanged) patch.payload = payload;
        if (fact.confirmationState === 'incomplete' && title.trim()) patch.confirmationState = fact.reviewState === 'candidate' ? 'inferred' : 'user_confirmed';
        await onSave(patch);
    };

    return (
        <form onSubmit={(event) => void submit(event)} className="space-y-3" aria-describedby={error ? `${id}-error` : undefined}>
            <div>
                <label htmlFor={`${id}-title`} className={LABEL_CLASS}>{t('careeros.career.editor.title', 'Title')}</label>
                <input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} aria-invalid={titleError ? true : undefined} aria-describedby={titleError ? `${id}-title-error` : undefined} />
                {titleError && <p id={`${id}-title-error`} className="mt-1 text-xs text-status-danger">{titleError}</p>}
            </div>
            {hasOrganization(fact.kind) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`${id}-org`} className={LABEL_CLASS}>{fact.kind === 'education' ? t('careeros.career.editor.school', 'School') : t('careeros.career.editor.organization', 'Organisation')}</label>
                        <input id={`${id}-org`} value={organization} onChange={(e) => setOrganization(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} />
                    </div>
                    <div>
                        <label htmlFor={`${id}-loc`} className={LABEL_CLASS}>{t('careeros.career.editor.location', 'Location')}</label>
                        <input id={`${id}-loc`} value={location} onChange={(e) => setLocation(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} />
                    </div>
                </div>
            )}
            {hasDates(fact.kind) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`${id}-start`} className={LABEL_CLASS}>{t('careeros.career.editor.startDate', 'Start (YYYY-MM)')}</label>
                        <input id={`${id}-start`} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} inputMode="numeric" placeholder="2021-03" />
                    </div>
                    <div>
                        <label htmlFor={`${id}-end`} className={LABEL_CLASS}>{t('careeros.career.editor.endDate', 'End (YYYY-MM or blank for present)')}</label>
                        <input id={`${id}-end`} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} inputMode="numeric" placeholder="2024-01" />
                    </div>
                </div>
            )}
            {isSkill && (
                <div>
                    <label htmlFor={`${id}-level`} className={LABEL_CLASS}>{t('careeros.career.editor.level', 'Level (optional)')}</label>
                    <input id={`${id}-level`} value={level} onChange={(e) => setLevel(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder={t('careeros.career.editor.levelPlaceholder', 'e.g. advanced')} />
                </div>
            )}
            {isAchievement && (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label htmlFor={`${id}-metric`} className={LABEL_CLASS}>{t('careeros.career.editor.metric', 'Metric (optional)')}</label>
                            <input id={`${id}-metric`} value={metric} onChange={(e) => setMetric(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder="32" />
                        </div>
                        <div>
                            <label htmlFor={`${id}-unit`} className={LABEL_CLASS}>{t('careeros.career.editor.unit', 'Unit')}</label>
                            <input id={`${id}-unit`} value={unit} onChange={(e) => setUnit(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder="%" />
                        </div>
                        <div>
                            <label htmlFor={`${id}-period`} className={LABEL_CLASS}>{t('careeros.career.editor.period', 'Period')}</label>
                            <input id={`${id}-period`} value={period} onChange={(e) => setPeriod(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder="2024" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor={`${id}-parent`} className={LABEL_CLASS}>{t('careeros.career.editor.parent', 'Where it happened')}</label>
                        <select id={`${id}-parent`} value={parentFactId} onChange={(e) => setParentFactId(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving}>
                            <option value="">{t('careeros.career.editor.noParent', 'Not linked to a role')}</option>
                            {experienceOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                    </div>
                    {evidenceOptions.length > 0 && (
                        <fieldset>
                            <legend className={LABEL_CLASS}>{t('careeros.career.editor.evidence', 'Evidence references')}</legend>
                            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border-default p-2">
                                {evidenceOptions.map((option) => {
                                    const checked = evidenceFactIds.includes(option.id);
                                    return (
                                        <li key={option.id}>
                                            <label className="tap-target flex items-center gap-2 rounded-lg px-2 text-sm text-content-primary hover:bg-surface-canvas">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={saving}
                                                    onChange={() => setEvidenceFactIds((prev) => (checked ? prev.filter((v) => v !== option.id) : [...prev, option.id]))}
                                                    className="h-4 w-4 rounded border-border-strong accent-action-primary"
                                                />
                                                <span className="truncate">{option.label}</span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </fieldset>
                    )}
                </>
            )}
            <div>
                <label htmlFor={`${id}-narrative`} className={LABEL_CLASS}>{isAchievement ? t('careeros.career.editor.narrative', 'What you did and the result') : t('careeros.career.editor.description', 'Description')}</label>
                <textarea id={`${id}-narrative`} value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={4} className={`${FIELD_CLASS} mt-1`} disabled={saving} />
            </div>
            {error && <p id={`${id}-error`} role="alert" className="text-sm text-status-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" loading={saving}>{t('btn.save', 'Save')}</Button>
                <Button variant="quiet" onClick={onCancel} disabled={saving}>{t('btn.cancel', 'Cancel')}</Button>
            </div>
        </form>
    );
};

export default FactEditor;
