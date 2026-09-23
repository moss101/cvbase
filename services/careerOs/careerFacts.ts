/**
 * Career facts import and review logic (COS-009), pure.
 *
 * Imports produce unconfirmed candidates with provenance. Nothing here
 * promotes a claim to `verified`, and contradictory candidates are surfaced as
 * conflicts for the user rather than merged. Fingerprints use the same
 * normalisation string as the SQL backfill but a different hash (FNV-1a, see
 * util.fingerprint), so cross-source dedupe relies on the identity key below.
 */
import type { ResumeData } from '../../types';
import type { UserProfile } from '../profileMapping';
import type { FactInput } from './mappers';
import { fingerprint, fnv1a64Hex, newId, normaliseText, stripHtml } from './util';
import type { CareerFact, FactArtifactKind, FactKind, FactReference } from './types';

export interface ResumeSource {
  id: string;
  revision?: number;
  data: ResumeData;
}

/** An import candidate: a FactInput plus the stable key the review UI can track it by. */
export interface FactCandidate extends FactInput {
  key: string;
}

const lower = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : '');
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The normalised string the SQL backfill md5s; we FNV it instead (documented in util.fingerprint). */
export function fingerprintInput(kind: FactKind, parts: string[]): string {
  return [kind, ...parts].join('|');
}

export const factFingerprint = (kind: FactKind, parts: string[]): string => fingerprint(fingerprintInput(kind, parts));

function base(kind: FactKind, resume: ResumeSource, section: string, legacyId: string | null, fp: string): Omit<FactCandidate, 'title' | 'organization' | 'location' | 'startDate' | 'endDate' | 'narrative' | 'payload' | 'sortOrder'> {
  return {
    key: fp,
    kind,
    parentFactId: null,
    confirmationState: 'inferred',
    verification: null,
    extractionConfidence: null,
    sourceKind: 'resume_import',
    sourceRef: { resumeId: resume.id, ...(resume.revision !== undefined ? { resumeRevision: resume.revision } : {}), section },
    sourceFingerprint: fp,
    legacyId,
    conflictGroup: null,
    reviewState: 'candidate',
    status: 'active',
  };
}

const fill = (c: Partial<FactCandidate>): Partial<FactCandidate> => ({
  title: '', organization: '', location: '', startDate: '', endDate: '', narrative: '', payload: {}, sortOrder: 0, ...c,
});

/**
 * Candidate facts from a stored resume. Narrative keeps the rich text; only
 * the fingerprint inputs are normalised. Entries without a title are skipped
 * (an empty row is not a claim).
 */
