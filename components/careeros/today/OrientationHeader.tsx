import React from 'react';
import { useTranslation } from '../../../services/translationService';
import type { TodayData } from './useTodayData';
import { Skeleton } from '../primitives';

/**
 * Greeting, date and one sentence derived from real state — counts of
 * applications by stage and the primary goal's title. When there is nothing,
 * it says so; it never invents a goal or momentum to fill the line.
 */
export interface OrientationHeaderProps {
    name: string | null;
    data: TodayData | null;
    loading: boolean;
    now?: Date;
}

export const orientationLine = (t: (key: string, fallback: string) => string, data: TodayData): string => {
    const parts: string[] = [];
    const active = data.applications.filter((a) => a.stage !== 'closed');
    const preparing = active.filter((a) => a.stage === 'preparing').length;
    const submitted = active.filter((a) => a.stage === 'submitted' || a.stage === 'response').length;
    const interviewing = active.filter((a) => a.stage === 'interview' || a.stage === 'final').length;
    if (preparing > 0) parts.push(t('careeros.today.orientation.preparing', '{count} preparing').replace('{count}', String(preparing)));
    if (submitted > 0) parts.push(t('careeros.today.orientation.submitted', '{count} awaiting a response').replace('{count}', String(submitted)));
    if (interviewing > 0) parts.push(t('careeros.today.orientation.interviewing', '{count} at interview stage').replace('{count}', String(interviewing)));
    const candidates = data.facts.filter((f) => f.reviewState === 'candidate' || f.reviewState === 'conflict').length;
    if (candidates > 0) parts.push(t('careeros.today.orientation.review', '{count} facts to review').replace('{count}', String(candidates)));
    const goal = data.goal
        ? t('careeros.today.orientation.goal', 'primary goal: {goal}').replace('{goal}', data.goal.title || data.goal.role)
        : t('careeros.today.orientation.noGoal', 'no goal set');
    if (parts.length === 0) {
        return active.length === 0 && data.opportunities.length === 0
            ? t('careeros.today.orientation.quiet', 'No applications in progress; {goal}.').replace('{goal}', goal)
            : `${t('careeros.today.orientation.opportunities', '{count} opportunities saved').replace('{count}', String(data.opportunities.length))}; ${goal}.`;
    }
    return `${parts.join(', ')}; ${goal}.`;
};

export const OrientationHeader: React.FC<OrientationHeaderProps> = ({ name, data, loading, now = new Date() }) => {
    const { t, language } = useTranslation();
    const hour = now.getHours();
    const greeting = hour < 12
        ? t('careeros.today.greeting.morning', 'Good morning')
        : hour < 18
            ? t('careeros.today.greeting.afternoon', 'Good afternoon')
            : t('careeros.today.greeting.evening', 'Good evening');
    let date: string;
    try {
        // The chosen interface language decides the date wording, not the OS locale.
        date = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    } catch {
        date = now.toDateString();
    }
    return (
        <header className="mb-6">
            <h1 className="cos-greeting text-[32px] text-content-primary md:text-[36px]">{name ? `${greeting}, ${name}` : greeting}</h1>
            {loading && !data
                ? <div className="mt-3 max-w-md"><Skeleton variant="text" /></div>
                : <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-content-secondary">{data ? `${date} · ${orientationLine(t, data)}` : date}</p>}
        </header>
    );
};

export default OrientationHeader;
