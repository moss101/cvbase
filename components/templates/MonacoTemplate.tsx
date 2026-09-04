import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const MonacoTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const navyColor = '#0B2545'; // Monaco Royal Navy
    const goldColor = '#C5A059'; // Champagne Gold accent

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="mb-3 mt-6">
            <h2 className="text-xs font-serif font-black tracking-widest uppercase pb-1 border-b-2" style={{ color: navyColor, borderBottomColor: goldColor }}>
                {title}
            </h2>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4">
                        <div className="bg-stone-50 p-6 rounded border-l-4 text-stone-700 italic text-justify" style={{ borderLeftColor: goldColor }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="pb-3 border-b border-stone-100 last:border-0 break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-stone-900 uppercase font-sans text-[11px] tracking-wide">
                                            {exp.jobTitle} <span className="text-stone-400 font-light font-serif">at</span> {exp.company}
                                        </h3>
                                        <span className="text-[10px] font-sans font-bold text-stone-500 uppercase tracking-wider">
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-sans font-extrabold mb-2">
                                        {exp.location}
                                    </p>
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <div className="break-after-avoid">{renderHeader('education')}</div>
                        <div className="space-y-3 font-sans">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[10px] break-inside-avoid">
                                    <p className="font-bold text-stone-900 uppercase">{edu.school}</p>
                                    <p className="text-stone-600 italic">{edu.degree}</p>
                                    <p className="text-[9px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} • {edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <div className="break-after-avoid">{renderHeader('skills')}</div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[9px] font-sans font-bold px-2 py-0.5 bg-stone-105 text-stone-800 rounded border border-stone-200"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('projects')}</div>
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold font-sans text-[11px] text-stone-900 uppercase">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-sans">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] text-stone-400 italic mb-1">
                                            Corporate Toolkit: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        sectionLayout(orderedSections(formData, visibleSections, ids), { runs: { optional: OPTIONAL_IDS } }).map((run) =>
            run.kind === 'section' ? renderSection(run.id) : (
                <OptionalSectionsRenderer
                        key={`optional-${run.ids[0]}`}
                        sections={run.ids}
                        formData={formData}
                        visibleSections={visibleSections}
                        fontClass="font-sans"
                        textClass="text-stone-700 text-xs font-sans leading-relaxed text-justify"
                        titleClass="font-bold text-stone-900 text-xs uppercase"
                        subtextClass="text-[9px] font-mono text-stone-400"
                        accentColor="#C5A059"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-monaco"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-14 flex flex-col justify-between ${fontSize} leading-relaxed text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Playfair Display', serif", 
                color: '#333333'
            }}
        >
            <div>
                {/* Premium Centered Executive Header block */}
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold tracking-tight uppercase mb-1" style={{ color: navyColor }}>
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    <p className="text-xs uppercase tracking-[0.25em] font-medium italic mb-4" style={{ color: goldColor }}>
                        {contact.jobTitle || 'Executive Vice President // Director'}
                    </p>

                    {/* Double gold horizontal rules */}
                    <div className="flex items-center justify-center gap-4 my-2">
                        <div className="h-[1px] w-12" style={{ backgroundColor: goldColor }}></div>
                        <div className="text-[10px] font-mono tracking-widest text-stone-400">MONACO EXECUTIVE DRAFT</div>
                        <div className="h-[1px] w-12" style={{ backgroundColor: goldColor }}></div>
                    </div>

                    {/* Contact details */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-sans text-stone-500 mt-3 uppercase tracking-wider font-bold">
                        {contact.email && <span>{contact.email}</span>}
                        {fullPhone && <span>|</span>}
                        {fullPhone && <span>{fullPhone}</span>}
                        {city && <span>|</span>}
                        {city && <span>{city}, {contact.country || 'MC'}</span>}
                        {contact.linkedin && <span>|</span>}
                        {contact.linkedin && <span className="lowercase font-bold text-stone-600">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Professional Statement */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Column Layout */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {renderRun(['education'])}
                    </div>

                    <div>
                        {renderRun(['skills'])}
                    </div>
                </div>

                {renderRun(['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'])}
            </div>
        </div>
    );
};

export default React.memo(MonacoTemplate);
