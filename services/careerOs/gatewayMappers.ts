/**
 * Row/result mappers for the career-gateway, career-coach and ai-interview
 * Edge Functions. Row → domain conversions reuse the shared mappers in
 * ./mappers.ts; this file only knows the per-tool result envelopes the
 * gateway returns (supabase/functions/career-gateway/tools.ts) and turns
 * them into the camelCase types in ./types.ts.
 */
import type {
  ActionRun, ApplicationArtifact, ApplicationStage, ArtifactKind, CareerAction, ClosedReason, CoachConversation, CoachMessage,
  InterviewSession, LegacyJobStatus, OutcomeObservation, PracticeFeedback,
} from './types';
import { arr, bool, int, numOrNull, obj, objOrNull, rowToAction, rowToActionRun, rowToArtifact, rowToConversation, rowToInterview, rowToMessage, rowToOutcome, str, strArr, strOrNull } from './mappers';

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export type ConfirmationPolicy = 'none' | 'diff' | 'explicit';

export interface ConfirmationRequired {
  token: string;
  contentHash: string;
  summary: string;
  destination?: string;
  expiresAt: string;
  policy: Exclude<ConfirmationPolicy, 'none'>;
}

export interface GatewayResponse<T> {
  run: ActionRun;
  result?: T;
  confirmationRequired?: ConfirmationRequired;
}

export function mapConfirmationRequired(raw: unknown): ConfirmationRequired | undefined {
  const c = objOrNull(raw);
  if (!c || typeof c.token !== 'string' || typeof c.contentHash !== 'string') return undefined;
  return {
    token: c.token,
    contentHash: c.contentHash,
    summary: str(c.summary),
    ...(typeof c.destination === 'string' ? { destination: c.destination } : {}),
    expiresAt: str(c.expiresAt),
    policy: c.policy === 'explicit' ? 'explicit' : 'diff',
  };
}

export function mapGatewayResponse<T>(raw: unknown, mapResult: (result: unknown) => T): GatewayResponse<T> {
  const body = obj(raw);
  const out: GatewayResponse<T> = { run: rowToActionRun(obj(body.run)) };
  if (body.result !== undefined) out.result = mapResult(body.result);
  const confirmation = mapConfirmationRequired(body.confirmationRequired);
  if (confirmation) out.confirmationRequired = confirmation;
  return out;
}

// ---------------------------------------------------------------------------
// Projections the gateway returns (ids/titles/revisions/counts only)
// ---------------------------------------------------------------------------

export interface ApplicationProjection {
  id: string;
  company: string;
  role: string;
  stage: ApplicationStage | null;
  status: LegacyJobStatus;
  closedReason: ClosedReason | null;
  opportunityId: string | null;
  campaignId: string | null;
  goalId: string | null;
  goalRevision: number | null;
  currentResumeId: string | null;
  prismRunId: string | null;
  readiness: Record<string, unknown> | null;
  revision: number;
}

export function mapApplicationProjection(raw: unknown): ApplicationProjection {
  const p = obj(raw);
  return {
    id: str(p.id),
    company: str(p.company),
    role: str(p.role),
    stage: (strOrNull(p.stage) as ApplicationStage | null),
    status: (str(p.status) || 'wishlist') as LegacyJobStatus,
    closedReason: strOrNull(p.closedReason) as ClosedReason | null,
    opportunityId: strOrNull(p.opportunityId),
    campaignId: strOrNull(p.campaignId),
    goalId: strOrNull(p.goalId),
    goalRevision: numOrNull(p.goalRevision),
    currentResumeId: strOrNull(p.currentResumeId),
    prismRunId: strOrNull(p.prismRunId),
    readiness: objOrNull(p.readiness),
    revision: int(p.revision, 1),
  };
}

export interface ArtifactProjection {
  id: string;
  kind: ArtifactKind;
  title: string;
  source: string;
  status: string;
  stale: boolean;
  revision: number;
  factIds: string[];
  length: number;
  updatedAt: string;
}

export function mapArtifactProjection(raw: unknown): ArtifactProjection {
  const a = obj(raw);
  return {
    id: str(a.id), kind: str(a.kind) as ArtifactKind, title: str(a.title), source: str(a.source), status: str(a.status),
    stale: bool(a.stale), revision: int(a.revision, 1), factIds: strArr(a.factIds), length: int(a.length, 0), updatedAt: str(a.updatedAt),
  };
}

export interface InterviewProjection {
  id: string;
  status: string;
  scheduledAt: string | null;
  timeZone: string | null;
  interviewType: string;
  themeCount: number;
  coveredThemes: number;
  practiceCount: number;
  answeredCount: number;
  revision: number;
}

