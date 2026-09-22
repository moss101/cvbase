import type { ApplicationStage } from '../../../services/careerOs/types';
import type { Translate } from '../../../services/translationService';

/**
 * Board columns in order. Labels reuse the legacy tracker copy where a
 * column maps onto an old status (Target Roles / Applied / Interviewing /
 * Archived) and Career OS copy for the stages the tracker never had.
 */
export const STAGE_ORDER: ApplicationStage[] = ['saved', 'preparing', 'submitted', 'response', 'interview', 'final', 'closed'];

export const stageLabels = (t: Translate): Record<ApplicationStage, string> => ({
    saved: t('smartStudio.tracker.col.wishlist', 'Target Roles'),
    preparing: t('careeros.application.stage.preparing', 'Preparing'),
    submitted: t('smartStudio.tracker.col.applied', 'Applied'),
    response: t('careeros.application.stage.response', 'Response received'),
    interview: t('smartStudio.tracker.col.interview', 'Interviewing'),
    final: t('careeros.application.stage.final', 'Final stage'),
    closed: t('smartStudio.tracker.col.rejected', 'Archived / Rejected'),
});

export const earlierStage = (stage: ApplicationStage): ApplicationStage | null => {
    const index = STAGE_ORDER.indexOf(stage);
    return index > 0 ? STAGE_ORDER[index - 1] : null;
};

export const laterStage = (stage: ApplicationStage): ApplicationStage | null => {
    const index = STAGE_ORDER.indexOf(stage);
    return index >= 0 && index < STAGE_ORDER.length - 1 ? STAGE_ORDER[index + 1] : null;
};
