import type { ActionType } from '../../../services/careerOs/types';

type T = (key: string, fallback: string) => string;

/**
 * What finishing an action leaves the person with — the "expected outcome"
 * line on Today's next step. It describes the result of doing the work, never
 * a promise about an employer's decision.
 */
export function expectedOutcome(t: T, type: ActionType): string {
    switch (type) {
        case 'PREPARE_INTERVIEW': return t('careeros.outcome.prepareInterview', 'You walk in with a prepared story for each theme the role asks about.');
        case 'TAILOR_CV': return t('careeros.outcome.tailorCv', 'A CV version tailored to this role, linked to the application.');
        case 'REVIEW_TAILORING': return t('careeros.outcome.reviewTailoring', 'A reviewed CV for this application, ready to send.');
        case 'REVIEW_OPPORTUNITY': return t('careeros.outcome.reviewOpportunity', 'A clear read on how well you fit before you spend time applying.');
        case 'START_APPLICATION': return t('careeros.outcome.startApplication', 'An application workspace that tracks what is ready and what is missing.');
        case 'FOLLOW_UP_APPLICATION': return t('careeros.outcome.followUp', 'A follow-up sent on time and recorded against the application.');
        case 'RECORD_OUTCOME': return t('careeros.outcome.recordOutcome', 'An up-to-date pipeline, so the next steps rank correctly.');
        case 'SET_GOAL': return t('careeros.outcome.setGoal', 'Recommendations ranked against where you want to go.');
        case 'REVIEW_IMPORT': return t('careeros.outcome.reviewImport', 'Confirmed facts that every CV and application can reuse.');
        case 'RESOLVE_CONFLICT': return t('careeros.outcome.resolveConflict', 'One consistent version of your history.');
        case 'REVIEW_PROFILE': return t('careeros.outcome.reviewProfile', 'A profile complete enough for accurate fit checks.');
        case 'CAPTURE_ACHIEVEMENT': return t('careeros.outcome.captureAchievement', 'Evidence you can cite in your next CV, application or review.');
        case 'IMPROVE_ACHIEVEMENT': return t('careeros.outcome.improveAchievement', 'An achievement with a measurable result.');
        case 'UPDATE_SKILL': return t('careeros.outcome.updateSkill', 'Skills that match the roles you are aiming for.');
        case 'START_CAMPAIGN': return t('careeros.outcome.startCampaign', 'Your search organised toward one goal.');
        case 'COMPARE_ROLES': return t('careeros.outcome.compareRoles', 'The options you are weighing, side by side.');
        default: return '';
    }
}
