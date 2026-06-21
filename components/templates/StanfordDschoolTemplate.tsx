import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const StanfordDschoolTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#DB2777'; // Vibrant D-School Pink / Magenta
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-stanford-dschool"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-800 leading-relaxed`}
            style={{ fontFamily: settings?.fontFamily || 'Helvetica, Arial, sans-serif' }}
        >
            {/* Unique Asymmetric Modern Header info columns */}
            <header className="mb-6 pb-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="max-w-[70%]">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
                        {contact.firstName || 'Candidate'} <span style={{ color: accentColor }}>{contact.lastName || 'Name'}</span>
                    </h1>
                    {contact.jobTitle && (
                        <p className="text-sm font-semibold tracking-wide text-slate-500 mt-1 uppercase">
                            {contact.jobTitle}
                        </p>
                    )}
                </div>

                {/* Minimalist modern meta stack list */}
                <div className="text-left md:text-right text-[10px] text-slate-500 space-y-1 font-medium">
                    {contact.email && <div className="break-all">{contact.email}</div>}
                    {fullPhone && <div>{fullPhone}</div>}
                    {fullAddress && <div>{city}, {countryName || 'US'}</div>}
                    {contact.linkedin && <div className="break-all text-slate-400">{contact.linkedin}</div>}
                    {contact.website && <div className="break-all text-slate-400">{contact.website}</div>}
                </div>
            </header>

            {/* Logical, Highly Scannable Column Container */}
            <div className="space-y-5">
                {/* Executive Summary */}
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: accentColor }}>
                            Core Narrative
                        </h2>
                        <div className="text-xs text-slate-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Focus Capabilities Grid with sleek bullets */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                            Capabilities & Skills
                        </h2>
                        <div className="text-xs text-slate-700 tracking-wide leading-relaxed">
                            {skills.join('  •  ')}
                        </div>
                    </section>
                )}

                {/* Career Ledger */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: accentColor }}>
                            Professional Journey
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="relative pl-4 border-l-2" style={{ borderColor: `${accentColor}30` }}>
                                    {/* Accent dot on timeline */}
                                    <div className="absolute left-[-2px] top-1.5 w-[3px] h-[3px] rounded-full" style={{ backgroundColor: accentColor }} />
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold">{exp.jobTitle}</h3>
                                        <span className="text-[10px] text-slate-500 font-bold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic mb-1.5">{exp.company}, {exp.location}</p>
                                    <div className="text-xs text-slate-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects Section */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: accentColor }}>
                            Featured Projects
                        </h2>
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div key={proj.id} className="relative pl-4 border-l-2" style={{ borderColor: `${accentColor}30` }}>
                                    <div className="absolute left-[-2px] top-1.5 w-[3px] h-[3px] rounded-full" style={{ backgroundColor: accentColor }} />
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold">{proj.name}</h3>
                                        <span className="text-[10px] text-slate-500 font-bold">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9.5px] font-semibold text-slate-500 tracking-wide uppercase mb-1">Stack: {proj.technologies}</p>
                                    )}
                                    <div className="text-xs text-slate-650 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education Path */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: accentColor }}>
                            Academic Foundations
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id} className="relative pl-4 border-l-2" style={{ borderColor: `${accentColor}30` }}>
                                    <div className="absolute left-[-2px] top-1.5 w-[3px] h-[3px] rounded-full" style={{ backgroundColor: accentColor }} />
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-950 font-bold">{edu.school}</h3>
                                        <span className="text-[10px] text-slate-500 font-bold">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-slate-600 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-400">{edu.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Additional optional list splits inside a modern aesthetic row */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 mb-1">Certifications</h3>
                            <div className="text-xs text-slate-655 space-y-0.5">
                                {certifications.map(c => (
                                    <div key={c.id}>• {c.name}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 mb-1">Languages</h3>
                            <div className="text-xs text-slate-655 space-y-0.5">
                                {languages.map(l => (
                                    <div key={l.id}>• {l.language} ({l.proficiency})</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StanfordDschoolTemplate;
