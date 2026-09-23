import type { ApplicationArtifact, ApplicationRecord, ArtifactStatus, CareerFact, ConfirmationState, InterviewSession, ReviewState } from '../../../services/careerOs/types';
import type { StoredResume } from '../../../services/repos/mappers';
import type { AtsReportSummary } from '../../../services/repos/atsReportRepo';
import type { Headshot } from '../../../services/repos/headshotRepo';
import { jdHeadline } from '../../../services/repos/atsReportRepo';
import type { DocumentKind } from '../primitives';
import { LIBRARY_TYPES } from '../../NavigationProvider';

/**
 * The Library's unified asset model (REQ-22, COS-028). Existing owners keep
 * their rows — CVs, versions, ATS reports and headshots are not copied — and
 * every asset is projected into one shape the list can filter, search, sort
 * and paginate without knowing the source. Pure functions only.
 */
export type LibraryKind = DocumentKind;

export const LIBRARY_KINDS: readonly LibraryKind[] = LIBRARY_TYPES;

export const isLibraryKind = (value: string | undefined): value is LibraryKind =>
    value !== undefined && (LIBRARY_KINDS as readonly string[]).includes(value);

export interface LibraryAsset {
    /** Stable key: `${kind}:${id}`. */
    key: string;
    id: string;
    kind: LibraryKind;
    title: string;
    /** One line under the title (company, organisation, score …). */
    meta?: string;
    /** ISO timestamp used for "newest first". */
    updatedAt: string;
    applicationId: string | null;
    goalId: string | null;
    status?: ArtifactStatus;
    stale?: boolean;
    /** Lower-cased haystack for the text search (titles, company, labels — never narrative text). */
    searchText: string;
    /** Kind-specific extras the card actions need. */
    extra: {
        storagePath?: string;
        resumeId?: string | null;
        score?: number | null;
        origin?: string | null;
        confirmationState?: ConfirmationState;
        reviewState?: ReviewState;
        usageCount?: number;
        isPrimary?: boolean;
    };
}

export interface LibrarySources {
    resumes: StoredResume[];
    reports: AtsReportSummary[];
    headshots: Headshot[];
    coverLetters: ApplicationArtifact[];
    facts: CareerFact[];
    interviews: InterviewSession[];
    applications: ApplicationRecord[];
}

const lower = (parts: Array<string | null | undefined>): string => parts.filter(Boolean).join(' ').toLowerCase();

const originLabel = (origin: Record<string, unknown> | null | undefined): string | null => {
    const kind = origin && typeof origin.kind === 'string' ? origin.kind : null;
    return kind;
};

export const applicationLabel = (app: Pick<ApplicationRecord, 'jobTitle' | 'company'> | undefined | null): string | null =>
    app ? [app.jobTitle, app.company].filter(Boolean).join(' · ') || null : null;

