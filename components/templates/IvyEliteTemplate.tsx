import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const IvyEliteTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#1E293B'; // Slate-800
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
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-900 flex items-center justify-between break-after-avoid">
                            <span>Professional Summary</span>
                            <span className="h-[1px] bg-slate-250 grow ml-3"></span>
                        </h2>
                        <div className="text-xs text-slate-700 text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-900 flex items-center justify-between break-after-avoid">
                            <span>Professional Experience</span>
                            <span className="h-[1px] bg-slate-250 grow ml-3"></span>
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-950 font-bold">{exp.jobTitle}</h3>
                                        <span className="text-slate-600 text-xs font-bold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs italic text-slate-700 mb-1">
                                        <span>{exp.company}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-500">{exp.location}</span>
                                    </div>
                                    <div className="text-xs text-slate-705 leading-relaxed pl-2 border-l border-slate-200" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-900 flex items-center justify-between break-after-avoid">
                            <span>Education</span>
                            <span className="h-[1px] bg-slate-250 grow ml-3"></span>
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-950 font-bold">{edu.school}</h3>
                                        <span className="text-slate-600 text-xs font-bold">{edu.startDate} – {edu.endDate}</span>
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
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-900 flex items-center justify-between break-after-avoid">
                            <span>Skills Assessment</span>
                            <span className="h-[1px] bg-slate-250 grow ml-3"></span>
                        </h2>
                        <p className="text-xs text-slate-705 leading-relaxed">
                            {skills.join('  |  ')}
                        </p>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-900 flex items-center justify-between break-after-avoid">
                            <span>Key Projects</span>
                            <span className="h-[1px] bg-slate-250 grow ml-3"></span>
                        </h2>
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-950 font-bold">{proj.name}</h3>
                                        <span className="text-slate-650 text-xs font-bold">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Tech Stack: {proj.technologies}</p>
                                    )}
                                    <div className="text-xs text-slate-700 leading-relaxed pl-2 border-l border-slate-200" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-900 flex items-center justify-between break-after-avoid">
                            <span>Certifications</span>
                            <span className="h-[1px] bg-slate-250 grow ml-3"></span>
                        </h2>
                        <p className="text-xs text-slate-705 leading-relaxed">
                            {certifications.map(cert => cert.name).join('  •  ')}
                        </p>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages">
                        <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider mb-1 break-after-avoid">Languages</h3>
                        <div className="text-xs text-slate-700">
                            {languages.map(lang => `${lang.language} (${lang.proficiency})`).join(', ')}
                        </div>
                    </div>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <div key="awards" data-section="awards">
                        <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider mb-1 break-after-avoid">Awards & Distinctions</h3>
                        <div className="text-xs text-slate-700 space-y-0.5">
                            {awards.map(award => (
                                <div className="break-inside-avoid" key={award.id}>• {award.title} ({award.date})</div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <div key="trainings" data-section="trainings">
                        <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider mb-1 break-after-avoid">Professional Development</h3>
                        <div className="text-xs text-slate-705 space-y-0.5">
                            {trainings.map(t => (
                                <div className="break-inside-avoid" key={t.id}>• {t.course} ({t.institution})</div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <div key="publications" data-section="publications">
                        <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider mb-1 break-after-avoid">Academic Publications</h3>
                        <div className="text-xs text-slate-705 space-y-0.5">
                            {publications.map(p => (
                                <div className="break-inside-avoid" key={p.id}>• {p.title} ({p.publisher})</div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <div key="volunteer" data-section="volunteer" className="col-span-2">
                        <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider mb-1 break-after-avoid">Civic Contribution & Volunteering</h3>
                        <div className="text-xs text-slate-700 grid grid-cols-2 gap-2">
                            {volunteer.map(item => (
                                <div key={item.id} className="text-xs break-inside-avoid">
                                    <span className="font-semibold">{item.role}</span> @ {item.organization}
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
            id={isCardPreview ? undefined : "resume-preview-ivy-elite"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-800 leading-relaxed`}
            style={{ fontFamily: settings?.fontFamily || 'Garamond, Georgia, serif' }}
        >
            {/* Left-aligned Professional Ivy Header */}
            <header className="border-b-2 border-slate-900 pb-4 mb-5">
                <div className="flex justify-between items-baseline">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    {contact.jobTitle && (
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {contact.jobTitle}
                        </p>
                    )}
                </div>
                
                {/* Contact Minimal Line */}
                <div className="mt-3 text-[10px] text-slate-600 flex flex-wrap gap-x-2 gap-y-0.5 font-sans">
                    {fullPhone && <span>{fullPhone}</span>}
                    {fullPhone && contact.email && <span className="text-slate-300">•</span>}
                    {contact.email && <span className="break-all">{contact.email}</span>}
                    {contact.email && fullAddress && <span className="text-slate-300">•</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                    {fullAddress && contact.linkedin && <span className="text-slate-300">•</span>}
                    {contact.linkedin && <span className="break-all">{contact.linkedin}</span>}
                    {contact.linkedin && contact.website && <span className="text-slate-305">•</span>}
                    {contact.website && <span className="break-all">{contact.website}</span>}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="space-y-5">
                {/* Executive Summary */}
                {renderRun(['summary', 'experience', 'projects', 'education', 'skills', 'certifications'])}

                {/* Additional segments (distributed in a high density, scannable block) */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {renderRun(['languages', 'awards', 'trainings', 'publications', 'volunteer'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(IvyEliteTemplate);
