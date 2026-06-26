import React, { useEffect, useState, useCallback } from 'react';
import * as resumeRepo from '../services/repos/resumeRepo';
import type { StoredResume } from '../services/repos/mappers';
import { canCreateResume } from '../services/subscriptionService';
import type { Plan } from '../types';

interface ResumeManagerProps {
    userId: string;
    plan: Plan;
    /** Open a specific resume in the builder. */
    onEdit: (resumeId: string) => void;
    /** Send the user to pricing when they hit the plan's resume limit. */
    onUpgrade: () => void;
}

const displayName = (r: StoredResume): string => {
    const c = (r.data as { contact?: { firstName?: string; jobTitle?: string } })?.contact;
    return c?.firstName ? `${c.firstName}'s resume` : 'Untitled';
};
const jobTitle = (r: StoredResume): string =>
    (r.data as { contact?: { jobTitle?: string } })?.contact?.jobTitle || 'No job title';

const ResumeManager: React.FC<ResumeManagerProps> = ({ userId, plan, onEdit, onUpgrade }) => {
    const [resumes, setResumes] = useState<StoredResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            setResumes(await resumeRepo.list(userId));
        } catch (err) {
            console.error('Loading resumes failed', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { refresh(); }, [refresh]);

    const limit = plan.limits.resumes;
    const canCreate = canCreateResume(resumes.length, limit);

    const handleCreate = useCallback(async () => {
        if (!canCreate) { onUpgrade(); return; }
        setBusy(true);
        try {
            const created = await resumeRepo.create(userId, { title: 'Untitled resume' });
            if (created.id) onEdit(created.id);
        } catch (err) {
            console.error('Creating resume failed', err);
        } finally {
            setBusy(false);
        }
    }, [canCreate, onUpgrade, userId, onEdit]);

    const handleDuplicate = useCallback(async (id: string) => {
        if (!canCreate) { onUpgrade(); return; }
        setBusy(true);
        try {
            await resumeRepo.duplicate(userId, id);
            await refresh();
        } catch (err) {
            console.error('Duplicating resume failed', err);
        } finally {
            setBusy(false);
        }
    }, [canCreate, onUpgrade, userId, refresh]);

    const handleRename = useCallback(async (r: StoredResume) => {
        if (!r.id) return;
        const next = window.prompt('Rename resume', r.title);
        if (next === null) return;
        try {
            await resumeRepo.rename(userId, r.id, next);
            await refresh();
        } catch (err) {
            console.error('Renaming resume failed', err);
        }
    }, [userId, refresh]);

    const handleDelete = useCallback(async (r: StoredResume) => {
        if (!r.id) return;
        if (r.isPrimary && resumes.length > 1) {
            window.alert('Make another resume your primary before deleting this one.');
            return;
        }
        if (!window.confirm(`Delete “${r.title}”? This cannot be undone.`)) return;
        try {
            await resumeRepo.remove(userId, r.id);
            await refresh();
        } catch (err) {
            console.error('Deleting resume failed', err);
        }
    }, [userId, refresh, resumes.length]);

    return (
        <div className="animate-fade-in">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">My Resumes</h1>
                    <p className="text-gray-500">
                        {limit < 0 ? 'Create as many tailored resumes as you need.' : `${resumes.length} of ${limit} on your ${plan.name} plan.`}
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    disabled={busy}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined">add</span>
                    New resume
                </button>
            </header>

            {loading ? (
                <p className="text-gray-400 py-16 text-center">Loading your resumes…</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* New / upgrade card */}
                    <button
                        onClick={handleCreate}
                        disabled={busy}
                        className={`glass-card h-[280px] flex flex-col items-center justify-center cursor-pointer group border-dashed border-2 bg-transparent ${canCreate ? 'border-gray-300 hover:border-primary hover:bg-primary/5' : 'border-amber-300 hover:bg-amber-50/40'}`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                            <span className={`material-symbols-outlined text-3xl ${canCreate ? 'text-primary' : 'text-amber-500'}`}>{canCreate ? 'add' : 'lock'}</span>
                        </div>
                        <p className={`font-bold ${canCreate ? 'text-gray-500 group-hover:text-primary' : 'text-amber-600'}`}>
                            {canCreate ? 'Create new resume' : 'Upgrade for more resumes'}
                        </p>
                    </button>

                    {resumes.map(r => (
                        <div key={r.id} className="glass-card h-[280px] flex flex-col p-5 group">
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">description</span>
                                </div>
                                {r.isPrimary && (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wide">Primary</span>
                                )}
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 mt-4 mb-0.5 truncate">{r.title}</h3>
                            <p className="text-xs text-gray-500 truncate">{displayName(r)} · {jobTitle(r)}</p>

                            <div className="mt-auto flex items-center gap-1.5">
                                <button
                                    onClick={() => r.id && onEdit(r.id)}
                                    className="flex-1 py-2 rounded-lg bg-dark text-white text-xs font-bold hover:bg-black transition-colors"
                                >
                                    Edit
                                </button>
                                <button onClick={() => handleDuplicate(r.id!)} title="Duplicate" aria-label="Duplicate" className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5">
                                    <span className="material-symbols-outlined text-base">content_copy</span>
                                </button>
                                <button onClick={() => handleRename(r)} title="Rename" aria-label="Rename" className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5">
                                    <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button onClick={() => handleDelete(r)} title="Delete" aria-label="Delete" className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                                    <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResumeManager;
