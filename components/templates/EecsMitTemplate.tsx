import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const EecsMitTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#2563EB'; // Rich Tech Blue
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSectionHeader = (title: string, indexStr: string) => (
        <div className="flex items-center gap-2 mt-5 mb-2 font-mono">
            <span className="text-xs font-bold text-slate-400 font-mono">[{indexStr}]</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                {title}
            </h2>
            <div className="h-[1px] bg-slate-200 grow"></div>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-eecs-mit"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-900 leading-normal`}
            style={{ fontFamily: settings?.fontFamily || 'Consolas, "JetBrains Mono", monospace' }}
        >
            {/* Header: Dense Monospace Style, Left-Aligned with Right Meta Tags */}
            <header className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-950">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    {contact.jobTitle && (
                        <p className="text-xs font-bold uppercase mt-1 tracking-wider" style={{ color: accentColor }}>
                            &lt; {contact.jobTitle} /&gt;
                        </p>
                    )}
                </div>

                <div className="text-right text-[10px] space-y-0.5 text-slate-600 font-mono whitespace-nowrap">
                    {contact.email && <div>{contact.email}</div>}
                    {fullPhone && <div>{fullPhone}</div>}
                    {fullAddress && <div>{city || 'Location'}, {contact.country || 'US'}</div>}
                    {contact.linkedin && <div>{contact.linkedin}</div>}
                    {contact.website && <div>{contact.website}</div>}
                </div>
            </header>

            {/* Core Body */}
            <div>
                {/* Summary */}
                {summary.professionalSummary && (
                    <section>
                        {renderSectionHeader('Summary', '01')}
                        <div className="text-xs text-slate-700 leading-relaxed font-sans text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {/* Skills Stack (Top prioritization for technical engineers) */}
                {skills.length > 0 && (
                    <section>
                        {renderSectionHeader('Technical Stack', '02')}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {skills.map((skill, index) => (
                                <span 
                                    key={index} 
                                    className="px-2 py-0.5 text-[9px] bg-slate-50 text-slate-800 border border-slate-250 rounded font-mono"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        {renderSectionHeader('Professional Experience', '03')}
                        <div className="space-y-4 pt-1">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-extrabold text-slate-950">
                                            {exp.jobTitle} <span className="text-slate-400 font-normal">@</span> {exp.company}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 font-mono font-bold">[{exp.startDate} - {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic mb-1.5">Loc: {exp.location}</p>
                                    <div className="text-xs text-slate-700 font-sans leading-relaxed pl-2 border-l border-slate-100" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        {renderSectionHeader('Selected Repositories & Projects', '04')}
                        <div className="space-y-4 pt-1">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-extrabold text-slate-900">
                                            {proj.name}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 font-mono font-bold">[{proj.startDate} - {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] text-slate-500 font-bold mb-1 font-mono uppercase tracking-widest style={{ color: accentColor }}">
                                            // Tech Stack: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-xs text-slate-650 font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <section>
                        {renderSectionHeader('Academics', '05')}
                        <div className="grid grid-cols-2 gap-4 pt-1">
                            {education.map(edu => (
                                <div key={edu.id} className="text-xs">
                                    <p className="font-extrabold text-slate-900">{edu.school}</p>
                                    <p className="text-xs text-slate-600 font-sans italic">{edu.degree}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">[{edu.startDate} - {edu.endDate}] // {edu.location}</p>
                                    {edu.description && (
                                        <p className="text-[10px] text-slate-500 font-sans mt-1">{edu.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Certifications and Languages in compact view */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500">
                                Certifications
                            </h3>
                            <ul className="text-slate-650 space-y-0.5 mt-1 list-disc pl-3">
                                {certifications.map(c => (
                                    <li key={c.id} className="text-[10px]">{c.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500">
                                Languages
                            </h3>
                            <ul className="text-slate-655 space-y-0.5 mt-1 list-disc pl-3 font-mono">
                                {languages.map(l => (
                                    <li key={l.id} className="text-[10px]">{l.language} ({l.proficiency})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {visibleSections.includes('awards') && awards.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500">
                                Honors
                            </h3>
                            <ul className="text-slate-655 space-y-0.5 mt-1 list-disc pl-3">
                                {awards.map(a => (
                                    <li key={a.id} className="text-[10px]">{a.title}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EecsMitTemplate;
