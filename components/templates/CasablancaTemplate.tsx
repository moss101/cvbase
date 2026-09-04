import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const CasablancaTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const primaryColor = '#8C6239'; // Casablanca Warm Earth
    const grayBorder = '#D5C3B2'; // Soft warm sand divider

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="mb-3 mt-6">
            <h2 className="text-xs font-serif font-black uppercase tracking-[0.25em] pb-1 border-b" style={{ color: primaryColor, borderColor: grayBorder }}>
                {title}
            </h2>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4 px-2">
                        <div className="text-stone-700 italic leading-relaxed text-justify px-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="pb-3 border-b last:border-0 break-inside-avoid" style={{ borderColor: 'rgba(140, 98, 57, 0.1)' }}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[11px] uppercase font-sans tracking-wider text-stone-900">{exp.jobTitle}</h3>
                                        <span className="text-[9.5px] uppercase font-semibold font-sans tracking-widest text-[#8C6239]">
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
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <div className="break-after-avoid">{renderHeader('education')}</div>
                        <div className="space-y-3 font-serif">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[10px] break-inside-avoid">
                                    <p className="font-bold text-stone-90 uppercase text-[10px] font-sans tracking-wider">{edu.school}</p>
                                    <p className="text-stone-650 italic">{edu.degree}</p>
                                    <p className="text-[8.5px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} • {edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <div className="break-after-avoid">{renderHeader('skills')}</div>
                        <div className="flex flex-wrap gap-1 pt-1">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[9px] font-sans font-bold px-2.5 py-1 bg-[#8C6239]/10 text-[#4E3520] rounded border border-[#8C6239]/20"
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
                                        <h3 className="font-bold font-sans text-stone-830 tracking-wider uppercase text-[11px]">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-sans">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9.5px] uppercase tracking-widest font-sans font-bold text-stone-450 mb-1">
                                            Frameworks: {proj.technologies}
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
                        textClass="text-stone-705 text-xs font-sans leading-relaxed text-justify"
                        titleClass="font-extrabold text-[#4E3520] text-xs uppercase"
                        subtextClass="text-[9px] font-mono text-stone-400"
                        accentColor="#8C6239"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-casablanca"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FDFBF9] p-16 flex flex-col justify-between ${fontSize} leading-relaxed text-left border-t-8`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Georgia', serif", 
                color: '#3E342B',
                borderTopColor: primaryColor
            }}
        >
            <div>
                {/* Vintage Warm Elegant Casablanca Header Block */}
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-serif tracking-[0.08em] font-normal uppercase mb-2" style={{ color: '#2B221A' }}>
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    <p className="text-xs uppercase tracking-[0.2em] font-serif italic mb-4" style={{ color: primaryColor }}>
                        {contact.jobTitle || 'Executive Operations Liaison / Strategy'}
                    </p>

                    {/* Inline clean description layout */}
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[9.5px] font-sans font-semibold text-stone-500 uppercase tracking-widest border-t border-b py-2.5" style={{ borderColor: 'rgba(140, 98, 57, 0.2)' }}>
                        {contact.email && <span>{contact.email}</span>}
                        {fullPhone && <span>{fullPhone}</span>}
                        {city && <span>{city}, {contact.country || 'MA'}</span>}
                        {contact.linkedin && <span className="lowercase font-bold tracking-normal">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Professional Statement */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Column layout splits holding education and skills */}
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

export default React.memo(CasablancaTemplate);
