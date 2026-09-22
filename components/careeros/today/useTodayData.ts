import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as interviewRepo from '../../../services/careerOs/interviewRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as prismRepo from '../../../services/repos/prismRepo';
import { buildEvent, emit, listActivity } from '../../../services/careerOs/careerEvents';
import { computeCandidateActions, rankActions, reconcileDurableCompletions, type ActionCandidate, type PrismRunRef } from '../../../services/careerOs/careerActions';
import { computeFunnel } from '../../../services/careerOs/campaignFunnel';
import { computeInsights, type InsightDraft } from '../../../services/careerOs/frontier/outcomeInsights';
import type {
    ApplicationRecord, Campaign, CampaignFunnel, CareerAction, CareerFact, CareerGoal, InterviewSession, Opportunity,
    OpportunityAnalysis, OutcomeObservation, ProductEvent,
} from '../../../services/careerOs/types';
import type { StoredResume } from '../../../services/repos/mappers';
import { captureException } from '../../../lib/monitoring';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery, type OwnedQuery } from '../data/useOwnedQuery';

/**
 * Everything Today reads, loaded once per profile revision and cached under
 * the `today` key. Sources are loaded independently so one failing table
 * degrades to a partial state instead of an empty page. Candidate actions
 * are computed by the shared rules, reconciled into the persisted queue by
 * dedupe key, and the eligible rows come back ranked — no AI call anywhere.
 */
export const TODAY_KEY = 'today';

export interface CampaignSummary {
    campaign: Campaign;
    funnel: CampaignFunnel;
    goalLabel: string | null;
}

export interface RankedAction {
    action: CareerAction;
    /** The rule candidate that produced this row, when the rules still produce it. */
    candidate: ActionCandidate | null;
}

export interface TodayData {
    goal: CareerGoal | null;
    facts: CareerFact[];
    opportunities: Opportunity[];
    applications: ApplicationRecord[];
    interviews: InterviewSession[];
    analyses: OpportunityAnalysis[];
    outcomes: OutcomeObservation[];
    campaigns: CampaignSummary[];
    events: ProductEvent[];
    resumes: StoredResume[];
    prismRuns: PrismRunRef[];
    /** Eligible persisted actions, ranked by the shared comparator. */
    actions: RankedAction[];
    insights: InsightDraft[];
    /** Sources that could not be loaded (their part of the page shows a partial state). */
    failed: string[];
    /** True when the account holds no facts, applications or resumes (onboarding gate input). */
    isEmptyAccount: boolean;
    loadedAt: string;
}

type Loader<T> = () => Promise<T>;

async function settle<T>(name: string, loader: Loader<T>, fallback: T, failed: string[]): Promise<T> {
    try {
        return await loader();
    } catch (err) {
        captureException(err, { context: `today-load-${name}` });
        failed.push(name);
        return fallback;
    }
}

