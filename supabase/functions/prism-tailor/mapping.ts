import type { ResumeData } from '../../../types.ts';
import type { AggregatedContext, ResumeDraft } from './schemas.ts';

// =========================================================================
// Final pipeline step — Structured JSON Parser. Deterministic (no LLM): maps
// the Writer's validated draft + the aggregated context onto the exact schema
// the template engine renders (types.ts ResumeData). Bullets become the
// repo's `<p>• …</p>` description HTML (see exampleData.ts).
// =========================================================================

const uid = () => crypto.randomUUID();

/** Escape text destined for the description HTML fields. The renderer also
 *  DOMPurifies at the sink; this keeps the stored value inert on its own. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const bulletsToHtml = (bullets: string[]): string =>
  bullets.map((b) => `<p>• ${escapeHtml(b.trim())}</p>`).join('');

/** Split strings like "Spanish (Fluent)" / "German - B2" into language + proficiency. */
function splitLanguage(s: string): { language: string; proficiency: string } {
  const paren = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) return { language: paren[1].trim(), proficiency: paren[2].trim() };
  const dash = s.match(/^(.*?)\s*[-–:]\s*(.+)$/);
  if (dash) return { language: dash[1].trim(), proficiency: dash[2].trim() };
  return { language: s.trim(), proficiency: '' };
}

const normKey = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Deterministically overwrite each draft experience entry's identity fields
 * (jobTitle/location/startDate/endDate) from the matching CONTEXT.workHistory
 * entry. The writer is instructed to copy these character-for-character, but
 * an LLM can still normalize ("Systems Administrator" → "Sysadmin") — and
 * these are facts with exactly one correct value, so they should never
 * depend on the model's transcription at all. Matched by company name;
 * entries whose company has no CONTEXT counterpart are left untouched so the
 * grounding checker still flags them as invented employers.
 */
export function alignDraftToContext(draft: ResumeDraft, context: AggregatedContext): ResumeDraft {
  return {
    ...draft,
    experience: draft.experience.map((e) => {
      const home = context.workHistory.find((w) => normKey(w.company) === normKey(e.company));
      if (!home) return e;
      return {
        ...e,
        company: home.company,
        jobTitle: home.title,
        location: home.location,
        startDate: home.startDate,
        endDate: home.endDate,
      };
    }),
  };
}

export function draftToResumeData(draft: ResumeDraft, context: AggregatedContext): ResumeData {
  const c = context.candidate;
  return {
    contact: {
      firstName: c.firstName,
      lastName: c.lastName,
      jobTitle: c.jobTitle || context.targetRole.title,
      phone: c.phone,
      phoneCountryCode: '',
      email: c.email,
      address: '',
      country: '',
      city: c.location,
      customCity: c.location,
      linkedin: c.linkedin,
      website: c.website,
      photo: '',
    },
    summary: { professionalSummary: draft.professionalSummary },
    experience: draft.experience.map((e) => ({
      id: uid(),
      jobTitle: e.jobTitle,
      company: e.company,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      description: bulletsToHtml(e.bullets),
    })),
    projects: draft.projects.map((p) => ({
      id: uid(),
      name: p.name,
      technologies: p.technologies,
      link: '',
      startDate: '',
      endDate: '',
      description: `<p>${escapeHtml(p.description.trim())}</p>`,
    })),
    education: draft.education.map((e) => ({
      id: uid(),
      school: e.school,
      degree: e.degree,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      // Rendered via dangerouslySetInnerHTML like every description field, so
      // the writer's plain text must be escaped (kept unwrapped: education
      // descriptions are stored as bare text, see exampleData.ts).
      description: escapeHtml(e.description.trim()),
    })),
    skills: draft.skills,
    certifications: draft.certifications.map((name) => ({
      id: uid(), name, number: '', expiryDate: '', description: '',
    })),
    languages: draft.languages.map((l) => ({ id: uid(), ...splitLanguage(l) })),
    awards: [],
    trainings: [],
    publications: [],
    volunteer: [],
    custom: [],
  };
}
