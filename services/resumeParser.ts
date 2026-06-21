import type { ResumeData } from '../types';
import { extractSkills, type NormalizedSkill } from './skillTaxonomy';

// =========================================================================
// Parsed resume model
// =========================================================================

export type ResumeSectionKind =
    | 'summary' | 'experience' | 'education' | 'skills' | 'projects'
    | 'certifications' | 'languages' | 'awards' | 'publications'
    | 'volunteer' | 'other';

export interface ParsedSection {
    kind: ResumeSectionKind;
    /** Header exactly as it appeared (or canonical name for structured input). */
    title: string;
    text: string;
    bullets: string[];
}

export interface ParsedContact {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    website: string;
    location: string;
}

export interface ParsedExperienceEntry {
    title: string;
    company: string;
    startDate: Date | null;
    endDate: Date | null;   // null with isCurrent=true means "Present"
    isCurrent: boolean;
    text: string;
}

export interface ParsedResume {
    source: 'structured' | 'file' | 'pasted';
    fileName?: string;
    fileType?: string;
    rawText: string;
    contact: ParsedContact;
    sections: ParsedSection[];
    experience: ParsedExperienceEntry[];
    /** Total professional experience in years, merged across overlapping ranges. */
    totalExperienceYears: number;
    skills: NormalizedSkill[];
    /** Skills explicitly listed in a skills section (vs. mentioned anywhere). */
    declaredSkills: string[];
    degrees: string[];
    bullets: string[];
    wordCount: number;
    /** Heuristics that suggest layout features ATS parsers choke on. */
    artifacts: {
        hasTabs: boolean;
        hasNonAsciiBullets: boolean;
        hasEmojis: boolean;
        columnsSuspected: boolean;
        imageOnlyPdf: boolean;
    };
}

// =========================================================================
// Text extraction from files
// =========================================================================

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

export async function extractTextFromFile(file: File): Promise<{ text: string; imageOnly: boolean }> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.txt') || name.endsWith('.md')) {
        return { text: await file.text(), imageOnly: false };
    }

    if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { text: result.value, imageOnly: false };
    }

    if (name.endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        // Run the worker from the bundled module so no CDN fetch is needed.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url,
        ).toString();
        const data = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        let text = '';
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            let lastY: number | null = null;
            for (const item of content.items as any[]) {
                if (typeof item.str !== 'string') continue;
                const y = item.transform?.[5];
                if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) text += '\n';
                else if (text && !text.endsWith('\n') && !text.endsWith(' ')) text += ' ';
                text += item.str;
                if (y !== undefined) lastY = y;
            }
            text += '\n';
        }
        const imageOnly = text.replace(/\s/g, '').length < 40;
        return { text, imageOnly };
    }

    throw new Error(`Unsupported file type. Please upload ${SUPPORTED_EXTENSIONS.join(', ')} or paste the text.`);
}

// =========================================================================
// Section segmentation
// =========================================================================

const SECTION_HEADERS: { kind: ResumeSectionKind; patterns: RegExp }[] = [
    { kind: 'summary', patterns: /^(professional\s+summary|summary|profile|about\s*me|objective|career\s+objective|personal\s+statement)\b/i },
    { kind: 'experience', patterns: /^(work\s+experience|professional\s+experience|experience|employment(\s+history)?|career\s+history|work\s+history|relevant\s+experience)\b/i },
    { kind: 'education', patterns: /^(education|academic\s+background|academics|qualifications|education\s*&\s*training)\b/i },
    { kind: 'skills', patterns: /^(skills|technical\s+skills|core\s+competencies|key\s+skills|areas\s+of\s+expertise|competencies|technologies|tech\s+stack|expertise)\b/i },
    { kind: 'projects', patterns: /^(projects|personal\s+projects|key\s+projects|selected\s+projects|portfolio)\b/i },
    { kind: 'certifications', patterns: /^(certifications?|licenses?(\s*&\s*certifications?)?|credentials)\b/i },
    { kind: 'languages', patterns: /^(languages?)\b/i },
    { kind: 'awards', patterns: /^(awards?|honors?|achievements?|accomplishments?|recognition)\b/i },
    { kind: 'publications', patterns: /^(publications?|research|papers)\b/i },
    { kind: 'volunteer', patterns: /^(volunteer(ing)?(\s+experience)?|community\s+(service|involvement))\b/i },
];

