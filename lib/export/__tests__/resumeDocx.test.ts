// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildResumeDoc, docxFileName } from '../resumeDocx.ts';
import type { ResumeData } from '../../../types';

const sample: ResumeData = {
    contact: {
        firstName: 'Jane', lastName: 'Doe', jobTitle: 'Senior Engineer',
        phone: '555-1234', phoneCountryCode: '+1', email: 'jane@example.com',
        address: '', country: 'USA', city: 'Austin', customCity: '',
        linkedin: 'linkedin.com/in/jane', website: '', photo: '',
    },
    summary: { professionalSummary: '<p>Engineer who ships <strong>reliable</strong> systems.</p>' },
    experience: [{
        id: '1', jobTitle: 'Senior Engineer', company: 'Acme', location: 'Remote',
        startDate: 'Jan 2020', endDate: 'Present',
        description: '<ul><li>Built React dashboards</li><li>Cut latency 40%</li></ul>',
    }],
    projects: [], education: [{
        id: 'e1', school: 'MIT', degree: 'BSc Computer Science', location: 'Cambridge',
        startDate: '2012', endDate: '2016', description: '',
    }],
    skills: ['React', 'TypeScript', 'Node.js'],
    certifications: [], languages: [{ id: 'l1', language: 'English', proficiency: 'Native' }],
    awards: [], trainings: [], publications: [], volunteer: [], custom: [],
};

const documentXml = async (data = sample, opts = {}): Promise<string> => {
    const buf = await Packer.toBuffer(buildResumeDoc(data, opts));
    const zip = await JSZip.loadAsync(buf);
    return zip.file('word/document.xml')!.async('string');
};

describe('lib/export/resumeDocx', () => {
    it('packs to a valid (ZIP-magic) .docx buffer', async () => {
        const buf = await Packer.toBuffer(buildResumeDoc(sample));
        expect(buf.length).toBeGreaterThan(1000);
        expect(Buffer.from(buf.subarray(0, 2)).toString('latin1')).toBe('PK');
    });

    it('writes the candidate header, contact line and section content', async () => {
        const xml = await documentXml();
        expect(xml).toContain('Jane Doe');
        expect(xml).toContain('jane@example.com');
        expect(xml).toContain('Senior Engineer');
        // section headings are upper-cased
        expect(xml).toContain('EXPERIENCE');
        expect(xml).toContain('EDUCATION');
        expect(xml).toContain('SKILLS');
        // skills are flattened into one line
        expect(xml).toContain('React');
        expect(xml).toContain('TypeScript');
        // bullet text from the HTML description survives
        expect(xml).toContain('Cut latency 40%');
        // language proficiency formatting
        expect(xml).toContain('English (Native)');
    });

    it('respects visibleSections (hidden sections are omitted)', async () => {
        const xml = await documentXml(sample, { visibleSections: ['summary', 'experience'] });
        expect(xml).toContain('EXPERIENCE');
        expect(xml).not.toContain('EDUCATION');
        expect(xml).not.toContain('SKILLS');
    });

    it('derives a sensible download filename', () => {
        expect(docxFileName(sample)).toBe('Jane_Doe_Resume.docx');
        expect(docxFileName({ ...sample, contact: { ...sample.contact, firstName: '', lastName: '' } })).toBe('Resume.docx');
    });
});
