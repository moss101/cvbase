import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as interviewRepo from '../../../services/careerOs/interviewRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as prismRepo from '../../../services/repos/prismRepo';
import { computeReadiness, summarizeReadiness } from '../../../services/careerOs/readiness';
import { track } from '../../../services/careerOs/careerEvents';
import { ConflictError } from '../../../services/careerOs/types';
import type { ApplicationArtifact, ApplicationRecord, Campaign, CareerGoal, InterviewSession, Opportunity, OutcomeObservation, Readiness } from '../../../services/careerOs/types';
import type { StoredResume } from '../../../services/repos/mappers';
import { useOwnedQuery, type OwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';

/**
 * Everything the application workspace shows, loaded once per application
 * and shared by its sections: the application (the authority), its
 * opportunity, owning campaign, the goal as it is now (to compare with the
 * decision-time snapshot), artifacts, interview sessions, outcomes, the
 * linked resume and any resumable PRISM run. Parts that fail load as null
 * and are listed in `failed` so the screen shows a partial state instead of
 * hiding what did load.
 */
export interface WorkspaceData {
    application: ApplicationRecord;
    opportunity: Opportunity | null;
    campaign: Campaign | null;
    /** The goal's current row; null when none is linked or it is unavailable. */
    currentGoal: CareerGoal | null;
    artifacts: ApplicationArtifact[];
    interviews: InterviewSession[];
    outcomes: OutcomeObservation[];
    /** undefined = no resume linked; null = linked but unavailable. */
    resume: StoredResume | null | undefined;
    prismRun: prismRepo.PrismRunSummary | null;
    failed: string[];
}

export async function loadWorkspace(userId: string, applicationId: string): Promise<WorkspaceData> {
    const application = await applicationRepo.get(userId, applicationId);
    const failed: string[] = [];
    const attempt = async <T,>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch { failed.push(name); return fallback; }
    };
    const [opportunity, campaign, currentGoal, artifacts, interviews, outcomes, resume, prismRun] = await Promise.all([
        application.opportunityId ? attempt('opportunity', () => opportunityRepo.get(userId, application.opportunityId as string), null) : Promise.resolve(null),
        application.campaignId ? attempt('campaign', () => campaignRepo.get(userId, application.campaignId as string), null) : Promise.resolve(null),
        application.goalId ? attempt('goal', () => goalRepo.get(userId, application.goalId as string), null) : Promise.resolve(null),
        attempt('artifacts', () => artifactRepo.list(userId, applicationId), [] as ApplicationArtifact[]),
        attempt('interviews', () => interviewRepo.listForApplication(userId, applicationId), [] as InterviewSession[]),
        attempt('outcomes', () => outcomeRepo.list(userId, applicationId), [] as OutcomeObservation[]),
        application.currentResumeId ? attempt('resume', () => resumeRepo.get(userId, application.currentResumeId as string), null) : Promise.resolve(undefined),
        attempt('prismRun', () => prismRepo.getResumableForApplication(userId, applicationId), null),
    ]);
    return { application, opportunity, campaign, currentGoal, artifacts, interviews, outcomes, resume, prismRun, failed };
}

const readinessSignature = (r: Readiness | null): string => (r ? r.items.map((i) => `${i.id}:${i.kind}:${i.state}`).join('|') : '');

export interface Workspace extends OwnedQuery<WorkspaceData> {
    readiness: Readiness | null;
    /** Replace the application row after a confirmed write (keeps the rest). */
    setApplication: (next: ApplicationRecord) => void;
    /** Replace artifacts after a confirmed write. */
    setArtifacts: (next: ApplicationArtifact[]) => void;
    setInterviews: (next: InterviewSession[]) => void;
    setOutcomes: (next: OutcomeObservation[]) => void;
}

export function useApplicationWorkspace(applicationId: string): Workspace {
    const { userId, invalidate } = useCareerOs();
    const query = useOwnedQuery(userId, `application:workspace:${applicationId}`, () => loadWorkspace(userId as string, applicationId), [applicationId]);
    const data = query.data;

    const readiness = useMemo(() => (data ? computeReadiness({
        application: data.application,
        artifacts: data.artifacts,
        prismRun: data.prismRun ? { id: data.prismRun.id, status: data.prismRun.status } : null,
        resume: data.resume === undefined ? undefined : data.resume ? { id: data.resume.id ?? '', revision: data.resume.revision } : null,
        interviewSessions: data.interviews,
        opportunity: data.opportunity,
    }) : null), [data]);

    // Persist readiness when its items change; it is derived, so a conflict
    // just means someone else wrote first and the next load recomputes it.
    const persisted = useRef<string>('');
    useEffect(() => {
        if (!userId || !data || !readiness) return;
        const signature = readinessSignature(readiness);
        if (signature === readinessSignature(data.application.readiness) || signature === persisted.current) return;
        persisted.current = signature;
        const wasReady = data.application.readiness ? summarizeReadiness(data.application.readiness).ready : false;
        const nowReady = summarizeReadiness(readiness).ready;
        let cancelled = false;
        applicationRepo.update(userId, data.application.id, { readiness }, data.application.revision)
            .then(async (next) => {
                if (cancelled) return;
                query.setData({ ...data, application: next });
                invalidate('applications:');
                if (nowReady && !wasReady) {
                    await track(userId, 'application_ready', { subjectRefs: { application: next.id }, payload: { necessary: readiness.items.filter((i) => i.kind === 'necessary').length }, dedupeKey: `application_ready:${next.id}:${next.revision}` });
                }
            })
            .catch((err: unknown) => {
                persisted.current = '';
                if (err instanceof ConflictError && !cancelled) void query.refresh();
            });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readiness, data, userId]);

    const setApplication = useCallback((next: ApplicationRecord) => { if (data) query.setData({ ...data, application: next }); }, [data, query]);
    const setArtifacts = useCallback((next: ApplicationArtifact[]) => { if (data) query.setData({ ...data, artifacts: next }); }, [data, query]);
    const setInterviews = useCallback((next: InterviewSession[]) => { if (data) query.setData({ ...data, interviews: next }); }, [data, query]);
    const setOutcomes = useCallback((next: OutcomeObservation[]) => { if (data) query.setData({ ...data, outcomes: next }); }, [data, query]);

    return { ...query, readiness, setApplication, setArtifacts, setInterviews, setOutcomes };
}
