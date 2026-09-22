import React from 'react';
import { useTranslation } from '../../../services/translationService';
import { CAREER_SUBVIEWS, careerPath, useNavigation, type CareerSubview } from '../../NavigationProvider';

/**
 * The eight Career subviews as a scrollable tab strip. Real links in a
 * `nav`, with the current page announced, so keyboard and screen-reader
 * users get the same map as everyone else. At 320px the strip scrolls
 * horizontally inside its own box; the page itself never does.
 */
export interface CareerNavProps {
    current: CareerSubview;
    /** Number of facts waiting for review — shown on the Evidence tab. */
    reviewCount?: number;
}

export const CareerNav: React.FC<CareerNavProps> = ({ current, reviewCount = 0 }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const labels: Record<CareerSubview, string> = {
        overview: t('careeros.career.nav.overview', 'Overview'),
        experience: t('careeros.career.nav.experience', 'Experience'),
        achievements: t('careeros.career.nav.achievements', 'Achievements'),
        skills: t('careeros.career.nav.skills', 'Skills'),
        education: t('careeros.career.nav.education', 'Education'),
        evidence: t('careeros.career.nav.evidence', 'Evidence'),
        goals: t('careeros.career.nav.goals', 'Goals'),
        profile: t('careeros.career.nav.profile', 'Profile'),
    };
    return (
        <nav aria-label={t('careeros.career.nav.label', 'Career sections')} className="-mx-1 overflow-x-auto pb-1">
            <ul className="flex min-w-max gap-1 px-1">
                {CAREER_SUBVIEWS.map((sub) => {
                    const active = sub === current;
                    return (
                        <li key={sub}>
                            <button
                                type="button"
                                aria-current={active ? 'page' : undefined}
                                onClick={() => navigate(careerPath.toCareer(sub))}
                                className={`tap-target inline-flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                                    active ? 'bg-action-primary/10 text-action-primary' : 'text-content-secondary hover:bg-surface-canvas hover:text-content-primary'
                                }`}
                            >
                                {labels[sub]}
                                {sub === 'evidence' && reviewCount > 0 && (
                                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-status-warning/15 px-1.5 text-[11px] tabular-nums text-status-warning">
                                        {reviewCount}
                                        <span className="sr-only"> {t('careeros.career.nav.awaitingReview', 'awaiting review')}</span>
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default CareerNav;