const matchSectionHeader = (line: string): { kind: ResumeSectionKind; title: string } | null => {
    const clean = line.replace(/^[\s•▪◦●\-–—*#:|]+|[\s:•▪◦●\-–—*#|]+$/g, '').trim();
    if (!clean || clean.length > 48) return null;
    // Header lines are short and don't end mid-sentence.
    if (/[.;,]$/.test(clean)) return null;
    const wordCount = clean.split(/\s+/).length;
    if (wordCount > 5) return null;
    for (const { kind, patterns } of SECTION_HEADERS) {
        if (patterns.test(clean)) return { kind, title: clean };
    }
    return null;
};

const BULLET_RE = /^\s*[•▪◦●○■\-–—*‣·»>+]\s+/;

// =========================================================================
// Contact extraction
// =========================================================================

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{3,4}([\s.-]?\d{2,4})?/;
const LINKEDIN_RE = /(linkedin\.com\/in\/[A-Za-z0-9\-_%]+|linkedin\.com\/[A-Za-z0-9\-_%/]+)/i;
const URL_RE = /\b((https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z]{2,})+(\/[^\s)]*)?)/i;

const extractContact = (lines: string[], rawText: string): ParsedContact => {
    const email = rawText.match(EMAIL_RE)?.[0] || '';
    const linkedin = rawText.match(LINKEDIN_RE)?.[0] || '';

    let phone = '';
    const phoneCandidates = rawText.match(new RegExp(PHONE_RE.source, 'g')) || [];
    for (const c of phoneCandidates) {
        const digits = c.replace(/\D/g, '');
        if (digits.length >= 9 && digits.length <= 14 && !/^(19|20)\d{2}$/.test(digits)) {
            phone = c.trim();
            break;
        }
    }

    let website = '';
    for (const line of lines.slice(0, 12)) {
        const m = line.match(URL_RE);
        if (m && !/linkedin\.com/i.test(m[0]) && !EMAIL_RE.test(m[0]) && /\.(com|io|dev|me|net|org|co|app|ai)\b/i.test(m[0])) {
            website = m[0];
            break;
        }
    }

    // Name: first short, mostly-alphabetic line near the top that isn't contact data.
    let name = '';
    for (const line of lines.slice(0, 6)) {
        const t = line.trim();
        if (!t || EMAIL_RE.test(t) || LINKEDIN_RE.test(t) || /\d{4,}/.test(t)) continue;
        const words = t.split(/\s+/);
        if (words.length >= 2 && words.length <= 5 && /^[A-Za-zÀ-ÿ'.\- ]+$/.test(t) && t.length <= 48) {
            name = t;
            break;
        }
    }

    // Location: a "City, ST" or "City, Country" pattern near the top.
    let location = '';
    for (const line of lines.slice(0, 10)) {
        const m = line.match(/([A-Z][a-zà-ÿA-Z.\- ]+,\s*[A-Z][a-zA-Z.\- ]+)/);
        if (m && !EMAIL_RE.test(m[0]) && m[0].length <= 48 && m[0] !== name) {
            location = m[0].trim();
            break;
        }
    }

    return { name, email, phone, linkedin, website, location };
};

// =========================================================================
// Dates & experience duration
// =========================================================================

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7,
    sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const DATE_TOKEN = `(?:(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?\\s+)?((?:19|20)\\d{2})`;
const PRESENT_TOKEN = `(present|current|now|today|ongoing)`;
const RANGE_RE = new RegExp(`${DATE_TOKEN}\\s*(?:[-–—]|to|until)\\s*(?:${DATE_TOKEN}|${PRESENT_TOKEN})`, 'gi');

const parseDateToken = (monthStr: string | undefined, yearStr: string): Date => {
    const month = monthStr ? MONTHS[monthStr.toLowerCase().slice(0, 4).replace(/\.$/, '').slice(0, 3)] ?? MONTHS[monthStr.toLowerCase().slice(0, 3)] ?? 0 : 0;
    return new Date(parseInt(yearStr, 10), month, 1);
};

export interface DateRange { start: Date; end: Date; isCurrent: boolean }

export const extractDateRanges = (text: string): DateRange[] => {
    const ranges: DateRange[] = [];
    RANGE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RANGE_RE.exec(text)) !== null) {
        const [, m1, y1, m2, y2, present] = m;
        const start = parseDateToken(m1, y1);
        const isCurrent = !!present;
        const end = isCurrent ? new Date() : y2 ? parseDateToken(m2, y2) : new Date();
        if (end.getTime() >= start.getTime() && start.getFullYear() > 1950) {
            ranges.push({ start, end, isCurrent });
        }
    }
    return ranges;
};

