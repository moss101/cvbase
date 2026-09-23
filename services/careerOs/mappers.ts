/**
 * Row <-> domain mappers for every Career OS table (see the foundation
 * migration for exact columns). Reads are defensive: an unknown or malformed
 * column becomes the documented default rather than throwing, so one bad row
 * can never take a whole list down. Writes only include the fields present on
 * the patch, so partial updates never clobber columns they did not mention.
 */
import type {
  ActionDestination, ActionRun, ActionRunStatus, ActionSource, ActionStatus, ActionType, ApplicationArtifact,
  ApplicationRecord, ApplicationStage, ArtifactKind, ArtifactSource, ArtifactStatus, Campaign, CampaignStatus,
  CareerAction, CareerFact, CareerGoal, CareerInsight, CareerPreferences, CareerProfile, CareerScenario, ClosedReason,
  CoachConversation, CoachMessage, CompPeriod, CompletionSource, ConfirmationState, FactArtifactKind, FactKind,
  FactReference, FactSourceKind, FactStatus, FactVerification, GoalStatus, InterviewSession, InterviewStatus,
  InterviewType, LegacyJobStatus, ListingStatus, Opportunity, OpportunityAnalysis, OpportunitySourceKind,
  OpportunityStatus, OpportunityType, OutcomeKind, OutcomeObservation, OutcomeSource, PriorityBand, ProductEvent,
  ProductEventName, RemotePreference, ReviewState, UserNotification,
} from './types';

// ---------------------------------------------------------------------------
// Primitive coercions
// ---------------------------------------------------------------------------

export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
export const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : []);
export const str = (v: unknown): string => (typeof v === 'string' ? v : '');
export const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
export const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
export const int = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return fallback;
};
export const numOrNull = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
export const strArr = (v: unknown): string[] => arr<unknown>(v).filter((x): x is string => typeof x === 'string');
export const objOrNull = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null);
export const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v as T : fallback);
export const oneOfOrNull = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v as T : null);

/** Copy `value` onto `row[column]` only when the patch actually carries it. */
const put = (row: Record<string, unknown>, column: string, value: unknown): void => {
  if (value !== undefined) row[column] = value;
};

// ---------------------------------------------------------------------------
// Enum vocabularies (mirror the CHECK constraints in the migration)
// ---------------------------------------------------------------------------

export const FACT_KINDS: readonly FactKind[] = [
  'experience', 'education', 'skill', 'achievement', 'project', 'certification', 'language', 'award', 'training',
  'publication', 'volunteer', 'summary', 'profile_field', 'custom',
];
export const CONFIRMATION_STATES: readonly ConfirmationState[] = ['verified', 'user_confirmed', 'inferred', 'incomplete'];
export const REVIEW_STATES: readonly ReviewState[] = ['candidate', 'reviewed', 'conflict'];
export const FACT_STATUSES: readonly FactStatus[] = ['active', 'withdrawn', 'deleted'];
export const FACT_SOURCE_KINDS: readonly FactSourceKind[] = ['manual', 'resume_import', 'legacy_import', 'prism_answer', 'coach', 'profile'];
export const FACT_ARTIFACT_KINDS: readonly FactArtifactKind[] = ['resume', 'resume_version', 'application_artifact', 'interview_session', 'coach_message', 'opportunity_analysis'];
export const REMOTE_PREFERENCES: readonly RemotePreference[] = ['remote', 'hybrid', 'onsite', 'any'];
export const REMOTE_TYPES = ['remote', 'hybrid', 'onsite'] as const;
export const COMP_PERIODS: readonly CompPeriod[] = ['year', 'month', 'day', 'hour'];
export const GOAL_STATUSES: readonly GoalStatus[] = ['active', 'archived'];
export const GOAL_SOURCES = ['user', 'suggested', 'onboarding'] as const;
export const OPPORTUNITY_TYPES: readonly OpportunityType[] = ['role', 'project', 'path'];
export const OPPORTUNITY_STATUSES: readonly OpportunityStatus[] = ['saved', 'watching', 'applied', 'not_interested', 'archived'];
export const OPPORTUNITY_SOURCE_KINDS: readonly OpportunitySourceKind[] = ['paste', 'manual', 'tracker_migration', 'connector', 'coach'];
export const LISTING_STATUSES: readonly ListingStatus[] = ['open', 'closed', 'unknown'];
export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = ['active', 'paused', 'closed'];
export const APPLICATION_STAGES: readonly ApplicationStage[] = ['saved', 'preparing', 'submitted', 'response', 'interview', 'final', 'closed'];
export const CLOSED_REASONS: readonly ClosedReason[] = ['rejected', 'withdrawn', 'accepted', 'archived'];
export const LEGACY_JOB_STATUSES: readonly LegacyJobStatus[] = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];
export const ARTIFACT_KINDS: readonly ArtifactKind[] = ['role_analysis', 'cover_letter', 'employer_question', 'linkedin', 'networking_note', 'note', 'interview_story', 'submission'];
export const ARTIFACT_SOURCES: readonly ArtifactSource[] = ['user', 'ai', 'prism', 'coach'];
export const ARTIFACT_STATUSES: readonly ArtifactStatus[] = ['draft', 'reviewed', 'snapshot'];
export const INTERVIEW_TYPES: readonly InterviewType[] = ['phone', 'video', 'onsite', 'panel', 'technical', 'case', 'unknown'];
export const INTERVIEW_STATUSES: readonly InterviewStatus[] = ['planned', 'prepared', 'completed', 'cancelled'];
export const OUTCOME_KINDS: readonly OutcomeKind[] = ['submitted', 'response', 'interview_scheduled', 'interview_completed', 'offer', 'rejected', 'withdrawn', 'accepted', 'no_response', 'correction'];
export const OUTCOME_SOURCES: readonly OutcomeSource[] = ['user_reported', 'system', 'connector'];
export const ACTION_TYPES: readonly ActionType[] = [
  'REVIEW_OPPORTUNITY', 'IMPROVE_ACHIEVEMENT', 'PREPARE_INTERVIEW', 'TAILOR_CV', 'FOLLOW_UP_APPLICATION', 'UPDATE_SKILL',
  'START_CAMPAIGN', 'REVIEW_PROFILE', 'COMPARE_ROLES', 'START_APPLICATION', 'RECORD_OUTCOME', 'REVIEW_IMPORT', 'SET_GOAL',
  'REVIEW_TAILORING', 'RESOLVE_CONFLICT', 'CAPTURE_ACHIEVEMENT',
];
export const ACTION_STATUSES: readonly ActionStatus[] = ['PROPOSED', 'READY', 'IN_PROGRESS', 'WAITING_FOR_USER', 'FAILED', 'COMPLETED', 'DISMISSED', 'EXPIRED'];
export const PRIORITY_BANDS: readonly PriorityBand[] = ['now', 'soon', 'later'];
export const ACTION_SOURCES: readonly ActionSource[] = ['rule', 'coach', 'user_reported', 'outcome_policy', 'proactive'];
export const COMPLETION_SOURCES: readonly CompletionSource[] = ['durable_receipt', 'user_reported'];
export const ACTION_RUN_STATUSES: readonly ActionRunStatus[] = ['pending', 'running', 'waiting_confirmation', 'completed', 'failed', 'cancelled'];
export const CONVERSATION_STATUSES = ['active', 'archived'] as const;
export const MESSAGE_ROLES = ['user', 'assistant', 'tool', 'system'] as const;
export const NOTIFICATION_KINDS = ['information', 'action_required'] as const;
export const SCENARIO_KINDS = ['goals', 'offers', 'mixed'] as const;
export const INSIGHT_STATUSES = ['active', 'stale', 'revoked'] as const;
export const MIGRATION_STATUSES = ['pending', 'done', 'failed', 'skipped'] as const;

