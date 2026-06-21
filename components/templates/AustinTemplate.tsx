import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const AustinTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const orangeColor = '#E65100'; // Safety Coral/Orange
    const textColor = '#111111'; // Jet Black

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="flex items-center gap-2 mb-3 mt-6">
            <span className="w-1.5 h-4 bg-orange-600 rounded-sm" style={{ backgroundColor: orangeColor }}></span>
            <h2 className="text-xs font-mono font-black uppercase tracking-wider text-black">
                {title}
            </h2>
            <div className="h-[1px] bg-stone-200 grow"></div>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-austin"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-stone-50 p-12 flex flex-col justify-between ${fontSize} leading-normal text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Fira Code', monospace", 
                color: textColor 
            }}
        >
            <div>
                {/* Tech Header */}
                <header className="border-b-2 border-stone-900 pb-5 mb-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-stone-900 uppercase">
                                {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                            </h1>
                            <p className="text-xs font-bold uppercase mt-1" style={{ color: orangeColor }}>
                                &gt; {contact.jobTitle || 'Fullstack Software Architect'}
                            </p>
                        </div>
                        <div className="text-right text-[8px] font-bold text-stone-400 uppercase tracking-widest leading-none">
                            AUSTIN_TX_VER // {new Date().getFullYear()}
                        </div>
                    </div>

                    {/* Meta tag style links */}
                    <div className="flex flex-wrap gap-2 mt-4 text-[9px] font-mono">
                        {contact.email && (
                            <span className="bg-stone-200 text-stone-700 px-2.5 py-0.5 rounded border border-stone-300">
                                email: {contact.email}
                            </span>
                        )}
                        {fullPhone && (
                            <span className="bg-stone-200 text-stone-700 px-2.5 py-0.5 rounded border border-stone-300">
                                phone: {fullPhone}
                            </span>
                        )}
                        {city && (
                            <span className="bg-stone-200 text-stone-700 px-2.5 py-0.5 rounded border border-stone-300">
                                site: {city}, {contact.country || 'US'}
                            </span>
                        )}
                        {contact.linkedin && (
                            <span className="bg-orange-50 text-orange-850 px-2.5 py-0.5 rounded border border-orange-200">
                                linked: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                        )}
                    </div>
                </header>

                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section className="mb-4">
                        {renderHeader('profile')}
                        <div className="text-stone-700 leading-relaxed text-justify font-sans" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Work Experience */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience')}
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold text-stone-900 mb-1">
                                        <h3 className="text-[11px] uppercase text-stone-900">
                                            {exp.jobTitle} @ <span style={{ color: orangeColor }}>{exp.company}</span>
                                        </h3>
                                        <span className="text-[8.5px] font-mono text-stone-505">[{exp.startDate} - {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[8px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">// location: {exp.location}</p>
                                    <div className="text-stone-600 text-xs text-justify font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('projects')}
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-xs uppercase font-bold">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] text-orange-700 font-bold mb-1.5 uppercase tracking-wide">
                                            Stack :: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Secondary layout splits */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {education.length > 0 && (
                            <section>
                                {renderHeader('education')}
                                <div className="space-y-3">
                                    {education.map(edu => (
                                        <div key={edu.id} className="text-[9.5px]">
                                            <p className="font-extrabold text-stone-900 uppercase">{edu.school}</p>
                                            <p className="text-stone-600 italic font-sans">{edu.degree}</p>
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
                                {renderHeader('skills')}
                                <div className="flex flex-wrap gap-1">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="text-[8.5px] bg-stone-200 text-stone-800 font-bold px-1.5 py-0.5 rounded border border-stone-300"
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
                    fontClass="font-sans"
                    textClass="text-stone-600 text-xs font-sans leading-relaxed text-justify"
                    titleClass="font-extrabold text-stone-950 text-xs uppercase"
                    subtextClass="text-[9px] font-mono text-stone-400"
                    accentColor="#E11D48"
                    renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            </div>
        </div>
    );
};

export default AustinTemplate;
