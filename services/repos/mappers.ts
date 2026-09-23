import type {
  ResumeData, ResumeSettings, SectionId, JobApplication, JobStatus,
  Subscription, UsageCounters, PlanId, BillingCycle, SubscriptionStatus,
} from '../../types';

export interface StoredResume {
  id?: string;
  title: string;
  data: ResumeData;
  settings: ResumeSettings;
  templateId: string;
  visibleSections: SectionId[];
  isPrimary: boolean;
  /** Server-owned: bumped by the `resumes_touch` trigger on every update.
   *  Read for conflict detection; never written by the client. */
  updatedAt?: string;
  /** Server-owned optimistic-concurrency counter (resumeRepo.saveById's
   *  `expectedRevision`). Never written by the client. */
  revision?: number;
  /** Tailored versions link back to the application they were made for. */
  applicationId?: string | null;
  /** {kind:'prism'|'copy'|'manual', runId?, sourceResumeId?, sourceRevision?} */
  origin?: Record<string, unknown> | null;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function rowToResume(row: Record<string, unknown>): StoredResume {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    title: str(row.title) || 'My Resume',
    data: obj(row.data) as unknown as ResumeData,
    settings: obj(row.settings) as unknown as ResumeSettings,
    templateId: str(row.template_id) || 'default',
    visibleSections: arr<SectionId>(row.visible_sections),
    isPrimary: row.is_primary === true,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    revision: typeof row.revision === 'number' ? row.revision : undefined,
    applicationId: typeof row.application_id === 'string' ? row.application_id : null,
    origin: row.origin && typeof row.origin === 'object' && !Array.isArray(row.origin)
      ? row.origin as Record<string, unknown>
      : null,
  };
}

/** `revision` and `updated_at` are deliberately never written: the database
 *  trigger owns both, and a client that could set them would defeat the
 *  optimistic-concurrency check in resumeRepo.saveById. */
export function resumeToRow(r: Partial<StoredResume>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (r.id !== undefined) row.id = r.id;
  if (r.title !== undefined) row.title = r.title;
  if (r.data !== undefined) row.data = r.data;
  if (r.settings !== undefined) row.settings = r.settings;
  if (r.templateId !== undefined) row.template_id = r.templateId;
  if (r.visibleSections !== undefined) row.visible_sections = r.visibleSections;
  if (r.isPrimary !== undefined) row.is_primary = r.isPrimary;
  if (r.applicationId !== undefined) row.application_id = r.applicationId;
  if (r.origin !== undefined) row.origin = r.origin;
  return row;
}

export interface StoredVersion {
  id?: string;
  resumeId: string;
  label: string;
  data: ResumeData;
  createdAt?: string;
}

export function rowToVersion(row: Record<string, unknown>): StoredVersion {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    resumeId: str(row.resume_id),
    label: str(row.label),
    data: obj(row.data) as unknown as ResumeData,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

export function versionToRow(v: Partial<StoredVersion>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (v.id !== undefined) row.id = v.id;
  if (v.resumeId !== undefined) row.resume_id = v.resumeId;
  if (v.label !== undefined) row.label = v.label;
  if (v.data !== undefined) row.data = v.data;
  return row;
}

export function rowToJob(row: Record<string, unknown>): JobApplication {
  return {
    id: str(row.id),
    jobTitle: str(row.role),
    company: str(row.company),
    jobUrl: typeof row.url === 'string' ? row.url : undefined,
    status: (str(row.status) || 'wishlist') as JobStatus,
    dateApplied: typeof row.date_applied === 'string' ? row.date_applied : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    matchScore: typeof row.match_score === 'number' ? row.match_score : undefined,
  };
}

export function jobToRow(j: Partial<JobApplication>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (j.id !== undefined) row.id = j.id;
  if (j.jobTitle !== undefined) row.role = j.jobTitle;
  if (j.company !== undefined) row.company = j.company;
  if (j.jobUrl !== undefined) row.url = j.jobUrl;
  if (j.status !== undefined) row.status = j.status;
  if (j.dateApplied !== undefined) row.date_applied = j.dateApplied;
  if (j.notes !== undefined) row.notes = j.notes;
  if (j.matchScore !== undefined) row.match_score = j.matchScore;
  return row;
}

export function rowToSubscription(row: Record<string, unknown> | null): Subscription | null {
  if (!row) return null;
  return {
    planId: (str(row.plan_id) || 'free') as PlanId,
    cycle: (str(row.cycle) || 'monthly') as BillingCycle,
    status: (str(row.status) || 'active') as SubscriptionStatus,
    currentPeriodStart: str(row.current_period_start),
    currentPeriodEnd: str(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function rowToUsage(row: Record<string, unknown> | null, month: string): UsageCounters {
  if (!row) return { month, atsScans: 0, aiActions: 0 };
  return {
    month: str(row.month) || month,
    atsScans: typeof row.ats_scans === 'number' ? row.ats_scans : 0,
    aiActions: typeof row.ai_actions === 'number' ? row.ai_actions : 0,
  };
}
