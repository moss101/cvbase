import React, { useEffect, useState, useCallback } from 'react';
import * as resumeRepo from '../services/repos/resumeRepo';
import type { StoredResume } from '../services/repos/mappers';
import { canCreateResume } from '../services/subscriptionService';
import type { Plan } from '../types';
import ConfirmDialog from './common/ConfirmDialog';
import { useToast } from './common/Toast';
import { Plus, FileText, Lock, Copy, Pencil, Trash2 } from 'lucide-react';
import { useTranslation, type Translate } from '../services/translationService';

interface ResumeManagerProps {
    userId: string;
    plan: Plan;
    /** Open a specific resume in the builder. */
    onEdit: (resumeId: string) => void;
    /** Send the user to pricing when they hit the plan's resume limit. */
    onUpgrade: () => void;
}

/** Server-side backstop (a DB trigger) rejects an insert once a resume is
 *  over the plan's limit; treat it the same as the client-side gate so a
 *  stale/incorrect local plan count still ends in an upgrade prompt instead
 *  of a generic failure toast. */
const isResumeLimitError = (err: unknown): boolean =>
    typeof err === 'object' && err !== null && 'message' in err &&
    String((err as { message?: unknown }).message).includes('resume_limit_reached');

const displayName = (r: StoredResume, t: Translate): string => {
    const c = (r.data as { contact?: { firstName?: string; jobTitle?: string } })?.contact;
    return c?.firstName ? t('mobile.usersResume', "{name}'s resume").replace('{name}', c.firstName) : t('dash.untitled', 'Untitled');
};
const jobTitle = (r: StoredResume, t: Translate): string =>
    (r.data as { contact?: { jobTitle?: string } })?.contact?.jobTitle || t('mobile.noJobTitle', 'No job title');

/** A rename or delete waiting on the user's answer in the dialog. */
type PendingAction = { kind: 'rename' | 'delete'; resume: StoredResume } | null;

/** Placeholder card shown while the list loads; same footprint as a real card. */
const SkeletonCard: React.FC = () => (
    <div aria-hidden="true" className="glass-card h-[280px] flex flex-col p-5 animate-pulse motion-reduce:animate-none">
        <div className="w-12 h-12 rounded-xl bg-gray-200/80" />
        <div className="mt-5 h-5 w-2/3 rounded bg-gray-200/80" />
        <div className="mt-2 h-3 w-1/2 rounded bg-gray-200/60" />
        <div className="mt-auto flex items-center gap-1.5">
            <div className="flex-1 h-8 rounded-lg bg-gray-200/80" />
            <div className="h-8 w-8 rounded-lg bg-gray-200/60" />
            <div className="h-8 w-8 rounded-lg bg-gray-200/60" />
            <div className="h-8 w-8 rounded-lg bg-gray-200/60" />
        </div>
    </div>
);

