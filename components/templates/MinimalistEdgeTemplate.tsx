import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const MinimalistEdgeTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#1E293B'; // Slate-800 / Elegant Slate
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-minimalist-edge"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-800 leading-normal`}
            style={{ fontFamily: settings?.fontFamily || 'Helvetica, Arial, sans-serif' }}
        >
            {/* Minimalist edge clean header */}
            <header className="border-b-2 border-slate-900 pb-5 mb-5 flex flex-col md:flex-row justify-between items-end gap-2">
                <div>
                    <h1 className="text-3xl font-black uppercase text-slate-905 tracking-wide leading-none">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    {contact.jobTitle && (
                        <p className="text-xs font-bold uppercase mt-2 tracking-widest text-slate-500">
                            {contact.jobTitle}
                        </p>
                    )}
                </div>

                <div className="text-left md:text-right text-[9.5px] text-slate-450 uppercase tracking-widest font-mono space-y-0.5">
                    {contact.email && <div>{contact.email}</div>}
                    {fullPhone && <div>{fullPhone}</div>}
                    {city && <div>{city}, {contact.country || 'US'}</div>}
                    {contact.linkedin && <div className="break-all">{contact.linkedin}</div>}
                </div>
            </header>

            {/* Contemporary Layout Flow */}
            <div className="space-y-4">
                {/* Objective Summary */}
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#111] mb-1">
                            Profile Context
                        </h2>
                        <div className="text-xs text-slate-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Technical Index */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#111] mb-1.5">
                            Expertise Core
                        </h2>
                        <div className="text-xs text-slate-700 tracking-wide leading-normal">
                            {skills.join('  •  ')}
                        </div>
                    </section>
                )}

                {/* Career Ledger */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#111] mb-2.5">
                            Professional Chronology
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold uppercase">
                                            {exp.jobTitle} // {exp.company}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 font-bold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-1">Loc: {exp.location}</p>
                                    <div className="text-xs text-slate-655 leading-relaxed text-justify pl-1" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects Section */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#111] mb-2.5">
                            Focus Initiatives
                        </h2>
                        <div className="space-y-3.5">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold uppercase">{proj.name}</h3>
                                        <span className="text-[10px] text-slate-505 font-bold">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] text-[#1E293B] font-mono tracking-wider uppercase mb-1">// {proj.technologies}</p>
                                    )}
                                    <div className="text-xs text-slate-655 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Educational History */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#111] mb-2.5">
                            Academic Ledger
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
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

                {/* Small Additional metadata split */}
                <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100">
                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Certifications</h3>
                            <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                                {certifications.map(c => (
                                    <div key={c.id}>- {c.name}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Languages</h3>
                            <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                                {languages.map(l => (
                                    <div key={l.id}>- {l.language} ({l.proficiency})</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MinimalistEdgeTemplate;
