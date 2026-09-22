/**
 * Career OS domain contract (client side). Mirrors the additive schema in
 * supabase/migrations/20260920100000_career_os_foundation.sql and the context
 * model in docs/career-os/CAREER_OS_CONTEXT_MODEL.md.
 *
 * Every owned record carries `id`, `revision` and timestamps. Mutations send
 * the revision they read; a stale revision is a `ConflictError`, never a
 * silent overwrite. Nothing in this file holds raw CV/JD text except the
 * fields explicitly named as user-owned content (fact narrative, opportunity
 * captured content, artifact content) — those never enter telemetry.
 */

// ---------------------------------------------------------------------------
// References and context envelope
// ---------------------------------------------------------------------------

export interface Ref {
  id: string;
  revision: number;
}

export interface ContextRefs {
  schemaVersion: 1;
  career: Ref;
  goal?: Ref;
  campaign?: Ref;
  opportunity?: Ref;
  application?: Ref;
  document?: Ref;
  conversation?: Ref;
}

export type ContextSource = 'route' | 'selection' | 'action' | 'conversation';
export type ContextCompleteness = 'ready' | 'partial' | 'stale' | 'unavailable' | 'loading';

export interface CareerContext {
  refs: ContextRefs;
  source: ContextSource;
  completeness: ContextCompleteness;
  /** Names of the missing/unavailable parts, e.g. ['goal', 'opportunity'] */
  missing: string[];
  /** Query hints that contradicted persisted relationships (never applied). */
  conflicts: ContextConflict[];
  /** Fields whose supplied revision is older than the persisted one (completeness 'stale'). */
  stale?: string[];
  /** Per-consumer projections (typed by the consumer). */
  projection: CareerContextProjection;
}

export interface ContextConflict {
  field: 'goal' | 'campaign' | 'opportunity' | 'application' | 'document';
  requestedId: string;
  authoritativeId: string | null;
  reason: string;
}

export interface CareerContextProjection {
  goal: CareerGoal | null;
  campaign: Campaign | null;
  opportunity: Opportunity | null;
  application: ApplicationRecord | null;
  document: { id: string; title: string; revision: number; applicationId: string | null } | null;
}

// ---------------------------------------------------------------------------
// Career facts (evidence-aware career memory)
// ---------------------------------------------------------------------------

export type FactKind =
  | 'experience' | 'education' | 'skill' | 'achievement' | 'project' | 'certification'
  | 'language' | 'award' | 'training' | 'publication' | 'volunteer' | 'summary' | 'profile_field' | 'custom';

/** Verified means a recorded method/source/time — never an LLM confidence. */
export type ConfirmationState = 'verified' | 'user_confirmed' | 'inferred' | 'incomplete';
export type ReviewState = 'candidate' | 'reviewed' | 'conflict';
export type FactStatus = 'active' | 'withdrawn' | 'deleted';
export type FactSourceKind = 'manual' | 'resume_import' | 'legacy_import' | 'prism_answer' | 'coach' | 'profile';

export interface FactVerification {
  method: string;
  source: string;
  verifiedAt: string;
}

export interface FactSourceRef {
  resumeId?: string;
  resumeRevision?: number;
  versionId?: string;
  runId?: string;
  section?: string;
  profile?: boolean;
}

export interface AchievementPayload {
  metric?: string;
  unit?: string;
  period?: string;
}

