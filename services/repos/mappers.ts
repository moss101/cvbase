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
  };
}

export function resumeToRow(r: Partial<StoredResume>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (r.id !== undefined) row.id = r.id;
  if (r.title !== undefined) row.title = r.title;
  if (r.data !== undefined) row.data = r.data;
  if (r.settings !== undefined) row.settings = r.settings;
  if (r.templateId !== undefined) row.template_id = r.templateId;
  if (r.visibleSections !== undefined) row.visible_sections = r.visibleSections;
  if (r.isPrimary !== undefined) row.is_primary = r.isPrimary;
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
