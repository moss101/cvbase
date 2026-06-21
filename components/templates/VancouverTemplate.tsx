import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const VancouverTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const sageColor = '#2E5A44'; // Vancouver Forest Sage
    const textColor = '#2D3748'; // Charcoal Gray slate

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="border-b pb-1.5 mb-3 mt-6 border-stone-200">
            <h2 className="text-xs font-sans font-bold uppercase tracking-wider" style={{ color: sageColor }}>
                {title}
            </h2>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-vancouver"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-stone-50 p-12 flex flex-col justify-between ${fontSize} leading-relaxed text-left border-r-[12px]`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Inter', sans-serif", 
                color: textColor,
                borderRightColor: sageColor
            }}
        >
            <div>
                {/* Pacific Northwest Inspired Clean Header */}
                <header className="mb-6">
                    <div className="flex justify-between items-baseline mb-2">
                        <h1 className="text-3xl font-black tracking-tight uppercase" style={{ color: '#1A3024' }}>
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <span className="text-[10px] font-mono tracking-widest uppercase font-bold" style={{ color: sageColor }}>
                            {contact.jobTitle || 'Sustainability Lead / General Director'}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-stone-500 border-t pt-2 border-stone-200 uppercase font-semibold">
                        {contact.email && <span>Email: {contact.email}</span>}
                        {fullPhone && <span>Phone: {fullPhone}</span>}
                        {city && <span>Location: {city}, {contact.country || 'CA'}</span>}
                        {contact.linkedin && <span className="lowercase">LinkedIn: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Profile statement */}
                {summary.professionalSummary && (
                    <section className="mb-4">
                        {renderHeader('profile')}
                        <div className="text-stone-700 leading-relaxed text-justify px-1" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Work Experience */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience')}
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="hover:bg-stone-100/50 p-1 rounded transition-colors duration-200">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-stone-900 text-[11px] uppercase tracking-wide">
                                            {exp.jobTitle} <span className="text-stone-400 font-normal">at</span> {exp.company}
                                        </h3>
                                        <span className="text-[9.5px] font-mono font-bold text-stone-500">
                                            [{exp.startDate} – {exp.endDate}]
                                        </span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-wider text-stone-400 font-bold mb-1">// {exp.location}</p>
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
                                        <h3 className="font-bold text-stone-900 uppercase text-[11px]">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-mono">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] font-mono text-stone-400 mb-1">
                                            Frameworks / Resources: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Grids */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {education.length > 0 && (
                            <section>
                                {renderHeader('education')}
                                <div className="space-y-3">
                                    {education.map(edu => (
                                        <div key={edu.id} className="text-[10px]">
                                            <p className="font-extrabold text-stone-900 uppercase">{edu.school}</p>
                                            <p className="text-stone-600 italic">{edu.degree}</p>
                                            <p className="text-[8.5px] font-mono text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} • {edu.location}</p>
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
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="text-[9px] font-mono border border-stone-250 px-2 py-0.5 text-stone-700 bg-stone-105 rounded-full"
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
                    textClass="text-stone-700 text-xs font-sans leading-relaxed text-justify"
                    titleClass="font-extrabold text-stone-900 text-xs uppercase"
                    subtextClass="text-[9px] font-mono text-stone-400"
                    accentColor="#0F766E"
                    renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            </div>
        </div>
    );
};

export default VancouverTemplate;