export function candidateFactsFromResume(resume: ResumeSource): FactCandidate[] {
  const d = resume.data ?? ({} as ResumeData);
  const out: FactCandidate[] = [];
  const push = (c: Partial<FactCandidate>) => out.push(fill(c) as FactCandidate);

  for (const e of Array.isArray(d.experience) ? d.experience : []) {
    if (!text(e.jobTitle).trim() && !text(e.company).trim()) continue;
    const fp = factFingerprint('experience', [lower(e.jobTitle), lower(e.company), text(e.startDate)]);
    push({
      ...base('experience', resume, 'experience', text(e.id) || null, fp),
      title: text(e.jobTitle), organization: text(e.company), location: text(e.location),
      startDate: text(e.startDate), endDate: text(e.endDate), narrative: text(e.description),
    });
  }
  for (const e of Array.isArray(d.education) ? d.education : []) {
    if (!text(e.degree).trim() && !text(e.school).trim()) continue;
    const fp = factFingerprint('education', [lower(e.degree), lower(e.school)]);
    push({
      ...base('education', resume, 'education', text(e.id) || null, fp),
      title: text(e.degree), organization: text(e.school), location: text(e.location),
      startDate: text(e.startDate), endDate: text(e.endDate), narrative: text(e.description),
    });
  }
  let idx = 0;
  for (const s of Array.isArray(d.skills) ? d.skills : []) {
    idx += 1;
    if (typeof s !== 'string' || !s.trim()) continue;
    const fp = factFingerprint('skill', [s.trim().toLowerCase()]);
    push({ ...base('skill', resume, 'skills', null, fp), title: s.trim(), sortOrder: idx });
  }
  for (const p of Array.isArray(d.projects) ? d.projects : []) {
    if (!text(p.name).trim()) continue;
    const fp = factFingerprint('project', [lower(p.name)]);
    push({
      ...base('project', resume, 'projects', text(p.id) || null, fp),
      title: text(p.name), startDate: text(p.startDate), endDate: text(p.endDate), narrative: text(p.description),
      payload: { technologies: text(p.technologies), link: text(p.link) },
    });
  }
  for (const c of Array.isArray(d.certifications) ? d.certifications : []) {
    if (!text(c.name).trim()) continue;
    const fp = factFingerprint('certification', [lower(c.name)]);
    push({
      ...base('certification', resume, 'certifications', text(c.id) || null, fp),
      title: text(c.name), endDate: text(c.expiryDate), narrative: text(c.description), payload: { number: text(c.number) },
    });
  }
  for (const l of Array.isArray(d.languages) ? d.languages : []) {
    if (!text(l.language).trim()) continue;
    const fp = factFingerprint('language', [lower(l.language)]);
    push({ ...base('language', resume, 'languages', text(l.id) || null, fp), title: text(l.language), payload: { proficiency: text(l.proficiency) } });
  }
  for (const a of Array.isArray(d.awards) ? d.awards : []) {
    if (!text(a.title).trim()) continue;
    const fp = factFingerprint('award', [lower(a.title), lower(a.issuer)]);
    push({ ...base('award', resume, 'awards', text(a.id) || null, fp), title: text(a.title), organization: text(a.issuer), startDate: text(a.date), narrative: text(a.description) });
  }
  for (const t of Array.isArray(d.trainings) ? d.trainings : []) {
    if (!text(t.course).trim()) continue;
    const fp = factFingerprint('training', [lower(t.course), lower(t.institution)]);
    push({ ...base('training', resume, 'trainings', text(t.id) || null, fp), title: text(t.course), organization: text(t.institution), startDate: text(t.date), narrative: text(t.description) });
  }
  for (const p of Array.isArray(d.publications) ? d.publications : []) {
    if (!text(p.title).trim()) continue;
    const fp = factFingerprint('publication', [lower(p.title)]);
    push({ ...base('publication', resume, 'publications', text(p.id) || null, fp), title: text(p.title), organization: text(p.publisher), startDate: text(p.date), narrative: text(p.description), payload: { link: text(p.link) } });
  }
  for (const v of Array.isArray(d.volunteer) ? d.volunteer : []) {
    if (!text(v.role).trim() && !text(v.organization).trim()) continue;
    const fp = factFingerprint('volunteer', [lower(v.role), lower(v.organization), text(v.startDate)]);
    push({ ...base('volunteer', resume, 'volunteer', text(v.id) || null, fp), title: text(v.role), organization: text(v.organization), location: text(v.location), startDate: text(v.startDate), endDate: text(v.endDate), narrative: text(v.description) });
  }
  for (const c of Array.isArray(d.custom) ? d.custom : []) {
    if (!text(c.title).trim()) continue;
    const fp = factFingerprint('custom', [lower(c.title), lower(c.subtitle)]);
    push({ ...base('custom', resume, 'custom', text(c.id) || null, fp), title: text(c.title), startDate: text(c.date), narrative: text(c.description), payload: { subtitle: text(c.subtitle) } });
  }
  const summary = text(d.summary?.professionalSummary);
  if (summary.trim()) {
    const fp = factFingerprint('summary', [resume.id]);
    push({ ...base('summary', resume, 'summary', null, fp), title: 'Professional summary', narrative: summary });
  }
  return out;
}

