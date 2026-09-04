import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const VanguardClassicTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#7F1D1D'; // Deep Crimson / Burgundy
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-xs font-black uppercase tracking-widest mb-1.5 pb-0.5 border-b-2 border-slate-900 break-after-avoid">
                            Executive Profile
                        </h2>
                        <div className="text-xs text-justify text-slate-750 font-normal leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900 break-after-avoid">
                            Professional Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-extrabold text-slate-950">{exp.jobTitle}</h3>
                                        <span className="text-slate-600 text-xs font-bold font-sans">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs italic text-slate-700 mb-1">
                                        <span>{exp.company}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-500 font-sans">{exp.location}</span>
                                    </div>
                                    <div className="text-xs text-slate-700 leading-relaxed font-normal text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900 break-after-avoid">
                            Education
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-extrabold text-slate-950">{edu.school}</h3>
                                        <span className="text-slate-650 text-xs font-bold font-sans">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-slate-705 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-500 font-sans">{edu.location}</span>
                                    </div>
                                    {edu.description && (
                                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{edu.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <div key="skills" data-section="skills">
                        <span className="font-extrabold text-slate-900">Core Expertise:</span> {skills.join(', ')}
                    </div>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900 break-after-avoid">
                            Selected Initiatives & Projects
                        </h2>
                        <div className="space-y-3">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-xs font-extrabold text-slate-950">{proj.name}</h3>
                                        <span className="text-slate-600 text-[10px] font-bold font-sans">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    <div className="text-xs text-slate-700 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <div key="certifications" data-section="certifications">
                        <span className="font-extrabold text-slate-900">Licenses & Certifications:</span> {certifications.map(c => c.name).join(' • ')}
                    </div>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages">
                        <span className="font-extrabold text-slate-900">Languages:</span> {languages.map(l => `${l.language} (${l.proficiency})`).join(', ')}
                    </div>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <div key="awards" data-section="awards">
                        <span className="font-extrabold text-slate-900">Awards:</span> <div className="break-after-avoid">{awards.map(a => `${a.title} (${a.date})`).join(', ')}</div>
                    </div>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <div key="trainings" data-section="trainings">
                        <span className="font-extrabold text-slate-900">Trainings:</span> {trainings.map(t => `${t.course} – ${t.institution}`).join(' • ')}
                    </div>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <div key="publications" data-section="publications">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b pb-0.5 mb-1.5 break-after-avoid">Publications</h3>
                        <div className="text-xs text-slate-700 space-y-1">
                            {publications.map(p => (
                                <div className="break-inside-avoid" key={p.id}>
                                    <div className="font-semibold">{p.title}</div>
                                    <div className="text-[10px] text-gray-500 italic">{p.publisher} ({p.date})</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <div key="volunteer" data-section="volunteer">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b pb-0.5 mb-1.5 break-after-avoid">Leadership & Volunteering</h3>
                        <div className="text-xs text-slate-700 space-y-1">
                            {volunteer.map(v => (
                                <div className="break-inside-avoid" key={v.id}>
                                    <div className="font-semibold">{v.role}</div>
                                    <div className="text-[10px] text-gray-500 italic">{v.organization}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-vanguard-classic"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-900 leading-normal`}
            style={{ fontFamily: settings?.fontFamily || 'Georgia, Cambria, serif' }}
        >
            {/* Authoritative Structured Executive Header */}
            <header className="border-t-4 pt-4 mb-6" style={{ borderColor: accentColor }}>
                <div className="flex flex-col md:flex-row justify-between items-baseline gap-2">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: accentColor }}>
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        {contact.jobTitle && (
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-1">
                                {contact.jobTitle}
                            </p>
                        )}
                    </div>
                    {/* Compact Stacked Metadata Block */}
                    <div className="text-right text-[10px] text-slate-600 font-sans space-y-0.5">
                        {fullPhone && <div>Phone: {fullPhone}</div>}
                        {contact.email && <div>Email: {contact.email}</div>}
                        {fullAddress && <div>Address: {fullAddress}</div>}
                        {contact.linkedin && <div className="break-all">LinkedIn: {contact.linkedin}</div>}
                        {contact.website && <div className="break-all">Portfolio: {contact.website}</div>}
                    </div>
                </div>
            </header>

            {/* Content Flow */}
            <div className="space-y-4">
                {/* Professional Statement */}
                {renderRun(['summary', 'experience', 'projects', 'education'])}

                {/* Combined skills, certifications & languages for a dense bottom block */}
                <section>
                    <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900">
                        Qualifications & Skills
                    </h2>
                    <div className="space-y-1.5 text-xs text-slate-700">
                        {renderRun(['skills', 'certifications', 'languages', 'awards', 'trainings'])}
                    </div>
                </section>

                {/* Publications and Volunteer inside neat blocks */}
                <div className="grid grid-cols-2 gap-4">
                    {renderRun(['publications', 'volunteer'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(VanguardClassicTemplate);
