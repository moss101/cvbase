import type { ResumeData, ResumeSettings, SectionId } from '../../../types';
import { INITIAL_STATE } from '../../../constants';
import type { ParsedResume } from '../../../lib/ats/resumeParse';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import { candidateFactsFromResume, reconcileCandidates, type FactCandidate } from '../../../services/careerOs/careerFacts';
import { ConflictError, type CareerFact } from '../../../services/careerOs/types';
import { newId } from '../../../services/careerOs/util';
import { captureException } from '../../../lib/monitoring';

/**
 * Import logic shared by onboarding and the Evidence view (COS-009). A CV
 * file or pasted text is parsed with the existing deterministic parser into
 * ResumeData, saved as an ordinary resume, and turned into unconfirmed
 * candidate facts with provenance. Nothing here confirms or verifies a claim;
 * duplicates are skipped and contradictions are recorded as a conflict group
 * for the review step.
 */

const DEFAULT_SETTINGS: ResumeSettings = { themeColor: '#008080', fontSize: 'medium', fontFamily: 'Arial, sans-serif' };

const ym = (date: Date | null): string => {
    if (!date || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const blocks = (text: string): string[] =>
    text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

const lines = (text: string): string[] =>
    text.split('\n').map((l) => l.replace(/^\s*[•▪◦●○■\-–—*‣·»>+]\s+/, '').trim()).filter(Boolean);

/**
 * ParsedResume → ResumeData. Only what the parser recognised is filled in;
 * everything else stays empty so the review step shows honest gaps instead
 * of invented values.
 */
export function parsedResumeToResumeData(parsed: ParsedResume): ResumeData {
    const data: ResumeData = JSON.parse(JSON.stringify(INITIAL_STATE)) as ResumeData;
    const nameParts = (parsed.contact.name || '').trim().split(/\s+/).filter(Boolean);
    data.contact.firstName = nameParts[0] ?? '';
    data.contact.lastName = nameParts.slice(1).join(' ');
    data.contact.email = parsed.contact.email || '';
    data.contact.phone = parsed.contact.phone || '';
    data.contact.linkedin = parsed.contact.linkedin || '';
    data.contact.website = parsed.contact.website || '';
    data.contact.city = parsed.contact.location || '';

    const section = (kind: ParsedResume['sections'][number]['kind']): string =>
        parsed.sections.filter((s) => s.kind === kind).map((s) => s.text).join('\n').trim();

    data.summary.professionalSummary = section('summary');

    data.experience = parsed.experience
        .filter((e) => e.title || e.company)
        .map((e) => ({
            id: newId(),
            jobTitle: e.title,
            company: e.company,
            location: '',
            startDate: ym(e.startDate),
            endDate: e.isCurrent ? 'Present' : ym(e.endDate),
            description: e.text.trim(),
        }));

    const education = section('education');
    if (education) {
        data.education = blocks(education).map((block) => {
            const ls = lines(block);
            return {
                id: newId(),
                degree: ls[0] ?? '',
                school: ls[1] ?? '',
                location: '',
                startDate: '',
                endDate: '',
                description: ls.slice(2).join('\n'),
            };
        }).filter((e) => e.degree || e.school);
    }

    const declared = parsed.declaredSkills.length > 0 ? parsed.declaredSkills : parsed.skills.map((s) => s.matched);
    data.skills = Array.from(new Set(declared.map((s) => s.trim()).filter(Boolean)));

    const projects = section('projects');
    if (projects) {
        data.projects = blocks(projects).map((block) => {
            const ls = lines(block);
            return { id: newId(), name: ls[0] ?? '', technologies: '', link: '', startDate: '', endDate: '', description: ls.slice(1).join('\n') };
        }).filter((p) => p.name);
    }

    const certifications = section('certifications');
    if (certifications) {
        data.certifications = lines(certifications).map((name) => ({ id: newId(), name, number: '', expiryDate: '', description: '' }));
    }

    const languages = section('languages');
    if (languages) {
        data.languages = languages.split(/[,\n;]+/).map((l) => l.trim()).filter(Boolean).map((entry) => {
            const match = entry.match(/^(.*?)\s*\((.*?)\)\s*$/);
            return { id: newId(), language: match ? match[1].trim() : entry, proficiency: match ? match[2].trim() : '' };
        });
    }

    const awards = section('awards');
    if (awards) {
        data.awards = blocks(awards).map((block) => {
            const ls = lines(block);
            const [title, issuer] = (ls[0] ?? '').split(/\s+[—–-]\s+/);
            return { id: newId(), title: title ?? '', issuer: issuer ?? '', date: '', description: ls.slice(1).join('\n') };
        }).filter((a) => a.title);
    }

    const publications = section('publications');
    if (publications) {
        data.publications = lines(publications).map((line) => {
            const [title, publisher] = line.split(/\s+[—–-]\s+/);
            return { id: newId(), title: title ?? '', publisher: publisher ?? '', date: '', link: '', description: '' };
        }).filter((p) => p.title);
    }

    const volunteer = section('volunteer');
    if (volunteer) {
        data.volunteer = blocks(volunteer).map((block) => {
            const ls = lines(block);
            const [role, organization] = (ls[0] ?? '').split(/\s+[—–-]\s+/);
            return { id: newId(), role: role ?? '', organization: organization ?? '', location: '', startDate: '', endDate: '', description: ls.slice(1).join('\n') };
        }).filter((v) => v.role || v.organization);
    }

    return data;
}

/** Optional sections that have content are made visible on the saved resume. */
export function visibleSectionsFor(data: ResumeData): SectionId[] {
    const out: SectionId[] = [];
    if (data.projects.length) out.push('projects');
    if (data.certifications.length) out.push('certifications');
    if (data.languages.length) out.push('languages');
    if (data.awards.length) out.push('awards');
    if (data.trainings.length) out.push('trainings');
    if (data.publications.length) out.push('publications');
    if (data.volunteer.length) out.push('volunteer');
    if (data.custom.length) out.push('custom');
    return out;
}

/** What a preview shows before the user commits to an import. */
export interface ImportPreview {
    name: string;
    jobTitle: string;
    experience: number;
    education: number;
    skills: number;
    other: number;
}

export function previewOf(data: ResumeData): ImportPreview {
    return {
        name: `${data.contact.firstName} ${data.contact.lastName}`.trim(),
        jobTitle: data.contact.jobTitle || data.experience[0]?.jobTitle || '',
        experience: data.experience.length,
        education: data.education.length,
        skills: data.skills.length,
        other: data.projects.length + data.certifications.length + data.languages.length + data.awards.length
            + data.trainings.length + data.publications.length + data.volunteer.length + data.custom.length,
    };
}

export interface ImportSource {
    data: ResumeData;
    /** An existing resume: reuse its id and revision instead of creating one. */
    resumeId?: string;
    resumeRevision?: number;
    title?: string;
}

export interface ImportResult {
    resumeId: string;
    /** Candidate facts actually inserted (a re-import returns none). */
    inserted: CareerFact[];
    duplicates: number;
    conflicts: number;
    /** Candidates skipped because the same claim appeared earlier in the import. */
    withinImport: number;
    /** Candidates the parser produced, before reconciliation. */
    parsed: number;
}

const stripKey = (candidate: FactCandidate): Omit<FactCandidate, 'key'> => {
    const { key: _key, ...rest } = candidate;
    return rest;
};

/**
 * Persist an import: save the resume when it is new, then insert the
 * reconciled candidates (idempotent by fingerprint). Existing facts that a
 * candidate contradicts are placed in the same conflict group so the review
 * shows both sides; nothing is merged or confirmed here.
 */
export async function importResumeData(userId: string, source: ImportSource, existingFacts: CareerFact[]): Promise<ImportResult> {
    let resumeId = source.resumeId;
    let revision = source.resumeRevision;
    if (!resumeId) {
        const created = await resumeRepo.create(userId, {
            title: source.title?.trim() || 'Imported CV',
            data: source.data,
            settings: DEFAULT_SETTINGS,
            templateId: 'default',
            visibleSections: visibleSectionsFor(source.data),
            isPrimary: false,
            origin: { kind: 'manual', source: 'career_import' },
        });
        if (!created.id) throw new Error('resume_create_failed');
        resumeId = created.id;
        revision = created.revision;
    }
    const candidates = candidateFactsFromResume({ id: resumeId, revision, data: source.data });
    const reconciled = reconcileCandidates(existingFacts, candidates);
    const inputs = [...reconciled.new, ...reconciled.conflicts.map((c) => c.candidate)].map(stripKey);
    const inserted = await factRepo.createMany(userId, inputs);

    // Put the existing side of each contradiction into the same group so the
    // review shows both. A concurrent edit just means the group is missing on
    // one side; the review still lists the candidate as a conflict.
    for (const conflict of reconciled.conflicts) {
        const existing = existingFacts.find((f) => f.id === conflict.existingId);
        if (!existing || existing.conflictGroup === conflict.conflictGroup) continue;
        try {
            await factRepo.update(userId, conflict.existingId, { conflictGroup: conflict.conflictGroup, reviewState: 'conflict' }, conflict.existingRevision);
        } catch (err) {
            if (!(err instanceof ConflictError)) captureException(err, { context: 'career-import-conflict-group' });
        }
    }

    return {
        resumeId,
        inserted,
        duplicates: reconciled.duplicates.length,
        conflicts: reconciled.conflicts.length,
        withinImport: reconciled.withinImport.length,
        parsed: candidates.length,
    };
}

export const MIN_IMPORT_TEXT = 120;
