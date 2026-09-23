import type { CareerFact, ConfirmationState, FactKind, FactSourceKind, GoalPriority } from '../../../services/careerOs/types';
import { factLabel } from '../../../services/careerOs/careerFacts';
import type { ActionDestination } from '../../../services/careerOs/types';
import { careerPath, type CareerRoute, type CareerSubview } from '../../NavigationProvider';
import type { ApplicationSection } from '../../../services/careerOs/types';

/**
 * Pure presentation helpers shared by the Career, Today and onboarding
 * screens: how a fact kind, period, source or confirmation state reads, and
 * how an action destination becomes a route. Translated labels are produced
 * through the hooks below so every string still goes through `t()`.
 */

export type Translate = (key: string, fallback: string) => string;

export const FACT_KIND_LABEL: Record<FactKind, [string, string]> = {
    experience: ['careeros.career.kind.experience', 'Experience'],
    education: ['careeros.career.kind.education', 'Education'],
    skill: ['careeros.career.kind.skill', 'Skill'],
    achievement: ['careeros.career.kind.achievement', 'Achievement'],
    project: ['careeros.career.kind.project', 'Project'],
    certification: ['careeros.career.kind.certification', 'Certification'],
    language: ['careeros.career.kind.language', 'Language'],
    award: ['careeros.career.kind.award', 'Award'],
    training: ['careeros.career.kind.training', 'Training'],
    publication: ['careeros.career.kind.publication', 'Publication'],
    volunteer: ['careeros.career.kind.volunteer', 'Volunteering'],
    summary: ['careeros.career.kind.summary', 'Summary'],
    profile_field: ['careeros.career.kind.profileField', 'Profile field'],
    custom: ['careeros.career.kind.custom', 'Custom'],
};

export const kindLabel = (t: Translate, kind: FactKind): string => t(FACT_KIND_LABEL[kind][0], FACT_KIND_LABEL[kind][1]);

const SOURCE_LABEL: Record<FactSourceKind, [string, string]> = {
    manual: ['careeros.career.source.manual', 'Added by you'],
    resume_import: ['careeros.career.source.resumeImport', 'Imported from a CV'],
    legacy_import: ['careeros.career.source.legacyImport', 'Linked from your existing CV'],
    prism_answer: ['careeros.career.source.prismAnswer', 'From a PRISM answer'],
    coach: ['careeros.career.source.coach', 'Suggested by Coach'],
    profile: ['careeros.career.source.profile', 'From your profile'],
};

export const sourceLabel = (t: Translate, kind: FactSourceKind): string => t(SOURCE_LABEL[kind][0], SOURCE_LABEL[kind][1]);

/** "2019-01 – 2023-06", "2019 – present" or '' when nothing is recorded. */
export const periodLabel = (t: Translate, fact: Pick<CareerFact, 'startDate' | 'endDate'>): string => {
    const start = fact.startDate.trim();
    const end = fact.endDate.trim();
    if (!start && !end) return '';
    if (start && !end) return `${start} – ${t('careeros.career.present', 'present')}`;
    if (!start) return end;
    return `${start} – ${end}`;
};

export const confirmationLabel = (t: Translate, state: ConfirmationState): string => {
    switch (state) {
        case 'verified': return t('careeros.evidence.verified', 'Verified');
        case 'user_confirmed': return t('careeros.evidence.userConfirmed', 'Confirmed by you');
        case 'inferred': return t('careeros.evidence.inferred', 'Inferred');
        default: return t('careeros.evidence.incomplete', 'Incomplete');
    }
};

export const PRIORITY_KEYS: GoalPriority['key'][] = ['compensation', 'growth', 'stability', 'flexibility', 'mission', 'learning', 'location', 'title'];

export const priorityLabel = (t: Translate, key: GoalPriority['key']): string => {
    switch (key) {
        case 'compensation': return t('careeros.goal.priority.compensation', 'Compensation');
        case 'growth': return t('careeros.goal.priority.growth', 'Growth');
        case 'stability': return t('careeros.goal.priority.stability', 'Stability');
        case 'flexibility': return t('careeros.goal.priority.flexibility', 'Flexibility');
        case 'mission': return t('careeros.goal.priority.mission', 'Mission');
        case 'learning': return t('careeros.goal.priority.learning', 'Learning');
        case 'location': return t('careeros.goal.priority.location', 'Location');
        default: return t('careeros.goal.priority.title', 'Title');
    }
};

