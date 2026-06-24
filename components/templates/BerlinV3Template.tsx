import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const BerlinV3Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const textColor = '#000000'; // Precise solid ink black

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string, tag: string) => (
        <div className="my-5">
            <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-black tracking-widest pb-1 border-b border-dashed border-black">
                <span>[ {title} ]</span>
                <span className="opacity-40">{tag}</span>
            </div>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-berlinv3"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-14 flex flex-col justify-between ${fontSize} leading-relaxed text-left border border-black`}
            style={{ 
                fontFamily: settings?.fontFamily || "'JetBrains Mono', monospace", 
                color: textColor 
            }}
        >
            <div>
                {/* Ultra-pure design block header */}
                <header className="mb-6 pb-4 border-b border-black">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-widest text-black">
                                {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                            </h1>
                            <p className="text-[10.5px] font-bold uppercase mt-1 text-stone-500">
                                // role : {contact.jobTitle || 'System Operations Engineer'}
                            </p>
                        </div>
                        <div className="text-right text-[8px] font-mono opacity-50 tracking-widest leading-none">
                            BERLIN_V3_DRAFT // SECURE
                        </div>
                    </div>

                    {/* Inline metadata details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[9.5px] font-mono text-stone-700">
                        {contact.email && <span>email : {contact.email}</span>}
                        {fullPhone && <span>phone : {fullPhone}</span>}
                        {city && <span>coord : {city}, {contact.country || 'DE'}</span>}
                        {contact.linkedin && <span>linked: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section className="mb-4">
                        {renderHeader('profile', 'S_00')}
                        <div className="text-stone-850 leading-relaxed text-justify px-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {/* Experience Ledger */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience', 'E_01')}
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold text-black mb-1">
                                        <h3 className="text-xs uppercase font-black">
                                            {exp.jobTitle} @ {exp.company}
                                        </h3>
                                        <span className="text-[9.5px] font-mono text-stone-505">[{exp.startDate} - {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-wide text-stone-400 font-bold mb-1.5">// location: {exp.location}</p>
                                    <div className="text-stone-700 text-xs text-justify leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('projects', 'P_02')}
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-xs uppercase font-black">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-mono">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] text-stone-400 font-bold mb-1.5 uppercase font-mono">
                                            environments: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-700 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Compact grid columns */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {education.length > 0 && (
                            <section>
                                {renderHeader('education', 'A_03')}
                                <div className="space-y-3">
                                    {education.map(edu => (
                                        <div key={edu.id} className="text-[9.5px] font-mono">
                                            <p className="font-extrabold text-black uppercase">{edu.school}</p>
                                            <p className="text-stone-500 italic">{edu.degree}</p>
                                            <p className="text-[8px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} // {edu.location}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div>
                        {skills.length > 0 && (
                            <section>
                                {renderHeader('skills', 'C_04')}
                                <div className="flex flex-wrap gap-1.5">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="text-[9px] font-mono bg-stone-100 text-stone-900 font-black px-2 py-0.5 border border-black rounded"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                <OptionalSectionsRenderer
                    formData={formData}
                    visibleSections={visibleSections}
                    excludeSections={['projects']}
                    fontClass="font-mono"
                    textClass="text-stone-700 text-[10px]"
                    titleClass="font-bold text-black text-xs uppercase"
                    subtextClass="text-[8px] text-stone-400 font-mono"
                    accentColor="#000000"
                    renderHeader={(title, tag) => renderHeader(title.toLowerCase(), tag || 'OPT')}
                />
            </div>
        </div>
    );
};

export default BerlinV3Template;