/** Compose every owned asset into the unified list. Application labels come from the caller's application list. */
export function composeAssets(src: LibrarySources): LibraryAsset[] {
    const apps = new Map(src.applications.map((a) => [a.id, a]));
    const appText = (id: string | null | undefined): string => (id ? lower([apps.get(id)?.jobTitle, apps.get(id)?.company]) : '');
    const out: LibraryAsset[] = [];

    for (const r of src.resumes) {
        if (!r.id) continue;
        const contact = (r.data as { contact?: { jobTitle?: string } } | undefined)?.contact;
        out.push({
            key: `cv:${r.id}`, id: r.id, kind: 'cv', title: r.title, meta: contact?.jobTitle || undefined,
            updatedAt: r.updatedAt ?? '', applicationId: r.applicationId ?? null, goalId: apps.get(r.applicationId ?? '')?.goalId ?? null,
            searchText: lower([r.title, contact?.jobTitle, r.templateId, appText(r.applicationId)]),
            extra: { origin: originLabel(r.origin), isPrimary: r.isPrimary },
        });
    }
    for (const rep of src.reports) {
        const headline = jdHeadline(rep.jobDescription);
        const resume = rep.resumeId ? src.resumes.find((r) => r.id === rep.resumeId) : undefined;
        out.push({
            key: `report:${rep.id}`, id: rep.id, kind: 'report',
            title: headline || 'General ATS check',
            meta: resume?.title,
            updatedAt: rep.createdAt, applicationId: resume?.applicationId ?? null, goalId: null,
            searchText: lower([headline, resume?.title, 'ats']),
            extra: { resumeId: rep.resumeId, score: rep.score },
        });
    }
    for (const h of src.headshots) {
        out.push({
            key: `headshot:${h.id}`, id: h.id, kind: 'headshot', title: 'Headshot', updatedAt: h.createdAt, applicationId: null, goalId: null,
            searchText: 'headshot', extra: { storagePath: h.storagePath },
        });
    }
    for (const a of src.coverLetters) {
        const app = apps.get(a.applicationId);
        out.push({
            key: `cover-letter:${a.id}`, id: a.id, kind: 'cover-letter', title: a.title || applicationLabel(app) || 'Cover letter', meta: app?.company,
            updatedAt: a.updatedAt, applicationId: a.applicationId, goalId: app?.goalId ?? null, status: a.status, stale: a.stale,
            searchText: lower([a.title, appText(a.applicationId), 'cover letter']),
            extra: {},
        });
    }
    const usage = new Map<string, number>();
    for (const s of src.interviews) for (const id of s.storyFactIds) usage.set(id, (usage.get(id) ?? 0) + 1);
    for (const f of src.facts) {
        if (f.status !== 'active') continue;
        if (f.kind === 'achievement') {
            out.push({
                key: `story:${f.id}`, id: f.id, kind: 'story', title: f.title || 'Achievement', meta: f.organization || undefined,
                updatedAt: f.updatedAt, applicationId: null, goalId: null,
                searchText: lower([f.title, f.organization, 'story achievement']),
                extra: { confirmationState: f.confirmationState, reviewState: f.reviewState, usageCount: usage.get(f.id) ?? 0 },
            });
        } else {
            out.push({
                key: `evidence:${f.id}`, id: f.id, kind: 'evidence', title: f.title || f.kind, meta: f.organization || undefined,
                updatedAt: f.updatedAt, applicationId: null, goalId: null,
                searchText: lower([f.title, f.organization, f.kind]),
                extra: { confirmationState: f.confirmationState, reviewState: f.reviewState },
            });
        }
    }
    return out;
}

export interface LibraryFilter {
    type?: LibraryKind;
    query?: string;
}

/** Case-insensitive client-side filter over titles, company and labels. */
export function filterAssets(assets: LibraryAsset[], filter: LibraryFilter): LibraryAsset[] {
    const q = (filter.query ?? '').trim().toLowerCase();
    return assets.filter((a) => (!filter.type || a.kind === filter.type) && (!q || a.searchText.includes(q) || a.title.toLowerCase().includes(q)));
}

export const sortNewest = (assets: LibraryAsset[]): LibraryAsset[] =>
    [...assets].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.key.localeCompare(b.key)));

export const PAGE_SIZE = 20;

export const paginate = (assets: LibraryAsset[], pages: number, size = PAGE_SIZE): { items: LibraryAsset[]; hasMore: boolean } => {
    const items = assets.slice(0, Math.max(1, pages) * size);
    return { items, hasMore: items.length < assets.length };
};

export interface KindCounts extends Record<LibraryKind, number> { all: number; toReview: number }

export function countByKind(assets: LibraryAsset[]): KindCounts {
    const counts: KindCounts = { all: assets.length, toReview: 0, cv: 0, report: 0, headshot: 0, 'cover-letter': 0, story: 0, evidence: 0 };
    for (const a of assets) {
        counts[a.kind] += 1;
        if (a.kind === 'evidence' && a.extra.reviewState && a.extra.reviewState !== 'reviewed') counts.toReview += 1;
    }
    return counts;
}

export function dateLabel(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}
