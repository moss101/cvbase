/**
 * Resume → .docx exporter, parallel to the existing PDF export.
 *
 * Produces a clean, single-column, ATS-friendly Word document (standard section
 * headings, real bullet lists) from the structured ResumeData — never from the
 * rendered template HTML, so the output parses cleanly. `buildResumeDoc` is pure
 * (no I/O) and unit-tested; `downloadResumeDocx` is the browser entry point.
 */
import {
    BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun,
} from 'docx';
import type { ResumeData, ResumeSettings, SectionId } from '../../types';
import { parseRichText, type RichBlock } from './richText.ts';
import { saveFile } from './saveFile';

export interface DocxExportOptions {
    settings?: Partial<ResumeSettings>;
    /** When provided, only these sections are exported (others are skipped). */
    visibleSections?: SectionId[];
}

const DEFAULT_ORDER: SectionId[] = [
    'summary', 'experience', 'education', 'skills', 'projects', 'certifications',
    'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom',
];

const SECTION_TITLES: Partial<Record<SectionId, string>> = {
    summary: 'Professional Summary', experience: 'Experience', education: 'Education',
    skills: 'Skills', projects: 'Projects', certifications: 'Certifications',
    languages: 'Languages', awards: 'Awards', trainings: 'Training',
    publications: 'Publications', volunteer: 'Volunteer Experience', custom: 'Additional',
};

const sanitizeColor = (c?: string): string => {
    const hex = (c || '').replace('#', '').trim();
    return /^[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : '1B1713';
};

const dateRange = (start?: string, end?: string): string =>
    [start, end].filter(Boolean).join(' – ');

/** Map one parsed rich-text block to TextRuns, honouring <br> as line breaks. */
const runsFromBlock = (b: RichBlock): TextRun[] => {
    const out: TextRun[] = [];
    for (const r of b.runs) {
        const lines = r.text.split('\n');
        lines.forEach((line, i) => {
            out.push(new TextRun({
                text: line,
                bold: r.bold,
                italics: r.italic,
                underline: r.underline ? {} : undefined,
                break: i > 0 ? 1 : undefined,
            }));
        });
    }
    return out.length ? out : [new TextRun('')];
};

/** Convert a sanitized HTML description into bullet/paragraph DOCX paragraphs. */
const descriptionParagraphs = (html?: string): Paragraph[] =>
    parseRichText(html || '').map(b => new Paragraph({
        children: runsFromBlock(b),
        bullet: b.list ? { level: 0 } : undefined,
        spacing: { after: 40 },
    }));

const sectionHeading = (title: string, color: string): Paragraph =>
    new Paragraph({
        spacing: { before: 220, after: 80 },
        border: { bottom: { color, size: 6, style: BorderStyle.SINGLE, space: 1 } },
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, color })],
    });

const entryTitle = (left: string, right?: string): Paragraph =>
    new Paragraph({
        spacing: { before: 120 },
        children: [new TextRun({ text: left, bold: true, size: 22 })].concat(
            right ? [new TextRun({ text: `  ·  ${right}`, size: 22, color: '5A5247' })] : [],
        ),
    });

const entryMeta = (text: string): Paragraph =>
    new Paragraph({ children: [new TextRun({ text, italics: true, size: 19, color: '5A5247' })] });