// ---------------------------------------------------------------------------
// Input/patch types (what repositories accept)
// ---------------------------------------------------------------------------

export type FactInput = Omit<CareerFact, 'id' | 'revision' | 'createdAt' | 'updatedAt'>;
export type FactPatch = Partial<FactInput>;
export type FactReferenceInput = Omit<FactReference, 'id' | 'createdAt'>;
export type GoalPatch = Partial<Omit<CareerGoal, 'id' | 'revision' | 'createdAt' | 'updatedAt'>>;
export type OpportunityPatch = Partial<Omit<Opportunity, 'id' | 'revision' | 'createdAt' | 'updatedAt'>>;
export type CampaignInput = Partial<Omit<Campaign, 'id' | 'revision' | 'createdAt' | 'updatedAt'>> & { name: string };
export type CampaignPatch = Partial<Omit<Campaign, 'id' | 'revision' | 'createdAt' | 'updatedAt'>>;
export type ApplicationPatch = Partial<Omit<ApplicationRecord, 'id' | 'revision' | 'createdAt' | 'updatedAt' | 'attemptNo' | 'previousAttemptId' | 'goalSnapshot' | 'goalRevision'>>;
export type ArtifactInput = Omit<ApplicationArtifact, 'id' | 'revision' | 'createdAt' | 'updatedAt' | 'snapshotOf' | 'stale' | 'status' | 'provenance' | 'plainText'> & Partial<Pick<ApplicationArtifact, 'status' | 'provenance' | 'plainText' | 'stale' | 'snapshotOf'>>;
export type ArtifactPatch = Partial<Omit<ApplicationArtifact, 'id' | 'revision' | 'createdAt' | 'updatedAt' | 'applicationId'>>;
export type InterviewInput = Partial<Omit<InterviewSession, 'id' | 'revision' | 'createdAt' | 'updatedAt'>> & { applicationId: string };
export type InterviewPatch = Partial<Omit<InterviewSession, 'id' | 'revision' | 'createdAt' | 'updatedAt' | 'applicationId'>>;
export type OutcomeInput = Omit<OutcomeObservation, 'id' | 'createdAt'>;
export type AnalysisInput = Omit<OpportunityAnalysis, 'id'>;
export type ActionInput = Omit<CareerAction, 'id' | 'revision' | 'createdAt' | 'updatedAt'>;
export type ActionPatch = Partial<Omit<CareerAction, 'id' | 'revision' | 'createdAt' | 'updatedAt'>>;
export type ConversationInput = Partial<Omit<CoachConversation, 'id' | 'revision' | 'createdAt' | 'updatedAt'>>;
export type MessageInput = Omit<CoachMessage, 'id' | 'createdAt'>;
export type ProductEventInput = Omit<ProductEvent, 'id'>;
export type NotificationInput = Omit<UserNotification, 'id' | 'createdAt' | 'readAt' | 'dismissedAt'> & Partial<Pick<UserNotification, 'readAt' | 'dismissedAt'>>;
export type PreferencesPatch = Partial<Omit<CareerPreferences, 'userId' | 'revision'>>;
export type ScenarioInput = Partial<Omit<CareerScenario, 'id' | 'revision' | 'createdAt' | 'updatedAt'>> & { name: string };
export type ScenarioPatch = Partial<Omit<CareerScenario, 'id' | 'revision' | 'createdAt' | 'updatedAt'>>;
export type InsightInput = Omit<CareerInsight, 'id'>;

