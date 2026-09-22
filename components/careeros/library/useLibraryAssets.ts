import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as atsReportRepo from '../../../services/repos/atsReportRepo';
import * as headshotRepo from '../../../services/repos/headshotRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as interviewRepo from '../../../services/careerOs/interviewRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import type { ApplicationArtifact, ApplicationRecord, CareerFact, InterviewSession } from '../../../services/careerOs/types';
import type { StoredResume } from '../../../services/repos/mappers';
import type { AtsReportSummary } from '../../../services/repos/atsReportRepo';
import type { Headshot } from '../../../services/repos/headshotRepo';
import { captureException } from '../../../lib/monitoring';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery, type OwnedQuery } from '../data/useOwnedQuery';
import { composeAssets, type LibraryAsset } from './libraryFormat';

/**
 * Everything the Library lists, loaded once per profile revision. Sources
 * load independently so one failing table yields a partial list, not an
 * empty page. All reads are owner-scoped and none is gated by plan: read
 * access to existing assets survives a downgrade (REQ-22).
 *
 * Cover letters have no list-all repository call, so they are read per
 * application for the most recent `APPLICATION_CAP` applications; the cap
 * is reported so the screen can say so.
 */
export const LIBRARY_KEY = 'library';
export const APPLICATION_CAP = 50;
export const REPORT_LIMIT = 100;

export interface LibraryData {
    assets: LibraryAsset[];
    applications: ApplicationRecord[];
    resumes: StoredResume[];
    /** Sources that failed to load (shown as a partial notice). */
    failed: string[];
    /** True when more applications exist than were scanned for cover letters. */
    applicationsCapped: boolean;
    loadedAt: string;
}

async function settle<T>(name: string, loader: () => Promise<T>, fallback: T, failed: string[]): Promise<T> {
    try {
        return await loader();
    } catch (err) {
        captureException(err, { context: `library-load-${name}` });
        failed.push(name);
        return fallback;
    }
}

export async function loadLibraryData(userId: string, now: Date = new Date()): Promise<LibraryData> {
    const failed: string[] = [];
    const [resumes, reports, headshots, facts, interviews, applications] = await Promise.all([
        settle('resumes', () => resumeRepo.list(userId), [] as StoredResume[], failed),
        settle('reports', () => atsReportRepo.listRecent(userId, REPORT_LIMIT), [] as AtsReportSummary[], failed),
        settle('headshots', () => headshotRepo.list(userId), [] as Headshot[], failed),
        settle('facts', () => factRepo.list(userId), [] as CareerFact[], failed),
        settle('interviews', () => interviewRepo.list(userId), [] as InterviewSession[], failed),
        settle('applications', () => applicationRepo.list(userId), [] as ApplicationRecord[], failed),
    ]);
    const scanned = applications.slice(0, APPLICATION_CAP);
    const coverLetters = (await Promise.all(scanned.map((app) =>
        settle('coverLetters', () => artifactRepo.list(userId, app.id, 'cover_letter'), [] as ApplicationArtifact[], failed)))).flat();
    return {
        assets: composeAssets({ resumes, reports, headshots, coverLetters, facts, interviews, applications }),
        applications,
        resumes,
        failed: Array.from(new Set(failed)),
        applicationsCapped: applications.length > APPLICATION_CAP,
        loadedAt: now.toISOString(),
    };
}

export const useLibraryAssets = (): OwnedQuery<LibraryData> => {
    const { userId, profile, migration } = useCareerOs();
    const ready = Boolean(userId && (migration === 'done' || migration === 'failed' || profile));
    const key = ready ? `${LIBRARY_KEY}:${profile?.revision ?? 0}` : null;
    return useOwnedQuery<LibraryData>(userId, key, () => loadLibraryData(userId as string));
};
