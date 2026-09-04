import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const ReykjavikTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const arcticCyan = '#008080'; // Clean Arctic Teal
    const slateDark = '#1E293B'; // Crisp deep slate
    const lightIce = '#F0F9FF'; // Soft blue-tint backdrop fallback or padding

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="border-b pb-0.5 mb-2 mt-5 flex justify-between items-end border-stone-200">
            <h2 className="text-[10px] font-sans font-extrabold uppercase tracking-[0.25em]" style={{ color: arcticCyan }}>
                {title}
            </h2>
            <span className="text-[7.5px] font-mono opacity-30">// REYK_NORDIC</span>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('profile')}</div>
                        <div className="text-stone-600 leading-relaxed text-justify px-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-extrabold text-[#0F172A] uppercase text-[11px] tracking-wide">
                                            {exp.jobTitle} / <span className="opacity-75">{exp.company}</span>
                                        </h3>
                                        <span className="text-[9px] font-mono font-bold text-stone-400">
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[8.5px] uppercase font-bold text-stone-400 mb-1">// {exp.location}</p>
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
                        <div className="space-y-3 font-sans">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[10px] break-inside-avoid">
                                    <p className="font-extrabold text-stone-900 uppercase">{edu.school}</p>
                                    <p className="text-stone-600 italic">{edu.degree}</p>
                                    <p className="text-[8px] font-mono text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} // {edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <div className="break-after-avoid">{renderHeader('skills')}</div>
                        <div className="flex flex-wrap gap-1">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[8.5px] font-bold px-2 py-0.5 bg-stone-105 text-stone-850 rounded border border-stone-200"
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
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-stone-800 text-[11px] uppercase tracking-wide">{proj.name}</h3>
                                        <span className="text-[9px] font-mono text-stone-400">[{proj.startDate} :: {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] font-mono text-stone-400 mb-1">
                                            toolkit: {proj.technologies}
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
                        titleClass="font-extrabold text-stone-900 text-xs uppercase"
                        subtextClass="text-[9px] font-mono text-stone-400"
                        accentColor="#0F766E"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-reykjavik"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-14 flex flex-col justify-between ${fontSize} leading-relaxed text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Inter', sans-serif", 
                color: slateDark 
            }}
        >
            <div>
                {/* Ice Crisp Minimal Nordic Header */}
                <header className="mb-6 flex justify-between items-baseline border-b pb-4 border-dashed border-stone-200">
                    <div>
                        <h1 className="text-3xl font-extrabold uppercase tracking-widest text-[#0F172A]">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: arcticCyan }}>
                            // {contact.jobTitle || 'Digital Product Lead'}
                        </p>
                    </div>

                    {/* Compact contact sidebar inside header */}
                    <div className="text-right text-[9.5px] font-semibold text-stone-500 font-sans tracking-wide">
                        {contact.email && <p>{contact.email}</p>}
                        {fullPhone && <p>{fullPhone}</p>}
                        {city && <p>{city}, {contact.country || 'IS'}</p>}
                    </div>
                </header>

                {/* Profile Overview */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Ice columns */}
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

export default React.memo(ReykjavikTemplate);