export interface MigrationEntry {
  id: string;
  migration: string;
  itemKind: string;
  oldId: string;
  newId: string | null;
  status: 'pending' | 'done' | 'failed' | 'skipped';
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// career_profiles
// ---------------------------------------------------------------------------

export function rowToProfile(row: Record<string, unknown>): CareerProfile {
  return {
    userId: str(row.user_id),
    headline: str(row.headline),
    onboarding: obj(row.onboarding) as CareerProfile['onboarding'],
    migrationVersion: int(row.migration_version),
    migratedAt: strOrNull(row.migrated_at),
    factsRevision: str(row.facts_revision),
    revision: int(row.revision, 1),
  };
}

export function profileToRow(p: Partial<Omit<CareerProfile, 'userId' | 'revision'>>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'headline', p.headline);
  put(row, 'onboarding', p.onboarding);
  put(row, 'migration_version', p.migrationVersion);
  put(row, 'migrated_at', p.migratedAt);
  put(row, 'facts_revision', p.factsRevision);
  return row;
}

// ---------------------------------------------------------------------------
// career_facts / career_fact_references
// ---------------------------------------------------------------------------

function verificationOf(v: unknown): FactVerification | null {
  const o = objOrNull(v);
  if (!o) return null;
  const method = str(o.method); const source = str(o.source); const verifiedAt = str(o.verifiedAt);
  return method && source && verifiedAt ? { method, source, verifiedAt } : null;
}

export function rowToFact(row: Record<string, unknown>): CareerFact {
  return {
    id: str(row.id),
    kind: oneOf(row.kind, FACT_KINDS, 'custom'),
    title: str(row.title),
    organization: str(row.organization),
    location: str(row.location),
    startDate: str(row.start_date),
    endDate: str(row.end_date),
    narrative: str(row.narrative),
    payload: obj(row.payload) as CareerFact['payload'],
    parentFactId: strOrNull(row.parent_fact_id),
    confirmationState: oneOf(row.confirmation_state, CONFIRMATION_STATES, 'inferred'),
    verification: verificationOf(row.verification),
    extractionConfidence: numOrNull(row.extraction_confidence),
    sourceKind: oneOf(row.source_kind, FACT_SOURCE_KINDS, 'manual'),
    sourceRef: obj(row.source_ref) as CareerFact['sourceRef'],
    sourceFingerprint: strOrNull(row.source_fingerprint),
    legacyId: strOrNull(row.legacy_id),
    conflictGroup: strOrNull(row.conflict_group),
    reviewState: oneOf(row.review_state, REVIEW_STATES, 'reviewed'),
    status: oneOf(row.status, FACT_STATUSES, 'active'),
    sortOrder: int(row.sort_order),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function factToRow(f: FactPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'kind', f.kind);
  put(row, 'title', f.title);
  put(row, 'organization', f.organization);
  put(row, 'location', f.location);
  put(row, 'start_date', f.startDate);
  put(row, 'end_date', f.endDate);
  put(row, 'narrative', f.narrative);
  put(row, 'payload', f.payload);
  put(row, 'parent_fact_id', f.parentFactId);
  put(row, 'confirmation_state', f.confirmationState);
  put(row, 'verification', f.verification);
  put(row, 'extraction_confidence', f.extractionConfidence);
  put(row, 'source_kind', f.sourceKind);
  put(row, 'source_ref', f.sourceRef);
  put(row, 'source_fingerprint', f.sourceFingerprint);
  put(row, 'legacy_id', f.legacyId);
  put(row, 'conflict_group', f.conflictGroup);
  put(row, 'review_state', f.reviewState);
  put(row, 'status', f.status);
  put(row, 'sort_order', f.sortOrder);
  return row;
}

export function rowToFactReference(row: Record<string, unknown>): FactReference {
  return {
    id: str(row.id),
    factId: str(row.fact_id),
    factRevision: int(row.fact_revision, 1),
    artifactKind: oneOf(row.artifact_kind, FACT_ARTIFACT_KINDS, 'resume'),
    artifactId: str(row.artifact_id),
    artifactSection: str(row.artifact_section),
    createdAt: str(row.created_at),
  };
}

export function factReferenceToRow(r: FactReferenceInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    fact_id: r.factId,
    fact_revision: r.factRevision,
    artifact_kind: r.artifactKind,
    artifact_id: r.artifactId,
    artifact_section: r.artifactSection ?? '',
  };
}

// ---------------------------------------------------------------------------
// career_goals / career_goal_revisions
// ---------------------------------------------------------------------------

