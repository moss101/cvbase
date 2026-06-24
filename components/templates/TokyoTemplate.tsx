import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const TokyoTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const accentColor = '#CF2E2E'; // Elegant Tokyo Crimson
    const textColor = '#1A1A1A'; // Charcoal ink

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="border-b-2 pb-0.5 mb-3 mt-6 flex justify-between items-end" style={{ borderColor: accentColor }}>
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-905" style={{ color: textColor }}>
                {title}
            </h2>
            <span className="text-[9px] font-mono opacity-40">SYSTEM_FLOW // {title.slice(0, 3).toUpperCase()}</span>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-tokyo"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-14 flex flex-col justify-between ${fontSize} leading-relaxed text-left border-l-[10px]`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Inter', sans-serif", 
                color: textColor,
                borderLeftColor: accentColor
            }}
        >
            <div>
                {/* Header Block */}
                <header className="mb-6">
                    <div className="flex justify-between items-baseline mb-1">
                        <h1 className="text-3xl font-black tracking-tighter uppercase text-stone-900">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <span className="text-xs font-mono font-black tracking-widest uppercase" style={{ color: accentColor }}>
                            {contact.jobTitle || 'Executive Specialist'}
                        </span>
                    </div>

                    {/* Minimal Inline Contact Bar */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-stone-500 border-t border-stone-200 pt-2">
                        {contact.email && <span>email: {contact.email}</span>}
                        {fullPhone && <span>tel: {fullPhone}</span>}
                        {city && <span>loc: {city}, {contact.country || 'JP'}</span>}
                        {contact.linkedin && <span>linkedin: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                        {contact.website && <span>web: {contact.website.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section className="mb-4">
                        {renderHeader('profile')}
                        <div className="text-stone-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {/* Work Experience */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience')}
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold text-stone-900">
                                        <div className="text-xs uppercase font-sans font-black tracking-wide">
                                            {exp.jobTitle} <span className="text-stone-400 font-medium font-mono text-[10px] lowercase">at</span> {exp.company}
                                        </div>
                                        <span className="text-[10px] font-mono text-stone-500">
                                            [{exp.startDate} – {exp.endDate}]
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-mono uppercase text-stone-400 font-bold mb-1">{exp.location}</p>
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
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
                                    <div className="flex justify-between items-baseline font-bold text-stone-900">
                                        <h3 className="text-xs uppercase font-semibold">{proj.name}</h3>
                                        <span className="text-[10px] font-mono text-stone-500">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1">
                                            toolkit: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Dual Column grid for supporting details (Education, Skills, etc) to remain compact but highly read-parsable */}
                <div className="grid grid-cols-2 gap-8 mt-4">
                    {/* Column 1 */}
                    <div className="space-y-4">
                        {education.length > 0 && (
                            <section>
                                {renderHeader('education')}
                                <div className="space-y-3">
                                    {education.map(edu => (
                                        <div key={edu.id}>
                                            <p className="font-extrabold text-stone-950 uppercase text-[10px]">{edu.school}</p>
                                            <p className="text-stone-600 italic text-[10px]">{edu.degree}</p>
                                            <p className="text-[9px] font-mono text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} • {edu.location}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <section>
                                {renderHeader('certifications')}
                                <div className="space-y-2">
                                    {certifications.map(cert => (
                                        <div key={cert.id} className="text-stone-805 text-[10px]">
                                            <p className="font-bold text-stone-900">{cert.name}</p>
                                            <p className="text-stone-400 font-mono text-[9px]">Expires: {cert.expiryDate}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-4">
                        {skills.length > 0 && (
                            <section>
                                {renderHeader('skills')}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="text-[9px] font-mono border border-stone-300 px-2 py-0.5 text-stone-600 bg-stone-50 rounded"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.includes('languages') && languages.length > 0 && (
                            <section>
                                {renderHeader('languages')}
                                <div className="space-y-1.5 font-mono text-[10px]">
                                    {languages.map(lang => (
                                        <div key={lang.id} className="flex justify-between">
                                            <span className="font-bold text-stone-700">{lang.language}</span>
                                            <span className="text-stone-400">{lang.proficiency}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* Additional custom sections */}
                {visibleSections.includes('custom') && custom.length > 0 && (
                    <section className="mt-4">
                        {renderHeader('custom')}
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h4 className="font-extrabold text-[#CF2E2E] text-xs uppercase">{item.title}</h4>
                                        {item.date && <span className="text-[9px] font-mono text-stone-400">{item.date}</span>}
                                    </div>
                                    {item.subtitle && <p className="text-[10px] text-stone-500 italic mb-1">{item.subtitle}</p>}
                                    {item.description && <div className="text-stone-600 text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <OptionalSectionsRenderer
                    formData={formData}
                    visibleSections={visibleSections}
                    excludeSections={['projects', 'certifications', 'languages', 'custom']}
                    fontClass="font-sans"
                    textClass="text-stone-600 text-xs font-sans leading-relaxed text-justify"
                    titleClass="font-extrabold text-[#CF2E2E] text-xs uppercase"
                    subtextClass="text-[9px] font-mono text-stone-400"
                    accentColor="#CF2E2E"
                    renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            </div>
        </div>
    );
};

export default TokyoTemplate;
