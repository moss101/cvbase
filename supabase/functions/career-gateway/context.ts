import { HttpError } from '../_shared/respond.ts';
import { notFound } from './policy.ts';

// =========================================================================
// Owned-row loaders and minimal projections shared by the gateway tools and
// the Coach context bundle. Every loader filters on user_id with the
// service client (RLS additionally covers direct client reads), so a foreign
// id resolves to `not_found` without revealing whether the row exists.
// Projections carry ids, titles, revisions, states and counts — the smallest
// shape each consumer needs — and the only free text they include is the
// user's own (fact titles/narratives, requirement lines, captured JD
// excerpts), which the prompts wrap as untrusted data.
// =========================================================================

// Minimal structural client: the real SupabaseClient and the in-memory test
// fake both satisfy it.
// deno-lint-ignore no-explicit-any
export type Db = { from: (table: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

export type Row = Record<string, unknown>;

export interface ApplicationRow extends Row {
  id: string;
  user_id: string;
  company: string;
  role: string;
  status: string;
  stage: string | null;
  closed_reason: string | null;
  opportunity_id: string | null;
  campaign_id: string | null;
  goal_id: string | null;
  goal_revision: number | null;
  goal_snapshot: Row | null;
  current_resume_id: string | null;
  prism_run_id: string | null;
  readiness: Row | null;
  revision: number;
}

export interface OpportunityRow extends Row {
  id: string;
  user_id: string;
  title: string;
  company: string;
  status: string;
  listing_status: string;
  captured_content: string;
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  comp_period: string | null;
  requirements: Array<{ id: string; text: string; kind?: string }>;
  revision: number;
}

export interface FactRow extends Row {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  organization: string;
  start_date: string;
  end_date: string;
  narrative: string;
  payload: Row;
  confirmation_state: string;
  review_state: string;
  status: string;
  revision: number;
}

export interface AnalysisRow extends Row {
  id: string;
  opportunity_id: string;
  goal_id: string | null;
  qualification: {
    supported?: Array<{ requirementId: string; text: string }>;
    partial?: Array<{ requirementId: string; text: string }>;
    missing?: Array<{ requirementId: string; text: string }>;
    unknown?: Array<{ requirementId: string; text: string }>;
  };
  direction: Row;
  ats_score: number | null;
  stale: boolean;
  computed_at: string;
}

async function unwrap<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new HttpError(500, 'internal_error', { detail: `${what}: ${error.message}` });
  return data;
}

/** One owned row or null (never another user's row). */
export async function loadOwned<T extends Row = Row>(db: Db, table: string, userId: string, id: string, cols = '*'): Promise<T | null> {
  const data = await unwrap<T | null>(
    db.from(table).select(cols).eq('id', id).eq('user_id', userId).maybeSingle(),
    `${table} load`,
  );
  return data ?? null;
}

/** One owned row or 404 `not_found` naming only the entity kind. */
export async function requireOwned<T extends Row = Row>(db: Db, table: string, userId: string, id: string, entity: string, cols = '*'): Promise<T> {
  const row = await loadOwned<T>(db, table, userId, id, cols);
  if (!row) throw notFound(entity);
  return row;
}

/** Owned rows by id list; every id must resolve or the call is `not_found`
 *  (a partial answer would reveal which ids exist). */
export async function requireOwnedAll<T extends Row = Row>(db: Db, table: string, userId: string, ids: string[], entity: string, cols = '*'): Promise<T[]> {
  if (ids.length === 0) return [];
  const rows = await unwrap<T[] | null>(
    db.from(table).select(cols).eq('user_id', userId).in('id', ids),
    `${table} load`,
  ) ?? [];
  const byId = new Map(rows.map((r) => [r.id as string, r]));
  if (ids.some((id) => !byId.has(id))) throw notFound(entity);
  return ids.map((id) => byId.get(id)!);
}

export async function listOwned<T extends Row = Row>(
  db: Db,
  table: string,
  userId: string,
  opts: { filters?: Record<string, unknown>; inFilter?: [string, unknown[]]; order?: [string, boolean]; limit?: number; cols?: string } = {},
): Promise<T[]> {
  let q = db.from(table).select(opts.cols ?? '*').eq('user_id', userId);
  for (const [k, v] of Object.entries(opts.filters ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
  if (opts.inFilter) q = q.in(opts.inFilter[0], opts.inFilter[1]);
  if (opts.order) q = q.order(opts.order[0], { ascending: opts.order[1] });
  if (opts.limit) q = q.limit(opts.limit);
  return await unwrap<T[] | null>(q, `${table} list`) ?? [];
}

export async function countOwned(db: Db, table: string, userId: string, filters: Record<string, unknown> = {}): Promise<number> {
  let q = db.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId);
  for (const [k, v] of Object.entries(filters)) q = v === null ? q.is(k, null) : q.eq(k, v);
  const { count, error } = await q;
  if (error) throw new HttpError(500, 'internal_error', { detail: `${table} count: ${error.message}` });
  return count ?? 0;
}

// -------------------------------------------------------------------------
// Domain loaders
// -------------------------------------------------------------------------

export const loadApplication = (db: Db, userId: string, id: string) =>
  requireOwned<ApplicationRow>(db, 'job_applications', userId, id, 'application');
export const loadOpportunity = (db: Db, userId: string, id: string) =>
  requireOwned<OpportunityRow>(db, 'opportunities', userId, id, 'opportunity');
export const loadGoal = (db: Db, userId: string, id: string) => requireOwned(db, 'career_goals', userId, id, 'goal');
export const loadCampaign = (db: Db, userId: string, id: string) => requireOwned(db, 'campaigns', userId, id, 'campaign');
export const loadResume = (db: Db, userId: string, id: string) =>
  requireOwned(db, 'resumes', userId, id, 'resume', 'id,user_id,title,revision,application_id,updated_at');

/** Active facts, confirmed/verified first, bounded. */
export async function loadActiveFacts(db: Db, userId: string, opts: { ids?: string[]; kinds?: string[]; limit?: number } = {}): Promise<FactRow[]> {
  let rows: FactRow[];
  if (opts.ids && opts.ids.length) {
    rows = await requireOwnedAll<FactRow>(db, 'career_facts', userId, opts.ids, 'fact');
    rows = rows.filter((r) => r.status === 'active');
    if (rows.length !== opts.ids.length) throw notFound('fact');
  } else {
    rows = await listOwned<FactRow>(db, 'career_facts', userId, {
      filters: { status: 'active' },
      inFilter: opts.kinds ? ['kind', opts.kinds] : undefined,
      order: ['sort_order', true],
      limit: 200,
    });
  }
  const rank = (s: string) => (s === 'verified' ? 0 : s === 'user_confirmed' ? 1 : s === 'inferred' ? 2 : 3);
  rows.sort((a, b) => rank(a.confirmation_state) - rank(b.confirmation_state));
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

export async function loadLatestAnalysis(db: Db, userId: string, opportunityId: string, goalId?: string | null): Promise<AnalysisRow | null> {
  const rows = await listOwned<AnalysisRow>(db, 'opportunity_analyses', userId, {
    filters: goalId ? { opportunity_id: opportunityId, goal_id: goalId } : { opportunity_id: opportunityId },
    order: ['computed_at', false],
    limit: 1,
  });
  return rows[0] ?? null;
}

export const loadArtifacts = (db: Db, userId: string, applicationId: string) =>
  listOwned(db, 'application_artifacts', userId, {
    filters: { application_id: applicationId }, order: ['updated_at', false],
    cols: 'id,user_id,application_id,kind,title,source,status,stale,revision,provenance,plain_text,updated_at',
  });

export const loadInterviewSessions = (db: Db, userId: string, applicationId: string) =>
  listOwned(db, 'interview_sessions', userId, { filters: { application_id: applicationId }, order: ['created_at', false] });

export const loadPrismRunsForApplication = (db: Db, userId: string, applicationId: string) =>
  listOwned(db, 'prism_runs', userId, {
    filters: { application_id: applicationId }, order: ['updated_at', false], limit: 3,
    cols: 'id,user_id,status,resume_id,idempotency_key,application_id,updated_at',
  });

// -------------------------------------------------------------------------
// Projections (ids/titles/revisions/states/counts only)
// -------------------------------------------------------------------------

export function projectApplication(app: ApplicationRow) {
  return {
    id: app.id,
    company: app.company,
    role: app.role,
    stage: app.stage,
    status: app.status,
    closedReason: app.closed_reason,
    opportunityId: app.opportunity_id,
    campaignId: app.campaign_id,
    goalId: app.goal_id,
    goalRevision: app.goal_revision,
    currentResumeId: app.current_resume_id,
    prismRunId: app.prism_run_id,
    readiness: app.readiness,
    revision: app.revision,
  };
}

export function compKnown(o: OpportunityRow): boolean {
  return o.comp_min != null || o.comp_max != null;
}

export function projectOpportunity(o: OpportunityRow) {
  return {
    id: o.id,
    title: o.title,
    company: o.company,
    status: o.status,
    listingStatus: o.listing_status,
    compensation: compKnown(o)
      ? { min: o.comp_min, max: o.comp_max, currency: o.comp_currency, period: o.comp_period }
      : 'unknown' as const,
    requirementCount: Array.isArray(o.requirements) ? o.requirements.length : 0,
    requirements: Array.isArray(o.requirements) ? o.requirements.map((r) => ({ id: r.id, text: r.text, kind: r.kind ?? 'unknown' })) : [],
    revision: o.revision,
  };
}

export function projectFact(f: FactRow) {
  return {
    id: f.id,
    kind: f.kind,
    title: f.title,
    organization: f.organization,
    period: [f.start_date, f.end_date].filter(Boolean).join(' – '),
    narrative: f.narrative,
    metric: typeof f.payload?.metric === 'string' ? f.payload.metric : undefined,
    confirmationState: f.confirmation_state,
    reviewState: f.review_state,
    revision: f.revision,
  };
}

export function projectAnalysis(a: AnalysisRow | null) {
  if (!a) return null;
  const q = a.qualification ?? {};
  return {
    id: a.id,
    goalId: a.goal_id,
    atsScore: a.ats_score,
    stale: a.stale,
    computedAt: a.computed_at,
    supported: (q.supported ?? []).map((r) => ({ requirementId: r.requirementId, text: r.text })),
    partial: (q.partial ?? []).map((r) => ({ requirementId: r.requirementId, text: r.text })),
    missing: (q.missing ?? []).map((r) => ({ requirementId: r.requirementId, text: r.text })),
    unknown: (q.unknown ?? []).map((r) => ({ requirementId: r.requirementId, text: r.text })),
  };
}

export function projectArtifact(a: Row) {
  return {
    id: a.id,
    kind: a.kind,
    title: a.title,
    source: a.source,
    status: a.status,
    stale: a.stale,
    revision: a.revision,
    factIds: Array.isArray((a.provenance as Row | null)?.factIds) ? (a.provenance as { factIds: string[] }).factIds : [],
    length: typeof a.plain_text === 'string' ? a.plain_text.length : 0,
    updatedAt: a.updated_at,
  };
}

export function projectInterview(s: Row) {
  const practice = Array.isArray(s.practice) ? s.practice as Row[] : [];
  const themes = Array.isArray(s.themes) ? s.themes as Row[] : [];
  return {
    id: s.id,
    status: s.status,
    scheduledAt: s.scheduled_at,
    timeZone: s.time_zone,
    interviewType: s.interview_type,
    themeCount: themes.length,
    coveredThemes: themes.filter((t) => t.covered === true).length,
    practiceCount: practice.length,
    answeredCount: practice.filter((p) => typeof p.answer === 'string' && p.answer.trim().length > 0).length,
    revision: s.revision,
  };
}

/** Application counts by stage for one campaign (observed, never synthetic). */
export async function campaignCounts(db: Db, userId: string, campaignId: string) {
  const apps = await listOwned<ApplicationRow>(db, 'job_applications', userId, {
    filters: { campaign_id: campaignId }, cols: 'id,user_id,campaign_id,stage,closed_reason',
  });
  const stages: Record<string, number> = {};
  for (const a of apps) stages[a.stage ?? 'unknown'] = (stages[a.stage ?? 'unknown'] ?? 0) + 1;
  const opportunities = await countOwned(db, 'campaign_opportunities', userId, { campaign_id: campaignId });
  return { opportunities, applications: apps.length, stages };
}

// -------------------------------------------------------------------------
// Coach context bundle
// -------------------------------------------------------------------------

export interface BundleItem {
  /** Stable citation id `{kind}:{id}`. */
  cid: string;
  kind: 'goal' | 'campaign' | 'opportunity' | 'application' | 'fact' | 'artifact' | 'analysis' | 'interview';
  id: string;
  label: string;
  /** Projection handed to the prompt (already minimal). */
  data: Row;
}

export interface ContextBundle {
  items: BundleItem[];
  refs: { goal?: string; campaign?: string; opportunity?: string; application?: string };
  revisions: Record<string, number>;
  /** User-authored / external free text that the prompt must treat as data. */
  untrusted: { opportunityContent: string };
}

export interface BundleRefs {
  goal?: string;
  campaign?: string;
  opportunity?: string;
  application?: string;
}

const CAPTURED_CONTENT_MAX = 4000;
const BUNDLE_FACT_LIMIT = 40;

/**
 * Bounded, owned projection of the user's career records around the
 * selected refs. Ownership is enforced per row; a foreign id is
 * `not_found`. The application's persisted relationships win over the
 * hints (a conflicting opportunity hint is ignored, not applied).
 */
export async function buildContextBundle(db: Db, userId: string, refs: BundleRefs): Promise<ContextBundle> {
  const items: BundleItem[] = [];
  const revisions: Record<string, number> = {};
  const out: ContextBundle['refs'] = {};
  let opportunityContent = '';

  let app: ApplicationRow | null = null;
  if (refs.application) {
    app = await loadApplication(db, userId, refs.application);
    out.application = app.id;
    revisions.application = app.revision;
    items.push({ cid: `application:${app.id}`, kind: 'application', id: app.id, label: `${app.role} at ${app.company}`, data: projectApplication(app) });
    const artifacts = await loadArtifacts(db, userId, app.id);
    for (const a of artifacts.slice(0, 12)) {
      items.push({ cid: `artifact:${a.id}`, kind: 'artifact', id: a.id as string, label: `${a.kind} "${a.title}"`, data: projectArtifact(a) });
    }
    const sessions = await loadInterviewSessions(db, userId, app.id);
    for (const s of sessions.slice(0, 3)) {
      items.push({ cid: `interview:${s.id}`, kind: 'interview', id: s.id as string, label: `interview (${s.status})`, data: projectInterview(s) });
    }
  }

  const opportunityId = app?.opportunity_id ?? refs.opportunity;
  let opp: OpportunityRow | null = null;
  if (opportunityId) {
    opp = await loadOpportunity(db, userId, opportunityId);
    out.opportunity = opp.id;
    revisions.opportunity = opp.revision;
    items.push({ cid: `opportunity:${opp.id}`, kind: 'opportunity', id: opp.id, label: `${opp.title} at ${opp.company}`, data: projectOpportunity(opp) });
    opportunityContent = (opp.captured_content ?? '').slice(0, CAPTURED_CONTENT_MAX);
    const analysis = await loadLatestAnalysis(db, userId, opp.id, app?.goal_id ?? null);
    if (analysis) {
      items.push({ cid: `analysis:${analysis.id}`, kind: 'analysis', id: analysis.id, label: 'latest fit analysis', data: projectAnalysis(analysis) as Row });
    }
  }

  const campaignId = app?.campaign_id ?? refs.campaign;
  let campaignGoal: string | null = null;
  if (campaignId) {
    const campaign = await loadCampaign(db, userId, campaignId);
    out.campaign = campaign.id as string;
    revisions.campaign = campaign.revision as number;
    campaignGoal = (campaign.goal_id as string | null) ?? null;
    const counts = await campaignCounts(db, userId, campaign.id as string);
    items.push({
      cid: `campaign:${campaign.id}`, kind: 'campaign', id: campaign.id as string, label: `campaign "${campaign.name}"`,
      data: { id: campaign.id, name: campaign.name, status: campaign.status, goalId: campaign.goal_id, revision: campaign.revision, ...counts },
    });
  }

  const goalId = app?.goal_id ?? refs.goal ?? campaignGoal;
  let goal: Row | null = null;
  if (goalId) {
    goal = await loadGoal(db, userId, goalId);
  } else {
    const primary = await listOwned(db, 'career_goals', userId, { filters: { is_primary: true, status: 'active' }, limit: 1 });
    goal = primary[0] ?? null;
  }
  if (goal) {
    out.goal = goal.id as string;
    revisions.goal = goal.revision as number;
    items.push({
      cid: `goal:${goal.id}`, kind: 'goal', id: goal.id as string, label: `goal "${goal.title}"`,
      data: {
        id: goal.id, title: goal.title, role: goal.role, level: goal.level, industry: goal.industry, location: goal.location,
        remotePreference: goal.remote_preference,
        compensation: goal.comp_min != null || goal.comp_max != null
          ? { min: goal.comp_min, max: goal.comp_max, currency: goal.comp_currency, period: goal.comp_period } : 'unknown',
        targetDate: goal.target_date ?? 'unknown', constraints: goal.constraints, priorities: goal.priorities, revision: goal.revision,
      },
    });
  }

  const facts = await loadActiveFacts(db, userId, { limit: BUNDLE_FACT_LIMIT });
  for (const f of facts) {
    items.push({ cid: `fact:${f.id}`, kind: 'fact', id: f.id, label: `${f.kind}: ${f.title}`, data: projectFact(f) });
  }

  return { items, refs: out, revisions, untrusted: { opportunityContent } };
}