export function mapInterviewProjection(raw: unknown): InterviewProjection {
  const s = obj(raw);
  return {
    id: str(s.id), status: str(s.status), scheduledAt: strOrNull(s.scheduledAt), timeZone: strOrNull(s.timeZone), interviewType: str(s.interviewType),
    themeCount: int(s.themeCount, 0), coveredThemes: int(s.coveredThemes, 0), practiceCount: int(s.practiceCount, 0), answeredCount: int(s.answeredCount, 0),
    revision: int(s.revision, 1),
  };
}

// ---------------------------------------------------------------------------
// Per-tool results
// ---------------------------------------------------------------------------

export interface StartApplicationResult { application: ApplicationProjection }
export interface ResumeApplicationResult {
  application: ApplicationProjection;
  opportunity: { id: string; title: string; company: string; status: string; revision: number } | null;
  artifacts: ArtifactProjection[];
  prism: Array<{ id: string; status: string; resumeId: string | null; updatedAt: string }>;
  interviews: InterviewProjection[];
}
export interface RequestTailoringResult {
  prismIdempotencyKey: string;
  applicationId: string;
  sourceResumeId: string;
  sourceResumeRevision: number;
  templateId: string | null;
  actionRunId: string;
  prismRunId?: string;
  resumeId?: string;
}
export interface ReportResultResult { run: ActionRun }
export interface PrepareInterviewResult { session: InterviewSession; created: boolean }
export interface CreatePlanResult { actions: CareerAction[] }
export interface RecordOutcomeResult { outcome: OutcomeObservation; application: ApplicationProjection }
export interface SaveArtifactResult { artifact: ApplicationArtifact; replaced: boolean }
export interface GenerateArtifactResult { artifact: ApplicationArtifact; newAssertions: string[] }
export interface ExplainPrioritiesResult { actions: Array<Record<string, unknown>>; count: number }
export interface ReviewEvidenceResult {
  facts: Array<{
    id: string; kind: string; title: string; organization: string; confirmationState: string; reviewState: string; status: string; revision: number;
    referenceCount: number; staleReferences: Array<{ artifactKind: string; artifactId: string; factRevision: number }>;
  }>;
  count: number;
}
export type CoverageState = 'supported' | 'partial' | 'missing' | 'unknown' | 'not_analyzed' | 'not_required';
export interface CompareOpportunitiesResult {
  opportunities: Array<Record<string, unknown>>;
  coverage: { opportunityIds: string[]; rows: Array<{ text: string; states: Record<string, CoverageState> }>; totals: Array<Record<string, unknown>> };
}
export type InspectContextResult = Record<string, unknown>;

export const mapStartApplicationResult = (raw: unknown): StartApplicationResult => ({ application: mapApplicationProjection(obj(raw).application) });

export const mapResumeApplicationResult = (raw: unknown): ResumeApplicationResult => {
  const r = obj(raw);
  const opp = objOrNull(r.opportunity);
  return {
    application: mapApplicationProjection(r.application),
    opportunity: opp ? { id: str(opp.id), title: str(opp.title), company: str(opp.company), status: str(opp.status), revision: int(opp.revision, 1) } : null,
    artifacts: arr<unknown>(r.artifacts).map(mapArtifactProjection),
    prism: arr<Record<string, unknown>>(r.prism).map((p) => ({ id: str(p.id), status: str(p.status), resumeId: strOrNull(p.resumeId), updatedAt: str(p.updatedAt) })),
    interviews: arr<unknown>(r.interviews).map(mapInterviewProjection),
  };
};

export const mapRequestTailoringResult = (raw: unknown): RequestTailoringResult => {
  const r = obj(raw);
  return {
    prismIdempotencyKey: str(r.prismIdempotencyKey), applicationId: str(r.applicationId), sourceResumeId: str(r.sourceResumeId),
    sourceResumeRevision: int(r.sourceResumeRevision, 1), templateId: strOrNull(r.templateId), actionRunId: str(r.actionRunId),
    ...(typeof r.prismRunId === 'string' ? { prismRunId: r.prismRunId } : {}),
    ...(typeof r.resumeId === 'string' ? { resumeId: r.resumeId } : {}),
  };
};

