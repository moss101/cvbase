import React, { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as careerProfileRepo from '../../../services/careerOs/careerProfileRepo';
import { ConflictError, type CareerProfile } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button } from '../primitives';

/**
 * One-time introduction for people who already had CVs or tracker rows
 * before Career OS (REQ-24). Three bullets, a link to the Library, and a
 * dismiss that records `introducedAt` on the profile so it never returns.
 * It never blocks anything: the page beneath it is fully usable.
 */
export interface IntroductionCardProps {
    userId: string;
    profile: CareerProfile;
    onDismissed: () => Promise<void> | void;
    /** Counts from the account, so the copy states what actually moved. */
    resumeCount: number;
    applicationCount: number;
}

export const IntroductionCard: React.FC<IntroductionCardProps> = ({ userId, profile, onDismissed, resumeCount, applicationCount }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);

    const dismiss = async () => {
        setBusy(true);
        try {
            try {
                await careerProfileRepo.updateOnboarding(userId, { ...profile.onboarding, introducedAt: new Date().toISOString() }, profile.revision);
            } catch (err) {
                if (!(err instanceof ConflictError)) throw err;
                const fresh = await careerProfileRepo.get(userId);
                if (fresh && !fresh.onboarding.introducedAt) {
                    await careerProfileRepo.updateOnboarding(userId, { ...fresh.onboarding, introducedAt: new Date().toISOString() }, fresh.revision);
                }
            }
        } catch (err) {
            captureException(err, { context: 'today-introduction' });
        } finally {
            setBusy(false);
            await onDismissed();
        }
    };

    const moved = t('careeros.today.intro.summary', 'Your {resumes} CVs and {applications} tracker entries moved in unchanged.')
        .replace('{resumes}', String(resumeCount)).replace('{applications}', String(applicationCount));

    return (
        <section role="region" aria-labelledby="intro-title" className="rounded-xl border border-border-default bg-surface-panel">
            <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <p className="flex min-w-0 flex-1 items-start gap-3 text-[13.5px] leading-relaxed text-content-secondary">
                    <Sparkles size={16} className="mt-[3px] shrink-0 text-action-primary" aria-hidden="true" />
                    <span>
                    <span id="intro-title" className="font-semibold text-content-primary">{t('careeros.today.intro.title', 'Your account is now a Career OS')}.</span>{' '}{moved}
                    </span>
                </p>
                <div className="-ml-2 flex shrink-0 items-center gap-1 pl-7 sm:ml-0 sm:pl-0">
                    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="intro-details" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-content-secondary hover:text-content-primary">
                        {t('careeros.today.intro.whatMoved', 'What moved where')}
                        <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    <Button variant="quiet" size="sm" onClick={() => void dismiss()} loading={busy}>{t('careeros.today.intro.gotIt', 'Got it')}</Button>
                </div>
            </div>
            {open && (
                <div id="intro-details" className="border-t border-border-default px-4 py-3 pl-11">
                    <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-content-secondary">
                        <li>{t('careeros.today.intro.whatChanged', 'Today shows what to do next, drawn from your own records. Career holds your facts, goals and evidence; Opportunities, Campaigns and Applications hold the search.')}</li>
                        <li>{t('careeros.today.intro.whereThingsWent', 'Your {resumes} CVs live in the Library and your {applications} tracker entries are now applications and opportunities. Templates, PRISM and the ATS checker are in the Library too.')
                            .replace('{resumes}', String(resumeCount)).replace('{applications}', String(applicationCount))}</li>
                        <li>{t('careeros.today.intro.intact', 'Nothing was rewritten: every CV and tracker row is intact, and facts read from your primary CV are candidates until you confirm them.')}</li>
                    </ul>
                    <Button className="mt-2 -ml-2" variant="quiet" size="sm" onClick={() => navigate(careerPath.toCvWorkspace())}>{t('careeros.today.intro.openLibrary', 'Open my CVs')}</Button>
                </div>
            )}
        </section>
    );
};

export default IntroductionCard;