export interface CareerFact {
  id: string;
  kind: FactKind;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  narrative: string;
  payload: Record<string, unknown> & AchievementPayload;
  parentFactId: string | null;
  confirmationState: ConfirmationState;
  verification: FactVerification | null;
  extractionConfidence: number | null;
  sourceKind: FactSourceKind;
  sourceRef: FactSourceRef;
  sourceFingerprint: string | null;
  legacyId: string | null;
  conflictGroup: string | null;
  reviewState: ReviewState;
  status: FactStatus;
  sortOrder: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type FactArtifactKind =
  | 'resume' | 'resume_version' | 'application_artifact' | 'interview_session' | 'coach_message' | 'opportunity_analysis';

export interface FactReference {
  id: string;
  factId: string;
  factRevision: number;
  artifactKind: FactArtifactKind;
  artifactId: string;
  artifactSection: string;
  createdAt: string;
}

/** A fact whose referenced artifacts were built from an older revision. */
export interface StaleReference extends FactReference {
  currentRevision: number;
}

export interface CareerProfile {
  userId: string;
  headline: string;
  onboarding: OnboardingState;
  migrationVersion: number;
  migratedAt: string | null;
  factsRevision: string;
  revision: number;
}

export type OnboardingObjective = 'active_search' | 'develop' | 'explore' | 'return';
export type OnboardingStep = 'objective' | 'import' | 'review' | 'goal' | 'done';

export interface OnboardingState {
  objective?: OnboardingObjective;
  step?: OnboardingStep;
  importedResumeId?: string;
  reviewedAt?: string;
  goalId?: string;
  completedAt?: string;
  pausedAt?: string;
  /** Existing users see a one-time introduction instead of onboarding. */
  introducedAt?: string;
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export type RemotePreference = 'remote' | 'hybrid' | 'onsite' | 'any';
export type CompPeriod = 'year' | 'month' | 'day' | 'hour';
export type GoalStatus = 'active' | 'archived';

export interface GoalConstraint {
  id: string;
  kind: 'hard' | 'soft';
  text: string;
  /** Machine-checkable field when known: location, remote, compMin, employer, level */
  field?: 'location' | 'remote' | 'compMin' | 'employer' | 'level' | 'industry';
  value?: string | number;
}

export interface GoalPriority {
  key: 'compensation' | 'growth' | 'stability' | 'flexibility' | 'mission' | 'learning' | 'location' | 'title';
  weight: number; // 0..1
  label?: string;
}

export interface CareerGoal {
  id: string;
  title: string;
  role: string;
  level: string;
  industry: string;
  location: string;
  remotePreference: RemotePreference | null;
  compMin: number | null;
  compMax: number | null;
  compCurrency: string | null;
  compPeriod: CompPeriod | null;
  targetDate: string | null;
  targetEmployers: string[];
  constraints: GoalConstraint[];
  priorities: GoalPriority[];
  isPrimary: boolean;
  status: GoalStatus;
  source: 'user' | 'suggested' | 'onboarding';
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type GoalInput = Omit<CareerGoal, 'id' | 'revision' | 'createdAt' | 'updatedAt'>;

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export type OpportunityType = 'role' | 'project' | 'path';
export type OpportunityStatus = 'saved' | 'watching' | 'applied' | 'not_interested' | 'archived';
export type OpportunitySourceKind = 'paste' | 'manual' | 'tracker_migration' | 'connector' | 'coach';
export type ListingStatus = 'open' | 'closed' | 'unknown';
export type Freshness = 'fresh' | 'aging' | 'stale' | 'closed' | 'unknown';

export interface OpportunityRequirement {
  id: string;
  text: string;
  kind: 'must' | 'nice' | 'unknown';
}

export interface Opportunity {
  id: string;
  opportunityType: OpportunityType;
  title: string;
  company: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'onsite' | null;
  sourceUrl: string | null;
  sourceKind: OpportunitySourceKind;
  capturedContent: string;
  contentFingerprint: string | null;
  capturedAt: string;
  sourceDate: string | null;
  listingStatus: ListingStatus;
  status: OpportunityStatus;
  compMin: number | null;
  compMax: number | null;
  compCurrency: string | null;
  compPeriod: CompPeriod | null;
  requirements: OpportunityRequirement[];
  legacyApplicationId: string | null;
  mergedIntoId: string | null;
  mergeUndo: Record<string, unknown> | null;
  notInterestedReason: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityInput = Partial<Omit<Opportunity, 'id' | 'revision' | 'createdAt' | 'updatedAt'>> & {
  title: string;
  company: string;
};

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export type CampaignStatus = 'active' | 'paused' | 'closed';

export interface CampaignMilestone {
  id: string;
  title: string;
  state: 'todo' | 'doing' | 'done';
  dueDate?: string;
}

export interface Campaign {
  id: string;
  goalId: string | null;
  name: string;
  status: CampaignStatus;
  milestones: CampaignMilestone[];
  notes: string;
  closedReason: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/** Observed counts over owned data — never a synthetic progress percentage. */
export interface CampaignFunnel {
  opportunities: number;
  preparing: number;
  submitted: number;
  response: number;
  interview: number;
  final: number;
  closed: number;
  offers: number;
  rejected: number;
  unknownOutcome: number;
}

// ---------------------------------------------------------------------------
// Applications (job_applications extended)
// ---------------------------------------------------------------------------

export type ApplicationStage = 'saved' | 'preparing' | 'submitted' | 'response' | 'interview' | 'final' | 'closed';
export type ClosedReason = 'rejected' | 'withdrawn' | 'accepted' | 'archived';
export type LegacyJobStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface SubmissionSnapshot {
  resumeId: string | null;
  resumeVersionId: string | null;
  resumeRevision: number | null;
  artifactIds: string[];
  confirmedAt: string;
  method: 'employer_site' | 'export' | 'email' | 'other';
  /** Set only by an explicit supersede: the snapshot this one replaced (kept verbatim). */
  previous?: SubmissionSnapshot;
}

export interface ReadinessItem {
  id: string;
  label: string;
  kind: 'necessary' | 'optional';
  state: 'complete' | 'incomplete' | 'blocked';
  detail?: string;
  destination?: ApplicationSection;
}

export interface Readiness {
  items: ReadinessItem[];
  computedAt: string;
}

export interface ApplicationRecord {
  id: string;
  /** Legacy fields kept verbatim for the tracker and old clients. */
  jobTitle: string;
  company: string;
  jobUrl: string | null;
  status: LegacyJobStatus;
  dateApplied: string | null;
  notes: string | null;
  matchScore: number | null;
  /** Career OS extension. */
  opportunityId: string | null;
  campaignId: string | null;
  goalId: string | null;
  goalRevision: number | null;
  goalSnapshot: CareerGoal | null;
  attemptNo: number;
  previousAttemptId: string | null;
  stage: ApplicationStage;
  closedReason: ClosedReason | null;
  submittedAt: string | null;
  submissionSnapshot: SubmissionSnapshot | null;
  currentResumeId: string | null;
  prismRunId: string | null;
  followUpAt: string | null;
  readiness: Readiness | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationSection =
  | 'analysis' | 'cv' | 'cover-letter' | 'questions' | 'linkedin' | 'networking' | 'interview' | 'notes' | 'activity';

export const APPLICATION_SECTIONS: ApplicationSection[] = [
  'analysis', 'cv', 'cover-letter', 'questions', 'linkedin', 'networking', 'interview', 'notes', 'activity',
];

export type ArtifactKind =
  | 'role_analysis' | 'cover_letter' | 'employer_question' | 'linkedin' | 'networking_note' | 'note' | 'interview_story' | 'submission';
export type ArtifactSource = 'user' | 'ai' | 'prism' | 'coach';
export type ArtifactStatus = 'draft' | 'reviewed' | 'snapshot';

export interface ArtifactProvenance {
  factIds?: string[];
  sourceRevisions?: Record<string, number | string>;
  model?: string;
  promptVersion?: string;
}

export interface ApplicationArtifact {
  id: string;
  applicationId: string;
  kind: ArtifactKind;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  source: ArtifactSource;
  status: ArtifactStatus;
  snapshotOf: string | null;
  provenance: ArtifactProvenance;
  stale: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Interviews and outcomes
// ---------------------------------------------------------------------------

export type InterviewType = 'phone' | 'video' | 'onsite' | 'panel' | 'technical' | 'case' | 'unknown';
export type InterviewStatus = 'planned' | 'prepared' | 'completed' | 'cancelled';

export interface InterviewTheme {
  id: string;
  theme: string;
  covered: boolean;
  sourceRequirementId?: string;
  factIds?: string[];
}

export interface PracticeFeedback {
  strengths: string[];
  gaps: string[];
  /** Fact ids the feedback relied on; empty when the model abstained. */
  citations: string[];
  abstained?: boolean;
}

export interface PracticeItem {
  id: string;
  question: string;
  themeId?: string;
  answer: string;
  feedback: PracticeFeedback | null;
  answeredAt: string | null;
}

export interface InterviewSession {
  id: string;
  applicationId: string;
  scheduledAt: string | null;
  timeZone: string | null;
  interviewType: InterviewType;
  themes: InterviewTheme[];
  storyFactIds: string[];
  practice: PracticeItem[];
  readiness: Record<string, unknown>;
  selfReportedResult: string | null;
  recruiterFeedback: string | null;
  status: InterviewStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type OutcomeKind =
  | 'submitted' | 'response' | 'interview_scheduled' | 'interview_completed' | 'offer' | 'rejected'
  | 'withdrawn' | 'accepted' | 'no_response' | 'correction';
export type OutcomeSource = 'user_reported' | 'system' | 'connector';

export interface OutcomeObservation {
  id: string;
  applicationId: string;
  kind: OutcomeKind;
  observedAt: string;
  source: OutcomeSource;
  details: Record<string, unknown>;
  supersedesId: string | null;
  note: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Fit analysis
// ---------------------------------------------------------------------------

export type FitEvidenceState = 'supported' | 'partial' | 'missing' | 'unknown';

export interface FitRequirement {
  requirementId: string;
  text: string;
  state: FitEvidenceState;
  evidence: Array<{ factId: string; label: string; confirmationState: ConfirmationState }>;
  note?: string;
}

export interface QualificationFit {
  supported: FitRequirement[];
  partial: FitRequirement[];
  missing: FitRequirement[];
  unknown: FitRequirement[];
}

export interface DirectionFactor {
  key: GoalPriority['key'] | 'constraint' | 'employer' | 'role' | 'industry' | 'level';
  label: string;
  verdict: 'aligned' | 'tension' | 'unknown';
  detail: string;
  weight?: number;
}

export interface DirectionFit {
  factors: DirectionFactor[];
  constraints: Array<{ constraintId: string; text: string; kind: 'hard' | 'soft'; verdict: 'met' | 'broken' | 'unknown'; detail: string }>;
  missing: string[];
  /** Present only when no goal exists — direction fit cannot be evaluated. */
  unavailableReason?: string;
}

export interface OpportunityAnalysis {
  id: string;
  opportunityId: string;
  goalId: string | null;
  applicationId: string | null;
  opportunityRevision: number;
  goalRevision: number | null;
  factsRevision: string;
  /** Hash of the listing content + requirement ids the fit used; '' for older rows. */
  inputFingerprint: string;
  engineVersion: string;
  qualification: QualificationFit;
  direction: DirectionFit;
  atsScore: number | null;
  hiddenByConstraint: { constraintId: string; text: string } | null;
  stale: boolean;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Actions and receipts
// ---------------------------------------------------------------------------

export type ActionType =
  | 'REVIEW_OPPORTUNITY' | 'IMPROVE_ACHIEVEMENT' | 'PREPARE_INTERVIEW' | 'TAILOR_CV' | 'FOLLOW_UP_APPLICATION'
  | 'UPDATE_SKILL' | 'START_CAMPAIGN' | 'REVIEW_PROFILE' | 'COMPARE_ROLES' | 'START_APPLICATION' | 'RECORD_OUTCOME'
  | 'REVIEW_IMPORT' | 'SET_GOAL' | 'REVIEW_TAILORING' | 'RESOLVE_CONFLICT' | 'CAPTURE_ACHIEVEMENT';

export type ActionStatus =
  | 'PROPOSED' | 'READY' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'FAILED' | 'COMPLETED' | 'DISMISSED' | 'EXPIRED';
export type PriorityBand = 'now' | 'soon' | 'later';
export type ActionSource = 'rule' | 'coach' | 'user_reported' | 'outcome_policy' | 'proactive';
export type CompletionSource = 'durable_receipt' | 'user_reported';

export interface EvidenceRef {
  kind: 'fact' | 'goal' | 'opportunity' | 'application' | 'artifact' | 'interview' | 'outcome' | 'analysis' | 'resume' | 'run' | 'insight';
  id: string;
  label: string;
}

export interface ActionDestination {
  space: 'today' | 'career' | 'opportunities' | 'campaigns' | 'applications' | 'coach' | 'library';
  id?: string;
  section?: string;
  sub?: string;
}

export interface CareerAction {
  id: string;
  actionType: ActionType;
  title: string;
  reason: string;
  evidenceRefs: EvidenceRef[];
  priorityBand: PriorityBand;
  contextRefs: Partial<Record<'goal' | 'campaign' | 'opportunity' | 'application' | 'document' | 'fact' | 'interview', Ref>>;
  inputRevisions: Record<string, number | string>;
  source: ActionSource;
  ruleVersion: string;
  status: ActionStatus;
  dedupeKey: string;
  destination: ActionDestination;
  estimatedEffort: string | null;
  effortSource: string | null;
  /** Omitted when uncalibrated — never a decorative percentage. */
  confidence: number | null;
  snoozedUntil: string | null;
  expiresAt: string | null;
  dismissedAt: string | null;
  completedAt: string | null;
  completionSource: CompletionSource | null;
  resultRef: Record<string, unknown> | null;
  lastError: { code: string; retryable: boolean; at: string } | null;
  resurfacedReason: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type ActionRunStatus = 'pending' | 'running' | 'waiting_confirmation' | 'completed' | 'failed' | 'cancelled';

export interface ActionRun {
  id: string;
  actionId: string | null;
  tool: string;
  status: ActionRunStatus;
  idempotencyKey: string;
  attempt: number;
  requestId: string;
  actor: 'user' | 'coach' | 'system';
  contextRevisions: Record<string, number | string>;
  inputSummary: Record<string, unknown>;
  resultRef: Record<string, unknown> | null;
  retryable: boolean;
  failureCode: string | null;
  confirmation: { token?: string; contentHash: string; destination?: string; expiresAt: string; confirmedAt?: string } | null;
  usage: { kind?: 'aiActions' | 'atsScans'; charged?: boolean; released?: boolean };
  startedAt: string | null;
  finishedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Coach
// ---------------------------------------------------------------------------

export interface CoachCitation {
  kind: 'fact' | 'goal' | 'opportunity' | 'application' | 'artifact' | 'interview' | 'outcome' | 'analysis' | 'insight';
  id: string;
  label: string;
}

export interface CoachProposal {
  tool: string;
  input: Record<string, unknown>;
  confirmationRequired: boolean;
  summary: string;
  actionRunId?: string;
  contentHash?: string;
}

export interface CoachConversation {
  id: string;
  title: string;
  contextRefs: Partial<Record<'goal' | 'campaign' | 'opportunity' | 'application', Ref>>;
  summary: string;
  summarySourceIds: string[];
  status: 'active' | 'archived';
  lastMessageAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoachMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  citations: CoachCitation[];
  proposals: CoachProposal[];
  actionRunId: string | null;
  abstained: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Events, notifications, preferences, scenarios, insights
// ---------------------------------------------------------------------------

export type ProductEventName =
  | 'career_os_opened' | 'career_import_reviewed' | 'career_profile_completed' | 'career_goal_created' | 'career_goal_updated'
  | 'opportunity_saved' | 'opportunity_reviewed' | 'opportunity_fit_reviewed' | 'application_started' | 'application_submitted'
  | 'application_ready' | 'application_artifact_saved' | 'cv_tailoring_started' | 'cv_tailored' | 'recommendation_opened'
  | 'recommendation_accepted' | 'recommendation_dismissed' | 'career_action_completed' | 'campaign_created' | 'campaign_completed'
  | 'career_achievement_updated' | 'career_evidence_confirmed' | 'career_claim_corrected' | 'artifact_update_reviewed'
  | 'interview_preparation_started' | 'interview_practice_completed' | 'application_response_recorded' | 'offer_recorded'
  | 'career_outcome_recorded' | 'coach_conversation_started' | 'coach_action_executed' | 'library_asset_opened'
  | 'career_search_used' | 'notification_action_opened' | 'career_onboarding_completed' | 'career_insight_reviewed'
  | 'career_scenario_compared' | 'career_reminder_opened';

export interface ProductEvent {
  id: string;
  eventName: ProductEventName;
  schemaVersion: number;
  subjectRefs: Record<string, string>;
  correlationId: string;
  source: 'client' | 'server';
  occurredAt: string;
  payload: Record<string, string | number | boolean | null>;
  dedupeKey: string | null;
}

export interface UserNotification {
  id: string;
  kind: 'information' | 'action_required';
  title: string;
  body: string;
  actionId: string | null;
  dedupeKey: string;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
}

export interface CareerPreferences {
  userId: string;
  proactiveEnabled: boolean;
  consentAt: string | null;
  timeZone: string;
  quietHours: { start: string; end: string } | null;
  dailyActionCap: number;
  triggers: { interview?: boolean; followUp?: boolean; staleImport?: boolean; evidenceGap?: boolean };
  lastProactiveRunAt: string | null;
  checkpoint: Record<string, unknown>;
  revision: number;
}

export interface ScenarioOption {
  id: string;
  label: string;
  refs: { goalId?: string; opportunityId?: string; applicationId?: string };
  inputs: {
    compMin?: number | null;
    compMax?: number | null;
    compCurrency?: string | null;
    compPeriod?: CompPeriod | null;
    location?: string | null;
    remote?: 'remote' | 'hybrid' | 'onsite' | null;
    growth?: number | null;
    stability?: number | null;
    flexibility?: number | null;
    mission?: number | null;
    learning?: number | null;
    evidenceGaps?: number | null;
  };
}

export interface ScenarioAssumption {
  id: string;
  optionId?: string;
  text: string;
  source: 'user';
}

export interface ScenarioResult {
  computedAt: string;
  ranking: Array<{ optionId: string; score: number | null; unknownInputs: string[]; verifiedInputs: string[]; assumedInputs: string[] }>;
  tradeoffs: Array<{ optionId: string; key: string; label: string; verdict: 'better' | 'worse' | 'unknown'; detail: string }>;
  sensitivity: Array<{ key: string; label: string; affectsRanking: boolean; detail: string }>;
  caveats: string[];
}

export interface CareerScenario {
  id: string;
  name: string;
  kind: 'goals' | 'offers' | 'mixed';
  options: ScenarioOption[];
  priorities: GoalPriority[];
  assumptions: ScenarioAssumption[];
  result: ScenarioResult | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CareerInsight {
  id: string;
  kind: string;
  statement: string;
  cohort: Record<string, unknown>;
  sampleSize: number;
  denominator: number;
  missingOutcomes: number;
  observationWindow: { from: string | null; to: string | null };
  sourceRefs: EvidenceRef[];
  policyVersion: string;
  status: 'active' | 'stale' | 'revoked';
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown when an update with an expected revision affected zero rows. */
export class ConflictError extends Error {
  readonly code = 'conflict';
  constructor(public readonly entity: string, public readonly id: string, public readonly expectedRevision: number) {
    super(`${entity} ${id} changed since revision ${expectedRevision}`);
    this.name = 'ConflictError';
  }
}

/** Thrown when an owned record cannot be found (or is not owned by the user). */
export class NotFoundError extends Error {
  readonly code = 'not_found';
  constructor(public readonly entity: string, public readonly id: string) {
    super(`${entity} ${id} is unavailable`);
    this.name = 'NotFoundError';
  }
}
