import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const LambdaTechTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#059669'; // Emerald-600
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-lambda-tech"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-800 leading-snug`}
            style={{ fontFamily: settings?.fontFamily || 'Consolas, monospace' }}
        >
            {/* Top Minimal Line Banner */}
            <header className="border-b border-dashed border-slate-350 pb-5 mb-5 flex justify-between items-baseline">
                <div>
                    <h1 className="text-2xl font-bold uppercase text-slate-900 tracking-tight">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    {contact.jobTitle && (
                        <p className="text-xs font-bold uppercase mt-1 tracking-widest text-[#059669]">
                            {contact.jobTitle}
                        </p>
                    )}
                </div>
                {/* Clean inline meta rows */}
                <div className="text-right text-[9.5px] text-slate-500 font-mono space-y-0.5">
                    {contact.email && <div>{contact.email}</div>}
                    {fullPhone && <div>{fullPhone}</div>}
                    {city && <div>{city}, {countryName || 'US'}</div>}
                    {contact.linkedin && <div className="break-all">{contact.linkedin}</div>}
                </div>
            </header>

            {/* Core Sections Container */}
            <div className="space-y-4">
                {/* Summary Statement */}
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 mb-1">
                            --- executive_overview ---
                        </h2>
                        <div className="text-xs font-sans text-slate-700 leading-normal text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Technical Index */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 mb-1.5">
                            --- technolgies_index ---
                        </h2>
                        <div className="text-xs text-slate-705 leading-relaxed font-mono">
                            {skills.join(' | ')}
                        </div>
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 mb-2">
                            --- professional_experience ---
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase">
                                            {exp.jobTitle} // {exp.company}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 font-mono">[{exp.startDate} - {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Loc: {exp.location}</p>
                                    <div className="text-xs text-slate-700 font-sans leading-relaxed pl-2 border-l border-slate-100" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 mb-2">
                            --- building_portfolio ---
                        </h2>
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase">
                                            {proj.name}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 font-mono">[{proj.startDate} - {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] text-[#059669] font-mono uppercase mb-1">
                                            * Stack: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-xs text-slate-650 font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 mb-2">
                            --- academic_path ---
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-bold text-slate-900">{edu.school}</h3>
                                        <span className="text-[10px] text-slate-500 font-mono">[{edu.startDate} - {edu.endDate}]</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-slate-700 font-sans italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-mono not-italic text-slate-400">{edu.location}</span>
                                    </div>
                                    {edu.description && (
                                        <p className="text-xs text-slate-600 font-sans mt-1 whitespace-pre-wrap">{edu.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Additional list splits */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <div>
                            <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Certifications</h3>
                            <div className="text-xs text-slate-600 mt-1 font-sans space-y-0.5">
                                {certifications.map(c => (
                                    <div key={c.id}>- {c.name}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <div>
                            <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Languages</h3>
                            <div className="text-xs text-slate-600 mt-1 font-mono space-y-0.5">
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

export default LambdaTechTemplate;
