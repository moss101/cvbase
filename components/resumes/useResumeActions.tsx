import React, { useCallback, useState } from 'react';
import * as resumeRepo from '../../services/repos/resumeRepo';
import type { StoredResume } from '../../services/repos/mappers';
import { canCreateResume } from '../../services/subscriptionService';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';
import { useTranslation } from '../../services/translationService';

/**
 * Create / duplicate / rename / delete for stored resumes, shared by the
 * legacy ResumeManager and the Career OS Library so both keep the same plan
 * limit, primary-resume guard, server backstop and copy.
 */

/** Server-side backstop (a DB trigger) rejects an insert once a resume is
 *  over the plan's limit; treat it the same as the client-side gate so a
 *  stale/incorrect local plan count still ends in an upgrade prompt instead
 *  of a generic failure toast. */
export const isResumeLimitError = (err: unknown): boolean =>
    typeof err === 'object' && err !== null && 'message' in err &&
    String((err as { message?: unknown }).message).includes('resume_limit_reached');

export type ResumeRef = Pick<StoredResume, 'id' | 'title' | 'isPrimary'>;

/** A rename or delete waiting on the user's answer in the dialog. */
type PendingAction = { kind: 'rename' | 'delete'; resume: ResumeRef } | null;

export interface ResumeActionsOptions {
    userId: string;
    /** How many resumes the account holds now (for the plan limit). */
    count: number;
    /** `plan.limits.resumes`; negative means unlimited. */
    limit: number;
    onEdit: (resumeId: string) => void;
    onUpgrade: () => void;
    /** Reload the list after a change. */
    refresh: () => Promise<unknown> | void;
}

export interface ResumeActions {
    busy: boolean;
    canCreate: boolean;
    create: () => Promise<void>;
    duplicate: (id: string) => Promise<void>;
    requestRename: (resume: ResumeRef) => void;
    requestDelete: (resume: ResumeRef) => void;
    /** The rename prompt and delete confirmation; render once. */
    dialogs: React.ReactNode;
}

export function useResumeActions({ userId, count, limit, onEdit, onUpgrade, refresh }: ResumeActionsOptions): ResumeActions {
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<PendingAction>(null);
    const { toast } = useToast();
    const { t } = useTranslation();
    const canCreate = canCreateResume(count, limit);

    const create = useCallback(async () => {
        if (!canCreate) { onUpgrade(); return; }
        setBusy(true);
        try {
            const created = await resumeRepo.create(userId, { title: t('mobile.untitledResume', 'Untitled resume') });
            if (created.id) onEdit(created.id);
        } catch (err) {
            if (isResumeLimitError(err)) {
                onUpgrade();
            } else {
                console.error('Creating resume failed', err);
                toast({ variant: 'error', title: t('resumeMgr.createFailedTitle', 'Could not create the resume'), description: t('resumeMgr.tryAgain', 'Please try again.') });
            }
        } finally {
            setBusy(false);
        }
    }, [canCreate, onUpgrade, userId, onEdit, toast, t]);

    const duplicate = useCallback(async (id: string) => {
        if (!canCreate) { onUpgrade(); return; }
        setBusy(true);
        try {
            await resumeRepo.duplicate(userId, id);
            await refresh();
        } catch (err) {
            if (isResumeLimitError(err)) {
                onUpgrade();
            } else {
                console.error('Duplicating resume failed', err);
                toast({ variant: 'error', title: t('resumeMgr.duplicateFailedTitle', 'Could not duplicate the resume'), description: t('resumeMgr.tryAgain', 'Please try again.') });
            }
        } finally {
            setBusy(false);
        }
    }, [canCreate, onUpgrade, userId, refresh, toast, t]);

    const requestRename = useCallback((r: ResumeRef) => {
        if (r.id) setPending({ kind: 'rename', resume: r });
    }, []);

    const requestDelete = useCallback((r: ResumeRef) => {
        if (!r.id) return;
        if (r.isPrimary && count > 1) {
            toast({
                title: t('resumeMgr.primaryResumeTitle', 'This is your primary resume'),
                description: t('resumeMgr.primaryResumeDesc', 'Make another resume your primary before deleting this one.'),
            });
            return;
        }
        setPending({ kind: 'delete', resume: r });
    }, [count, toast, t]);

    const confirmPending = useCallback(async (value?: string) => {
        const action = pending;
        setPending(null);
        if (!action?.resume.id) return;
        const { resume } = action;
        const id = action.resume.id;
        if (action.kind === 'rename') {
            const next = (value ?? '').trim();
            if (!next || next === resume.title) return;
            try {
                await resumeRepo.rename(userId, id, next);
                await refresh();
            } catch (err) {
                console.error('Renaming resume failed', err);
                toast({ variant: 'error', title: t('resumeMgr.renameFailedTitle', 'Could not rename the resume'), description: t('resumeMgr.tryAgain', 'Please try again.') });
            }
            return;
        }
        try {
            await resumeRepo.remove(userId, id);
            await refresh();
            toast({ variant: 'success', title: t('resumeMgr.deletedToast', 'Deleted "{title}"').replace('{title}', resume.title ?? '') });
        } catch (err) {
            console.error('Deleting resume failed', err);
            toast({ variant: 'error', title: t('resumeMgr.deleteFailedTitle', 'Could not delete the resume'), description: t('resumeMgr.tryAgain', 'Please try again.') });
        }
    }, [pending, userId, refresh, toast, t]);

    const dialogs = (
        <>
            <ConfirmDialog
                open={pending?.kind === 'rename'}
                mode="prompt"
                title={t('resumeMgr.renameDialogTitle', 'Rename resume')}
                inputLabel={t('resumeMgr.resumeNameLabel', 'Resume name')}
                defaultValue={pending?.resume.title ?? ''}
                required
                confirmLabel={t('resumeMgr.rename', 'Rename')}
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
            <ConfirmDialog
                open={pending?.kind === 'delete'}
                title={t('resumeMgr.deleteDialogTitle', 'Delete "{title}"?').replace('{title}', pending?.resume.title ?? '')}
                description={t('resumeMgr.deleteDialogDesc', 'This cannot be undone.')}
                confirmLabel={t('btn.delete', 'Delete')}
                destructive
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
        </>
    );

    return { busy, canCreate, create, duplicate, requestRename, requestDelete, dialogs };
}
