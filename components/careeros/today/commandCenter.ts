import type { ApplicationRecord, InterviewSession, Opportunity } from '../../../services/careerOs/types';
import type { StoredResume } from '../../../services/repos/mappers';
import type { TodayData } from './useTodayData';

/**
 * Pure derivations behind Today's command center: the Goal → Offers progress
 * stages with their blockers, what is actively in progress, and the next
 * dated item. Everything is computed from the person's own records; a stage
 * with nothing in it says so rather than showing an invented number.
 */

export const ACTIVE_STAGES = new Set<ApplicationRecord['stage']>(['preparing', 'submitted', 'response', 'interview', 'final']);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface ProgressCounts {
    goalSet: boolean;
    factsConfirmed: number;
    factsTotal: number;
    factsToReview: number;
    opportunities: number;
    opportunitiesNewThisWeek: number;
    applicationsActive: number;
    applicationsPreparing: number;
    applicationsSubmitted: number;
    applicationsNeedingCv: number;
    interviewsUpcoming: number;
    interviewsUnprepared: number;
    offers: number;
    accepted: number;
}

export function progressCounts(data: TodayData, now: Date = new Date()): ProgressCounts {
    const facts = data.facts.filter((f) => f.status === 'active');
    const confirmed = facts.filter((f) => f.confirmationState === 'verified' || f.confirmationState === 'user_confirmed').length;
    const toReview = facts.filter((f) => f.reviewState === 'candidate' || f.reviewState === 'conflict').length;
    const opps = data.opportunities.filter((o) => o.status === 'saved' || o.status === 'watching');
    const active = data.applications.filter((a) => ACTIVE_STAGES.has(a.stage));
    const upcoming = upcomingInterviews(data, now);
    const offerApps = data.applications.filter((a) => a.stage === 'final' || (a.stage === 'closed' && a.closedReason === 'accepted'));
    return {
        goalSet: Boolean(data.goal),
        factsConfirmed: confirmed,
        factsTotal: facts.length,
        factsToReview: toReview,
        opportunities: opps.length,
        opportunitiesNewThisWeek: opps.filter((o) => now.getTime() - Date.parse(o.createdAt) < WEEK_MS).length,
        applicationsActive: active.length,
        applicationsPreparing: active.filter((a) => a.stage === 'preparing').length,
        applicationsSubmitted: active.filter((a) => a.stage === 'submitted' || a.stage === 'response').length,
        applicationsNeedingCv: active.filter((a) => a.stage === 'preparing' && !a.currentResumeId).length,
        interviewsUpcoming: upcoming.length,
        interviewsUnprepared: upcoming.filter(({ session }) => session.themes.length > 0 && session.themes.every((th) => !th.covered)).length,
        offers: offerApps.length,
        accepted: data.applications.filter((a) => a.stage === 'closed' && a.closedReason === 'accepted').length,
    };
}

export interface UpcomingInterview {
    session: InterviewSession;
    application: ApplicationRecord | null;
}

/** Planned or prepared interviews still ahead, soonest first; undated ones last. */
export function upcomingInterviews(data: TodayData, now: Date = new Date()): UpcomingInterview[] {
    return data.interviews
        .filter((s) => (s.status === 'planned' || s.status === 'prepared') && (!s.scheduledAt || Date.parse(s.scheduledAt) >= now.getTime() - 2 * 60 * 60 * 1000))
        .sort((a, b) => (a.scheduledAt ?? '9999') < (b.scheduledAt ?? '9999') ? -1 : 1)
        .map((session) => ({ session, application: data.applications.find((a) => a.id === session.applicationId) ?? null }));
}

/** Applications in motion, most recently touched first. */
export function activeApplications(data: TodayData): ApplicationRecord[] {
    return data.applications
        .filter((a) => ACTIVE_STAGES.has(a.stage))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** The primary CV, else the most recently edited one. */
export function currentCv(resumes: StoredResume[]): StoredResume | null {
    return resumes.find((r) => r.isPrimary) ?? [...resumes].sort((a, b) => ((a.updatedAt ?? '') < (b.updatedAt ?? '') ? 1 : -1))[0] ?? null;
}

/**
 * The saved opportunity most worth attention next: saved (not just watched),
 * no active application for it yet, the best confirmed-evidence fit first,
 * then the most recently saved.
 */
export function priorityOpportunity(data: TodayData): Opportunity | null {
    const applied = new Set(data.applications.filter((a) => a.opportunityId && a.stage !== 'saved').map((a) => a.opportunityId as string));
    const candidates = data.opportunities.filter((o) => o.status === 'saved' && !applied.has(o.id));
    const supportedShare = (o: Opportunity): number => {
        const q = data.analyses.find((a) => a.opportunityId === o.id && !a.stale)?.qualification;
        if (!q) return -1;
        const total = q.supported.length + q.partial.length + q.missing.length + q.unknown.length;
        return total ? q.supported.length / total : -1;
    };
    return candidates.sort((a, b) => supportedShare(b) - supportedShare(a) || (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
}

export interface Deadline {
    kind: 'interview' | 'follow_up' | 'milestone';
    at: string;
    timeZone: string | null;
    label: string;
    applicationId?: string;
    campaignId?: string;
}

/** The next dated commitment the person recorded: an interview, a follow-up or a campaign milestone. */
export function nextDeadline(data: TodayData, now: Date = new Date()): Deadline | null {
    const items: Deadline[] = [];
    for (const { session, application } of upcomingInterviews(data, now)) {
        if (session.scheduledAt) items.push({ kind: 'interview', at: session.scheduledAt, timeZone: session.timeZone, label: application ? `${application.jobTitle} · ${application.company}` : '', applicationId: session.applicationId });
    }
    for (const a of data.applications) {
        if (a.followUpAt && ACTIVE_STAGES.has(a.stage) && Date.parse(a.followUpAt) >= now.getTime() - 24 * 60 * 60 * 1000) {
            items.push({ kind: 'follow_up', at: a.followUpAt, timeZone: null, label: `${a.jobTitle} · ${a.company}`, applicationId: a.id });
        }
    }
    for (const { campaign } of data.campaigns) {
        for (const m of campaign.milestones) {
            if (m.state !== 'done' && m.dueDate && Date.parse(m.dueDate) >= now.getTime() - 24 * 60 * 60 * 1000) {
                items.push({ kind: 'milestone', at: m.dueDate, timeZone: null, label: `${m.title} · ${campaign.name}`, campaignId: campaign.id });
            }
        }
    }
    return items.sort((a, b) => (a.at < b.at ? -1 : 1))[0] ?? null;
}
