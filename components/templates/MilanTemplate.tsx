import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const MilanTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const luxuryEspresso = '#4A2E1B'; // Milan Luxury Espresso
    const warmGrey = '#D2B48C'; // Soft gold/beige border accent

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="mb-3 mt-6">
            <h2 className="text-xs font-serif font-bold uppercase tracking-[0.25em] pb-1 border-b" style={{ color: luxuryEspresso, borderColor: warmGrey }}>
                {title}
            </h2>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-milan"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FCFAF7] p-16 flex flex-col justify-between ${fontSize} leading-relaxed text-left border-t-8`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Georgia', serif", 
                color: '#2C2520',
                borderTopColor: luxuryEspresso
            }}
        >
            <div>
                {/* Italian Vogue/Editorial Centered Header */}
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-serif tracking-[0.1em] font-normal uppercase mb-2">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    <p className="text-xs uppercase tracking-[0.2em] italic mb-4" style={{ color: luxuryEspresso }}>
                        {contact.jobTitle || 'Executive Creative Director // Strategy'}
                    </p>

                    {/* Inline minimal contact strip */}
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[9.5px] font-sans font-semibold text-stone-500 uppercase tracking-widest border-t border-b py-2" style={{ borderColor: 'rgba(139, 115, 85, 0.2)' }}>
                        {contact.email && <span>{contact.email}</span>}
                        {fullPhone && <span>{fullPhone}</span>}
                        {city && <span>{city}, {contact.country || 'IT'}</span>}
                        {contact.linkedin && <span className="lowercase font-bold tracking-normal">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section className="mb-4 px-2">
                        <div className="text-stone-700 italic leading-relaxed text-justify px-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {/* Experience Ledger */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience')}
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="pb-3 border-b last:border-0" style={{ borderColor: 'rgba(139, 115, 85, 0.1)' }}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[11px] uppercase font-sans tracking-wider text-stone-900">{exp.jobTitle}</h3>
                                        <span className="text-[9.5px] uppercase font-semibold font-sans tracking-widest text-stone-400">
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[10px] italic text-stone-500 mb-2 font-serif">
                                        {exp.company} • {exp.location}
                                    </p>
                                    <div className="text-stone-600 text-[11px] text-justify font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
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
                                        <h3 className="font-bold font-sans text-stone-830 tracking-wider uppercase text-[11px]">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-sans">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9.5px] uppercase tracking-widest font-sans font-bold text-stone-450 mb-1">
                                            Toolkit: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Milan Grid */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {education.length > 0 && (
                            <section>
                                {renderHeader('education')}
                                <div className="space-y-3 font-serif">
                                    {education.map(edu => (
                                        <div key={edu.id} className="text-[10px]">
                                            <p className="font-bold text-stone-90 uppercase text-[10px] font-sans tracking-wider">{edu.school}</p>
                                            <p className="text-stone-650 italic">{edu.degree}</p>
                                            <p className="text-[8.5px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} • {edu.location}</p>
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
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="text-[9px] font-sans font-bold px-2.5 py-1 bg-[#D2B48C]/15 text-stone-800 rounded border border-[#D2B48C]/30"
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
                    fontClass="font-serif"
                    textClass="text-stone-700 text-xs font-serif leading-relaxed text-justify"
                    titleClass="font-bold text-stone-900 text-xs uppercase font-sans tracking-wide"
                    subtextClass="text-[9px] font-sans text-stone-400"
                    accentColor="#8C6239"
                    renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            </div>
        </div>
    );
};

export default MilanTemplate;
