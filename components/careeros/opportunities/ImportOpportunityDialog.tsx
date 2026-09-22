import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import { extractRequirements } from '../../../services/careerOs/careerFit';
import { track } from '../../../services/careerOs/careerEvents';
import type { Opportunity, OpportunityInput, OpportunityType } from '../../../services/careerOs/types';
import { Dialog } from '../../common/Dialog';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, StatePanel } from '../primitives';
import { FailureNotice } from '../application/FailureNotice';
import { Select, TextArea, TextInput } from '../application/fields';
import { useAsyncAction } from '../application/useAsyncAction';
import { guessFromListing } from './importHeuristics';

/**
 * "Add opportunity" (REQ-15): paste a listing or enter one by hand. The
 * captured text is stored verbatim with its fingerprint and the requirement
 * lines read from it; title/company/location are guessed into editable
 * fields. Before saving, likely duplicates are shown with Merge / Save
 * anyway / Cancel — a merge keeps the existing record as the survivor and
 * can be undone.
 */
export interface ImportResult {
    opportunity: Opportunity;
    /** Set when the new record was merged into an existing one (the survivor). */
    mergedInto?: Opportunity;
}

export interface ImportOpportunityDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved: (result: ImportResult) => void;
}

type Mode = 'paste' | 'manual';
const MIN_PASTE = 40;

