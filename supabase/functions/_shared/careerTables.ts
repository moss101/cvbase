// The single list of every user-owned Career OS table (COS-003 foundation
// migration, 20260920100000_career_os_foundation.sql) as account-export
// emits it. account-export's test parses that migration and fails when a
// `create table public.…` is missing here, so a new owned table cannot be
// forgotten by the export; the same test checks each table cascades from
// auth.users so account-delete (auth.admin.deleteUser) covers it.
//
// Column policy: every column (`*`) — these tables hold the user's own
// facts, goals, opportunities (including pasted JD text), artifacts,
// conversations and receipts, and the ADR (§6) treats all of it as user data.
// The only exclusions in the whole export remain Stripe identifiers and PRISM
// run bodies (see PRISM_RUN_COLUMNS).

export interface OwnedTable {
  /** Postgres table name under `public`. */
  table: string;
  /** Key in the export document (camelCase). */
  section: string;
  /** PostgREST column selection. */
  columns: string;
  /** Tables keyed by user_id hold at most one row: exported as an object. */
  single?: boolean;
}

export const CAREER_OS_TABLES: readonly OwnedTable[] = [
  { table: 'career_profiles', section: 'careerProfile', columns: '*', single: true },
  { table: 'career_facts', section: 'careerFacts', columns: '*' },
  { table: 'career_fact_references', section: 'careerFactReferences', columns: '*' },
  { table: 'career_goals', section: 'careerGoals', columns: '*' },
  { table: 'career_goal_revisions', section: 'careerGoalRevisions', columns: '*' },
  { table: 'opportunities', section: 'opportunities', columns: '*' },
  { table: 'campaigns', section: 'campaigns', columns: '*' },
  { table: 'campaign_opportunities', section: 'campaignOpportunities', columns: '*' },
  { table: 'application_artifacts', section: 'applicationArtifacts', columns: '*' },
  { table: 'interview_sessions', section: 'interviewSessions', columns: '*' },
  { table: 'application_outcomes', section: 'applicationOutcomes', columns: '*' },
  { table: 'opportunity_analyses', section: 'opportunityAnalyses', columns: '*' },
  { table: 'career_actions', section: 'careerActions', columns: '*' },
  { table: 'action_runs', section: 'actionRuns', columns: '*' },
  { table: 'coach_conversations', section: 'coachConversations', columns: '*' },
  { table: 'coach_messages', section: 'coachMessages', columns: '*' },
  { table: 'career_events', section: 'careerEvents', columns: '*' },
  { table: 'user_notifications', section: 'userNotifications', columns: '*' },
  { table: 'career_preferences', section: 'careerPreferences', columns: '*', single: true },
  { table: 'career_scenarios', section: 'careerScenarios', columns: '*' },
  { table: 'career_insights', section: 'careerInsights', columns: '*' },
  { table: 'career_migrations', section: 'careerMigrations', columns: '*' },
];

/** prism_runs metadata only: the binding columns are user data, the run
 *  bodies (jd/cv text, checkpoints, drafts, results) are never exported. */
export const PRISM_RUN_COLUMNS =
  'id,status,template_id,resume_id,application_id,source_resume_id,source_resume_revision,idempotency_key,' +
  'error_code,tokens_used,schema_version,prompt_version,created_at,updated_at';

/** Relative path of the foundation migration, for the coverage test. */
export const CAREER_OS_MIGRATION = 'supabase/migrations/20260920100000_career_os_foundation.sql';

/** Table names `create table public.<name> (` in a migration, in order. */
export function createdTables(sql: string): string[] {
  return [...sql.matchAll(/^create table (?:if not exists )?public\.(\w+)\s*\(/gim)].map((m) => m[1]);
}

/** The `create table` body for one table (between the outer parentheses). */
export function tableBody(sql: string, table: string): string | null {
  const re = new RegExp(`^create table (?:if not exists )?public\\.${table}\\s*\\(`, 'im');
  const m = re.exec(sql);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')' && --depth === 0) return sql.slice(m.index + m[0].length, i);
  }
  return null;
}

/** True when the table's user_id column cascades from auth.users. */
export function cascadesFromAuthUsers(body: string): boolean {
  return /^\s*user_id uuid (?:not null |primary key )?references auth\.users \(id\) on delete cascade/m.test(body);
}
