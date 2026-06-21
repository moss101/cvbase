import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const SubwayTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const accentColor = '#DFBE1A'; // Subway Transit Yellow-Gold accent
    const textColor = '#111111'; // Pure dark charcoal

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string, stationCode: string) => (
        <div className="flex items-center gap-3 mt-6 mb-3">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-mono text-[10px] font-black shrink-0" style={{ boxShadow: `inset 0 0 0 2px ${accentColor}` }}>
                {stationCode}
            </div>
            <div className="h-[2px] bg-black grow relative">
                <span className="absolute -top-3.5 left-2 font-mono text-[9px] uppercase tracking-widest font-black text-stone-900">{title}</span>
            </div>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-subway"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-stone-50 p-12 flex flex-col justify-between ${fontSize} leading-normal text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'JetBrains Mono', monospace", 
                color: textColor 
            }}
        >
            <div>
                {/* Station Board style Header */}
                <header className="bg-black text-[#E5E5E5] p-6 mb-6 rounded-lg relative overflow-hidden" style={{ borderLeft: `8px solid ${accentColor}` }}>
                    <div className="absolute right-4 top-4 font-mono text-[8px] tracking-widest text-[#555] uppercase">
                        LINE_ATS_COMPLIANT // RESUME_SYSTEM
                    </div>
                    
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase mb-1">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-4 text-stone-300">
                        // {contact.jobTitle || 'Lead Infrastructure Engineer'}
                    </p>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[9px] pt-3 border-t border-stone-800 text-stone-400">
                        {contact.email && <div>[E-MAIL] : {contact.email}</div>}
                        {fullPhone && <div>[PHONE]  : {fullPhone}</div>}
                        {city && <div>[STATION]: {city}, {contact.country || 'GLOBAL'}</div>}
                        {contact.linkedin && <div>[SYSTEM] : {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
                    </div>
                </header>

                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section className="mb-4">
                        {renderHeader('profile', '01')}
                        <div className="text-stone-700 leading-relaxed pl-11 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Work Experience */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience', '02')}
                        <div className="space-y-4 pl-11">
                            {experience.map(exp => (
                                <div key={exp.id} className="border-l-2 border-dashed border-stone-300 pl-4 relative">
                                    {/* Small circle accent */}
                                    <span className="absolute -left-[5px] top-1.5 w-[8px] h-[8px] rounded-full bg-stone-400"></span>
                                    
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-black text-[11px] uppercase text-stone-900">{exp.jobTitle}</h3>
                                        <span className="text-[9px] font-bold text-stone-500">[{exp.startDate} :: {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[9px] text-[#A67E14] font-bold mb-1 uppercase tracking-wide">
                                        &gt; {exp.company} // {exp.location}
                                    </p>
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('projects', '03')}
                        <div className="space-y-4 pl-11">
                            {projects.map(proj => (
                                <div key={proj.id} className="border-l-2 border-stone-200 pl-4 relative">
                                    <span className="absolute -left-[4px] top-1.5 w-[6px] h-[6px] rounded-full bg-stone-300"></span>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-black text-[11px] uppercase text-stone-800">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] text-stone-400 font-bold mb-1">
                                            ENV_TAGS :: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Triple block horizontal info grid */}
                <div className="grid grid-cols-3 gap-6 mt-6 pt-3 pl-11">
                    {/* Education block */}
                    <div>
                        <h4 className="font-black uppercase text-[10px] text-stone-905 border-b pb-1 mb-2 tracking-widest">// education</h4>
                        {education.length > 0 && (
                            <div className="space-y-3">
                                {education.map(edu => (
                                    <div key={edu.id} className="text-[9.5px]">
                                        <p className="font-extrabold text-stone-900 uppercase">{edu.school}</p>
                                        <p className="text-stone-500 italic">{edu.degree}</p>
                                        <p className="text-[8px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Skill Tags block */}
                    <div>
                        <h4 className="font-black uppercase text-[10px] text-stone-905 border-b pb-1 mb-2 tracking-widest">// skills</h4>
                        <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 15).map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[8.5px] bg-stone-200 text-stone-800 font-bold px-1.5 py-0.5 rounded uppercase"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Certs & Languages */}
                    <div>
                        <h4 className="font-black uppercase text-[10px] text-stone-905 border-b pb-1 mb-2 tracking-widest">// SYSTEM_MISC</h4>
                        <div className="space-y-2 text-[9px]">
                            {visibleSections.includes('certifications') && certifications.slice(0, 3).map(cert => (
                                <div key={cert.id} className="text-stone-700">
                                    <p className="font-bold underline uppercase">{cert.name}</p>
                                </div>
                            ))}
                            {visibleSections.includes('languages') && languages.slice(0, 3).map(lang => (
                                <div key={lang.id} className="flex justify-between items-center text-stone-600">
                                    <span>{lang.language}</span>
                                    <span className="text-[8px] bg-stone-300 font-bold text-stone-700 px-1 rounded uppercase">{lang.proficiency.slice(0, 4)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-dashed border-stone-300 pt-5">
                    <OptionalSectionsRenderer
                        formData={formData}
                        visibleSections={visibleSections}
                        excludeSections={['projects', 'certifications', 'languages']}
                        fontClass="font-mono text-[9px]"
                        textClass="text-stone-605 text-[10px] font-sans leading-relaxed text-justify"
                        titleClass="font-extrabold text-stone-900 text-[10px] uppercase tracking-wider"
                        subtextClass="text-[8.5px] font-mono text-stone-400"
                        accentColor="#DC2626"
                        renderHeader={(title, tag) => renderHeader(title.toLowerCase(), tag || 'OPT')}
                    />
                </div>
            </div>
        </div>
    );
};

export default SubwayTemplate;
