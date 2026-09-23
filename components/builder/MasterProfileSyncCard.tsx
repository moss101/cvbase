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
    /** The draft as it is now; when the profile would add nothing to it, no offer is shown. */
    current?: ResumeData;
}

const differs = (from: string | undefined | null, to: string | undefined | null): boolean => Boolean(from && from.trim() && from.trim() !== (to ?? '').trim());

export type ProfileSection = 'contact' | 'summary' | 'skills' | 'certifications';

/** The draft sections applying the profile would change (empty: nothing to offer). */
export function profileAdditions(profile: UserProfile, draft: ResumeData): ProfileSection[] {
    const c = draft.contact;
    const out: ProfileSection[] = [];
    if (differs(profile.firstName, c.firstName) || differs(profile.lastName, c.lastName) || differs(profile.phone, c.phone)
        || differs(profile.email, c.email) || differs(profile.jobTitle, c.jobTitle) || differs(profile.linkedin, c.linkedin)
        || differs(profile.portfolio || profile.github, c.website)) out.push('contact');
    if (differs(profile.bio, draft.summary.professionalSummary)) out.push('summary');
    const skills = new Set(draft.skills.map((sk) => String(sk).toLowerCase()));
    if ((profile.careSpecialties ?? []).some((sk) => !skills.has(sk.toLowerCase()))) out.push('skills');
    const certs = new Set(draft.certifications.map((ce) => ce.name.toLowerCase()));
    if ((profile.certifications ?? []).some((name) => !certs.has(name.toLowerCase()))) out.push('certifications');
    return out;
}

const MasterProfileSyncCard: React.FC<MasterProfileSyncCardProps> = ({ userProfile, isHydrated, onHydrate, onResync, onApply, current }) => {
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

    // Nothing to offer: the draft already holds everything the profile has.
    const additions = current ? profileAdditions(userProfile, current) : null;
    if (!isHydrated && additions && additions.length === 0) return null;
    const sectionName: Record<ProfileSection, string> = {
        contact: t('nav.contact', 'Contact info'),
        summary: t('nav.summary', 'Summary'),
        skills: t('nav.skills', 'Skills'),
        certifications: t('nav.certifications', 'Certifications'),
    };

    // A calm tinted row inside the editor panel (no border of its own): the
    // profile is the one source behind every CV, so this reads as an offer.
    return (
        <div
            className={`mt-6 flex flex-col items-start justify-between gap-4 rounded-xl px-5 py-4 sm:flex-row sm:items-center ${
                isHydrated ? 'bg-action-primary/5' : 'bg-surface-canvas'
            }`}
            id="profile-integration-block"
        >
            <div className="flex min-w-0 items-start gap-3.5">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${isHydrated ? 'bg-action-primary/10 text-action-primary' : 'bg-surface-panel text-action-primary'}`}>
                    {isHydrated
                        ? <CheckCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                        : <Wand2 className="h-[18px] w-[18px]" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 text-[14px] font-semibold leading-tight text-content-primary">
                        {isHydrated ? t('masterSync.syncComplete', 'Master sync complete!') : t('masterSync.linkReady', 'Master Profile Link Ready')}
                        {!isHydrated && (
                            <span className="rounded-full border border-border-default bg-surface-panel px-2 py-0.5 text-[11px] font-medium text-content-secondary">
                                {t('masterSync.cloudAutoFill', 'Cloud Auto-Fill')}
                            </span>
                        )}
                    </h3>
                    <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-content-secondary">
                        {isHydrated
                            ? t('masterSync.syncedDesc', 'Your contact fields, executive bio, core skills, links, and certified badges are safely synchronized.')
                            : additions
                                // Name exactly what would change, not a count that may be zero.
                                ? t('masterSync.fillsSections', 'Your profile has details this CV does not use yet: {sections}. Filling copies them in; you can edit anything afterwards.')
                                    .replace('{sections}', additions.map((a) => sectionName[a].toLowerCase()).join(', '))
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
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 self-stretch rounded-[10px] border border-border-strong bg-surface-panel px-3.5 py-2 text-[13px] font-semibold text-content-primary transition-colors duration-150 hover:border-action-primary/50 hover:text-action-primary sm:self-center"
                    id="hydrate-resume-action"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t('masterSync.hydrateDraft', 'Hydrate Draft')}
                </button>
            ) : (
                <button
                    onClick={onResync}
                    className="shrink-0 cursor-pointer self-start rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-content-secondary transition-colors duration-150 hover:bg-surface-panel hover:text-content-primary sm:self-center"
                >
                    {t('masterSync.resyncFields', 'Re-sync Fields')}
                </button>
            )}
        </div>
    );
};

export default MasterProfileSyncCard;
