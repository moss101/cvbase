import React, { useEffect, useId, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import type { StoredResume } from '../../../services/repos/mappers';
import type { JobApplication } from '../../../types';
import { captureException } from '../../../lib/monitoring';
import { Dialog } from '../../common/Dialog';
import { Button, StatePanel } from '../primitives';
import { claimDraft, claimJobs, findDuplicate, type ClaimMode, type DraftPreview } from './anonymousClaims';

/**
 * Explicit claim of anonymous work into the signed-in account (REQ-24): a
 * preview of the draft (name, title, entry counts), duplicate handling
 * against the account's CVs, and the tracker rows from the anonymous
 * studio. Nothing is claimed by closing the dialog; the device copy is
 * cleared only after the account owns a saved copy.
 */
export interface ClaimDraftDialogProps {
    userId: string;
    drafts: DraftPreview[];
    jobs: JobApplication[];
    onDone: (result: { claimedResumes: number; claimedJobs: number }) => void;
    onClose: () => void;
}

export const ClaimDraftDialog: React.FC<ClaimDraftDialogProps> = ({ userId, drafts, jobs, onDone, onClose }) => {
    const { t } = useTranslation();
    const id = useId();
    const [existing, setExisting] = useState<StoredResume[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [modes, setModes] = useState<Record<string, ClaimMode>>({});
    const [claimJobsToo, setClaimJobsToo] = useState(jobs.length > 0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        resumeRepo.list(userId)
            .then((list) => { if (!cancelled) { setExisting(list); setLoadError(false); } })
            .catch((err) => { captureException(err, { context: 'claim-list-resumes' }); if (!cancelled) setLoadError(true); });
        return () => { cancelled = true; };
    }, [userId]);

    const modeFor = (draft: DraftPreview): ClaimMode => modes[draft.docKey] ?? 'keep_both';

    const submit = async () => {
        setBusy(true);
        setError(null);
        let claimedResumes = 0;
        let claimedJobs = 0;
        try {
            const primary = (existing ?? []).find((r) => r.isPrimary) ?? null;
            for (const draft of drafts) {
                const saved = await claimDraft(userId, draft, modeFor(draft), primary);
                if (saved) claimedResumes += 1;
            }
            if (claimJobsToo && jobs.length > 0) {
                claimedJobs = (await claimJobs(userId, jobs)).length;
            }
            onDone({ claimedResumes, claimedJobs });
        } catch (err) {
            captureException(err, { context: 'claim-draft' });
            setError(t('careeros.claim.failed', 'The claim could not be completed. Your draft is still on this device.'));
        } finally {
            setBusy(false);
        }
    };

    const allDiscard = drafts.every((d) => modeFor(d) === 'discard') && (!claimJobsToo || jobs.length === 0);

    return (
        <Dialog open onClose={onClose} title={t('careeros.claim.title', 'Work saved on this device')} panelClassName="max-w-lg max-h-[85vh]" bodyClassName="overflow-y-auto">
            <p className="text-sm text-content-secondary">
                {t('careeros.claim.description', 'This browser holds work from before you signed in. Choose what to bring into your account. Nothing is claimed unless you confirm.')}
            </p>
            {loadError && <div className="mt-3"><StatePanel kind="partial" compact title={t('careeros.claim.listError', 'Your saved CVs could not be checked for duplicates')} description={t('careeros.claim.listErrorDescription', 'You can still keep the draft as a new CV.')} /></div>}
            <ul className="mt-4 space-y-3">
                {drafts.map((draft) => {
                    const dup = findDuplicate(existing ?? [], draft);
                    const mode = modeFor(draft);
                    const name = `${id}-${draft.docKey}`;
                    return (
                        <li key={draft.docKey} className="rounded-xl border border-border-default bg-surface-canvas p-3">
                            <p className="text-sm font-semibold text-content-primary">{draft.title || t('careeros.claim.untitledDraft', 'Untitled CV draft')}</p>
                            <p className="text-xs text-content-secondary">
                                {[
                                    draft.jobTitle,
                                    t('careeros.claim.experienceCount', '{count} roles').replace('{count}', String(draft.experienceCount)),
                                    t('careeros.claim.skillCount', '{count} skills').replace('{count}', String(draft.skillCount)),
                                ].filter(Boolean).join(' · ')}
                            </p>
                            {dup.sameTitle && (
                                <p role="status" className="mt-1 text-xs text-status-warning">{t('careeros.claim.duplicate', 'A CV with the same title already exists in your account.')}</p>
                            )}
                            <fieldset className="mt-2">
                                <legend className="sr-only">{t('careeros.claim.choice', 'What to do with this draft')}</legend>
                                <div className="flex flex-col gap-1">
                                    {([
                                        ['keep_both', dup.sameTitle || dup.primary ? t('careeros.claim.keepBoth', 'Keep both (add as a new CV)') : t('careeros.claim.keep', 'Add to my CVs')],
                                        ...(dup.primary ? [['replace_primary', t('careeros.claim.replacePrimary', 'Replace my primary CV ({title})').replace('{title}', dup.primary.title)]] : []),
                                        ['discard', t('careeros.claim.discard', 'Discard this draft')],
                                    ] as Array<[ClaimMode, string]>).map(([value, label]) => (
                                        <label key={value} className="tap-target flex items-center gap-2 rounded-lg px-2 text-sm text-content-primary hover:bg-surface-panel">
                                            <input type="radio" name={name} value={value} checked={mode === value} onChange={() => setModes((prev) => ({ ...prev, [draft.docKey]: value }))} disabled={busy} className="h-4 w-4 accent-action-primary" />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </li>
                    );
                })}
                {jobs.length > 0 && (
                    <li className="rounded-xl border border-border-default bg-surface-canvas p-3">
                        <label className="tap-target flex items-start gap-2 text-sm text-content-primary">
                            <input type="checkbox" checked={claimJobsToo} onChange={(e) => setClaimJobsToo(e.target.checked)} disabled={busy} className="mt-1 h-4 w-4 rounded accent-action-primary" />
                            <span>
                                <span className="block font-semibold">{t('careeros.claim.jobsTitle', '{count} tracker entries').replace('{count}', String(jobs.length))}</span>
                                <span className="block text-xs text-content-secondary">{t('careeros.claim.jobsDescription', 'Saved as opportunities (source: entered manually). Sample rows are not included.')}</span>
                                <span className="mt-1 block text-xs text-content-secondary">{jobs.slice(0, 3).map((j) => `${j.jobTitle} · ${j.company}`).join('; ')}{jobs.length > 3 ? ' …' : ''}</span>
                            </span>
                        </label>
                    </li>
                )}
            </ul>
            {error && <p role="alert" className="mt-3 text-sm text-status-danger">{error}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="quiet" onClick={onClose} disabled={busy}>{t('careeros.claim.later', 'Decide later')}</Button>
                <Button variant={allDiscard ? 'danger' : 'primary'} onClick={() => void submit()} loading={busy} disabled={existing === null && !loadError}>
                    {allDiscard ? t('careeros.claim.confirmDiscard', 'Discard') : t('careeros.claim.confirm', 'Claim into my account')}
                </Button>
            </div>
        </Dialog>
    );
};

export default ClaimDraftDialog;