const ResumeManager: React.FC<ResumeManagerProps> = ({ userId, plan, onEdit, onUpgrade }) => {
    const [resumes, setResumes] = useState<StoredResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<PendingAction>(null);
    const { toast } = useToast();
    const { t } = useTranslation();

    const refresh = useCallback(async () => {
        try {
            setResumes(await resumeRepo.list(userId));
        } catch (err) {
            console.error('Loading resumes failed', err);
            toast({ variant: 'error', title: t('resumeMgr.couldNotLoad', 'Could not load your resumes'), description: t('resumeMgr.checkConnection', 'Check your connection and try again.') });
        } finally {
            setLoading(false);
        }
    }, [userId, toast, t]);

    useEffect(() => { refresh(); }, [refresh]);

    const limit = plan.limits.resumes;
    const canCreate = canCreateResume(resumes.length, limit);

    const handleCreate = useCallback(async () => {
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

    const handleDuplicate = useCallback(async (id: string) => {
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

    const requestRename = useCallback((r: StoredResume) => {
        if (r.id) setPending({ kind: 'rename', resume: r });
    }, []);

    const requestDelete = useCallback((r: StoredResume) => {
        if (!r.id) return;
        if (r.isPrimary && resumes.length > 1) {
            toast({
                title: t('resumeMgr.primaryResumeTitle', 'This is your primary resume'),
                description: t('resumeMgr.primaryResumeDesc', 'Make another resume your primary before deleting this one.'),
            });
            return;
        }
        setPending({ kind: 'delete', resume: r });
    }, [resumes.length, toast, t]);

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

    const isEmpty = !loading && resumes.length === 0;

    return (
        <div className="animate-fade-in">
            <header className="flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <p className="dashboard-eyebrow mb-3">{t('dash.resumeArchive', 'Resume archive')}</p>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('resumeMgr.myResumes', 'My Resumes')}</h1>
                    <p className="text-gray-500">
                        {limit < 0
                            ? t('resumeMgr.unlimitedDesc', 'Create as many tailored resumes as you need.')
                            : t('resumeMgr.usageDesc', '{count} of {limit} on your {plan} plan.')
                                .replace('{count}', String(resumes.length))
                                .replace('{limit}', String(limit))
                                .replace('{plan}', plan.name)}
                    </p>
                </div>
                {/* The empty state carries its own primary action, so the header stays quiet there. */}
                {!isEmpty && (
                    <button
                        onClick={handleCreate}
                        disabled={busy}
                        className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        <Plus className="w-[1em] h-[1em]" aria-hidden="true" />
                        {t('resumeMgr.newResume', 'New resume')}
                    </button>
                )}
            </header>

            {loading ? (
                <div
                    role="status"
                    aria-busy="true"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <span className="sr-only">{t('resumeMgr.loadingResumes', 'Loading your resumes')}</span>
                    {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : isEmpty ? (
                <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <h2 className="mt-5 text-xl font-bold text-gray-800">{t('resumeMgr.noResumesYet', 'No resumes yet')}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
                        {t('resumeMgr.emptyStateDesc', 'Start from a blank page, or paste an old resume into Smart Studio and let it do the typing.')}
                    </p>
                    <button
                        onClick={handleCreate}
                        disabled={busy}
                        className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-[1em] h-[1em]" aria-hidden="true" />
                        {t('resumeMgr.createFirstResume', 'Create your first resume')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* New / upgrade card */}
                    <button
                        onClick={handleCreate}
                        disabled={busy}
                        className={`glass-card h-[280px] flex flex-col items-center justify-center cursor-pointer group border-dashed border-2 bg-transparent ${canCreate ? 'border-gray-300 hover:border-primary hover:bg-primary/5' : 'border-amber-300 hover:bg-amber-50/40'}`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                            {canCreate
                                ? <Plus className="w-8 h-8 text-primary" aria-hidden="true" />
                                : <Lock className="w-8 h-8 text-amber-500" aria-hidden="true" />}
                        </div>
                        <p className={`font-bold ${canCreate ? 'text-gray-500 group-hover:text-primary' : 'text-amber-600'}`}>
                            {canCreate ? t('resumeMgr.createNewResume', 'Create new resume') : t('resumeMgr.upgradeForMore', 'Upgrade for more resumes')}
                        </p>
                    </button>

                    {resumes.map(r => (
                        <div key={r.id} className="glass-card h-[280px] flex flex-col p-5 group">
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <FileText className="w-[1em] h-[1em]" aria-hidden="true" />
                                </div>
                                {r.isPrimary && (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wide">{t('resumeMgr.primary', 'Primary')}</span>
                                )}
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 mt-4 mb-0.5 truncate">{r.title}</h3>
                            <p className="text-xs text-gray-500 truncate">{displayName(r, t)} · {jobTitle(r, t)}</p>

                            <div className="mt-auto flex items-center gap-1.5">
                                <button
                                    onClick={() => r.id && onEdit(r.id)}
                                    className="flex-1 py-2 rounded-lg bg-dark text-white text-xs font-bold hover:bg-black transition-colors"
                                >
                                    {t('resumeMgr.edit', 'Edit')}
                                </button>
                                <button onClick={() => handleDuplicate(r.id!)} title={t('resumeMgr.duplicate', 'Duplicate')} aria-label={t('resumeMgr.duplicate', 'Duplicate')} className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5">
                                    <Copy className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button onClick={() => requestRename(r)} title={t('resumeMgr.rename', 'Rename')} aria-label={t('resumeMgr.rename', 'Rename')} className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5">
                                    <Pencil className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button onClick={() => requestDelete(r)} title={t('btn.delete', 'Delete')} aria-label={t('btn.delete', 'Delete')} className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
        </div>
    );
};

export default ResumeManager;
