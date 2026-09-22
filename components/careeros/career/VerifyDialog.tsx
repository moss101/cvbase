import React, { useId, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import type { CareerFact, FactVerification } from '../../../services/careerOs/types';
import { Dialog } from '../../common/Dialog';
import { Button } from '../primitives';
import { FIELD_CLASS, LABEL_CLASS } from './FactEditor';
import { factTitle } from './factFormat';

/**
 * Verified is a recorded method, source and time — never a score. This
 * dialog collects exactly those three things and refuses to submit without
 * them, so the badge always means something a person can check.
 */
export interface VerifyDialogProps {
    fact: CareerFact | null;
    onVerify: (fact: CareerFact, verification: FactVerification) => Promise<void>;
    onClose: () => void;
}

const METHODS = ['reference_letter', 'employer_contact', 'certificate', 'public_record', 'other'] as const;

export const VerifyDialog: React.FC<VerifyDialogProps> = ({ fact, onVerify, onClose }) => {
    const { t } = useTranslation();
    const id = useId();
    const [method, setMethod] = useState<(typeof METHODS)[number]>('certificate');
    const [source, setSource] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const methodLabel: Record<(typeof METHODS)[number], string> = {
        reference_letter: t('careeros.career.verify.method.referenceLetter', 'Reference letter'),
        employer_contact: t('careeros.career.verify.method.employerContact', 'Employer confirmed it'),
        certificate: t('careeros.career.verify.method.certificate', 'Certificate or transcript'),
        public_record: t('careeros.career.verify.method.publicRecord', 'Public record'),
        other: t('careeros.career.verify.method.other', 'Other recorded check'),
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!fact) return;
        if (!source.trim() || !date) {
            setError(t('careeros.career.verify.required', 'A source and a date are required to record a verification.'));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onVerify(fact, { method, source: source.trim(), verifiedAt: new Date(date).toISOString() });
            onClose();
        } catch {
            setError(t('careeros.career.verify.failed', 'The verification could not be recorded. The fact is unchanged.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={fact !== null} onClose={onClose} title={t('careeros.career.verify.title', 'Record a verification')} panelClassName="max-w-md">
            {fact && (
                <form onSubmit={(event) => void submit(event)} className="space-y-3">
                    <p className="text-sm text-content-secondary">
                        {t('careeros.career.verify.explain', '"Verified" means a recorded method, source and date that someone could check — not an AI score and not that it appeared in a CV. This is for: {fact}').replace('{fact}', factTitle(fact))}
                    </p>
                    <div>
                        <label htmlFor={`${id}-method`} className={LABEL_CLASS}>{t('careeros.career.verify.method', 'Method')}</label>
                        <select id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])} className={`${FIELD_CLASS} mt-1`} disabled={saving}>
                            {METHODS.map((m) => <option key={m} value={m}>{methodLabel[m]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`${id}-source`} className={LABEL_CLASS}>{t('careeros.career.verify.source', 'Source')}</label>
                        <input id={`${id}-source`} value={source} onChange={(e) => setSource(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} placeholder={t('careeros.career.verify.sourcePlaceholder', 'e.g. HR letter dated March 2024')} required />
                    </div>
                    <div>
                        <label htmlFor={`${id}-date`} className={LABEL_CLASS}>{t('careeros.career.verify.date', 'Verified on')}</label>
                        <input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={saving} required />
                    </div>
                    {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <Button variant="quiet" onClick={onClose} disabled={saving}>{t('btn.cancel', 'Cancel')}</Button>
                        <Button type="submit" variant="primary" loading={saving}>{t('careeros.career.verify.submit', 'Record verification')}</Button>
                    </div>
                </form>
            )}
        </Dialog>
    );
};

export default VerifyDialog;
