/**
 * CVBase ATS Engine
 * -----------------
 * A deterministic, local analysis engine modeled on how commercial ATS
 * platforms (Workday, Greenhouse, Taleo, iCIMS) parse and rank resumes:
 *
 *   1. Parse the job description into weighted, normalized requirements.
 *   2. Parse the resume into structured sections (resumeParser.ts).
 *   3. Score multiple dimensions — keyword alignment, title alignment,
 *      experience depth, education, parse-ability, readability — and
 *      combine them into an ATS compatibility score and a job match score.
 *
 * Everything runs locally and synchronously, which is what makes the
 * real-time re-scoring in the UI possible.
 */

import {
    extractSkills,
    normalizeSkillTerm,
    SKILL_CATEGORY_LABELS,
    HARD_CATEGORIES,
    STRONG_ACTION_VERBS,
    WEAK_OPENERS,
    CLICHES,
    type NormalizedSkill,
    type SkillCategory,
} from './skillTaxonomy.ts';
import {
    extractDateRanges,
    type ParsedResume,
    type ParsedSection,
} from './resumeParse.ts';

// =========================================================================
// Job description analysis
// =========================================================================

export type Seniority = 'internship' | 'entry' | 'mid' | 'senior' | 'lead' | 'director' | 'executive' | 'unspecified';

export interface JobKeyword {
    /** Canonical display term. */
    term: string;
    /** Skill category when it maps to the taxonomy; null for free phrases. */
    category: SkillCategory | null;
    /** Occurrences in the JD. */
    count: number;
    /** Found in a must-have / requirements block. */
    required: boolean;
    /** Relative importance used in scoring. */
    weight: number;
}

export interface JobAnalysis {
    title: string;
    seniority: Seniority;
    yearsRequired: number | null;
    educationRequired: string | null;
    keywords: JobKeyword[];
    requiredCount: number;
    preferredCount: number;
    responsibilities: string[];
    remote: boolean;
    employmentType: string | null;
    wordCount: number;
}

const SENIORITY_PATTERNS: { level: Seniority; re: RegExp }[] = [
    { level: 'internship', re: /\b(intern(ship)?|co-op)\b/i },
    { level: 'executive', re: /\b(chief|cto|ceo|cfo|coo|cmo|vp|vice president|svp|evp)\b/i },
    { level: 'director', re: /\b(director|head of)\b/i },
    { level: 'lead', re: /\b(lead|principal|staff)\b/i },
    { level: 'senior', re: /\b(senior|sr\.?)\b/i },
    { level: 'entry', re: /\b(junior|jr\.?|entry[- ]level|graduate|associate)\b/i },
];

const SENIORITY_RANK: Record<Seniority, number> = {
    internship: 0, entry: 1, mid: 2, senior: 3, lead: 4, director: 5, executive: 6, unspecified: 2,
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
    internship: 'Internship', entry: 'Entry level', mid: 'Mid level', senior: 'Senior',
    lead: 'Lead / Principal', director: 'Director', executive: 'Executive', unspecified: 'Unspecified',
};