export const mapReportResultResult = (raw: unknown): ReportResultResult => ({ run: rowToActionRun(obj(obj(raw).run)) });
export const mapPrepareInterviewResult = (raw: unknown): PrepareInterviewResult => ({ session: rowToInterview(obj(obj(raw).session)), created: bool(obj(raw).created) });
export const mapCreatePlanResult = (raw: unknown): CreatePlanResult => ({ actions: arr<Record<string, unknown>>(obj(raw).actions).map(rowToAction) });
export const mapRecordOutcomeResult = (raw: unknown): RecordOutcomeResult => ({
  outcome: rowToOutcome(obj(obj(raw).outcome)), application: mapApplicationProjection(obj(raw).application),
});
export const mapSaveArtifactResult = (raw: unknown): SaveArtifactResult => ({ artifact: rowToArtifact(obj(obj(raw).artifact)), replaced: bool(obj(raw).replaced) });
export const mapGenerateArtifactResult = (raw: unknown): GenerateArtifactResult => ({
  artifact: rowToArtifact(obj(obj(raw).artifact)), newAssertions: strArr(obj(raw).newAssertions),
});
export const mapExplainPrioritiesResult = (raw: unknown): ExplainPrioritiesResult => ({
  actions: arr<Record<string, unknown>>(obj(raw).actions), count: int(obj(raw).count, 0),
});
export const mapReviewEvidenceResult = (raw: unknown): ReviewEvidenceResult => ({
  facts: arr<Record<string, unknown>>(obj(raw).facts).map((f) => ({
    id: str(f.id), kind: str(f.kind), title: str(f.title), organization: str(f.organization), confirmationState: str(f.confirmationState),
    reviewState: str(f.reviewState), status: str(f.status), revision: int(f.revision, 1), referenceCount: int(f.referenceCount, 0),
    staleReferences: arr<Record<string, unknown>>(f.staleReferences).map((s) => ({ artifactKind: str(s.artifactKind), artifactId: str(s.artifactId), factRevision: int(s.factRevision, 1) })),
  })),
  count: int(obj(raw).count, 0),
});
export const mapCompareOpportunitiesResult = (raw: unknown): CompareOpportunitiesResult => {
  const r = obj(raw);
  const coverage = obj(r.coverage);
  return {
    opportunities: arr<Record<string, unknown>>(r.opportunities),
    coverage: {
      opportunityIds: strArr(coverage.opportunityIds),
      rows: arr<Record<string, unknown>>(coverage.rows).map((row) => ({ text: str(row.text), states: obj(row.states) as Record<string, CoverageState> })),
      totals: arr<Record<string, unknown>>(coverage.totals),
    },
  };
};
export const mapInspectContextResult = (raw: unknown): InspectContextResult => obj(raw);

// ---------------------------------------------------------------------------
// Coach / interview envelopes
// ---------------------------------------------------------------------------

export interface CoachReply {
  conversationId: string;
  created: boolean;
  message: CoachMessage;
  abstained: boolean;
  abstainReason: string | null;
  caveat: boolean;
  /** True when the metered action was refunded (model unavailable). */
  released: boolean;
  dropped: { citations: number; proposals: number };
  conversation: CoachConversation | null;
  contextUsed: { ids: string[]; refs: Record<string, string>; revisions: Record<string, number> };
}

export function mapCoachReply(raw: unknown): CoachReply {
  const r = obj(raw);
  const used = obj(r.contextUsed);
  const dropped = obj(r.dropped);
  return {
    conversationId: str(r.conversationId),
    created: bool(r.created),
    message: rowToMessage(obj(r.message)),
    abstained: bool(r.abstained),
    abstainReason: strOrNull(r.abstainReason),
    caveat: bool(r.caveat),
    released: bool(r.released),
    dropped: { citations: int(dropped.citations, 0), proposals: int(dropped.proposals, 0) },
    conversation: r.conversation ? rowToConversation(obj(r.conversation)) : null,
    contextUsed: {
      ids: strArr(used.ids),
      refs: Object.fromEntries(Object.entries(obj(used.refs)).filter((e): e is [string, string] => typeof e[1] === 'string')),
      revisions: Object.fromEntries(Object.entries(obj(used.revisions)).filter((e): e is [string, number] => typeof e[1] === 'number')),
    },
  };
}

export interface PracticeQuestionsResult { session: InterviewSession; added: number; charged: boolean }
export interface PracticeFeedbackResult {
  session: InterviewSession;
  practiceItemId: string;
  feedback: PracticeFeedback & { reason?: string };
  charged: boolean;
}

export const mapPracticeQuestionsResult = (raw: unknown): PracticeQuestionsResult => ({
  session: rowToInterview(obj(obj(raw).session)), added: int(obj(raw).added, 0), charged: bool(obj(raw).charged),
});

export function mapPracticeFeedbackResult(raw: unknown): PracticeFeedbackResult {
  const r = obj(raw);
  const f = obj(r.feedback);
  return {
    session: rowToInterview(obj(r.session)),
    practiceItemId: str(r.practiceItemId),
    feedback: {
      strengths: strArr(f.strengths), gaps: strArr(f.gaps), citations: strArr(f.citations), abstained: bool(f.abstained),
      ...(typeof f.reason === 'string' ? { reason: f.reason } : {}),
    },
    charged: bool(r.charged),
  };
}