export function rowToGoal(row: Record<string, unknown>): CareerGoal {
  return {
    id: str(row.id),
    title: str(row.title),
    role: str(row.role),
    level: str(row.level),
    industry: str(row.industry),
    location: str(row.location),
    remotePreference: oneOfOrNull(row.remote_preference, REMOTE_PREFERENCES),
    compMin: numOrNull(row.comp_min),
    compMax: numOrNull(row.comp_max),
    compCurrency: strOrNull(row.comp_currency),
    compPeriod: oneOfOrNull(row.comp_period, COMP_PERIODS),
    targetDate: strOrNull(row.target_date),
    targetEmployers: strArr(row.target_employers),
    constraints: arr<CareerGoal['constraints'][number]>(row.constraints).filter((c) => c && typeof c === 'object'),
    priorities: arr<CareerGoal['priorities'][number]>(row.priorities).filter((p) => p && typeof p === 'object'),
    isPrimary: bool(row.is_primary),
    status: oneOf(row.status, GOAL_STATUSES, 'active'),
    source: oneOf(row.source, GOAL_SOURCES, 'user'),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function goalToRow(g: GoalPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'title', g.title);
  put(row, 'role', g.role);
  put(row, 'level', g.level);
  put(row, 'industry', g.industry);
  put(row, 'location', g.location);
  put(row, 'remote_preference', g.remotePreference);
  put(row, 'comp_min', g.compMin);
  put(row, 'comp_max', g.compMax);
  put(row, 'comp_currency', g.compCurrency);
  put(row, 'comp_period', g.compPeriod);
  put(row, 'target_date', g.targetDate);
  put(row, 'target_employers', g.targetEmployers);
  put(row, 'constraints', g.constraints);
  put(row, 'priorities', g.priorities);
  put(row, 'is_primary', g.isPrimary);
  put(row, 'status', g.status);
  put(row, 'source', g.source);
  return row;
}

/** A career_goal_revisions row: the snapshot is the goal row minus revision/updated_at. */
export function rowToGoalRevision(row: Record<string, unknown>): CareerGoal {
  const snapshot = obj(row.snapshot);
  return rowToGoal({ ...snapshot, revision: row.revision, updated_at: row.created_at });
}

// ---------------------------------------------------------------------------
// opportunities
// ---------------------------------------------------------------------------

export function rowToOpportunity(row: Record<string, unknown>): Opportunity {
  return {
    id: str(row.id),
    opportunityType: oneOf(row.opportunity_type, OPPORTUNITY_TYPES, 'role'),
    title: str(row.title),
    company: str(row.company),
    location: str(row.location),
    remoteType: oneOfOrNull(row.remote_type, REMOTE_TYPES),
    sourceUrl: strOrNull(row.source_url),
    sourceKind: oneOf(row.source_kind, OPPORTUNITY_SOURCE_KINDS, 'manual'),
    capturedContent: str(row.captured_content),
    contentFingerprint: strOrNull(row.content_fingerprint),
    capturedAt: str(row.captured_at),
    sourceDate: strOrNull(row.source_date),
    listingStatus: oneOf(row.listing_status, LISTING_STATUSES, 'unknown'),
    status: oneOf(row.status, OPPORTUNITY_STATUSES, 'saved'),
    compMin: numOrNull(row.comp_min),
    compMax: numOrNull(row.comp_max),
    compCurrency: strOrNull(row.comp_currency),
    compPeriod: oneOfOrNull(row.comp_period, COMP_PERIODS),
    requirements: arr<Opportunity['requirements'][number]>(row.requirements).filter((r) => r && typeof r === 'object' && typeof r.text === 'string'),
    legacyApplicationId: strOrNull(row.legacy_application_id),
    mergedIntoId: strOrNull(row.merged_into_id),
    mergeUndo: objOrNull(row.merge_undo),
    notInterestedReason: strOrNull(row.not_interested_reason),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function opportunityToRow(o: OpportunityPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'opportunity_type', o.opportunityType);
  put(row, 'title', o.title);
  put(row, 'company', o.company);
  put(row, 'location', o.location);
  put(row, 'remote_type', o.remoteType);
  put(row, 'source_url', o.sourceUrl);
  put(row, 'source_kind', o.sourceKind);
  put(row, 'captured_content', o.capturedContent);
  put(row, 'content_fingerprint', o.contentFingerprint);
  put(row, 'captured_at', o.capturedAt);
  put(row, 'source_date', o.sourceDate);
  put(row, 'listing_status', o.listingStatus);
  put(row, 'status', o.status);
  put(row, 'comp_min', o.compMin);
  put(row, 'comp_max', o.compMax);
  put(row, 'comp_currency', o.compCurrency);
  put(row, 'comp_period', o.compPeriod);
  put(row, 'requirements', o.requirements);
  put(row, 'legacy_application_id', o.legacyApplicationId);
  put(row, 'merged_into_id', o.mergedIntoId);
  put(row, 'merge_undo', o.mergeUndo);
  put(row, 'not_interested_reason', o.notInterestedReason);
  return row;
}

// ---------------------------------------------------------------------------
// campaigns / campaign_opportunities
// ---------------------------------------------------------------------------

export function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: str(row.id),
    goalId: strOrNull(row.goal_id),
    name: str(row.name),
    status: oneOf(row.status, CAMPAIGN_STATUSES, 'active'),
    milestones: arr<Campaign['milestones'][number]>(row.milestones).filter((m) => m && typeof m === 'object'),
    notes: str(row.notes),
    closedReason: strOrNull(row.closed_reason),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function campaignToRow(c: CampaignPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'goal_id', c.goalId);
  put(row, 'name', c.name);
  put(row, 'status', c.status);
  put(row, 'milestones', c.milestones);
  put(row, 'notes', c.notes);
  put(row, 'closed_reason', c.closedReason);
  return row;
}

export interface CampaignMembership { campaignId: string; opportunityId: string; createdAt: string }

export function rowToCampaignMembership(row: Record<string, unknown>): CampaignMembership {
  return { campaignId: str(row.campaign_id), opportunityId: str(row.opportunity_id), createdAt: str(row.created_at) };
}

// ---------------------------------------------------------------------------
// job_applications (legacy columns + Career OS extension)
// ---------------------------------------------------------------------------

/**
 * Derive `stage` for a row that only knows the legacy `status`, exactly like
 * the `job_applications_sync_stage` trigger does for a null stage.
 */
export function deriveStageFromStatus(status: LegacyJobStatus, stage: ApplicationStage | null, closedReason: ClosedReason | null): ApplicationStage {
  switch (status) {
    case 'wishlist': return stage === 'preparing' ? 'preparing' : 'saved';
    case 'applied': return stage === 'submitted' || stage === 'response' ? stage : 'submitted';
    case 'interview': return 'interview';
    case 'offer': return stage === 'closed' && closedReason === 'accepted' ? 'closed' : 'final';
    case 'rejected': return 'closed';
    default: return 'saved';
  }
}

/** The legacy status an old client will read for a stage (trigger mapping). */
export function statusForStage(stage: ApplicationStage, closedReason: ClosedReason | null): LegacyJobStatus {
  switch (stage) {
    case 'saved':
    case 'preparing': return 'wishlist';
    case 'submitted':
    case 'response': return 'applied';
    case 'interview': return 'interview';
    case 'final': return 'offer';
    case 'closed': return closedReason === 'accepted' ? 'offer' : 'rejected';
    default: return 'wishlist';
  }
}

export function rowToApplication(row: Record<string, unknown>): ApplicationRecord {
  const status = oneOf(row.status, LEGACY_JOB_STATUSES, 'wishlist');
  const rawStage = oneOfOrNull(row.stage, APPLICATION_STAGES);
  let closedReason = oneOfOrNull(row.closed_reason, CLOSED_REASONS);
  const stage = rawStage ?? deriveStageFromStatus(status, rawStage, closedReason);
  if (stage === 'closed' && !closedReason) closedReason = status === 'rejected' ? 'rejected' : 'archived';
  if (stage !== 'closed') closedReason = null;
  const goalSnapshot = objOrNull(row.goal_snapshot);
  const snapshot = objOrNull(row.submission_snapshot);
  const readiness = objOrNull(row.readiness);
  return {
    id: str(row.id),
    jobTitle: str(row.role),
    company: str(row.company),
    jobUrl: strOrNull(row.url),
    status,
    dateApplied: strOrNull(row.date_applied),
    notes: typeof row.notes === 'string' ? row.notes : null,
    matchScore: numOrNull(row.match_score),
    opportunityId: strOrNull(row.opportunity_id),
    campaignId: strOrNull(row.campaign_id),
    goalId: strOrNull(row.goal_id),
    goalRevision: numOrNull(row.goal_revision),
    goalSnapshot: goalSnapshot ? rowToGoal(goalSnapshot) : null,
    attemptNo: int(row.attempt_no, 1),
    previousAttemptId: strOrNull(row.previous_attempt_id),
    stage,
    closedReason,
    submittedAt: strOrNull(row.submitted_at),
    submissionSnapshot: snapshot ? (snapshot as unknown as ApplicationRecord['submissionSnapshot']) : null,
    currentResumeId: strOrNull(row.current_resume_id),
    prismRunId: strOrNull(row.prism_run_id),
    followUpAt: strOrNull(row.follow_up_at),
    readiness: readiness && Array.isArray(readiness.items) ? (readiness as unknown as ApplicationRecord['readiness']) : null,
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function applicationToRow(a: ApplicationPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'role', a.jobTitle);
  put(row, 'company', a.company);
  put(row, 'url', a.jobUrl);
  put(row, 'status', a.status);
  put(row, 'date_applied', a.dateApplied);
  put(row, 'notes', a.notes);
  put(row, 'match_score', a.matchScore);
  put(row, 'opportunity_id', a.opportunityId);
  put(row, 'campaign_id', a.campaignId);
  put(row, 'goal_id', a.goalId);
  put(row, 'stage', a.stage);
  put(row, 'closed_reason', a.closedReason);
  put(row, 'submitted_at', a.submittedAt);
  put(row, 'submission_snapshot', a.submissionSnapshot);
  put(row, 'current_resume_id', a.currentResumeId);
  put(row, 'prism_run_id', a.prismRunId);
  put(row, 'follow_up_at', a.followUpAt);
  put(row, 'readiness', a.readiness);
  return row;
}

// ---------------------------------------------------------------------------
// application_artifacts
// ---------------------------------------------------------------------------

export function rowToArtifact(row: Record<string, unknown>): ApplicationArtifact {
  return {
    id: str(row.id),
    applicationId: str(row.application_id),
    kind: oneOf(row.kind, ARTIFACT_KINDS, 'note'),
    title: str(row.title),
    content: obj(row.content),
    plainText: str(row.plain_text),
    source: oneOf(row.source, ARTIFACT_SOURCES, 'user'),
    status: oneOf(row.status, ARTIFACT_STATUSES, 'draft'),
    snapshotOf: strOrNull(row.snapshot_of),
    provenance: obj(row.provenance) as ApplicationArtifact['provenance'],
    stale: bool(row.stale),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function artifactToRow(a: Partial<ArtifactInput> & ArtifactPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'application_id', (a as Partial<ArtifactInput>).applicationId);
  put(row, 'kind', a.kind);
  put(row, 'title', a.title);
  put(row, 'content', a.content);
  put(row, 'plain_text', a.plainText);
  put(row, 'source', a.source);
  put(row, 'status', a.status);
  put(row, 'snapshot_of', a.snapshotOf);
  put(row, 'provenance', a.provenance);
  put(row, 'stale', a.stale);
  return row;
}

// ---------------------------------------------------------------------------
// interview_sessions
// ---------------------------------------------------------------------------

export function rowToInterview(row: Record<string, unknown>): InterviewSession {
  return {
    id: str(row.id),
    applicationId: str(row.application_id),
    scheduledAt: strOrNull(row.scheduled_at),
    timeZone: strOrNull(row.time_zone),
    interviewType: oneOf(row.interview_type, INTERVIEW_TYPES, 'unknown'),
    themes: arr<InterviewSession['themes'][number]>(row.themes).filter((t) => t && typeof t === 'object'),
    storyFactIds: strArr(row.story_fact_ids),
    practice: arr<InterviewSession['practice'][number]>(row.practice).filter((p) => p && typeof p === 'object'),
    readiness: obj(row.readiness),
    selfReportedResult: strOrNull(row.self_reported_result),
    recruiterFeedback: strOrNull(row.recruiter_feedback),
    status: oneOf(row.status, INTERVIEW_STATUSES, 'planned'),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function interviewToRow(s: Partial<InterviewInput>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'application_id', s.applicationId);
  put(row, 'scheduled_at', s.scheduledAt);
  put(row, 'time_zone', s.timeZone);
  put(row, 'interview_type', s.interviewType);
  put(row, 'themes', s.themes);
  put(row, 'story_fact_ids', s.storyFactIds);
  put(row, 'practice', s.practice);
  put(row, 'readiness', s.readiness);
  put(row, 'self_reported_result', s.selfReportedResult);
  put(row, 'recruiter_feedback', s.recruiterFeedback);
  put(row, 'status', s.status);
  return row;
}

// ---------------------------------------------------------------------------
// application_outcomes
// ---------------------------------------------------------------------------

export function rowToOutcome(row: Record<string, unknown>): OutcomeObservation {
  return {
    id: str(row.id),
    applicationId: str(row.application_id),
    kind: oneOf(row.kind, OUTCOME_KINDS, 'response'),
    observedAt: str(row.observed_at),
    source: oneOf(row.source, OUTCOME_SOURCES, 'user_reported'),
    details: obj(row.details),
    supersedesId: strOrNull(row.supersedes_id),
    note: str(row.note),
    createdAt: str(row.created_at),
  };
}

export function outcomeToRow(o: OutcomeInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    application_id: o.applicationId,
    kind: o.kind,
    observed_at: o.observedAt,
    source: o.source,
    details: o.details ?? {},
    supersedes_id: o.supersedesId ?? null,
    note: o.note ?? '',
  };
}

// ---------------------------------------------------------------------------
// opportunity_analyses
// ---------------------------------------------------------------------------

const emptyQualification = (): OpportunityAnalysis['qualification'] => ({ supported: [], partial: [], missing: [], unknown: [] });
const emptyDirection = (): OpportunityAnalysis['direction'] => ({ factors: [], constraints: [], missing: [] });

export function rowToAnalysis(row: Record<string, unknown>): OpportunityAnalysis {
  const q = obj(row.qualification);
  const d = obj(row.direction);
  const hidden = objOrNull(row.hidden_by_constraint);
  return {
    id: str(row.id),
    opportunityId: str(row.opportunity_id),
    goalId: strOrNull(row.goal_id),
    applicationId: strOrNull(row.application_id),
    opportunityRevision: int(row.opportunity_revision, 1),
    goalRevision: numOrNull(row.goal_revision),
    factsRevision: str(row.facts_revision),
    inputFingerprint: str(row.input_fingerprint),
    engineVersion: str(row.engine_version),
    qualification: {
      ...emptyQualification(),
      supported: arr(q.supported), partial: arr(q.partial), missing: arr(q.missing), unknown: arr(q.unknown),
    },
    direction: {
      ...emptyDirection(),
      factors: arr(d.factors), constraints: arr(d.constraints), missing: strArr(d.missing),
      ...(typeof d.unavailableReason === 'string' ? { unavailableReason: d.unavailableReason } : {}),
    },
    atsScore: numOrNull(row.ats_score),
    hiddenByConstraint: hidden && typeof hidden.constraintId === 'string' ? { constraintId: hidden.constraintId, text: str(hidden.text) } : null,
    stale: bool(row.stale),
    computedAt: str(row.computed_at),
  };
}

export function analysisToRow(a: AnalysisInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    opportunity_id: a.opportunityId,
    goal_id: a.goalId,
    application_id: a.applicationId,
    opportunity_revision: a.opportunityRevision,
    goal_revision: a.goalRevision,
    facts_revision: a.factsRevision,
    input_fingerprint: a.inputFingerprint,
    engine_version: a.engineVersion,
    qualification: a.qualification,
    direction: a.direction,
    ats_score: a.atsScore === null ? null : Math.round(a.atsScore),
    hidden_by_constraint: a.hiddenByConstraint,
    stale: a.stale,
    computed_at: a.computedAt,
  };
}

// ---------------------------------------------------------------------------
// career_actions / action_runs
// ---------------------------------------------------------------------------

function lastErrorOf(v: unknown): CareerAction['lastError'] {
  const o = objOrNull(v);
  if (!o || typeof o.code !== 'string') return null;
  return { code: o.code, retryable: bool(o.retryable), at: str(o.at) };
}

export function rowToAction(row: Record<string, unknown>): CareerAction {
  return {
    id: str(row.id),
    actionType: oneOf(row.action_type, ACTION_TYPES, 'REVIEW_PROFILE'),
    title: str(row.title),
    reason: str(row.reason),
    evidenceRefs: arr<CareerAction['evidenceRefs'][number]>(row.evidence_refs).filter((e) => e && typeof e === 'object'),
    priorityBand: oneOf(row.priority_band, PRIORITY_BANDS, 'soon'),
    contextRefs: obj(row.context_refs) as CareerAction['contextRefs'],
    inputRevisions: obj(row.input_revisions) as CareerAction['inputRevisions'],
    source: oneOf(row.source, ACTION_SOURCES, 'rule'),
    ruleVersion: str(row.rule_version),
    status: oneOf(row.status, ACTION_STATUSES, 'READY'),
    dedupeKey: str(row.dedupe_key),
    destination: obj(row.destination) as unknown as ActionDestination,
    estimatedEffort: strOrNull(row.estimated_effort),
    effortSource: strOrNull(row.effort_source),
    confidence: numOrNull(row.confidence),
    snoozedUntil: strOrNull(row.snoozed_until),
    expiresAt: strOrNull(row.expires_at),
    dismissedAt: strOrNull(row.dismissed_at),
    completedAt: strOrNull(row.completed_at),
    completionSource: oneOfOrNull(row.completion_source, COMPLETION_SOURCES),
    resultRef: objOrNull(row.result_ref),
    lastError: lastErrorOf(row.last_error),
    resurfacedReason: strOrNull(row.resurfaced_reason),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function actionToRow(a: ActionPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'action_type', a.actionType);
  put(row, 'title', a.title);
  put(row, 'reason', a.reason);
  put(row, 'evidence_refs', a.evidenceRefs);
  put(row, 'priority_band', a.priorityBand);
  put(row, 'context_refs', a.contextRefs);
  put(row, 'input_revisions', a.inputRevisions);
  put(row, 'source', a.source);
  put(row, 'rule_version', a.ruleVersion);
  put(row, 'status', a.status);
  put(row, 'dedupe_key', a.dedupeKey);
  put(row, 'destination', a.destination);
  put(row, 'estimated_effort', a.estimatedEffort);
  put(row, 'effort_source', a.effortSource);
  put(row, 'confidence', a.confidence);
  put(row, 'snoozed_until', a.snoozedUntil);
  put(row, 'expires_at', a.expiresAt);
  put(row, 'dismissed_at', a.dismissedAt);
  put(row, 'completed_at', a.completedAt);
  put(row, 'completion_source', a.completionSource);
  put(row, 'result_ref', a.resultRef);
  put(row, 'last_error', a.lastError);
  put(row, 'resurfaced_reason', a.resurfacedReason);
  return row;
}

export function rowToActionRun(row: Record<string, unknown>): ActionRun {
  const confirmation = objOrNull(row.confirmation);
  return {
    id: str(row.id),
    actionId: strOrNull(row.action_id),
    tool: str(row.tool),
    status: oneOf(row.status, ACTION_RUN_STATUSES, 'pending'),
    idempotencyKey: str(row.idempotency_key),
    attempt: int(row.attempt, 1),
    requestId: str(row.request_id),
    actor: oneOf(row.actor, ['user', 'coach', 'system'] as const, 'user'),
    contextRevisions: obj(row.context_revisions) as ActionRun['contextRevisions'],
    inputSummary: obj(row.input_summary),
    resultRef: objOrNull(row.result_ref),
    retryable: bool(row.retryable),
    failureCode: strOrNull(row.failure_code),
    confirmation: confirmation && typeof confirmation.contentHash === 'string'
      ? {
        contentHash: confirmation.contentHash,
        expiresAt: str(confirmation.expiresAt),
        ...(typeof confirmation.token === 'string' ? { token: confirmation.token } : {}),
        ...(typeof confirmation.destination === 'string' ? { destination: confirmation.destination } : {}),
        ...(typeof confirmation.confirmedAt === 'string' ? { confirmedAt: confirmation.confirmedAt } : {}),
      }
      : null,
    usage: obj(row.usage) as ActionRun['usage'],
    startedAt: strOrNull(row.started_at),
    finishedAt: strOrNull(row.finished_at),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// coach_conversations / coach_messages
// ---------------------------------------------------------------------------

export function rowToConversation(row: Record<string, unknown>): CoachConversation {
  return {
    id: str(row.id),
    title: str(row.title),
    contextRefs: obj(row.context_refs) as CoachConversation['contextRefs'],
    summary: str(row.summary),
    summarySourceIds: strArr(row.summary_source_ids),
    status: oneOf(row.status, CONVERSATION_STATUSES, 'active'),
    lastMessageAt: strOrNull(row.last_message_at),
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function conversationToRow(c: ConversationInput, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'title', c.title);
  put(row, 'context_refs', c.contextRefs);
  put(row, 'summary', c.summary);
  put(row, 'summary_source_ids', c.summarySourceIds);
  put(row, 'status', c.status);
  put(row, 'last_message_at', c.lastMessageAt);
  return row;
}

export function rowToMessage(row: Record<string, unknown>): CoachMessage {
  return {
    id: str(row.id),
    conversationId: str(row.conversation_id),
    role: oneOf(row.role, MESSAGE_ROLES, 'assistant'),
    content: str(row.content),
    citations: arr<CoachMessage['citations'][number]>(row.citations).filter((c) => c && typeof c === 'object'),
    proposals: arr<CoachMessage['proposals'][number]>(row.proposals).filter((p) => p && typeof p === 'object'),
    actionRunId: strOrNull(row.action_run_id),
    abstained: bool(row.abstained),
    createdAt: str(row.created_at),
  };
}

export function messageToRow(m: MessageInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    conversation_id: m.conversationId,
    role: m.role,
    content: m.content,
    citations: m.citations ?? [],
    proposals: m.proposals ?? [],
    action_run_id: m.actionRunId ?? null,
    abstained: m.abstained === true,
  };
}

// ---------------------------------------------------------------------------
// career_events / user_notifications
// ---------------------------------------------------------------------------

function scalarPayload(v: unknown): ProductEvent['payload'] {
  const out: ProductEvent['payload'] = {};
  for (const [k, val] of Object.entries(obj(v))) {
    if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') out[k] = val;
  }
  return out;
}

export function rowToEvent(row: Record<string, unknown>): ProductEvent {
  const refs: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(row.subject_refs))) if (typeof v === 'string') refs[k] = v;
  return {
    id: str(row.id),
    eventName: str(row.event_name) as ProductEventName,
    schemaVersion: int(row.schema_version, 1),
    subjectRefs: refs,
    correlationId: str(row.correlation_id),
    source: oneOf(row.source, ['client', 'server'] as const, 'client'),
    occurredAt: str(row.occurred_at),
    payload: scalarPayload(row.payload),
    dedupeKey: strOrNull(row.dedupe_key),
  };
}

export function eventToRow(e: ProductEventInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    event_name: e.eventName,
    schema_version: e.schemaVersion,
    subject_refs: e.subjectRefs,
    correlation_id: e.correlationId,
    source: e.source,
    occurred_at: e.occurredAt,
    payload: e.payload,
    dedupe_key: e.dedupeKey,
  };
}

export function rowToNotification(row: Record<string, unknown>): UserNotification {
  return {
    id: str(row.id),
    kind: oneOf(row.kind, NOTIFICATION_KINDS, 'information'),
    title: str(row.title),
    body: str(row.body),
    actionId: strOrNull(row.action_id),
    dedupeKey: str(row.dedupe_key),
    readAt: strOrNull(row.read_at),
    dismissedAt: strOrNull(row.dismissed_at),
    createdAt: str(row.created_at),
  };
}

export function notificationToRow(n: NotificationInput, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId, kind: n.kind, title: n.title, body: n.body ?? '', action_id: n.actionId ?? null, dedupe_key: n.dedupeKey,
  };
  put(row, 'read_at', n.readAt);
  put(row, 'dismissed_at', n.dismissedAt);
  return row;
}

// ---------------------------------------------------------------------------
// career_preferences
// ---------------------------------------------------------------------------

export function rowToPreferences(row: Record<string, unknown>): CareerPreferences {
  const quiet = objOrNull(row.quiet_hours);
  return {
    userId: str(row.user_id),
    proactiveEnabled: bool(row.proactive_enabled),
    consentAt: strOrNull(row.consent_at),
    timeZone: str(row.time_zone) || 'UTC',
    quietHours: quiet && typeof quiet.start === 'string' && typeof quiet.end === 'string' ? { start: quiet.start, end: quiet.end } : null,
    dailyActionCap: int(row.daily_action_cap, 3),
    triggers: obj(row.triggers) as CareerPreferences['triggers'],
    lastProactiveRunAt: strOrNull(row.last_proactive_run_at),
    checkpoint: obj(row.checkpoint),
    revision: int(row.revision, 1),
  };
}

export function preferencesToRow(p: PreferencesPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'proactive_enabled', p.proactiveEnabled);
  put(row, 'consent_at', p.consentAt);
  put(row, 'time_zone', p.timeZone);
  put(row, 'quiet_hours', p.quietHours);
  put(row, 'daily_action_cap', p.dailyActionCap);
  put(row, 'triggers', p.triggers);
  put(row, 'last_proactive_run_at', p.lastProactiveRunAt);
  put(row, 'checkpoint', p.checkpoint);
  return row;
}

