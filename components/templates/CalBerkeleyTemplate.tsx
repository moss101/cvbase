import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const CalBerkeleyTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#1E3A8A'; // Berkeley Blue
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
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A] mb-1 pb-0.5 border-b border-slate-200 break-after-avoid">
                            Core Summary
                        </h2>
                        <div className="text-xs text-slate-750 font-normal leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A] mb-3 pb-0.5 border-b border-slate-200 break-after-avoid">
                            Professional Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-bold uppercase tracking-tight">
                                            {exp.jobTitle} <span className="text-amber-600">|</span> {exp.company}
                                        </h3>
                                        <span className="text-[10px] font-mono text-slate-500 font-bold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1 ml-0.5">Location: {exp.location}</p>
                                    <div className="text-xs text-slate-650 leading-relaxed pl-2.5 border-l-2 border-slate-100" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A] mb-3 pb-0.5 border-b border-slate-200 break-after-avoid">
                            Education
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-bold">{edu.school}</h3>
                                        <span className="text-[10px] font-mono text-slate-500 font-bold">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-slate-700 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-500">{edu.location}</span>
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
                    <section key="skills" data-section="skills">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A] mb-2 pb-0.5 border-b border-slate-200 break-after-avoid">
                            Core Capabilities & Stack
                        </h2>
                        <div className="flex flex-wrap gap-1">
                            {skills.map((skill, index) => (
                                <span key={index} className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A] mb-3 pb-0.5 border-b border-slate-200 break-after-avoid">
                            Technical Projects & Open Source
                        </h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-bold uppercase tracking-tight">
                                            {item.name}
                                        </h3>
                                        <span className="text-[10px] font-mono text-slate-500 font-bold">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    {item.technologies && (
                                        <p className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest ml-0.5 mb-1 bg-slate-50 p-1 rounded inline-block">
                                            Stack: {item.technologies}
                                        </p>
                                    )}
                                    <div className="text-xs text-slate-650 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <div key="certifications" data-section="certifications">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-700 break-after-avoid">Certifications</h3>
                        <ul className="text-xs text-slate-600 space-y-0.5 mt-1">
                            {certifications.map(c => (
                                <li className="break-inside-avoid" key={c.id}>• {c.name} ({c.expiryDate || 'Active'})</li>
                            ))}
                        </ul>
                    </div>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-700 break-after-avoid">Languages</h3>
                        <ul className="text-xs text-slate-600 space-y-0.5 mt-1 font-mono">
                            {languages.map(l => (
                                <li className="break-inside-avoid" key={l.id}>• {l.language} [{l.proficiency}]</li>
                            ))}
                        </ul>
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
            id={isCardPreview ? undefined : "resume-preview-cal-berkeley"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-800 leading-relaxed`}
            style={{ fontFamily: settings?.fontFamily || 'Helvetica, Arial, sans-serif' }}
        >
            {/* Berkeley Premium Top Header Block */}
            <header className="border-l-4 pl-4 py-1 mb-6 border-amber-500">
                <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tight">
                    {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                </h1>
                {contact.jobTitle && (
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
                        Systems & Software Engineer
                    </p>
                )}
                
                {/* Contact Line */}
                <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
                    {fullPhone && <span>PHONE: {fullPhone}</span>}
                    {contact.email && <span>EMAIL: {contact.email}</span>}
                    {city && <span>LOCATION: {city}, {contact.country || 'US'}</span>}
                    {contact.linkedin && <span className="break-all">LINKEDIN: {contact.linkedin}</span>}
                    {contact.website && <span className="break-all">WEB: {contact.website}</span>}
                </div>
            </header>

            {/* Logical, Flowing ATS Layout */}
            <div className="space-y-5">
                {/* Executive Summary */}
                {renderRun(['summary', 'skills', 'experience', 'projects', 'education'])}

                {/* Bottom multi sections */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                    {renderRun(['certifications', 'languages'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(CalBerkeleyTemplate);
