import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['awards', 'trainings', 'publications', 'volunteer', 'custom'];

const BarcelonaTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const primaryColor = '#C27D38'; // Barcelona Terracotta Warm accent
    const textColor = '#2B2B2B'; // Soft black charcoal

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="mb-4 mt-6">
            <h2 className="text-xs font-serif font-black tracking-widest uppercase pb-1 border-b" style={{ color: primaryColor, borderColor: 'rgba(194, 125, 56, 0.25)' }}>
                {title}
            </h2>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4 px-4 text-center">
                        <div className="text-stone-700 italic leading-relaxed text-justify px-6 border-l-2 border-r-2" style={{ borderColor: 'rgba(194, 125, 56, 0.2)' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-6 pl-4 border-l-2" style={{ borderColor: 'rgba(194, 125, 56, 0.15)' }}>
                            {experience.map(exp => (
                                <div key={exp.id} className="relative break-inside-avoid">
                                    {/* Tick Ornament */}
                                    <span className="absolute -left-[21px] top-1.5 w-[8px] h-[8px] rounded-full bg-white border-2" style={{ borderColor: primaryColor }}></span>

                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-xs uppercase font-sans tracking-wide text-stone-900">{exp.jobTitle}</h3>
                                        <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: primaryColor }}>
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[10px] italic text-stone-500 mb-2 font-serif">
                                        {exp.company} • {exp.location}
                                    </p>
                                    <div className="text-stone-600 text-xs text-justify font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
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
                                <div className="break-inside-avoid" key={edu.id}>
                                    <p className="font-bold text-stone-90 upper text-[10px] uppercase font-sans tracking-wide">{edu.school}</p>
                                    <p className="text-stone-600 italic text-[10px]">{edu.degree}</p>
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
                                    className="text-[9px] font-sans font-bold px-2.5 py-1 bg-stone-150/75 text-stone-700 rounded border border-stone-200 cursor-pointer"
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
                        <div className="space-y-5 pl-4 border-l-2" style={{ borderColor: 'rgba(194, 125, 56, 0.15)' }}>
                            {projects.map(proj => (
                                <div key={proj.id} className="relative break-inside-avoid">
                                    <span className="absolute -left-[20px] top-1.5 w-[6px] h-[6px] rounded bg-stone-300"></span>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-stone-800 text-xs uppercase font-sans">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-sans font-bold">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] uppercase tracking-widest font-sans font-extrabold text-stone-400 mt-0.5">
                                            Frameworks: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify mt-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <div className="break-after-avoid">{renderHeader('certifications')}</div>
                        <div className="space-y-2 text-[10px]">
                            {certifications.map(cert => (
                                <div className="break-inside-avoid" key={cert.id}>
                                    <p className="font-bold text-stone-900">{cert.name}</p>
                                    <p className="text-stone-400 text-[9px]">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <div className="break-after-avoid">{renderHeader('languages')}</div>
                        <div className="space-y-1.5 text-[10.5px]">
                            {languages.map(lang => (
                                <div key={lang.id} className="flex justify-between border-b pb-0.5 break-inside-avoid">
                                    <span className="font-bold text-stone-700">{lang.language}</span>
                                    <span className="text-stone-400 italic font-serif">{lang.proficiency}</span>
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
                        textClass="text-[#2B2B2B] text-xs font-sans leading-relaxed text-justify"
                        titleClass="font-bold text-stone-900 text-xs uppercase"
                        subtextClass="text-[9px] font-mono text-stone-400"
                        accentColor="#C27D38"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-barcelona"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FDFBF7] p-12 flex flex-col justify-between ${fontSize} leading-relaxed text-left border-t-8`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Georgia', serif", 
                color: textColor,
                borderTopColor: primaryColor
            }}
        >
            <div>
                {/* Clean traditional header */}
                <header className="border-b pb-6 mb-6 text-center" style={{ borderColor: 'rgba(194, 125, 56, 0.15)' }}>
                    <h1 className="text-3xl font-light tracking-[0.1em] font-serif uppercase mb-2">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    <p className="text-xs uppercase tracking-[0.2em] font-serif italic mb-4" style={{ color: primaryColor }}>
                        {contact.jobTitle || 'Design Lead // Creative Principal'}
                    </p>

                    {/* Centered inline-block info elements */}
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[10px] font-sans font-bold text-stone-500 uppercase tracking-wider">
                        {contact.email && <span>{contact.email}</span>}
                        {fullPhone && <span>•</span>}
                        {fullPhone && <span>{fullPhone}</span>}
                        {city && <span>•</span>}
                        {city && <span>{city}, {contact.country || 'ES'}</span>}
                        {contact.linkedin && <span>•</span>}
                        {contact.linkedin && <span className="lowercase font-medium">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Profile Overview */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Structured Columns */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {renderRun(['education', 'certifications'])}
                    </div>

                    <div>
                        {renderRun(['skills', 'languages'])}
                    </div>
                </div>

                {renderRun(['awards', 'trainings', 'publications', 'volunteer', 'custom'])}
            </div>
        </div>
    );
};

export default React.memo(BarcelonaTemplate);