/** Total years covered by a set of (possibly overlapping) date ranges. */
export const mergedYears = (ranges: DateRange[]): number => {
    if (!ranges.length) return 0;
    const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
    let total = 0;
    let curStart = sorted[0].start.getTime();
    let curEnd = sorted[0].end.getTime();
    for (const r of sorted.slice(1)) {
        if (r.start.getTime() <= curEnd) {
            curEnd = Math.max(curEnd, r.end.getTime());
        } else {
            total += curEnd - curStart;
            curStart = r.start.getTime();
            curEnd = r.end.getTime();
        }
    }
    total += curEnd - curStart;
    return Math.round((total / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
};

// =========================================================================
// Education extraction
// =========================================================================

const DEGREE_RE = /\b(ph\.?d|doctorate|m\.?b\.?a|m\.?s\.?c?|master(?:'s)?(\s+of\s+[a-z]+)?|b\.?s\.?c?|b\.?a|b\.?e(?:ng)?|bachelor(?:'s)?(\s+of\s+[a-z]+)?|associate(?:'s)?(\s+degree)?|diploma|high\s+school)\b/gi;

const extractDegrees = (text: string): string[] => {
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    DEGREE_RE.lastIndex = 0;
    while ((m = DEGREE_RE.exec(text)) !== null) {
        const raw = m[0].toLowerCase().replace(/\./g, '');
        if (/^phd|doctorate/.test(raw)) found.add('Doctorate');
        else if (/^mba/.test(raw)) found.add('MBA');
        else if (/^m/.test(raw)) found.add("Master's");
        else if (/^b/.test(raw)) found.add("Bachelor's");
        else if (/^associate/.test(raw)) found.add("Associate's");
        else if (/^diploma/.test(raw)) found.add('Diploma');
        else found.add('High School');
    }
    return Array.from(found);
};

// =========================================================================
// Plain-text resume parsing
// =========================================================================

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function parseResumeText(
    rawText: string,
    source: ParsedResume['source'] = 'pasted',
    fileName?: string,
    imageOnlyPdf = false,
): ParsedResume {
    const text = rawText.replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const nonEmpty = lines.filter(l => l.trim());

    // --- segment into sections ---
    const sections: ParsedSection[] = [];
    let current: ParsedSection = { kind: 'other', title: 'Header', text: '', bullets: [] };
    for (const line of lines) {
        const header = matchSectionHeader(line);
        if (header) {
            if (current.text.trim()) sections.push(current);
            current = { kind: header.kind, title: header.title, text: '', bullets: [] };
            continue;
        }
        current.text += line + '\n';
        if (BULLET_RE.test(line) && line.replace(BULLET_RE, '').trim().length > 2) {
            current.bullets.push(line.replace(BULLET_RE, '').trim());
        }
    }
    if (current.text.trim()) sections.push(current);

    const sectionOf = (kind: ResumeSectionKind) => sections.filter(s => s.kind === kind);

    // --- contact ---
    const contact = extractContact(nonEmpty, text);

    // --- experience entries (split section text on date ranges) ---
    const expSections = sectionOf('experience');
    const expText = expSections.map(s => s.text).join('\n');
    const experience: ParsedExperienceEntry[] = [];
    if (expText.trim()) {
        const expLines = expText.split('\n');
        let entry: ParsedExperienceEntry | null = null;
        for (const line of expLines) {
            const ranges = extractDateRanges(line);
            if (ranges.length) {
                if (entry) experience.push(entry);
                // Title/company usually share the date line or sit just above it.
                const label = line.replace(RANGE_RE, '').replace(/[|•·–—-]+\s*$/, '').trim();
                entry = {
                    title: label.split(/\s+[|@—–]\s+|,\s+/)[0]?.trim() || '',
                    company: label.split(/\s+[|@—–]\s+|,\s+/)[1]?.trim() || '',
                    startDate: ranges[0].start,
                    endDate: ranges[0].isCurrent ? null : ranges[0].end,
                    isCurrent: ranges[0].isCurrent,
                    text: '',
                };
            } else if (entry) {
                entry.text += line + '\n';
            }
        }
        if (entry) experience.push(entry);
    }

    const expRanges = extractDateRanges(expText || text);
    const totalExperienceYears = mergedYears(expRanges);

    // --- skills ---
    const skills = extractSkills(text);
    const declaredSkills = sectionOf('skills')
        .flatMap(s => s.text.split(/[,•▪|\n;:]+/))
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 48);

    // --- artifacts that break real ATS parsers ---
    const longSpaceRuns = nonEmpty.filter(l => /\S {4,}\S/.test(l)).length;
    const artifacts = {
        hasTabs: /\t/.test(text),
        hasNonAsciiBullets: /[▪◦●○■‣»]/.test(text),
        hasEmojis: EMOJI_RE.test(text),
        columnsSuspected: longSpaceRuns > Math.max(nonEmpty.length * 0.25, 6),
        imageOnlyPdf,
    };

    const bullets = sections.flatMap(s => s.bullets);

    return {
        source,
        fileName,
        fileType: fileName?.split('.').pop()?.toLowerCase(),
        rawText: text,
        contact,
        sections,
        experience,
        totalExperienceYears,
        skills,
        declaredSkills,
        degrees: extractDegrees(text),
        bullets,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        artifacts,
    };
}

// =========================================================================
// Structured (in-app) resume → ParsedResume
// =========================================================================

const stripHtml = (html: string): string =>
    html
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/(p|div|li|ul|ol|br|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const parseAppDate = (s: string): Date | null => {
    if (!s) return null;
    if (/present|current|now/i.test(s)) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const yr = s.match(/(19|20)\d{2}/);
    return yr ? new Date(parseInt(yr[0], 10), 0, 1) : null;
};

export function parseFromResumeData(data: ResumeData): ParsedResume {
    const parts: string[] = [];
    const sections: ParsedSection[] = [];
    const push = (kind: ResumeSectionKind, title: string, body: string) => {
        const text = body.trim();
        if (!text) return;
        const bullets = text.split('\n').filter(l => BULLET_RE.test(l) || l.trim().startsWith('•')).map(l => l.replace(BULLET_RE, '').replace(/^•\s*/, '').trim());
        sections.push({ kind, title, text, bullets });
        parts.push(`${title}\n${text}`);
    };

    const c = data.contact;
    const headerLines = [
        `${c.firstName} ${c.lastName}`.trim(),
        c.jobTitle,
        [c.email, c.phone && `${c.phoneCountryCode || ''} ${c.phone}`.trim(), [c.city || c.customCity, c.country].filter(Boolean).join(', ')].filter(Boolean).join(' | '),
        [c.linkedin, c.website].filter(Boolean).join(' | '),
    ].filter(Boolean).join('\n');
    parts.unshift(headerLines);

    push('summary', 'Professional Summary', stripHtml(data.summary.professionalSummary || ''));

    const experience: ParsedExperienceEntry[] = [];
    const expBody = data.experience.map(e => {
        const start = parseAppDate(e.startDate);
        const end = parseAppDate(e.endDate);
        const isCurrent = /present|current|now/i.test(e.endDate) || (!end && !!start);
        experience.push({
            title: e.jobTitle, company: e.company,
            startDate: start, endDate: end, isCurrent,
            text: stripHtml(e.description || ''),
        });
        return `${e.jobTitle} | ${e.company} | ${e.startDate} - ${e.endDate || 'Present'}\n${stripHtml(e.description || '')}`;
    }).join('\n\n');
    push('experience', 'Work Experience', expBody);

    push('education', 'Education', data.education.map(e =>
        `${e.degree} | ${e.school} | ${e.startDate} - ${e.endDate}\n${stripHtml(e.description || '')}`).join('\n\n'));
    push('skills', 'Skills', data.skills.join(', '));
    push('projects', 'Projects', data.projects.map(p =>
        `${p.name} (${p.technologies})\n${stripHtml(p.description || '')}`).join('\n\n'));
    push('certifications', 'Certifications', data.certifications.map(x => `${x.name} ${x.number}`.trim()).join('\n'));
    push('languages', 'Languages', data.languages.map(l => `${l.language} (${l.proficiency})`).join(', '));
    push('awards', 'Awards', data.awards.map(a => `${a.title} — ${a.issuer}\n${stripHtml(a.description || '')}`).join('\n\n'));
    push('publications', 'Publications', data.publications.map(p => `${p.title} — ${p.publisher}`).join('\n'));
    push('volunteer', 'Volunteering', data.volunteer.map(v => `${v.role} — ${v.organization}\n${stripHtml(v.description || '')}`).join('\n\n'));

    const rawText = parts.join('\n\n');

    const ranges: DateRange[] = experience
        .filter(e => e.startDate)
        .map(e => ({ start: e.startDate as Date, end: e.endDate || new Date(), isCurrent: e.isCurrent }));

    return {
        source: 'structured',
        rawText,
        contact: {
            name: `${c.firstName} ${c.lastName}`.trim(),
            email: c.email,
            phone: c.phone,
            linkedin: c.linkedin,
            website: c.website,
            location: [c.city || c.customCity, c.country].filter(Boolean).join(', '),
        },
        sections,
        experience,
        totalExperienceYears: mergedYears(ranges),
        skills: extractSkills(rawText),
        declaredSkills: data.skills,
        degrees: extractDegrees(data.education.map(e => e.degree).join('\n')),
        bullets: sections.flatMap(s => s.bullets),
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        artifacts: {
            hasTabs: false,
            hasNonAsciiBullets: false,
            hasEmojis: EMOJI_RE.test(rawText),
            columnsSuspected: false,
            imageOnlyPdf: false,
        },
    };
}