// ---------------------------------------------------------------------------
// career_scenarios / career_insights / career_migrations
// ---------------------------------------------------------------------------

export function rowToScenario(row: Record<string, unknown>): CareerScenario {
  const result = objOrNull(row.result);
  return {
    id: str(row.id),
    name: str(row.name),
    kind: oneOf(row.kind, SCENARIO_KINDS, 'goals'),
    options: arr<CareerScenario['options'][number]>(row.options).filter((o) => o && typeof o === 'object'),
    priorities: arr<CareerScenario['priorities'][number]>(row.priorities).filter((p) => p && typeof p === 'object'),
    assumptions: arr<CareerScenario['assumptions'][number]>(row.assumptions).filter((a) => a && typeof a === 'object'),
    result: result && typeof result.computedAt === 'string' ? (result as unknown as CareerScenario['result']) : null,
    revision: int(row.revision, 1),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function scenarioToRow(s: ScenarioPatch, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'name', s.name);
  put(row, 'kind', s.kind);
  put(row, 'options', s.options);
  put(row, 'priorities', s.priorities);
  put(row, 'assumptions', s.assumptions);
  put(row, 'result', s.result);
  return row;
}

export function rowToInsight(row: Record<string, unknown>): CareerInsight {
  const window = obj(row.observation_window);
  return {
    id: str(row.id),
    kind: str(row.kind),
    statement: str(row.statement),
    cohort: obj(row.cohort),
    sampleSize: int(row.sample_size),
    denominator: int(row.denominator),
    missingOutcomes: int(row.missing_outcomes),
    observationWindow: { from: strOrNull(window.from), to: strOrNull(window.to) },
    sourceRefs: arr<CareerInsight['sourceRefs'][number]>(row.source_refs).filter((r) => r && typeof r === 'object'),
    policyVersion: str(row.policy_version),
    status: oneOf(row.status, INSIGHT_STATUSES, 'active'),
    computedAt: str(row.computed_at),
  };
}

export function insightToRow(i: Partial<InsightInput>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  put(row, 'kind', i.kind);
  put(row, 'statement', i.statement);
  put(row, 'cohort', i.cohort);
  put(row, 'sample_size', i.sampleSize);
  put(row, 'denominator', i.denominator);
  put(row, 'missing_outcomes', i.missingOutcomes);
  put(row, 'observation_window', i.observationWindow);
  put(row, 'source_refs', i.sourceRefs);
  put(row, 'policy_version', i.policyVersion);
  put(row, 'status', i.status);
  put(row, 'computed_at', i.computedAt);
  return row;
}

export function rowToMigration(row: Record<string, unknown>): MigrationEntry {
  return {
    id: str(row.id),
    migration: str(row.migration),
    itemKind: str(row.item_kind),
    oldId: str(row.old_id),
    newId: strOrNull(row.new_id),
    status: oneOf(row.status, MIGRATION_STATUSES, 'done'),
    error: strOrNull(row.error),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}
