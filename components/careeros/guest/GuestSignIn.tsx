import React from 'react';
import { useTranslation } from '../../../services/translationService';
import type { CareerSpace } from '../../NavigationProvider';
import { SpaceHeader, StatePanel } from '../primitives';

/**
 * What a signed-out visitor sees on an account-only space: what the space is
 * for, and a sign-in that brings them straight back here. Their on-device CV
 * draft is untouched and can be claimed after sign-in.
 */
const COPY: Partial<Record<CareerSpace, [string, string]>> = {
    career: ['careeros.guest.career', 'Keep your experience, achievements and goals as confirmed facts that every CV and application can reuse.'],
    opportunities: ['careeros.guest.opportunities', 'Save roles you are considering and see how well you fit each one, with the evidence behind it.'],
    campaigns: ['careeros.guest.campaigns', 'Run your search toward a goal: applications on a board, milestones and an honest funnel.'],
    applications: ['careeros.guest.applications', 'Prepare each application in one place: tailored CV, cover letter, questions and interview prep.'],
    coach: ['careeros.guest.coach', 'A coach that knows your goals and applications, and only acts when you confirm.'],
    search: ['careeros.guest.search', 'Search across everything in your account.'],
    notifications: ['careeros.guest.notifications', 'Reminders and updates about your applications, when you ask for them.'],
    billing: ['careeros.guest.billing', 'Plans and billing belong to an account.'],
};

export const GuestSignIn: React.FC<{ space: CareerSpace; spaceLabel: string; onOpenAuth: () => void }> = ({ space, spaceLabel, onOpenAuth }) => {
    const { t } = useTranslation();
    const copy = COPY[space];
    return (
        <div className="mx-auto w-full max-w-[1240px] [&>*]:max-w-3xl">
            <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={spaceLabel} />
            <StatePanel
                kind="denied"
                title={t('careeros.guest.signInTitle', 'Sign in to use {space}').replace('{space}', spaceLabel)}
                description={`${copy ? t(copy[0], copy[1]) : ''} ${t('careeros.guest.draftSafe', 'A CV you started on this device stays here until you choose to keep it in your account.')}`.trim()}
                action={{ label: t('dash.signInSync', 'Sign In / Sync'), onClick: onOpenAuth }}
            />
        </div>
    );
};

export default GuestSignIn;
