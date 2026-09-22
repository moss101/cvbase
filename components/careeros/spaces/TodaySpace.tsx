import React, { useEffect, useMemo, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CareerRoute } from '../../NavigationProvider';
import { useAuth } from '../../AuthProvider';
import type { JobApplication } from '../../../types';
import { Button, SpaceHeader, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from '../career/useOnline';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { ActionQueue } from '../today/ActionQueue';
import { ActiveCampaigns } from '../today/ActiveCampaigns';
import { CareerPulse } from '../today/CareerPulse';
import { ClaimDraftDialog } from '../today/ClaimDraftDialog';
import { InsightsPanel } from '../today/InsightsPanel';
import { IntroductionCard } from '../today/IntroductionCard';
import { OrientationHeader } from '../today/OrientationHeader';
import { RecentActivity } from '../today/RecentActivity';
import { listClaimableDrafts, listClaimableJobs, type DraftPreview } from '../today/anonymousClaims';
import { useTodayData } from '../today/useTodayData';
import { WorkspaceShortcuts } from '../today/WorkspaceShortcuts';

/**
 * Today (REQ-12, COS-015): orientation, up to three eligible actions, a
 * decomposable pulse, active campaigns, recent activity and outcome
 * insights — all from durable records, no AI call. New accounts with no
 * data see the resumable onboarding instead; existing accounts see a
 * one-time introduction and are never forced through onboarding. Anonymous
 * work on this device is offered for explicit claim.
 */
export interface SpaceProps {
    route: CareerRoute;
}

/** Whether the profile says onboarding should be shown instead of Today. */
export const shouldShowOnboarding = (onboarding: { completedAt?: string; pausedAt?: string; step?: string }, isEmptyAccount: boolean): boolean => {
    if (onboarding.completedAt) return false;
    if (onboarding.pausedAt) return false;
    if (onboarding.step) return true; // Started and not paused: resume where they stopped.
    return isEmptyAccount;
};

const TodaySpace: React.FC<SpaceProps> = (_props) => {
    const { t } = useTranslation();
    const { user, userProfile } = useAuth();
    const { userId, profile, profileError, migration, refreshProfile, invalidate } = useCareerOs();
    const online = useOnline();
    const today = useTodayData();
    const [forceOnboarding, setForceOnboarding] = useState(false);
    const [claim, setClaim] = useState<{ drafts: DraftPreview[]; jobs: JobApplication[] } | null>(null);
    const [claimChecked, setClaimChecked] = useState<string | null>(null);
    const [claimResult, setClaimResult] = useState<{ claimedResumes: number; claimedJobs: number } | null>(null);
    const [introDismissed, setIntroDismissed] = useState(false);

    // Anonymous work on this device: offered once per session for the signed-in account.
    useEffect(() => {
        if (!userId || claimChecked === userId) return;
        setClaimChecked(userId);
        try {
            const drafts = listClaimableDrafts(userId);
            const jobs = listClaimableJobs();
            if (drafts.length > 0 || jobs.length > 0) setClaim({ drafts, jobs });
        } catch { /* storage unavailable */ }
    }, [userId, claimChecked]);

    const name = useMemo(() => {
        const fromProfile = userProfile?.firstName?.trim();
        if (fromProfile) return fromProfile;
        const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
        const full = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
        return full.trim().split(/\s+/)[0] || null;
    }, [user, userProfile]);

    const data = today.data;
    const gateOpen = Boolean(profile && data && (forceOnboarding || shouldShowOnboarding(profile.onboarding, data.isEmptyAccount)));
    useEffect(() => { if (gateOpen && !forceOnboarding) setForceOnboarding(true); }, [gateOpen, forceOnboarding]);

    if (!userId) return null;

    // Loading until the profile, the backfill and the first read have all settled (no flash of an empty page).
    const loading = data === null && today.error === null;
    const failed = (source: string) => Boolean(data?.failed.includes(source));

    const claimDialog = claim ? (
        <ClaimDraftDialog
            userId={userId}
            drafts={claim.drafts}
            jobs={claim.jobs}
            onClose={() => setClaim(null)}
            onDone={(result) => { setClaim(null); setClaimResult(result); invalidate(); }}
        />
    ) : null;

    // Gate: onboarding for new, empty accounts (or a started, unpaused flow); never for accounts with history.
    // Once the flow is on screen it stays until it exits: importing a CV mid-flow
    // makes the account non-empty, and the shell's profile copy only refreshes on
    // exit, so re-evaluating the gate on every data reload would eject the person
    // from the review step.
    if (profile && data && gateOpen) {
        return (
            <>
                <OnboardingFlow
                    userId={userId}
                    profile={profile}
                    onExit={() => { setForceOnboarding(false); invalidate('today'); void refreshProfile(); }}
                />
                {claimDialog}
            </>
        );
    }

    // The one-time introduction is for accounts that had history before Career
    // OS existed; someone who came in through onboarding has already been told.
    const showIntro = Boolean(profile && data && !introDismissed && !profile.onboarding.introducedAt && !profile.onboarding.completedAt && !profile.onboarding.step && !data.isEmptyAccount);
    const pausedOnboarding = Boolean(profile && !profile.onboarding.completedAt && profile.onboarding.pausedAt);

    return (
        <div className="mx-auto w-full max-w-5xl">
            {profileError !== null && !profile ? (
                <>
                    <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={t('careeros.space.today', 'Today')} />
                    <StatePanel kind="error" title={t('careeros.today.profileError', 'Today could not load your profile')} onRetry={() => void refreshProfile()} />
                </>
            ) : (
                <>
                    <OrientationHeader name={name} data={data} loading={loading || migration === 'running'} />

                    <div className="space-y-4" aria-live="polite">
                        {!online && <StatePanel kind="offline" compact description={t('careeros.today.offline', 'Showing what was loaded last. Starting, snoozing or dismissing an action needs a connection.')} />}
                        {today.error !== null && (
                            <StatePanel kind="error" title={t('careeros.today.loadError', 'Today could not be loaded')} description={t('careeros.today.loadErrorDescription', 'Your records are unchanged. Try again, or open any space from the menu.')} onRetry={() => void today.refresh()} />
                        )}
                        {data && data.failed.length > 0 && today.error === null && (
                            <StatePanel kind="partial" compact title={t('careeros.today.partial', 'Some sections could not be loaded')} description={t('careeros.today.partialDescription', 'Loaded what was reachable; the affected sections say so below.')} onRetry={() => void today.refresh()} />
                        )}
                        {claimResult && (claimResult.claimedResumes > 0 || claimResult.claimedJobs > 0) && (
                            <StatePanel
                                kind="partial"
                                compact
                                title={t('careeros.claim.done', 'Claimed into your account')}
                                description={t('careeros.claim.doneDescription', '{resumes} CVs and {jobs} opportunities were added.').replace('{resumes}', String(claimResult.claimedResumes)).replace('{jobs}', String(claimResult.claimedJobs))}
                                action={{ label: t('btn.close', 'Close'), onClick: () => setClaimResult(null) }}
                            />
                        )}
                        {showIntro && profile && data && (
                            <IntroductionCard
                                userId={userId}
                                profile={profile}
                                resumeCount={data.resumes.length}
                                applicationCount={data.applications.length}
                                onDismissed={async () => { setIntroDismissed(true); await refreshProfile(); }}
                            />
                        )}
                        {pausedOnboarding && profile && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-default bg-surface-panel p-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-content-primary">{t('careeros.today.resumeSetup', 'Setup paused')}</p>
                                    <p className="text-[13px] text-content-secondary">{t('careeros.today.resumeSetupDescription', 'Pick up where you stopped whenever you like. Everything here works without it.')}</p>
                                </div>
                                <Button variant="secondary" size="sm" icon={<PlayCircle size={14} />} onClick={() => setForceOnboarding(true)} disabled={!online}>{t('careeros.today.resumeSetupAction', 'Continue setup')}</Button>
                            </div>
                        )}
                    </div>

                    {/* grid-cols-1 is minmax(0,1fr): on phones the stacked column must never grow to a truncated line's full width. */}
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <div className="min-w-0 space-y-6">
                            <ActionQueue
                                userId={userId}
                                actions={data?.actions ?? []}
                                loading={loading || migration === 'running'}
                                failed={failed('actions')}
                                online={online}
                                onChanged={() => { invalidate('today'); }}
                                onRetry={() => void today.refresh()}
                            />
                            <ActiveCampaigns campaigns={data?.campaigns ?? []} loading={loading} failed={failed('campaigns')} onRetry={() => void today.refresh()} />
                        </div>
                        <div className="min-w-0 space-y-6">
                            <CareerPulse data={data} loading={loading} />
                            <WorkspaceShortcuts userId={userId} />
                            <InsightsPanel
                                userId={userId}
                                insights={data?.insights ?? []}
                                submittedCount={data ? data.applications.filter((a) => a.submittedAt).length : 0}
                                goal={data?.goal ?? null}
                                loading={loading}
                                online={online}
                            />
                            <RecentActivity userId={userId} events={data?.events ?? []} loading={loading} failed={failed('events')} onRetry={() => void today.refresh()} />
                        </div>
                    </div>
                </>
            )}

            {claimDialog}
        </div>
    );
};

export default TodaySpace;