const REQUIRED_BLOCK_RE = /^(requirements?|qualifications?|must[- ]haves?|what (you('ll)?|we) (need|require|expect)|minimum qualifications?|basic qualifications?|who you are|about you|skills? (required|needed))\b/i;
const PREFERRED_BLOCK_RE = /^(preferred( qualifications?)?|nice[- ]to[- ]haves?|bonus( points)?|plus(es)?|good to have|desirable|we'?d love)/i;
const RESPONSIBILITY_BLOCK_RE = /^(responsibilities|what you('ll)? (do|be doing)|your (role|mission)|duties|day[- ]to[- ]day|in this role)/i;

const JD_STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'you', 'your', 'our', 'will', 'are', 'this', 'that', 'have',
    'has', 'from', 'they', 'their', 'who', 'what', 'when', 'where', 'how', 'all', 'can',
    'job', 'role', 'work', 'working', 'team', 'teams', 'company', 'experience', 'years',
    'year', 'skills', 'skill', 'ability', 'able', 'strong', 'excellent', 'good', 'great',
    'plus', 'must', 'preferred', 'required', 'requirements', 'qualifications', 'including',
    'etc', 'such', 'well', 'within', 'across', 'into', 'about', 'other', 'more', 'most',
    'new', 'use', 'using', 'used', 'help', 'million', 'per', 'via', 'each', 'than', 'them',
    'while', 'also', 'both', 'between', 'through', 'over', 'under', 'related', 'relevant',
    'candidates', 'candidate', 'applicants', 'position', 'opportunity', 'benefits', 'salary',
    'equal', 'employer', 'apply', 'application', 'please', 'join', 'looking', 'seeking',
    'environment', 'knowledge', 'understanding', 'familiarity', 'proficiency', 'demonstrated',
]);

const tokenize = (text: string): string[] =>
    text.toLowerCase().replace(/[^a-z0-9+#./& -]/g, ' ').split(/\s+/).filter(Boolean);

export function analyzeJobDescription(jdText: string): JobAnalysis {
    const text = jdText.replace(/\r\n?/g, '\n').trim();
    const lines = text.split('\n').map(l => l.trim());
    const lower = text.toLowerCase();

    // --- title ---
    let title = '';
    const titlePatterns = [
        /(?:hiring|seeking|looking for)(?:\s+an?\s+|\s+)([A-Z][A-Za-z0-9/&+# .-]{3,60}?)(?:\s+(?:to|who|with|at|in)\b|[.,!\n]|$)/,
        /(?:join us as|work as)(?:\s+an?\s+|\s+)([A-Z][A-Za-z0-9/&+# .-]{3,60}?)(?:[.,!\n]|$)/,
    ];
    for (const re of titlePatterns) {
        const m = text.match(re);
        if (m) { title = m[1].trim(); break; }
    }
    if (!title) {
        for (const line of lines.slice(0, 5)) {
            if (line && line.length <= 70 && line.split(/\s+/).length <= 8 && !/[.:;!?]$/.test(line) && /[A-Za-z]/.test(line)) {
                title = line.replace(/^(job title|position|role)\s*[:\-]\s*/i, '').trim();
                break;
            }
        }
    }

    // --- seniority ---
    let seniority: Seniority = 'unspecified';
    const seniorityScope = title || lines.slice(0, 3).join(' ');
    for (const { level, re } of SENIORITY_PATTERNS) {
        if (re.test(seniorityScope)) { seniority = level; break; }
    }
    if (seniority === 'unspecified') {
        for (const { level, re } of SENIORITY_PATTERNS) {
            if (re.test(lower.slice(0, 600))) { seniority = level; break; }
        }
    }

    // --- years of experience ---
    let yearsRequired: number | null = null;
    const yearsMatches = text.matchAll(/(\d{1,2})\s*(?:\+|or more|plus)?\s*(?:-|to)?\s*\d{0,2}\s*years?(?:'|’)?(?:\s+of)?\s+(?:[a-z ]{0,30})?experience/gi);
    for (const m of yearsMatches) {
        const n = parseInt(m[1], 10);
        if (n > 0 && n <= 30) yearsRequired = yearsRequired === null ? n : Math.min(yearsRequired, n);
    }

    // --- education ---
    let educationRequired: string | null = null;
    if (/\b(ph\.?d|doctorate)\b/i.test(text)) educationRequired = 'Doctorate';
    else if (/\b(master(?:'s|s)?( degree)?|m\.?s\.?c?|mba)\b/i.test(text)) educationRequired = "Master's";
    else if (/\b(bachelor(?:'s|s)?( degree)?|b\.?s\.?c?|b\.?a\.?|undergraduate degree|4[- ]year degree)\b/i.test(text)) educationRequired = "Bachelor's";
    else if (/\b(associate(?:'s|s)? degree|high school diploma|ged)\b/i.test(text)) educationRequired = "Associate's / High school";

    // --- segment requirement vs preferred vs responsibility blocks ---
    type Block = 'required' | 'preferred' | 'responsibilities' | 'other';
    let block: Block = 'other';
    const blockText: Record<Block, string> = { required: '', preferred: '', responsibilities: '', other: '' };
    const responsibilities: string[] = [];
    for (const line of lines) {
        const clean = line.replace(/^[\s•▪◦●\-–—*#]+/, '').trim();
        if (REQUIRED_BLOCK_RE.test(clean)) { block = 'required'; continue; }
        if (PREFERRED_BLOCK_RE.test(clean)) { block = 'preferred'; continue; }
        if (RESPONSIBILITY_BLOCK_RE.test(clean)) { block = 'responsibilities'; continue; }
        blockText[block] += line + '\n';
        if (block === 'responsibilities' && clean && /^[•▪◦●\-–—*]/.test(line) && clean.length > 10) {
            responsibilities.push(clean);
        }
    }
    // No explicit blocks → treat the whole JD as required context.
    if (!blockText.required.trim()) blockText.required = blockText.other;

    const requiredLower = blockText.required.toLowerCase();
    const titleLower = title.toLowerCase();

    // --- taxonomy skills with weights ---
    const skills = extractSkills(text);
    const keywords: JobKeyword[] = skills.map(s => {
        const aliasInRequired = s.def.aliases.some(a => requiredLower.includes(a)) || requiredLower.includes(s.def.name.toLowerCase());
        const inTitle = titleLower.includes(s.def.name.toLowerCase()) || s.def.aliases.some(a => a.length > 2 && titleLower.includes(a));
        const required = aliasInRequired || inTitle;
        let weight = 1 + Math.min(s.count - 1, 4) * 0.35;
        if (required) weight += 1.4;
        if (inTitle) weight += 1.6;
        if (s.def.category === 'soft') weight *= 0.55;
        return { term: s.def.name, category: s.def.category, count: s.count, required, weight };
    });

    // --- frequent free phrases the taxonomy doesn't know (domain nouns) ---
    const knownAliases = new Set(skills.flatMap(s => [s.def.name.toLowerCase(), ...s.def.aliases]));
    const tokens = tokenize(text);
    const freq = new Map<string, number>();
    const addTerm = (t: string) => freq.set(t, (freq.get(t) || 0) + 1);
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.length > 3 && !JD_STOPWORDS.has(t) && !/^\d+$/.test(t)) addTerm(t);
        if (i < tokens.length - 1) {
            const b = `${t} ${tokens[i + 1]}`;
            if (!JD_STOPWORDS.has(t) && !JD_STOPWORDS.has(tokens[i + 1]) && t.length > 2 && tokens[i + 1].length > 2) addTerm(b);
        }
    }
    const phraseKeywords: JobKeyword[] = [];
    const sortedPhrases = Array.from(freq.entries())
        .filter(([term, count]) => count >= 3 && !knownAliases.has(term) && !Array.from(knownAliases).some(k => term.includes(k) || k.includes(term)))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
    for (const [term, count] of sortedPhrases) {
        // Prefer bigrams; drop unigrams that are part of an already-kept bigram.
        if (!term.includes(' ') && phraseKeywords.some(p => p.term.includes(term))) continue;
        phraseKeywords.push({
            term,
            category: null,
            count,
            required: requiredLower.includes(term),
            weight: 0.6 + Math.min(count - 2, 4) * 0.2,
        });
    }

    const allKeywords = [...keywords, ...phraseKeywords].sort((a, b) => b.weight - a.weight);

    return {
        title,
        seniority,
        yearsRequired,
        educationRequired,
        keywords: allKeywords,
        requiredCount: allKeywords.filter(k => k.required).length,
        preferredCount: allKeywords.filter(k => !k.required).length,
        responsibilities: responsibilities.slice(0, 10),
        remote: /\b(remote|work from home|wfh|hybrid)\b/i.test(text),
        employmentType: lower.match(/\b(full[- ]time|part[- ]time|contract|freelance|temporary|permanent)\b/)?.[0] || null,
        wordCount: tokens.length,
    };
}

// =========================================================================
// Report model
// =========================================================================

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface FormatCheck {
    id: string;
    label: string;
    status: CheckStatus;
    detail: string;
}

export interface MatchedKeyword extends JobKeyword {
    /** Where it was found on the resume (section titles). */
    foundIn: string[];
    /** Times it appears on the resume. */
    resumeCount: number;
}

export interface ScoreDimension {
    id: string;
    label: string;
    score: number;      // 0–100
    weight: number;     // contribution to its parent score
    summary: string;
}

export interface SectionFeedback {
    kind: string;
    title: string;
    present: boolean;
    score: number;      // 0–100
    strengths: string[];
    issues: string[];
}

export type RecPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
    priority: RecPriority;
    title: string;
    detail: string;
    /** Estimated score points recoverable by fixing this. */
    impact: number;
}

export interface SkillGapGroup {
    category: SkillCategory;
    label: string;
    matched: MatchedKeyword[];
    missing: JobKeyword[];
}

export interface RoleFit {
    targetTitle: string;
    resumeTitle: string;
    titleAligned: boolean;
    seniority: Seniority;
    resumeSeniority: Seniority;
    seniorityVerdict: string;
    yearsRequired: number | null;
    yearsOnResume: number;
    yearsVerdict: string;
    educationRequired: string | null;
    educationVerdict: string;
    strengths: string[];
    gaps: string[];
    verdict: string;
    competitiveness: 'strong' | 'moderate' | 'stretch';
}

/**
 * Anti-keyword-stuffing signal. Populated when the resume repeats JD keywords
 * far beyond natural usage to game the match score; `cap` is the ceiling the
 * match score is clamped to once stuffing is detected.
 */
export interface KeywordStuffing {
    severity: 'moderate' | 'high';
    /** Canonical terms that were over-repeated. */
    terms: string[];
    /** The most a stuffed resume's match score is allowed to reach. */
    cap: number;
    /** Plain-language explanation surfaced to the user. */
    detail: string;
}

/**
 * Shown on every report. A high match score is a screening aid, not a promise —
 * and stuffing a resume with keywords backfires with modern parsers and humans.
 */
export const ATS_DISCLAIMER =
    'A higher match score can help with ATS screening, but it does not guarantee interviews. ' +
    'Keep your resume truthful, readable, and relevant.';

export interface AtsReport {
    generatedAt: string;
    /** Shown to the user beneath the scores; never empty. */
    disclaimer: string;
    /** Resume quality / parse-ability, JD-independent. */
    atsScore: number;
    atsDimensions: ScoreDimension[];
    /** Resume ↔ job alignment; null when no JD was provided. */
    matchScore: number | null;
    /** Anti-stuffing signal; null when no stuffing was detected (or no JD). */
    keywordStuffing: KeywordStuffing | null;
    matchDimensions: ScoreDimension[];
    matchedKeywords: MatchedKeyword[];
    missingKeywords: JobKeyword[];
    skillGaps: SkillGapGroup[];
    sectionFeedback: SectionFeedback[];
    formatChecks: FormatCheck[];
    recommendations: Recommendation[];
    roleFit: RoleFit | null;
    stats: {
        wordCount: number;
        bulletCount: number;
        quantifiedBulletRate: number;
        actionVerbRate: number;
        experienceYears: number;
        skillCount: number;
    };
}

// =========================================================================
// Readability metrics
// =========================================================================

interface BulletMetrics {
    total: number;
    actionVerbRate: number;
    quantifiedRate: number;
    tooLong: number;
    tooShort: number;
    weakOpeners: string[];
}

const QUANT_RE = /\d|%|\$|€|£/;

const analyzeBullets = (bullets: string[]): BulletMetrics => {
    if (!bullets.length) {
        return { total: 0, actionVerbRate: 0, quantifiedRate: 0, tooLong: 0, tooShort: 0, weakOpeners: [] };
    }
    let action = 0, quant = 0, tooLong = 0, tooShort = 0;
    const weak: string[] = [];
    for (const b of bullets) {
        const words = b.split(/\s+/).filter(Boolean);
        const first = (words[0] || '').toLowerCase().replace(/[^a-z-]/g, '');
        if (STRONG_ACTION_VERBS.has(first)) action++;
        else if (WEAK_OPENERS.has(first) && weak.length < 5) weak.push(words.slice(0, 3).join(' '));
        if (QUANT_RE.test(b)) quant++;
        if (words.length > 32) tooLong++;
        if (words.length < 5) tooShort++;
    }
    return {
        total: bullets.length,
        actionVerbRate: action / bullets.length,
        quantifiedRate: quant / bullets.length,
        tooLong,
        tooShort,
        weakOpeners: weak,
    };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// =========================================================================
// Keyword matching against the resume
// =========================================================================

const countOccurrences = (haystack: string, needle: string): number => {
    if (!needle) return 0;
    let count = 0, idx = 0;
    while ((idx = haystack.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
    return count;
};

const matchKeywordsAgainstResume = (
    job: JobAnalysis,
    resume: ParsedResume,
): { matched: MatchedKeyword[]; missing: JobKeyword[] } => {
    const resumeLower = ` ${resume.rawText.toLowerCase()} `;
    const resumeSkillNames = new Set(resume.skills.map(s => s.def.name));
    const declaredNormalized = new Set(
        resume.declaredSkills.map(s => normalizeSkillTerm(s)?.name).filter(Boolean) as string[],
    );

    const matched: MatchedKeyword[] = [];
    const missing: JobKeyword[] = [];

    for (const kw of job.keywords) {
        let resumeCount = 0;
        if (kw.category) {
            if (resumeSkillNames.has(kw.term) || declaredNormalized.has(kw.term)) {
                resumeCount = resume.skills.find(s => s.def.name === kw.term)?.count || 1;
            }
        } else {
            resumeCount = countOccurrences(resumeLower, kw.term.toLowerCase());
        }

        if (resumeCount > 0) {
            const foundIn = resume.sections
                .filter(s => {
                    const sl = s.text.toLowerCase();
                    if (kw.category) {
                        const skill = resume.skills.find(rs => rs.def.name === kw.term);
                        const aliases = skill ? [skill.def.name.toLowerCase(), ...skill.def.aliases] : [kw.term.toLowerCase()];
                        return aliases.some(a => sl.includes(a));
                    }
                    return sl.includes(kw.term.toLowerCase());
                })
                .map(s => s.title);
            matched.push({ ...kw, foundIn, resumeCount });
        } else {
            missing.push(kw);
        }
    }
    return { matched, missing };
};

// =========================================================================
// Main analysis
// =========================================================================

export function runAtsAnalysis(resume: ParsedResume, job: JobAnalysis | null): AtsReport {
    const bulletMetrics = analyzeBullets(resume.bullets);
    const recommendations: Recommendation[] = [];
    const rec = (priority: RecPriority, title: string, detail: string, impact: number) =>
        recommendations.push({ priority, title, detail, impact });

    const sectionsByKind = (kind: string) => resume.sections.filter(s => s.kind === kind);
    const has = (kind: string) => sectionsByKind(kind).length > 0;

    // ---------------------------------------------------------------------
    // Format / parse-ability checks
    // ---------------------------------------------------------------------
    const formatChecks: FormatCheck[] = [];
    const check = (id: string, label: string, status: CheckStatus, detail: string) =>
        formatChecks.push({ id, label, status, detail });

    // Contact
    const c = resume.contact;
    const contactBits = [c.email, c.phone, c.name].filter(Boolean).length;
    if (c.email && c.phone && c.name) {
        check('contact', 'Contact information', 'pass', 'Name, email and phone number were all detected and parsed cleanly.');
    } else {
        const missingBits = [!c.name && 'name', !c.email && 'email address', !c.phone && 'phone number'].filter(Boolean).join(', ');
        check('contact', 'Contact information', c.email ? 'warn' : 'fail', `Could not detect: ${missingBits}. ATS systems auto-fill application fields from these — missing ones cause silent rejections.`);
        rec(c.email ? 'high' : 'critical', 'Complete your contact header', `Add your ${missingBits} at the very top of the resume in plain text (not inside an image or table header).`, 8);
    }
    if (!c.linkedin) {
        check('linkedin', 'LinkedIn profile', 'warn', 'No LinkedIn URL found. 77% of recruiters cross-check LinkedIn; include the URL in your header.');
    } else {
        check('linkedin', 'LinkedIn profile', 'pass', `LinkedIn detected (${c.linkedin}).`);
    }

    // Standard sections
    const coreKinds: { kind: string; label: string }[] = [
        { kind: 'experience', label: 'Work experience' },
        { kind: 'education', label: 'Education' },
        { kind: 'skills', label: 'Skills' },
        { kind: 'summary', label: 'Professional summary' },
    ];
    const missingCore = coreKinds.filter(k => !has(k.kind));
    if (!missingCore.length) {
        check('sections', 'Standard section headers', 'pass', 'All core sections (summary, experience, education, skills) use recognizable headers.');
    } else {
        const names = missingCore.map(m => m.label).join(', ');
        check('sections', 'Standard section headers', missingCore.some(m => m.kind === 'experience') ? 'fail' : 'warn',
            `Could not find: ${names}. ATS parsers map content by header — use standard names like "Work Experience", "Education", "Skills".`);
        for (const m of missingCore) {
            rec(m.kind === 'experience' ? 'critical' : 'high', `Add a "${m.label}" section`,
                `No ${m.label.toLowerCase()} section was detected. Use the literal header "${m.label}" so parsers map it correctly.`, m.kind === 'experience' ? 12 : 6);
        }
    }

    // Dates
    const dateRanges = extractDateRanges(resume.rawText);
    if (resume.experience.length > 0 || dateRanges.length > 0) {
        const undated = resume.experience.filter(e => !e.startDate).length;
        if (undated === 0 && dateRanges.length > 0) {
            check('dates', 'Employment dates', 'pass', `${dateRanges.length} parseable date range${dateRanges.length > 1 ? 's' : ''} found (e.g. "Jan 2022 – Present").`);
        } else {
            check('dates', 'Employment dates', 'warn', 'Some roles are missing machine-readable dates. Use a consistent "Mon YYYY – Mon YYYY" format so tenure can be calculated.');
            rec('medium', 'Standardize employment dates', 'Format every role as "Jan 2022 – Mar 2024". ATS systems compute your years of experience from these ranges.', 4);
        }
    } else {
        check('dates', 'Employment dates', 'fail', 'No date ranges detected anywhere — recruiters and ATS filters cannot compute your experience.');
        rec('critical', 'Add dates to your work history', 'Every position needs a start and end date in "Mon YYYY" format.', 10);
    }

    // Layout artifacts
    const a = resume.artifacts;
    if (a.imageOnlyPdf) {
        check('layout', 'File parse-ability', 'fail', 'This PDF contains almost no extractable text — it is likely a scanned image or an export with outlined fonts. Most ATS systems will read it as empty.');
        rec('critical', 'Export a text-based PDF', 'Re-export your resume directly from your editor (not a scan/screenshot) so the text layer is selectable.', 20);
    } else if (a.columnsSuspected || a.hasTabs) {
        check('layout', 'Single-column layout', 'warn', 'Spacing patterns suggest multi-column or tabbed layout. Older parsers read columns left-to-right across the page, scrambling your content.');
        rec('high', 'Switch to a single-column layout', 'Multi-column resumes get scrambled by Taleo/iCIMS-era parsers. Keep one column with clear headers.', 6);
    } else {
        check('layout', 'Single-column layout', 'pass', 'No multi-column or table artifacts detected — the text parses in natural reading order.');
    }
    if (a.hasEmojis) {
        check('chars', 'Special characters', 'warn', 'Emojis or decorative symbols found. They render as junk bytes ("â€¢") in many parsers — replace with plain text.');
        rec('low', 'Remove emojis and decorative symbols', 'Replace decorative characters with plain hyphens or standard bullets.', 2);
    } else {
        check('chars', 'Special characters', 'pass', 'No emojis or exotic symbols that could corrupt parsing.');
    }

    // Length
    const wc = resume.wordCount;
    if (wc < 200) {
        check('length', 'Resume length', wc < 90 ? 'fail' : 'warn', `Only ~${wc} words. Thin resumes score poorly on keyword density — aim for 400–800 words.`);
        rec('high', 'Expand your content', 'Your resume is too short to rank well. Add 3–5 accomplishment bullets per recent role with concrete outcomes.', 8);
    } else if (wc > 1100) {
        check('length', 'Resume length', 'warn', `~${wc} words — likely 3+ pages. Recruiters spend ~7 seconds on the first pass; trim to the most relevant two pages.`);
        rec('medium', 'Tighten to two pages', 'Cut roles older than ~10 years to one line each and remove redundant bullets.', 3);
    } else {
        check('length', 'Resume length', 'pass', `~${wc} words — a healthy length for parsing and recruiter review.`);
    }

    // Bullets & readability
    if (bulletMetrics.total === 0) {
        check('bullets', 'Bullet point structure', 'fail', 'No bullet points detected. Dense paragraphs are skimmed poorly by recruiters and parsed as one blob by ATS software.');
        rec('high', 'Convert paragraphs to bullets', 'Break each role description into 3–6 single-line bullets starting with an action verb.', 8);
    } else {
        const avRate = Math.round(bulletMetrics.actionVerbRate * 100);
        const qRate = Math.round(bulletMetrics.quantifiedRate * 100);
        check('bullets', 'Bullet point structure', bulletMetrics.total >= 5 ? 'pass' : 'warn',
            `${bulletMetrics.total} bullets found · ${avRate}% open with a strong action verb · ${qRate}% include numbers.`);
        if (bulletMetrics.actionVerbRate < 0.5) {
            check('verbs', 'Action verbs', 'warn', `Only ${avRate}% of bullets start with a strong action verb${bulletMetrics.weakOpeners.length ? ` (weak openers: "${bulletMetrics.weakOpeners.join('", "')}…")` : ''}.`);
            rec('high', 'Lead every bullet with an action verb', 'Replace openers like "Responsible for…" with verbs such as Led, Built, Reduced, Negotiated, Launched.', 6);
        } else {
            check('verbs', 'Action verbs', 'pass', `${avRate}% of bullets open with a strong action verb.`);
        }
        if (bulletMetrics.quantifiedRate < 0.35) {
            check('metrics', 'Quantified results', 'warn', `Only ${qRate}% of bullets contain a number. Quantified bullets ("cut costs 18%") are the #1 differentiator recruiters scan for.`);
            rec('high', 'Quantify your achievements', 'Add a metric to at least half your bullets: revenue, %, time saved, team size, ticket volume — any concrete number.', 7);
        } else {
            check('metrics', 'Quantified results', 'pass', `${qRate}% of bullets are quantified — strong evidence-based writing.`);
        }
        if (bulletMetrics.tooLong > 1) {
            rec('low', 'Shorten overlong bullets', `${bulletMetrics.tooLong} bullets exceed ~32 words. Split them — one achievement per line.`, 2);
        }
    }

    // Clichés / first person
    const lowerText = resume.rawText.toLowerCase();
    const foundCliches = CLICHES.filter(cl => lowerText.includes(cl));
    if (foundCliches.length >= 2) {
        check('cliches', 'Buzzword density', 'warn', `Found clichés: "${foundCliches.slice(0, 4).join('", "')}". These carry zero keyword value — spend the space on skills and outcomes.`);
        rec('low', 'Replace clichés with evidence', `Swap phrases like "${foundCliches[0]}" for specific accomplishments that prove the trait.`, 2);
    } else {
        check('cliches', 'Buzzword density', 'pass', 'Low cliché density — the writing stays concrete.');
    }
    const firstPersonHits = (lowerText.match(/(^|[\s.(])i\s|(\s)my\s/g) || []).length;
    if (firstPersonHits > 3) {
        check('pronouns', 'First-person pronouns', 'warn', 'Multiple uses of "I/my". Resume convention is implied first person ("Led…", not "I led…").');
        rec('low', 'Drop first-person pronouns', 'Rewrite "I managed the team" as "Managed 8-person team".', 1);
    } else {
        check('pronouns', 'First-person pronouns', 'pass', 'Written in implied first person — the standard resume voice.');
    }

    // ---------------------------------------------------------------------
    // ATS compatibility score (JD-independent)
    // ---------------------------------------------------------------------
    const statusScore = (s: CheckStatus) => (s === 'pass' ? 100 : s === 'warn' ? 55 : 0);
    const fc = (id: string) => formatChecks.find(f => f.id === id);

    const atsDimensions: ScoreDimension[] = [
        {
            id: 'parseability', label: 'File & layout parse-ability', weight: 0.25,
            score: clamp((statusScore(fc('layout')!.status) + statusScore(fc('chars')!.status) + (fc('dates') ? statusScore(fc('dates')!.status) : 60)) / 3),
            summary: 'Whether an ATS can extract your text in the right order with usable dates.',
        },
        {
            id: 'contact', label: 'Contact completeness', weight: 0.15,
            score: clamp(contactBits / 3 * 80 + (c.linkedin ? 20 : 0)),
            summary: 'Name, email, phone and LinkedIn detected from the header.',
        },
        {
            id: 'structure', label: 'Section structure', weight: 0.2,
            score: clamp(((coreKinds.length - missingCore.length) / coreKinds.length) * 100),
            summary: 'Core sections present under standard, machine-readable headers.',
        },
        {
            id: 'writing', label: 'Bullet & writing quality', weight: 0.3,
            score: bulletMetrics.total === 0 ? 15 : clamp(
                bulletMetrics.actionVerbRate * 45 +
                bulletMetrics.quantifiedRate * 40 +
                Math.min(bulletMetrics.total / 12, 1) * 15,
            ),
            summary: 'Action-verb openers, quantified outcomes and skimmable bullets.',
        },
        {
            id: 'density', label: 'Content depth', weight: 0.1,
            score: clamp(statusScore(fc('length')!.status) * 0.6 + Math.min(resume.skills.length / 12, 1) * 40),
            summary: 'Enough substance (and recognized skills) for keyword ranking.',
        },
    ];
    const atsScore = clamp(atsDimensions.reduce((sum, d) => sum + d.score * d.weight, 0));

    // ---------------------------------------------------------------------
    // Job match scoring
    // ---------------------------------------------------------------------
    let matchScore: number | null = null;
    let matchDimensions: ScoreDimension[] = [];
    let matchedKeywords: MatchedKeyword[] = [];
    let missingKeywords: JobKeyword[] = [];
    let skillGaps: SkillGapGroup[] = [];
    let roleFit: RoleFit | null = null;
    let keywordStuffing: KeywordStuffing | null = null;

    if (job) {
        const { matched, missing } = matchKeywordsAgainstResume(job, resume);
        matchedKeywords = matched;
        missingKeywords = missing;

        const weightOf = (arr: JobKeyword[]) => arr.reduce((s, k) => s + k.weight, 0);
        const reqMatched = matched.filter(k => k.required);
        const reqMissing = missing.filter(k => k.required);
        const prefMatched = matched.filter(k => !k.required);
        const prefMissing = missing.filter(k => !k.required);

        const reqTotal = weightOf(reqMatched) + weightOf(reqMissing);
        const prefTotal = weightOf(prefMatched) + weightOf(prefMissing);
        const requiredCoverage = reqTotal > 0 ? weightOf(reqMatched) / reqTotal : 1;
        const preferredCoverage = prefTotal > 0 ? weightOf(prefMatched) / prefTotal : 1;

        // Title alignment
        const resumeTitle = resume.experience[0]?.title || resume.contact.name || '';
        const declaredTitle = (resume.source === 'structured'
            ? resume.sections.length && resume.rawText.split('\n')[1]
            : resumeTitle) || resumeTitle;
        const jobTitleTokens = tokenize(job.title).filter(t => !JD_STOPWORDS.has(t) && t.length > 2);
        const resumeTitleText = `${declaredTitle} ${resume.experience.map(e => e.title).join(' ')}`.toLowerCase();
        const titleHits = jobTitleTokens.filter(t => resumeTitleText.includes(t));
        const titleAlignment = jobTitleTokens.length ? titleHits.length / jobTitleTokens.length : 0.5;

        // Seniority on the resume
        let resumeSeniority: Seniority = 'unspecified';
        const latestTitles = resume.experience.slice(0, 2).map(e => e.title).join(' ') || resumeTitleText;
        for (const { level, re } of SENIORITY_PATTERNS) {
            if (re.test(latestTitles)) { resumeSeniority = level; break; }
        }
        if (resumeSeniority === 'unspecified') {
            resumeSeniority = resume.totalExperienceYears >= 12 ? 'lead'
                : resume.totalExperienceYears >= 6 ? 'senior'
                : resume.totalExperienceYears >= 2.5 ? 'mid'
                : 'entry';
        }

        // Experience years
        let yearsScore = 0.75;
        let yearsVerdict = 'The job posting does not state a required number of years.';
        if (job.yearsRequired !== null) {
            const ratio = resume.totalExperienceYears / job.yearsRequired;
            yearsScore = clamp(ratio * 100, 0, 100) / 100;
            if (ratio >= 1) {
                yearsScore = 1;
                yearsVerdict = `You show ~${resume.totalExperienceYears} years against the ${job.yearsRequired}+ required — fully qualified on tenure.`;
            } else if (ratio >= 0.7) {
                yearsVerdict = `You show ~${resume.totalExperienceYears} of the ${job.yearsRequired}+ years requested — close enough that strong keyword alignment can compensate.`;
            } else {
                yearsVerdict = `You show ~${resume.totalExperienceYears} years against ${job.yearsRequired}+ requested. Surface adjacent experience (projects, freelance, internships) with dates to close the gap.`;
            }
        } else if (resume.totalExperienceYears === 0) {
            yearsScore = 0.4;
            yearsVerdict = 'No parseable tenure found on the resume — add dated roles or projects.';
        }

        // Education
        const eduRank: Record<string, number> = { 'High School': 1, "Associate's / High school": 1, "Associate's": 1, 'Diploma': 1, "Bachelor's": 2, "Master's": 3, 'MBA': 3, 'Doctorate': 4 };
        let eduScore = 0.85;
        let educationVerdict = 'No explicit education requirement detected in the posting.';
        if (job.educationRequired) {
            const need = eduRank[job.educationRequired] || 2;
            const best = Math.max(0, ...resume.degrees.map(d => eduRank[d] || 0));
            if (best >= need) {
                eduScore = 1;
                educationVerdict = `Posting asks for a ${job.educationRequired} degree — your ${resume.degrees.join(' / ') || 'credentials'} satisfies it.`;
            } else if (best > 0) {
                eduScore = 0.6;
                educationVerdict = `Posting asks for a ${job.educationRequired}; your highest detected credential is ${resume.degrees.join(' / ')}. Equivalent experience often substitutes — make it prominent.`;
            } else {
                eduScore = 0.35;
                educationVerdict = `Posting asks for a ${job.educationRequired} degree but no education section was parsed. Add one, even for in-progress or partial studies.`;
            }
        }

        matchDimensions = [
            { id: 'required', label: 'Required skills & keywords', weight: 0.45, score: clamp(requiredCoverage * 100), summary: `${reqMatched.length}/${reqMatched.length + reqMissing.length} weighted must-have terms found on your resume.` },
            { id: 'preferred', label: 'Preferred skills', weight: 0.1, score: clamp(preferredCoverage * 100), summary: `${prefMatched.length}/${prefMatched.length + prefMissing.length} nice-to-have terms covered.` },
            { id: 'title', label: 'Title alignment', weight: 0.15, score: clamp(titleAlignment * 100), summary: titleHits.length ? `Your titles share "${titleHits.slice(0, 3).join('", "')}" with the posting.` : 'Your recent titles share little vocabulary with the target role.' },
            { id: 'years', label: 'Experience depth', weight: 0.18, score: clamp(yearsScore * 100), summary: yearsVerdict },
            { id: 'education', label: 'Education', weight: 0.12, score: clamp(eduScore * 100), summary: educationVerdict },
        ];
        matchScore = clamp(matchDimensions.reduce((s, d) => s + d.score * d.weight, 0));

        // --- anti-keyword-stuffing cap ---
        // A genuinely-used skill rarely appears many times in a single resume.
        // When a JD keyword is repeated far beyond natural usage, the match
        // score is being gamed; cap it and tell the user (truthfulness > score).
        const stuffThreshold = Math.max(8, Math.round(resume.wordCount / 50));
        const overused = matched
            .filter(k => k.resumeCount >= stuffThreshold)
            .sort((x, y) => y.resumeCount - x.resumeCount);
        if (overused.length > 0) {
            const worst = overused[0].resumeCount;
            const severity: KeywordStuffing['severity'] =
                overused.length >= 4 || worst >= 25 ? 'high' : 'moderate';
            const cap = severity === 'high' ? 60 : 75;
            const terms = overused.slice(0, 6).map(k => k.term);
            const detail =
                `${terms.map(t => `"${t}"`).join(', ')} ${terms.length === 1 ? 'appears' : 'appear'} ` +
                `unusually often (e.g. "${overused[0].term}" ×${worst}). Modern ATS parsers and recruiters ` +
                'penalize keyword stuffing, so your match score is capped here. Mention each skill where it is ' +
                'genuinely evidenced rather than repeating it.';
            keywordStuffing = { severity, terms, cap, detail };
            matchScore = Math.min(matchScore, cap);
            check('stuffing', 'Keyword stuffing', severity === 'high' ? 'fail' : 'warn', detail);
            rec(severity === 'high' ? 'high' : 'medium', 'Remove repeated keyword stuffing',
                `Cut the over-repetition of ${terms.map(t => `"${t}"`).join(', ')}. ` +
                'Each skill needs to appear only where you actually evidence it; spamming terms lowers, not raises, your real ranking.',
                severity === 'high' ? 6 : 3);
        }

        // --- skills gap, grouped by category ---
        const categories = new Map<SkillCategory, SkillGapGroup>();
        for (const kw of [...matched, ...missing]) {
            if (!kw.category) continue;
            let group = categories.get(kw.category);
            if (!group) {
                group = { category: kw.category, label: SKILL_CATEGORY_LABELS[kw.category], matched: [], missing: [] };
                categories.set(kw.category, group);
            }
            if ('resumeCount' in kw) group.matched.push(kw as MatchedKeyword);
            else group.missing.push(kw);
        }
        skillGaps = Array.from(categories.values()).sort((x, y) =>
            (y.matched.length + y.missing.length) - (x.matched.length + x.missing.length));

        // --- role fit ---
        const senDiff = SENIORITY_RANK[resumeSeniority] - SENIORITY_RANK[job.seniority];
        const seniorityVerdict = job.seniority === 'unspecified'
            ? 'The posting does not state a seniority level.'
            : senDiff === 0 ? `Your profile reads as ${SENIORITY_LABELS[resumeSeniority]} — exactly the level this role targets.`
            : senDiff > 0 ? `Your profile reads ${SENIORITY_LABELS[resumeSeniority]}, above the ${SENIORITY_LABELS[job.seniority]} level posted. Expect "overqualified" screening — emphasize hands-on motivation.`
            : `Your profile reads ${SENIORITY_LABELS[resumeSeniority]} for a ${SENIORITY_LABELS[job.seniority]} posting. Emphasize leadership moments, scope and ownership to read more senior.`;

        const strengths: string[] = [];
        const gaps: string[] = [];
        const topMatched = reqMatched.sort((x, y) => y.weight - x.weight).slice(0, 4).map(k => k.term);
        if (topMatched.length) strengths.push(`Direct hits on high-weight requirements: ${topMatched.join(', ')}.`);
        if (yearsScore >= 1 && job.yearsRequired) strengths.push(`Tenure requirement met (${resume.totalExperienceYears}y vs ${job.yearsRequired}+ asked).`);
        if (titleAlignment >= 0.6) strengths.push('Job titles closely mirror the target role — strong recruiter signal.');
        if (eduScore === 1 && job.educationRequired) strengths.push(`Education requirement (${job.educationRequired}) satisfied.`);
        if (bulletMetrics.quantifiedRate >= 0.4) strengths.push('Quantified accomplishments give recruiters concrete evidence.');

        const topMissing = reqMissing.sort((x, y) => y.weight - x.weight).slice(0, 4).map(k => k.term);
        if (topMissing.length) gaps.push(`Missing must-have terms: ${topMissing.join(', ')}.`);
        if (job.yearsRequired && yearsScore < 0.7) gaps.push(`Tenure gap: ~${resume.totalExperienceYears}y shown vs ${job.yearsRequired}+ requested.`);
        if (titleAlignment < 0.4) gaps.push('Title vocabulary mismatch — consider a headline that names the target role.');
        if (eduScore < 0.6 && job.educationRequired) gaps.push(`Education requirement (${job.educationRequired}) not evidenced.`);

        const competitiveness: RoleFit['competitiveness'] =
            matchScore >= 75 ? 'strong' : matchScore >= 55 ? 'moderate' : 'stretch';
        const verdict =
            competitiveness === 'strong'
                ? 'You are a strong on-paper candidate. Fix the remaining keyword gaps and this resume should pass automated screening comfortably.'
                : competitiveness === 'moderate'
                ? 'A competitive but not guaranteed match. Closing the highest-weight keyword gaps below would move you into the top band most ATS filters shortlist.'
                : 'On paper this role is a stretch. You can still compete by mirroring the posting\'s exact vocabulary, surfacing adjacent experience, and tailoring your summary to the role.';

        roleFit = {
            targetTitle: job.title || 'Target role',
            resumeTitle: resume.experience[0]?.title || declaredTitle || '—',
            titleAligned: titleAlignment >= 0.5,
            seniority: job.seniority,
            resumeSeniority,
            seniorityVerdict,
            yearsRequired: job.yearsRequired,
            yearsOnResume: resume.totalExperienceYears,
            yearsVerdict,
            educationRequired: job.educationRequired,
            educationVerdict,
            strengths,
            gaps,
            verdict,
            competitiveness,
        };

        // --- keyword-driven recommendations ---
        const criticalMissing = reqMissing.sort((x, y) => y.weight - x.weight);
        for (const kw of criticalMissing.slice(0, 5)) {
            rec('critical', `Add "${kw.term}" to your resume`,
                `"${kw.term}" appears ${kw.count}× in the job posting${kw.required ? ' as a requirement' : ''} but never on your resume. If you have this skill, name it explicitly in your skills section and evidence it in a bullet; ATS ranking is exact-match driven.`,
                Math.round(4 + kw.weight * 2));
        }
        if (criticalMissing.length > 5) {
            rec('high', `Cover ${criticalMissing.length - 5} more missing requirements`,
                `Also absent: ${criticalMissing.slice(5, 12).map(k => k.term).join(', ')}. Work the ones you genuinely have into your experience bullets.`, 6);
        }
        for (const kw of prefMissing.sort((x, y) => y.weight - x.weight).slice(0, 3)) {
            rec('medium', `Consider adding "${kw.term}"`, `Listed as a nice-to-have (${kw.count}× in the posting). Even one mention helps your ranking.`, 2);
        }
        if (titleAlignment < 0.5 && job.title) {
            rec('high', 'Mirror the target job title', `Add a headline near your name such as "${job.title}" (if accurate) and echo its wording in your summary. Recruiters search by title verbatim.`, 5);
        }
        const summarySection = sectionsByKind('summary')[0];
        if (summarySection && job.keywords.length) {
            const summaryLower = summarySection.text.toLowerCase();
            const topReqTerms = job.keywords.filter(k => k.required).slice(0, 6);
            const inSummary = topReqTerms.filter(k => summaryLower.includes(k.term.toLowerCase()));
            if (topReqTerms.length && inSummary.length / topReqTerms.length < 0.34) {
                rec('medium', 'Tailor your summary to this job', `Your summary mentions ${inSummary.length} of the top ${topReqTerms.length} requirements. Rewrite it to name the role and 3–4 of: ${topReqTerms.map(k => k.term).join(', ')}.`, 4);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Section-by-section feedback
    // ---------------------------------------------------------------------
    const sectionFeedback: SectionFeedback[] = [];

    const summarySec = sectionsByKind('summary')[0];
    {
        const strengths: string[] = [];
        const issues: string[] = [];
        let score = 0;
        if (summarySec) {
            const words = summarySec.text.split(/\s+/).filter(Boolean).length;
            score = 60;
            if (words >= 30 && words <= 90) { score += 20; strengths.push(`Good length (${words} words) — scannable in one glance.`); }
            else if (words < 30) issues.push(`Very short (${words} words). Aim for 3–4 sentences: role identity, years, top skills, signature win.`);
            else issues.push(`Long (${words} words). Recruiters skim summaries — tighten to 3–4 sentences.`);
            const sumSkills = extractSkills(summarySec.text);
            if (sumSkills.length >= 3) { score += 20; strengths.push(`Names ${sumSkills.length} recognizable skills (${sumSkills.slice(0, 3).map(s => s.def.name).join(', ')}…).`); }
            else issues.push('Mentions few concrete skills — name your 3–4 strongest, matching the target job\'s wording.');
            if (job?.title && summarySec.text.toLowerCase().includes(job.title.toLowerCase().split(/\s+/)[0] || '')) strengths.push('References the target role family.');
        } else {
            issues.push('No professional summary found. It\'s the first thing both ATS keyword scans and recruiters read — add 3–4 targeted sentences.');
        }
        sectionFeedback.push({ kind: 'summary', title: 'Professional Summary', present: !!summarySec, score: clamp(score), strengths, issues });
    }

    {
        const strengths: string[] = [];
        const issues: string[] = [];
        let score = 0;
        const expSecs = sectionsByKind('experience');
        if (expSecs.length) {
            score = 45;
            const entries = resume.experience.length;
            if (entries >= 2) { score += 10; strengths.push(`${entries} distinct roles parsed with company/title/date structure.`); }
            else if (entries === 1) strengths.push('1 role parsed cleanly.');
            else issues.push('Could not split your experience into individual roles — make each role a "Title | Company | Dates" line followed by bullets.');
            if (bulletMetrics.actionVerbRate >= 0.5) { score += 15; strengths.push(`${Math.round(bulletMetrics.actionVerbRate * 100)}% of bullets open with strong action verbs.`); }
            else issues.push(`Only ${Math.round(bulletMetrics.actionVerbRate * 100)}% of bullets start with an action verb — lead with Led/Built/Reduced/Drove.`);
            if (bulletMetrics.quantifiedRate >= 0.35) { score += 20; strengths.push(`${Math.round(bulletMetrics.quantifiedRate * 100)}% of bullets carry numbers — strong evidence density.`); }
            else issues.push(`Only ${Math.round(bulletMetrics.quantifiedRate * 100)}% of bullets are quantified. Add metrics: scale, %, $, time, volume.`);
            if (resume.totalExperienceYears > 0) { score += 10; strengths.push(`~${resume.totalExperienceYears} years of tenure computed from your dates.`); }
            else issues.push('No tenure computable — check that every role has parseable dates.');
        } else {
            issues.push('No work-experience section detected — this is the single most important section for any ATS.');
        }
        sectionFeedback.push({ kind: 'experience', title: 'Work Experience', present: !!expSecs.length, score: clamp(score), strengths, issues });
    }

    {
        const strengths: string[] = [];
        const issues: string[] = [];
        let score = 0;
        const eduSecs = sectionsByKind('education');
        if (eduSecs.length) {
            score = 70;
            if (resume.degrees.length) { score += 30; strengths.push(`Credential level detected: ${resume.degrees.join(', ')}.`); }
            else issues.push('Section exists but no degree level was recognized — spell out "Bachelor of Science in X" rather than abbreviations only.');
        } else {
            issues.push('No education section found. Even senior resumes should keep a one-line education entry — many ATS filters require the field.');
        }
        sectionFeedback.push({ kind: 'education', title: 'Education', present: !!eduSecs.length, score: clamp(score), strengths, issues });
    }

    {
        const strengths: string[] = [];
        const issues: string[] = [];
        let score = 0;
        const skillSecs = sectionsByKind('skills');
        const declared = resume.declaredSkills.length;
        if (skillSecs.length) {
            score = 50;
            if (declared >= 8 && declared <= 25) { score += 25; strengths.push(`${declared} skills listed — a healthy, scannable range.`); }
            else if (declared < 8) issues.push(`Only ${declared} skills listed. Expand to 10–18 covering tools, methods and domains from your target jobs.`);
            else issues.push(`${declared} skills listed — long lists dilute signal. Keep the 15–18 most relevant.`);
            const hardCount = resume.skills.filter(s => HARD_CATEGORIES.includes(s.def.category)).length;
            const softCount = resume.skills.filter(s => s.def.category === 'soft').length;
            if (hardCount >= softCount) { score += 25; strengths.push(`Good hard/soft balance (${hardCount} hard, ${softCount} soft).`); }
            else issues.push(`Soft skills outnumber hard skills (${softCount} vs ${hardCount}). ATS ranking keys almost entirely on hard skills.`);
        } else {
            issues.push('No dedicated skills section. Add one — it\'s the highest-density keyword real estate on the page.');
        }
        sectionFeedback.push({ kind: 'skills', title: 'Skills', present: !!skillSecs.length, score: clamp(score), strengths, issues });
    }

    // ---------------------------------------------------------------------
    // Order recommendations by priority then impact
    // ---------------------------------------------------------------------
    const prioRank: Record<RecPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((x, y) => prioRank[x.priority] - prioRank[y.priority] || y.impact - x.impact);

    return {
        generatedAt: new Date().toISOString(),
        disclaimer: ATS_DISCLAIMER,
        atsScore,
        atsDimensions,
        matchScore,
        keywordStuffing,
        matchDimensions,
        matchedKeywords,
        missingKeywords,
        skillGaps,
        sectionFeedback,
        formatChecks,
        recommendations,
        roleFit,
        stats: {
            wordCount: resume.wordCount,
            bulletCount: bulletMetrics.total,
            quantifiedBulletRate: bulletMetrics.quantifiedRate,
            actionVerbRate: bulletMetrics.actionVerbRate,
            experienceYears: resume.totalExperienceYears,
            skillCount: resume.skills.length,
        },
    };
}

/** Convenience wrapper used by the UI. */
export function runFullAnalysis(resume: ParsedResume, jobDescription: string | null): { job: JobAnalysis | null; report: AtsReport } {
    const job = jobDescription && jobDescription.trim().length >= 80
        ? analyzeJobDescription(jobDescription)
        : null;
    return { job, report: runAtsAnalysis(resume, job) };
}
