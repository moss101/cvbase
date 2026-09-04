import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const OxfordTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const primaryColor = '#102A43'; // Oxford Dark Slate Blue
    const grayColor = '#627D98'; // Muted Slate Accent

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="mb-3 mt-5">
            <h2 className="text-[11px] font-sans font-bold uppercase tracking-[0.15em] pb-1 border-b text-center" style={{ color: primaryColor, borderColor: '#BCCCDC' }}>
                {title}
            </h2>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('profile')}</div>
                        <div className="text-stone-700 leading-relaxed text-justify px-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-4 px-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold text-stone-900 mb-0.5">
                                        <span className="text-xs font-serif font-black">{exp.jobTitle}</span>
                                        <span className="text-[10px] font-sans text-stone-500 font-normal">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-[10px] text-stone-600 mb-1.5 italic font-sans">
                                        <span>{exp.company}</span>
                                        <span>{exp.location}</span>
                                    </div>
                                    <div className="text-stone-600 text-[11px] text-justify font-serif leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('education')}</div>
                        <div className="space-y-3 px-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline font-bold text-stone-905">
                                        <span className="text-xs font-serif font-bold">{edu.school}</span>
                                        <span className="text-[10px] font-sans text-stone-500 font-normal">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <p className="text-[10px] text-stone-600 italic font-sans mb-1">{edu.degree} – {edu.location}</p>
                                    {edu.description && <div className="text-stone-500 text-[10px]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(edu.description) }} />}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <div key="skills" data-section="skills">
                        <h3 className="font-sans font-bold uppercase tracking-wider text-[10px] border-b pb-1 mb-2 break-after-avoid" style={{ color: primaryColor, borderColor: '#BCCCDC' }}>skills</h3>
                        <div className="flex flex-wrap gap-1">
                            {skills.map(skill => (
                                <span key={skill} className="text-[9px] font-sans bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('projects')}</div>
                        <div className="space-y-3 px-4">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline font-medium text-stone-900 mb-0.5">
                                        <span className="text-xs font-serif font-bold">{proj.name}</span>
                                        <span className="text-[9px] font-sans text-stone-400">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] text-stone-400 italic mb-1.5">
                                            Area of Study: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-[10.5px] text-justify font-serif" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages">
                        <h3 className="font-sans font-bold uppercase tracking-wider text-[10px] border-b pb-1 mb-2 break-after-avoid" style={{ color: primaryColor, borderColor: '#BCCCDC' }}>Languages</h3>
                        <div className="space-y-1">
                            {languages.map(lang => (
                                <div key={lang.id} className="flex justify-between text-[10px] font-serif break-inside-avoid">
                                    <strong>{lang.language}</strong>
                                    <span className="text-stone-500 italic font-sans text-[9px]">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                        fontClass="font-serif"
                        textClass="text-stone-605 text-xs font-serif leading-relaxed text-justify"
                        titleClass="font-extrabold text-[#112F4D] text-xs uppercase"
                        subtextClass="text-[9px] font-sans text-stone-400"
                        accentColor="#112F4D"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-oxford"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-16 flex flex-col justify-between ${fontSize} leading-relaxed text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Times New Roman', Times, serif", 
                color: '#222222'
            }}
        >
            <div>
                {/* Traditional Editorial Oxford Header */}
                <header className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-normal uppercase mb-1" style={{ color: primaryColor }}>
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-sans mb-3" style={{ color: grayColor }}>
                        {contact.jobTitle || 'Fellow Researcher / Senior Subject Matter Expert'}
                    </p>

                    {/* Centered contact info array with small visual bullets */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[9.5px] font-sans text-stone-600 tracking-wide">
                        {contact.email && <span>{contact.email}</span>}
                        {fullPhone && <span className="text-stone-300">•</span>}
                        {fullPhone && <span>{fullPhone}</span>}
                        {city && <span className="text-stone-300">•</span>}
                        {city && <span>{city}, {contact.country || 'UK'}</span>}
                        {contact.linkedin && <span className="text-stone-300">•</span>}
                        {contact.linkedin && <span className="lowercase underline">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>

                    <div className="border-t border-b py-0.5 mt-3 border-stone-200">
                        <p className="font-sans text-[8px] uppercase tracking-widest text-stone-400">Curriculum Vitae</p>
                    </div>
                </header>

                {/* Profile summary */}
                {renderRun(['summary', 'experience', 'education', 'projects'])}

                {/* Certifications and skills as compact inline lists for ATS parsing safety */}
                <div className="grid grid-cols-2 gap-8 px-4 mt-5">
                    {renderRun(['skills', 'languages'])}
                </div>

                <div className="px-4 mt-6">
                    {renderRun(['certifications', 'awards', 'trainings', 'publications', 'volunteer', 'custom'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(OxfordTemplate);