export async function loadTodayData(userId: string, now: Date = new Date()): Promise<TodayData> {
    const failed: string[] = [];
    const [goal, facts, opportunities, applications, interviews, analyses, outcomes, campaigns, events, resumes] = await Promise.all([
        settle('goal', () => goalRepo.getPrimary(userId), null as CareerGoal | null, failed),
        settle('facts', () => factRepo.list(userId), [] as CareerFact[], failed),
        settle('opportunities', () => opportunityRepo.list(userId, 'all'), [] as Opportunity[], failed),
        settle('applications', () => applicationRepo.list(userId), [] as ApplicationRecord[], failed),
        settle('interviews', () => interviewRepo.list(userId), [] as InterviewSession[], failed),
        settle('analyses', () => analysisRepo.listLatest(userId), [] as OpportunityAnalysis[], failed),
        settle('outcomes', () => outcomeRepo.list(userId), [] as OutcomeObservation[], failed),
        settle('campaigns', () => campaignRepo.list(userId, 'active'), [] as Campaign[], failed),
        settle('events', () => listActivity(userId, 20), [] as ProductEvent[], failed),
        settle('resumes', () => resumeRepo.list(userId), [] as StoredResume[], failed),
    ]);

    // PRISM runs bound to active applications (no list-all function exists; one
    // scoped read per application that recorded a run, bounded).
    const withRuns = applications.filter((a) => a.stage !== 'closed' && a.prismRunId).slice(0, 20);
    const prismRuns = (await Promise.all(withRuns.map(async (app) => {
        try {
            const run = await prismRepo.getResumableForApplication(userId, app.id);
            return run ? [{ id: run.id, status: run.status, applicationId: run.applicationId ?? app.id, updatedAt: run.updatedAt } satisfies PrismRunRef] : [];
        } catch (err) {
            captureException(err, { context: 'today-load-prism' });
            if (!failed.includes('prismRuns')) failed.push('prismRuns');
            return [];
        }
    }))).flat();

    // Campaign funnels from the campaign's own opportunities/applications/outcomes.
    const campaignSummaries = await Promise.all(campaigns.map(async (campaign): Promise<CampaignSummary> => {
        const apps = applications.filter((a) => a.campaignId === campaign.id);
        const appIds = new Set(apps.map((a) => a.id));
        let memberIds: string[] = [];
        try { memberIds = await campaignRepo.listOpportunityIds(userId, campaign.id); } catch (err) { captureException(err, { context: 'today-load-campaign-members' }); }
        const members = new Set(memberIds);
        const opps = opportunities.filter((o) => members.has(o.id) || apps.some((a) => a.opportunityId === o.id));
        const goalLabel = campaign.goalId ? (goal && goal.id === campaign.goalId ? goal.title || goal.role : null) : null;
        return { campaign, funnel: computeFunnel(apps, opps, outcomes.filter((o) => appIds.has(o.applicationId))), goalLabel };
    }));

    // Rules → persisted queue → eligible rows, ranked.
    let actions: RankedAction[] = [];
    const candidates = failed.includes('facts') || failed.includes('applications')
        ? [] // Partial inputs would expire live actions; leave the queue alone.
        : computeCandidateActions({ now, goal, facts, opportunities, applications, interviews, analyses, prismRuns, artifacts: [], outcomes });
    try {
        if (candidates.length > 0) await actionRepo.upsertByDedupeKey(userId, candidates);
        // Actions the person began complete only once their durable result
        // exists (a goal row, reviewed facts, a linked CV …) — never on open.
        const inFlight = await actionRepo.list(userId, ['IN_PROGRESS', 'WAITING_FOR_USER']);
        for (const done of reconcileDurableCompletions(inFlight, { goal, facts, applications, interviews, outcomes, opportunities, analyses })) {
            try {
                await actionRepo.complete(userId, done.action.id, done.action.revision, { resultRef: done.resultRef, completionSource: 'durable_receipt' });
                void emit(userId, buildEvent('career_action_completed', {
                    subjectRefs: { action: done.action.id },
                    payload: { actionType: done.action.actionType, completionSource: 'durable_receipt' },
                    dedupeKey: `career_action_completed:${done.action.id}`,
                }));
            } catch (err) {
                captureException(err, { context: 'today-complete-action' });
            }
        }
        const eligible = await actionRepo.listEligible(userId, now);
        const byKey = new Map(candidates.map((c) => [c.dedupeKey, c]));
        const ranked = rankActions(candidates).map((c) => c.dedupeKey);
        const order = new Map(ranked.map((key, index) => [key, index]));
        actions = eligible
            .map((action) => ({ action, candidate: byKey.get(action.dedupeKey) ?? null }))
            .sort((a, b) => {
                const ia = order.get(a.action.dedupeKey) ?? Number.POSITIVE_INFINITY;
                const ib = order.get(b.action.dedupeKey) ?? Number.POSITIVE_INFINITY;
                if (ia !== ib) return ia - ib;
                return a.action.createdAt < b.action.createdAt ? 1 : a.action.createdAt > b.action.createdAt ? -1 : 0;
            });
    } catch (err) {
        captureException(err, { context: 'today-load-actions' });
        failed.push('actions');
    }

    const insights = computeInsights({ now, applications, outcomes, analyses, opportunities });

    return {
        goal, facts, opportunities, applications, interviews, analyses, outcomes, campaigns: campaignSummaries, events, resumes, prismRuns, actions, insights, failed,
        isEmptyAccount: facts.length === 0 && applications.length === 0 && resumes.length === 0 && !failed.includes('facts') && !failed.includes('applications') && !failed.includes('resumes'),
        loadedAt: now.toISOString(),
    };
}

export const useTodayData = (): OwnedQuery<TodayData> => {
    const { userId, profile, migration } = useCareerOs();
    // Wait for the backfill so legacy rows are linked before the rules run.
    const ready = Boolean(userId && profile && (migration === 'done' || migration === 'failed'));
    const key = ready ? `${TODAY_KEY}:${profile?.revision ?? 0}` : null;
    return useOwnedQuery<TodayData>(userId, key, () => loadTodayData(userId as string));
};