export const ImportOpportunityDialog: React.FC<ImportOpportunityDialogProps> = ({ open, onClose, onSaved }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [mode, setMode] = useState<Mode>('paste');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [location, setLocation] = useState('');
    const [remoteType, setRemoteType] = useState<'' | 'remote' | 'hybrid' | 'onsite'>('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourceDate, setSourceDate] = useState('');
    const [type, setType] = useState<OpportunityType>('role');
    const [touched, setTouched] = useState<{ title?: boolean; company?: boolean }>({});
    const [duplicates, setDuplicates] = useState<opportunityRepo.DuplicateMatches | null>(null);

    useEffect(() => {
        if (!open) return;
        setMode('paste'); setContent(''); setTitle(''); setCompany(''); setLocation(''); setRemoteType('');
        setSourceUrl(''); setSourceDate(''); setType('role'); setTouched({}); setDuplicates(null);
    }, [open]);

    // Guesses fill the fields until the person edits them.
    useEffect(() => {
        if (mode !== 'paste') return;
        const guess = guessFromListing(content);
        if (!touched.title) setTitle(guess.title);
        if (!touched.company) setCompany(guess.company);
        if (!location && guess.location) setLocation(guess.location);
        if (!remoteType && guess.remoteType) setRemoteType(guess.remoteType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, mode]);

    const requirements = useMemo(() => (mode === 'paste' ? extractRequirements(content) : []), [content, mode]);
    const fingerprint = useMemo(() => (mode === 'paste' ? opportunityRepo.contentFingerprint(content) : null), [content, mode]);

    const valid = title.trim().length > 0 && company.trim().length > 0 && (mode === 'manual' || content.trim().length >= MIN_PASTE);

    const buildInput = (): OpportunityInput => ({
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        remoteType: remoteType || null,
        opportunityType: type,
        sourceKind: mode,
        sourceUrl: sourceUrl.trim() || null,
        sourceDate: sourceDate || null,
        capturedContent: mode === 'paste' ? content : '',
        contentFingerprint: fingerprint,
        requirements,
        status: 'saved',
        listingStatus: 'unknown',
    });

    const [check, checkState] = useAsyncAction(async () => {
        if (!userId) return;
        const found = await opportunityRepo.findDuplicates(userId, { fingerprint, title, company });
        if (found.exact.length > 0 || found.possible.length > 0) {
            setDuplicates(found);
            return;
        }
        await persist(null);
    });

    const persist = async (mergeInto: Opportunity | null) => {
        if (!userId) return;
        const created = await opportunityRepo.create(userId, buildInput());
        await track(userId, 'opportunity_saved', {
            subjectRefs: { opportunity: created.id },
            payload: { sourceKind: mode, requirements: requirements.length, merged: mergeInto !== null, opportunityType: type },
            dedupeKey: `opportunity_saved:${created.id}`,
        });
        let survivor: Opportunity | undefined;
        if (mergeInto) {
            const merged = await opportunityRepo.merge(userId, created.id, mergeInto.id);
            survivor = merged.target;
        }
        invalidate('opportunit');
        onSaved({ opportunity: created, ...(survivor ? { mergedInto: survivor } : {}) });
    };

    const [saveAnyway, saveState] = useAsyncAction(async () => persist(null));
    const [mergeWith, mergeState] = useAsyncAction(async (target: Opportunity) => persist(target));
    const busy = checkState.pending || saveState.pending || mergeState.pending;
    const error = checkState.error ?? saveState.error ?? mergeState.error;

    const typeOptions = [
        { value: 'role', label: t('careeros.opportunity.type.role', 'Opportunity') },
        { value: 'project', label: t('careeros.opportunity.type.project', 'Project') },
        { value: 'path', label: t('careeros.opportunity.type.path', 'Career path') },
    ];
    const remoteOptions = [
        { value: '', label: t('careeros.opportunity.remoteUnknown', 'Not stated') },
        { value: 'remote', label: t('careeros.opportunity.remote', 'Remote') },
        { value: 'hybrid', label: t('careeros.opportunity.hybrid', 'Hybrid') },
        { value: 'onsite', label: t('careeros.opportunity.onsite', 'On site') },
    ];

    const candidates = duplicates ? [...duplicates.exact, ...duplicates.possible] : [];

    return (
        <Dialog
            open={open}
            onClose={busy ? () => undefined : onClose}
            title={t('careeros.opportunity.import.title', 'Add opportunity')}
            panelClassName="max-w-2xl max-h-[92vh]"
            bodyClassName="overflow-y-auto"
            footer={
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('btn.cancel', 'Cancel')}</Button>
                    {duplicates ? (
                        <Button variant="secondary" onClick={() => { void saveAnyway(); }} loading={saveState.pending} disabled={busy}>
                            {t('careeros.opportunity.import.saveAnyway', 'Save anyway')}
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={() => { void check(); }} loading={checkState.pending} disabled={!valid || busy || !userId}>
                            {t('careeros.opportunity.import.save', 'Save opportunity')}
                        </Button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                <div role="radiogroup" aria-label={t('careeros.opportunity.import.mode', 'How would you like to add it?')} className="flex flex-wrap gap-2">
                    {(['paste', 'manual'] as Mode[]).map((option) => (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={mode === option}
                            onClick={() => { setMode(option); setDuplicates(null); }}
                            className={`tap-target rounded-lg border px-3 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                                mode === option ? 'border-action-primary bg-action-primary/10 text-content-primary' : 'border-border-default bg-surface-panel text-content-secondary hover:bg-surface-canvas'
                            }`}
                        >
                            {option === 'paste' ? t('careeros.opportunity.import.paste', 'Paste a job description') : t('careeros.opportunity.import.manual', 'Enter details by hand')}
                        </button>
                    ))}
                </div>

                {mode === 'paste' && (
                    <TextArea
                        label={t('careeros.opportunity.import.jd', 'Job description')}
                        hint={t('careeros.opportunity.import.jdHint', 'Stored exactly as pasted. Requirement lines are read from it; the title and company below are guesses you can correct.')}
                        rows={8}
                        value={content}
                        onChange={(event) => { setContent(event.target.value); setDuplicates(null); }}
                        placeholder={t('careeros.opportunity.import.jdPlaceholder', 'Paste the full listing here…')}
                    />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput label={t('careeros.opportunity.import.jobTitle', 'Job title')} value={title} onChange={(event) => { setTitle(event.target.value); setTouched((s) => ({ ...s, title: true })); setDuplicates(null); }} required />
                    <TextInput label={t('careeros.opportunity.import.company', 'Company')} value={company} onChange={(event) => { setCompany(event.target.value); setTouched((s) => ({ ...s, company: true })); setDuplicates(null); }} required />
                    <TextInput label={t('careeros.opportunity.import.location', 'Location')} optional={t('careeros.common.optional', 'optional')} value={location} onChange={(event) => setLocation(event.target.value)} />
                    <Select label={t('careeros.opportunity.import.remote', 'Remote arrangement')} options={remoteOptions} value={remoteType} onChange={(event) => setRemoteType(event.target.value as typeof remoteType)} />
                    <TextInput label={t('careeros.opportunity.import.sourceUrl', 'Source link')} optional={t('careeros.common.optional', 'optional')} type="url" inputMode="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" />
                    <TextInput label={t('careeros.opportunity.import.listingDate', 'Listing date')} optional={t('careeros.common.optional', 'optional')} hint={t('careeros.opportunity.import.listingDateHint', 'Leave empty if the listing does not say — it will show as unknown.')} type="date" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} />
                    <Select label={t('careeros.opportunity.import.type', 'Type')} options={typeOptions} value={type} onChange={(event) => setType(event.target.value as OpportunityType)} />
                </div>

                {mode === 'paste' && content.trim().length > 0 && (
                    <p className="text-[13px] text-content-secondary" role="status">
                        {content.trim().length < MIN_PASTE
                            ? t('careeros.opportunity.import.tooShort', 'Paste a little more of the listing to save it.')
                            : t('careeros.opportunity.import.requirementsFound', '{count} requirement lines found').replace('{count}', String(requirements.length))}
                    </p>
                )}

                {error ? <FailureNotice error={error} onDismiss={() => { checkState.reset(); saveState.reset(); mergeState.reset(); }} /> : null}

                {duplicates && (
                    <StatePanel
                        kind="partial"
                        title={candidates.length === 1
                            ? t('careeros.opportunity.import.duplicateOne', 'Looks like a duplicate of {title} at {company}').replace('{title}', candidates[0].title).replace('{company}', candidates[0].company)
                            : t('careeros.opportunity.import.duplicateMany', 'Looks like a duplicate of {count} saved opportunities').replace('{count}', String(candidates.length))}
                        description={duplicates.exact.length > 0
                            ? t('careeros.opportunity.import.duplicateExact', 'The pasted text is identical to a saved listing.')
                            : t('careeros.opportunity.import.duplicatePossible', 'Same title and company. That alone is not proof they are the same listing — merge only if you are sure.')}
                    >
                        <ul className="space-y-2">
                            {candidates.map((candidate) => (
                                <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-default bg-surface-panel p-3">
                                    <span className="min-w-0 text-sm text-content-primary">
                                        <span className="font-semibold">{candidate.title}</span> · {candidate.company}
                                        <span className="block text-xs text-content-muted">{duplicates.exact.some((e) => e.id === candidate.id) ? t('careeros.opportunity.import.sameText', 'Same text') : t('careeros.opportunity.import.sameTitle', 'Same title and company')}</span>
                                    </span>
                                    <Button size="sm" variant="primary" onClick={() => { void mergeWith(candidate); }} loading={mergeState.pending} disabled={busy}>
                                        {t('careeros.opportunity.import.merge', 'Merge into this one')}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </StatePanel>
                )}
            </div>
        </Dialog>
    );
};

export default ImportOpportunityDialog;
