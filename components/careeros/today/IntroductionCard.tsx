import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
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

    return (
        <section role="region" aria-labelledby="intro-title" className="rounded-2xl border border-action-primary/30 bg-action-primary/5 p-5">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-panel text-action-primary"><Sparkles size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                    <h2 id="intro-title" className="text-base font-semibold text-content-primary">{t('careeros.today.intro.title', 'Your account is now a Career OS')}</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
                        <li>{t('careeros.today.intro.whatChanged', 'Today shows what to do next, drawn from your own records. Career holds your facts, goals and evidence; Opportunities, Campaigns and Applications hold the search.')}</li>
                        <li>{t('careeros.today.intro.whereThingsWent', 'Your {resumes} CVs live in the Library and your {applications} tracker entries are now applications and opportunities. Templates, PRISM and the ATS checker are in the Library too.')
                            .replace('{resumes}', String(resumeCount)).replace('{applications}', String(applicationCount))}</li>
                        <li>{t('careeros.today.intro.intact', 'Nothing was rewritten: every CV and tracker row is intact, and facts read from your primary CV are candidates until you confirm them.')}</li>
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="primary" size="sm" onClick={() => void dismiss()} loading={busy}>{t('careeros.today.intro.gotIt', 'Got it')}</Button>
                        <Button variant="quiet" size="sm" onClick={() => navigate(careerPath.toLibrary('cv'))}>{t('careeros.today.intro.openLibrary', 'Open my CVs')}</Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default IntroductionCard;