/** Build the Word document. Pure: no DOM, no file system. */
export function buildResumeDoc(data: ResumeData, opts: DocxExportOptions = {}): Document {
    const color = sanitizeColor(opts.settings?.themeColor);
    const order = (data.sectionOrder?.length ? data.sectionOrder : DEFAULT_ORDER) as SectionId[];
    const visible = opts.visibleSections ? new Set(opts.visibleSections) : null;
    const shown = (id: SectionId) => !visible || visible.has(id);

    const c = data.contact;
    const children: Paragraph[] = [];

    // --- header ---
    const name = `${c.firstName} ${c.lastName}`.trim() || 'Your Name';
    children.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 20 },
        children: [new TextRun({ text: name, bold: true, size: 44, color })],
    }));
    if (c.jobTitle) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: c.jobTitle, size: 26, color: '5A5247' })] }));
    }
    const contactBits = [
        c.email,
        [c.phoneCountryCode, c.phone].filter(Boolean).join(' '),
        [c.city || c.customCity, c.country].filter(Boolean).join(', '),
        c.linkedin, c.website,
    ].map(s => (s || '').trim()).filter(Boolean);
    if (contactBits.length) {
        children.push(new Paragraph({ children: [new TextRun({ text: contactBits.join('   |   '), size: 19, color: '5A5247' })] }));
    }

    const section = (id: SectionId, body: Paragraph[]) => {
        if (!body.length) return;
        children.push(sectionHeading(SECTION_TITLES[id] || id, color), ...body);
    };

    for (const id of order) {
        if (!shown(id)) continue;
        switch (id) {
            case 'summary':
                section('summary', descriptionParagraphs(data.summary?.professionalSummary));
                break;
            case 'experience':
                section('experience', (data.experience || []).flatMap(e => [
                    entryTitle(e.jobTitle || '', e.company),
                    entryMeta([dateRange(e.startDate, e.endDate), e.location].filter(Boolean).join('   ·   ')),
                    ...descriptionParagraphs(e.description),
                ]));
                break;
            case 'education':
                section('education', (data.education || []).flatMap(ed => [
                    entryTitle(ed.degree || ed.school || '', ed.degree ? ed.school : undefined),
                    entryMeta([dateRange(ed.startDate, ed.endDate), ed.location].filter(Boolean).join('   ·   ')),
                    ...descriptionParagraphs(ed.description),
                ]));
                break;
            case 'skills':
                section('skills', (data.skills || []).filter(Boolean).length
                    ? [new Paragraph({ children: [new TextRun({ text: data.skills.filter(Boolean).join('  ·  '), size: 21 })] })]
                    : []);
                break;
            case 'projects':
                section('projects', (data.projects || []).flatMap(p => [
                    entryTitle(p.name || '', p.technologies),
                    entryMeta([dateRange(p.startDate, p.endDate), p.link].filter(Boolean).join('   ·   ')),
                    ...descriptionParagraphs(p.description),
                ]));
                break;
            case 'certifications':
                section('certifications', (data.certifications || []).flatMap(ct => [
                    entryTitle(ct.name || '', ct.number ? `#${ct.number}` : undefined),
                    ...(ct.expiryDate ? [entryMeta(`Expires ${ct.expiryDate}`)] : []),
                    ...descriptionParagraphs(ct.description),
                ]));
                break;
            case 'languages':
                section('languages', (data.languages || []).filter(l => l.language).length
                    ? [new Paragraph({ children: [new TextRun({ text: (data.languages || []).filter(l => l.language).map(l => l.proficiency ? `${l.language} (${l.proficiency})` : l.language).join('  ·  '), size: 21 })] })]
                    : []);
                break;
            case 'awards':
                section('awards', (data.awards || []).flatMap(a => [
                    entryTitle(a.title || '', a.issuer),
                    ...(a.date ? [entryMeta(a.date)] : []),
                    ...descriptionParagraphs(a.description),
                ]));
                break;
            case 'trainings':
                section('trainings', (data.trainings || []).flatMap(t => [
                    entryTitle(t.course || '', t.institution),
                    ...(t.date ? [entryMeta(t.date)] : []),
                    ...descriptionParagraphs(t.description),
                ]));
                break;
            case 'publications':
                section('publications', (data.publications || []).flatMap(pb => [
                    entryTitle(pb.title || '', pb.publisher),
                    entryMeta([pb.date, pb.link].filter(Boolean).join('   ·   ')),
                    ...descriptionParagraphs(pb.description),
                ]));
                break;
            case 'volunteer':
                section('volunteer', (data.volunteer || []).flatMap(v => [
                    entryTitle(v.role || '', v.organization),
                    entryMeta([dateRange(v.startDate, v.endDate), v.location].filter(Boolean).join('   ·   ')),
                    ...descriptionParagraphs(v.description),
                ]));
                break;
            case 'custom':
                section('custom', (data.custom || []).flatMap(cs => [
                    entryTitle(cs.title || '', cs.subtitle),
                    ...(cs.date ? [entryMeta(cs.date)] : []),
                    ...descriptionParagraphs(cs.description),
                ]));
                break;
            default:
                break;
        }
    }

    return new Document({
        creator: 'CVBase',
        title: `${name} — Resume`,
        styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
        sections: [{
            properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
            children,
        }],
    });
}

/** Suggested download filename for a resume. */
export function docxFileName(data: ResumeData): string {
    const base = `${data.contact.firstName || ''}_${data.contact.lastName || ''}`.replace(/^_+|_+$/g, '').replace(/\s+/g, '_');
    return base ? `${base}_Resume.docx` : 'Resume.docx';
}

/**
 * Entry point used by the builder UI: build the doc and hand it to the user.
 * Anchor `<a download>` clicks are a no-op (or a dead-end blob: navigation)
 * inside a Capacitor WebView, so this now routes through the cross-platform
 * `saveFile` helper — an anchor download on the web, the native share sheet
 * (with a Documents-directory fallback) inside the packaged apps.
 */
export async function downloadResumeDocx(data: ResumeData, opts: DocxExportOptions = {}): Promise<void> {
    const blob = await Packer.toBlob(buildResumeDoc(data, opts));
    await saveFile({
        blob,
        filename: docxFileName(data),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
}