/** Legacy profile columns become user_confirmed profile_field facts (the columns stay untouched). */
export function candidateFactsFromProfile(profile: UserProfile): FactCandidate[] {
  const out: FactCandidate[] = [];
  const add = (field: string, column: string, title: string, value: string | string[]) => {
    if (Array.isArray(value) ? value.length === 0 : !value.trim()) return;
    const fp = factFingerprint('profile_field', [column]);
    out.push(fill({
      key: fp, kind: 'profile_field', title, payload: { field, value },
      parentFactId: null, confirmationState: 'user_confirmed', verification: null, extractionConfidence: null,
      sourceKind: 'profile', sourceRef: { profile: true }, sourceFingerprint: fp, legacyId: null, conflictGroup: null,
      reviewState: 'reviewed', status: 'active',
    }) as FactCandidate);
  };
  add('jobTitle', 'job_title', 'Current title', profile.jobTitle ?? '');
  add('industry', 'industry', 'Industry', profile.industry ?? '');
  add('careSpecialties', 'care_specialties', 'Care specialties', profile.careSpecialties ?? []);
  add('licensedState', 'licensed_state', 'Licensed state', profile.licensedState ?? '');
  add('certifications', 'certifications', 'Certifications', profile.certifications ?? []);
  return out;
}

// ---------------------------------------------------------------------------
// Reconciliation against existing facts
// ---------------------------------------------------------------------------

type FactLike = Pick<CareerFact, 'kind' | 'title' | 'organization' | 'startDate' | 'endDate' | 'narrative'> & { sourceFingerprint: string | null };

/** kind + normalised title + organisation: the same claim regardless of source hash. */
export function identityKey(f: Pick<FactLike, 'kind' | 'title' | 'organization'>): string {
  return `${f.kind}|${normaliseText(f.title)}|${normaliseText(f.organization)}`;
}

const sameContent = (a: FactLike, b: FactLike): boolean =>
  normaliseText(a.startDate) === normaliseText(b.startDate)
  && normaliseText(a.endDate) === normaliseText(b.endDate)
  && normaliseText(stripHtml(a.narrative)) === normaliseText(stripHtml(b.narrative));

const parseLoose = (v: string): number | null => {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^(present|current|now|ongoing)$/i.test(s)) return Number.POSITIVE_INFINITY;
  const m = s.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?$/);
  if (m) return Date.UTC(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, m[3] ? Number(m[3]) : 1);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
};

/**
 * True only when both periods have a parseable start and do not overlap —
 * i.e. two distinct stints of the same role at the same organisation. Any
 * uncertainty (missing or unparsable dates) is NOT disjoint, so it is shown
 * for review rather than silently treated as separate.
 */
export function periodsDisjoint(a: Pick<FactLike, 'startDate' | 'endDate'>, b: Pick<FactLike, 'startDate' | 'endDate'>): boolean {
  const aStart = parseLoose(a.startDate); const bStart = parseLoose(b.startDate);
  if (aStart === null || bStart === null) return false;
  const aEnd = a.endDate.trim() ? parseLoose(a.endDate) : Number.POSITIVE_INFINITY;
  const bEnd = b.endDate.trim() ? parseLoose(b.endDate) : Number.POSITIVE_INFINITY;
  if (aEnd === null || bEnd === null) return false;
  return aEnd < bStart || bEnd < aStart;
}

export interface Reconciliation {
  /** Candidates with no existing counterpart. */
  new: FactCandidate[];
  /** Same claim, same content (or same fingerprint): map to the existing id. */
  duplicates: Array<{ candidate: FactCandidate; existingId: string }>;
  /** Same claim, different dates/narrative: both sides share a conflict group for review. */
  conflicts: Array<{ candidate: FactCandidate; existingId: string; existingRevision: number; conflictGroup: string }>;
  /** Candidates dropped because an earlier candidate in the same import already carried the claim. */
  withinImport: FactCandidate[];
}

/**
 * Split candidates into new / duplicate / conflict against the user's
 * existing facts (any status: a deleted tombstone still counts as "seen", so
 * a re-import cannot resurrect what the user removed).
 */
