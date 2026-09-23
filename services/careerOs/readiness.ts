/**
 * Application readiness (COS-018/COS-022 logic): necessary and optional
 * preparation items with complete / incomplete / blocked states and the
 * workspace section that resolves each. It is a checklist, never a score.
 */
import type { ApplicationArtifact, ApplicationRecord, InterviewSession, Opportunity, Readiness, ReadinessItem } from './types';

/** The same short date style as the rest of Career OS ("Sep 21, 2026"). */
const recordedOn = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export interface ReadinessInput {
  application: ApplicationRecord;
  artifacts: ApplicationArtifact[];
  /** The PRISM run bound to this application, if any. */
  prismRun?: { id: string; status: string } | null;
  /** The resume record `currentResumeId` points at (null when it cannot be loaded). */
  resume?: { id: string; revision?: number } | null;
  interviewSessions?: InterviewSession[];
  opportunity?: Opportunity | null;
  now?: Date;
}

const answered = (a: ApplicationArtifact): boolean => {
  const answer = a.content?.answer;
  return (typeof answer === 'string' && answer.trim() !== '') || a.plainText.trim() !== '';
};

export function computeReadiness(input: ReadinessInput): Readiness {
  const { application: app, artifacts } = input;
  const items: ReadinessItem[] = [];
  const byKind = (kind: ApplicationArtifact['kind']) => artifacts.filter((a) => a.applicationId === app.id && a.kind === kind && a.status !== 'snapshot');

  // Necessary: role analysis reviewed.
  const analyses = byKind('role_analysis');
  items.push(analyses.some((a) => a.status === 'reviewed' && !a.stale)
    ? { id: 'role-analysis', label: 'Role analysis reviewed', kind: 'necessary', state: 'complete', destination: 'analysis' }
    : { id: 'role-analysis', label: 'Role analysis reviewed', kind: 'necessary', state: 'incomplete', destination: 'analysis', detail: analyses.length > 0 ? (analyses.some((a) => a.stale) ? 'Analysis is stale after a change; review it again.' : 'Draft analysis not yet reviewed.') : 'No role analysis yet.' });

  // Necessary: CV linked and reviewed.
  const run = input.prismRun ?? null;
  if (!app.currentResumeId) {
    items.push(run && run.status === 'failed'
      ? { id: 'cv', label: 'Application CV', kind: 'necessary', state: 'blocked', destination: 'cv', detail: 'The tailoring run failed; retry it or link a CV manually.' }
      : { id: 'cv', label: 'Application CV', kind: 'necessary', state: 'incomplete', destination: 'cv', detail: run && run.status === 'review' ? 'Tailored CV is waiting for your review.' : run ? 'Tailoring in progress.' : 'No CV linked to this application.' });
  } else if (input.resume === null) {
    items.push({ id: 'cv', label: 'Application CV', kind: 'necessary', state: 'incomplete', destination: 'cv', detail: 'The linked CV is unavailable; link another one explicitly.' });
  } else if (run && run.status === 'review') {
    items.push({ id: 'cv', label: 'Application CV', kind: 'necessary', state: 'incomplete', destination: 'cv', detail: 'A newer tailored version is waiting for your review.' });
  } else {
    items.push({ id: 'cv', label: 'Application CV', kind: 'necessary', state: 'complete', destination: 'cv' });
  }

  // Necessary only when employer questions exist.
  const questions = byKind('employer_question');
  if (questions.length > 0) {
    const open = questions.filter((q) => !(answered(q) && q.status === 'reviewed'));
    items.push(open.length === 0
      ? { id: 'questions', label: 'Employer questions answered', kind: 'necessary', state: 'complete', destination: 'questions' }
      : { id: 'questions', label: 'Employer questions answered', kind: 'necessary', state: 'incomplete', destination: 'questions', detail: `${open.length} of ${questions.length} still need a reviewed answer.` });
  }

  // Necessary: a user-confirmed submission record.
  items.push(app.submittedAt && app.submissionSnapshot
    ? { id: 'submission', label: 'Submission recorded', kind: 'necessary', state: 'complete', destination: 'activity', detail: `Recorded ${recordedOn(app.submittedAt)}.` }
    : { id: 'submission', label: 'Submission recorded', kind: 'necessary', state: 'incomplete', destination: 'activity', detail: 'Record the submission yourself once you have sent it; opening the employer site does not count.' });

  // Optional items.
  const optional = (id: string, label: string, kind: ApplicationArtifact['kind'], destination: ReadinessItem['destination']) => {
    const list = byKind(kind);
    items.push(list.some((a) => a.status === 'reviewed' && !a.stale)
      ? { id, label, kind: 'optional', state: 'complete', destination }
      : { id, label, kind: 'optional', state: 'incomplete', destination, detail: list.length > 0 ? 'Draft not yet reviewed.' : 'Not started.' });
  };
  optional('cover-letter', 'Cover letter', 'cover_letter', 'cover-letter');
  optional('linkedin', 'LinkedIn note', 'linkedin', 'linkedin');
  optional('networking', 'Networking note', 'networking_note', 'networking');

  const sessions = (input.interviewSessions ?? []).filter((s) => s.applicationId === app.id && s.status !== 'cancelled');
  items.push(sessions.some((s) => s.status === 'prepared' || s.status === 'completed')
    ? { id: 'interview-prep', label: 'Interview preparation', kind: 'optional', state: 'complete', destination: 'interview' }
    : { id: 'interview-prep', label: 'Interview preparation', kind: 'optional', state: 'incomplete', destination: 'interview', detail: sessions.length > 0 ? 'Session planned; themes not yet covered.' : 'No interview session recorded.' });

  return { items, computedAt: (input.now ?? new Date()).toISOString() };
}

export interface ReadinessSummary {
  necessaryComplete: number;
  necessaryTotal: number;
  blocked: ReadinessItem[];
  incomplete: ReadinessItem[];
  /** Every necessary item complete and nothing blocked. */
  ready: boolean;
}

/** Counts for display — deliberately not a percentage. */
export function summarizeReadiness(readiness: Readiness): ReadinessSummary {
  const necessary = readiness.items.filter((i) => i.kind === 'necessary');
  const blocked = readiness.items.filter((i) => i.state === 'blocked');
  const incomplete = readiness.items.filter((i) => i.state === 'incomplete');
  const necessaryComplete = necessary.filter((i) => i.state === 'complete').length;
  return { necessaryComplete, necessaryTotal: necessary.length, blocked, incomplete, ready: blocked.length === 0 && necessaryComplete === necessary.length };
}
