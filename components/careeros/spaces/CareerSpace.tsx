import React from 'react';
import { useTranslation } from '../../../services/translationService';
import { CAREER_SUBVIEWS, type CareerRoute, type CareerSubview } from '../../NavigationProvider';
import { SpaceHeader, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { AchievementsView } from '../career/AchievementsView';
import { CareerNav } from '../career/CareerNav';
import { EvidenceView } from '../career/EvidenceView';
import { FactsView } from '../career/FactsView';
import { GoalsView } from '../career/GoalsView';
import { OverviewView } from '../career/OverviewView';
import { ProfileView } from '../career/ProfileView';
import { countByConfirmation } from '../career/factFormat';
import { useCareerFacts } from '../career/useCareerFacts';

/**
 * The Career space (COS-009/010/019/023): Overview, Experience, Achievements,
 * Skills, Education, Evidence, Goals and Profile over the canonical facts.
 * It presents progression and evidence, not a CV layout; the CV editor stays
 * in the Library. Route `sub` picks the view and `id` opens a goal.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const isSubview = (value: string | undefined): value is CareerSubview => (CAREER_SUBVIEWS as readonly string[]).includes(value ?? '');

const CareerSpace: React.FC<SpaceProps> = ({ route }) => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const facts = useCareerFacts();
    const sub: CareerSubview = isSubview(route.sub) ? route.sub : 'overview';
    const counts = countByConfirmation(facts.active);

    const descriptions: Record<CareerSubview, string> = {
        overview: t('careeros.career.description.overview', 'Your professional record: what is confirmed, where you are heading and what to capture next.'),
        experience: t('careeros.career.description.experience', 'Roles as facts with provenance, newest first.'),
        achievements: t('careeros.career.description.achievements', 'Results you can point to, linked to the roles and evidence behind them.'),
        skills: t('careeros.career.description.skills', 'Skills as confirmed claims, with an optional level.'),
        education: t('careeros.career.description.education', 'Degrees and qualifications with their evidence state.'),
        evidence: t('careeros.career.description.evidence', 'Where claims enter and leave: review imports, resolve contradictions, see what drafts depend on.'),
        goals: t('careeros.career.description.goals', 'Structured goals with priorities and constraints. One may be primary; none is also fine.'),
        profile: t('careeros.career.description.profile', 'Your account profile — the same form as before.'),
    };

    if (!userId) {
        return <StatePanel kind="denied" title={t('careeros.shell.signInTitle', 'Sign in to open your Career OS')} />;
    }

    let body: React.ReactNode;
    switch (sub) {
        case 'experience': body = <FactsView kind="experience" />; break;
        case 'education': body = <FactsView kind="education" />; break;
        case 'skills': body = <FactsView kind="skill" />; break;
        case 'achievements': body = <AchievementsView />; break;
        case 'evidence': body = <EvidenceView />; break;
        case 'goals': body = <GoalsView goalId={route.id} />; break;
        case 'profile': body = <ProfileView />; break;
        case 'overview':
        default: body = <OverviewView />; break;
    }

    return (
        <div className="mx-auto w-full max-w-5xl">
            <SpaceHeader
                eyebrow={t('careeros.shell.eyebrow', 'Career OS')}
                title={t('careeros.space.career', 'Career')}
                description={descriptions[sub]}
            >
                <CareerNav current={sub} reviewCount={counts.candidates + counts.conflicts} />
            </SpaceHeader>
            {body}
        </div>
    );
};

export default CareerSpace;