export function reconcileCandidates(existing: CareerFact[], candidates: FactCandidate[]): Reconciliation {
  const result: Reconciliation = { new: [], duplicates: [], conflicts: [], withinImport: [] };
  const byFingerprint = new Map<string, CareerFact>();
  const byIdentity = new Map<string, CareerFact[]>();
  for (const f of existing) {
    if (f.sourceFingerprint) byFingerprint.set(f.sourceFingerprint, f);
    const k = identityKey(f);
    byIdentity.set(k, [...(byIdentity.get(k) ?? []), f]);
  }
  const seenInImport = new Map<string, FactCandidate>();
  for (const c of candidates) {
    const k = identityKey(c);
    const earlier = seenInImport.get(k);
    if (earlier && (sameContent(earlier, c) || c.kind === 'skill')) { result.withinImport.push(c); continue; }
    seenInImport.set(k, c);

    const byFp = c.sourceFingerprint ? byFingerprint.get(c.sourceFingerprint) : undefined;
    const matches = byIdentity.get(k) ?? [];
    const exact = byFp && sameContent(byFp, c) ? byFp : matches.find((m) => sameContent(m, c));
    if (exact) { result.duplicates.push({ candidate: c, existingId: exact.id }); continue; }
    // A distinct stint (same title/employer, non-overlapping dates) is a new fact, not a contradiction.
    const overlapping = matches.filter((m) => !periodsDisjoint(m, c));
    const contradicting = byFp ?? overlapping.find((m) => m.status === 'active');
    if (!contradicting && overlapping.length === 0 && matches.length > 0) { result.new.push(c); continue; }
    if (contradicting) {
      const conflictGroup = contradicting.conflictGroup ?? newId();
      result.conflicts.push({
        candidate: { ...c, conflictGroup, reviewState: 'conflict' },
        existingId: contradicting.id, existingRevision: contradicting.revision, conflictGroup,
      });
      continue;
    }
    // Only withdrawn/deleted counterparts remain: honour the user's earlier decision.
    if (overlapping.length > 0) { result.duplicates.push({ candidate: c, existingId: overlapping[0].id }); continue; }
    result.new.push(c);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Revision, labels and change impact
// ---------------------------------------------------------------------------

/** Stable hash over the active facts' ids and revisions; '' when there are none. */
export function factsRevision(facts: Array<Pick<CareerFact, 'id' | 'revision' | 'status'>>): string {
  const active = facts.filter((f) => f.status === 'active').map((f) => `${f.id}:${f.revision}`).sort();
  return active.length === 0 ? '' : fnv1a64Hex(active.join('\n'));
}

/** Short citation label, e.g. "Senior Nurse at Acme (2019–2022)". */
export function factLabel(fact: Pick<CareerFact, 'kind' | 'title' | 'organization' | 'startDate' | 'endDate' | 'payload'>): string {
  const span = [fact.startDate, fact.endDate || (fact.startDate ? 'present' : '')].filter(Boolean).join('–');
  switch (fact.kind) {
    case 'skill': return `Skill: ${fact.title}`;
    case 'language': return `Language: ${fact.title}${fact.payload.proficiency ? ` (${String(fact.payload.proficiency)})` : ''}`;
    case 'profile_field': {
      const value = fact.payload.value;
      return `${fact.title}: ${Array.isArray(value) ? value.join(', ') : String(value ?? '')}`.trim();
    }
    case 'summary': return 'Professional summary';
    case 'education': return [fact.title, fact.organization].filter(Boolean).join(', ') + (span ? ` (${span})` : '');
    default: {
      const head = [fact.title, fact.organization].filter(Boolean).join(' at ') || fact.kind;
      return span ? `${head} (${span})` : head;
    }
  }
}

export interface ChangeImpact {
  factId: string;
  total: number;
  byKind: Partial<Record<FactArtifactKind, string[]>>;
}

/** Artifacts affected when a fact changes: the ids referencing it, grouped by artifact kind. */
export function impactOfChange(fact: Pick<CareerFact, 'id'>, references: FactReference[]): ChangeImpact {
  const byKind: Partial<Record<FactArtifactKind, string[]>> = {};
  let total = 0;
  for (const r of references) {
    if (r.factId !== fact.id) continue;
    const list = byKind[r.artifactKind] ?? (byKind[r.artifactKind] = []);
    if (!list.includes(r.artifactId)) { list.push(r.artifactId); total += 1; }
  }
  for (const k of Object.keys(byKind) as FactArtifactKind[]) byKind[k] = byKind[k]!.sort();
  return { factId: fact.id, total, byKind };
}
