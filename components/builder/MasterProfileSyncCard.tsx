import React from 'react';
import { CheckCheck, Wand2, RefreshCw } from 'lucide-react';
import type { ResumeData } from '../../types';
import type { UserProfile } from '../AuthProvider';
import { useTranslation } from '../../services/translationService';

/**
 * "Auto-fill from master profile" prompt shown above the active form when a
 * signed-in user has a master profile to pull contact/summary/skills/
 * certifications from. Extracted verbatim from ResumeBuilder.tsx (which owns
 * all the state it needs — `isHydrated`, `setFormData` — and passes them
 * down) purely to keep that file's line count manageable; no behaviour
 * change.
 */

interface MasterProfileSyncCardProps {
    userProfile: UserProfile;
    isHydrated: boolean;
    onHydrate: () => void;
    onResync: () => void;
    onApply: (updater: (prev: ResumeData) => ResumeData) => void;
}

const MasterProfileSyncCard: React.FC<MasterProfileSyncCardProps> = ({ userProfile, isHydrated, onHydrate, onResync, onApply }) => {
    const { t } = useTranslation();
    const applyProfile = () => {
        onApply((prev) => {
            const currentCerts = [...prev.certifications];
            if (userProfile.certifications) {
                userProfile.certifications.forEach((certName) => {
                    const exists = currentCerts.some((c) => c.name.toLowerCase() === certName.toLowerCase());
                    if (!exists) {
                        currentCerts.push({
                            id: crypto.randomUUID(),
                            name: certName,
                            number: '',
                            expiryDate: '',
                            description: t('masterSync.credentialDesc', 'Synchronized credential from your master profile.'),
                        });
                    }
                });
            }

            return {
                ...prev,
                contact: {
                    ...prev.contact,
                    firstName: userProfile.firstName || prev.contact.firstName,
                    lastName: userProfile.lastName || prev.contact.lastName,
                    phone: userProfile.phone || prev.contact.phone,
                    email: userProfile.email || prev.contact.email,
                    jobTitle: userProfile.jobTitle || prev.contact.jobTitle,
                    linkedin: userProfile.linkedin || prev.contact.linkedin,
                    website: userProfile.portfolio || userProfile.github || prev.contact.website,
                },
                summary: {
                    ...prev.summary,
                    professionalSummary: userProfile.bio || prev.summary.professionalSummary,
                },
                skills: userProfile.careSpecialties && userProfile.careSpecialties.length > 0
                    ? Array.from(new Set([...prev.skills, ...userProfile.careSpecialties]))
                    : prev.skills,
                certifications: currentCerts,
            };
        });
        onHydrate();
    };

    return (
        <div className={`mt-6 p-5 rounded-2xl border transition-all ${
            isHydrated
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'
                : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-slate-800 text-white shadow-xl hover:shadow-indigo-950/10'
        }`} id="profile-integration-block">
            <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                    isHydrated
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/35'
                }`}>
                    {isHydrated
                        ? <CheckCheck className="w-[1em] h-[1em] text-2xl" aria-hidden="true" />
                        : <Wand2 className="w-[1em] h-[1em] text-2xl" aria-hidden="true" />}
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                        {isHydrated ? t('masterSync.syncComplete', 'Master sync complete!') : t('masterSync.linkReady', 'Master Profile Link Ready')}
                        {!isHydrated && (
                            <span className="text-[9px] font-semibold bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-500/25">
                                {t('masterSync.cloudAutoFill', 'Cloud Auto-Fill')}
                            </span>
                        )}
                    </h3>
                    <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
                        isHydrated ? 'text-slate-500 font-medium' : 'text-slate-300'
                    }`}>
                        {isHydrated
                            ? t('masterSync.syncedDesc', 'Your contact fields, executive bio, core skills, links, and certified badges are safely synchronized.')
                            : t('masterSync.detectedDesc', 'We detected a master profile checklist for "{name}" containing {skills} skills and {certs} credentials. Would you like to instantly auto-fill your active resume draft?')
                                .replace('{name}', userProfile.firstName || t('mobile.user', 'User'))
                                .replace('{skills}', String(userProfile.careSpecialties?.length || 0))
                                .replace('{certs}', String(userProfile.certifications?.length || 0))
                        }
                    </p>
                </div>
            </div>
            {!isHydrated ? (
                <button
                    onClick={applyProfile}
                    className="mt-3 sm:mt-0 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-indigo-500/25 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer self-stretch sm:self-center"
                    id="hydrate-resume-action"
                >
                    <RefreshCw className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                    {t('masterSync.hydrateDraft', 'Hydrate Draft')}
                </button>
            ) : (
                <button
                    onClick={onResync}
                    className="mt-2 sm:mt-0 text-xs font-bold text-slate-500 hover:text-indigo-600 cursor-pointer border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg bg-white self-start sm:self-center transition-all shadow-sm"
                >
                    {t('masterSync.resyncFields', 'Re-sync Fields')}
                </button>
            )}
        </div>
    );
};

export default MasterProfileSyncCard;