/** Display title for any fact: the citation label without the kind prefix noise. */
export const factTitle = (fact: Pick<CareerFact, 'kind' | 'title' | 'organization' | 'startDate' | 'endDate' | 'payload'>): string => {
    if (fact.kind === 'skill' || fact.kind === 'language') return fact.title;
    if (fact.kind === 'profile_field') return factLabel(fact);
    return fact.title || factLabel(fact);
};

/** Loose sort key for "newest first": end date (present = newest), then start date. */
export const recencyKey = (fact: Pick<CareerFact, 'startDate' | 'endDate'>): string => {
    const end = fact.endDate.trim();
    const start = fact.startDate.trim();
    if (start && !end) return `9999-${start}`;
    return `${end || '0000'}-${start || '0000'}`;
};

export const byRecency = (a: Pick<CareerFact, 'startDate' | 'endDate'>, b: Pick<CareerFact, 'startDate' | 'endDate'>): number =>
    recencyKey(b).localeCompare(recencyKey(a));

/** Counts of active facts by confirmation state, for the overview and the pulse. */
export interface ConfirmationCounts {
    verified: number;
    user_confirmed: number;
    inferred: number;
    incomplete: number;
    candidates: number;
    conflicts: number;
    total: number;
}

export const countByConfirmation = (facts: CareerFact[]): ConfirmationCounts => {
    const counts: ConfirmationCounts = { verified: 0, user_confirmed: 0, inferred: 0, incomplete: 0, candidates: 0, conflicts: 0, total: 0 };
    for (const fact of facts) {
        if (fact.status !== 'active') continue;
        counts.total += 1;
        counts[fact.confirmationState] += 1;
        if (fact.reviewState === 'candidate') counts.candidates += 1;
        if (fact.reviewState === 'conflict') counts.conflicts += 1;
    }
    return counts;
};

const CAREER_SUBS: readonly string[] = ['overview', 'experience', 'achievements', 'skills', 'education', 'evidence', 'goals', 'profile'];

/** The route an action's destination resolves to (ids only, no text). */
export const destinationToRoute = (destination: ActionDestination): CareerRoute => {
    switch (destination.space) {
        case 'career': {
            const sub = destination.section && CAREER_SUBS.includes(destination.section) ? (destination.section as CareerSubview) : 'overview';
            return careerPath.toCareer(sub);
        }
        case 'applications':
            return destination.id
                ? careerPath.toApplication(destination.id, (destination.section as ApplicationSection | undefined) ?? 'analysis')
                : careerPath.toSpace('applications');
        case 'opportunities':
            return destination.id ? careerPath.toOpportunity(destination.id) : careerPath.toSpace('opportunities');
        case 'campaigns':
            return destination.id ? careerPath.toCampaign(destination.id) : careerPath.toSpace('campaigns');
        case 'coach':
            return careerPath.toCoach(destination.id);
        case 'library':
            return destination.id ? careerPath.toCvEdit(destination.id) : careerPath.toLibrary('cv');
        case 'today':
        default:
            return careerPath.toSpace('today');
    }
};

/** Where an evidence reference chip should open. */
export const evidenceRefRoute = (kind: string, id: string): CareerRoute | null => {
    switch (kind) {
        case 'fact': return careerPath.toCareer('evidence');
        case 'goal': return careerPath.toGoal(id);
        case 'opportunity': return careerPath.toOpportunity(id);
        case 'application': return careerPath.toApplication(id, 'analysis');
        case 'interview': return null;
        case 'analysis': return null;
        case 'resume': return careerPath.toCvEdit(id);
        default: return null;
    }
};

export const formatDate = (iso: string | null | undefined, locale?: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    try {
        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    } catch {
        return date.toDateString();
    }
};
