import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const ChicagoTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const accentColor = '#334155'; // Chicago Slate Gray
    const goldAccent = '#B45309'; // Industrial Amber accent
    const textColor = '#1E293B'; // Dark Slate Ink

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="flex items-center gap-4 mt-6 mb-3">
            <h2 className="text-xs font-sans font-black uppercase tracking-wider text-slate-800 shrink-0">
                {title}
            </h2>
            <div className="h-[2px] bg-slate-300 grow" />
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('profile')}</div>
                        <div className="text-slate-700 leading-relaxed text-justify px-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="relative pl-6 border-l-2 border-slate-200 ml-2 break-inside-avoid">
                                    {/* Small metal rivet symbol */}
                                    <span className="absolute -left-[5px] top-1.5 w-[8px] h-[8px] rounded-full bg-slate-700 border border-stone-200" style={{ backgroundColor: goldAccent }}></span>

                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-extrabold text-[11px] uppercase text-slate-900">{exp.jobTitle}</h3>
                                        <span className="text-[9px] font-mono font-bold text-slate-400">[{exp.startDate} :: {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[9.5px] italic text-slate-500 font-medium mb-1.5">{exp.company} • {exp.location}</p>
                                    <div className="text-slate-600 text-xs text-justify font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <div className="break-after-avoid">{renderHeader('education')}</div>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[9.5px] break-inside-avoid">
                                    <p className="font-extrabold text-slate-900 uppercase">{edu.school}</p>
                                    <p className="text-slate-600 italic">{edu.degree}</p>
                                    <p className="text-[8px] text-slate-450 mt-0.5">{edu.startDate} – {edu.endDate} // {edu.location}</p>
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
                                    className="text-[8.5px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded uppercase"
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
                                <div key={proj.id} className="pl-6 border-l-2 border-slate-200 ml-2 relative break-inside-avoid">
                                    <span className="absolute -left-[4px] top-1.5 w-[6px] h-[6px] rounded bg-slate-400"></span>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold text-[11px] uppercase text-slate-800">{proj.name}</h3>
                                        <span className="text-[9px] text-slate-400 font-mono">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] text-slate-500 font-mono mb-1.5">
                                            Engines/Tech: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-slate-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
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
                        textClass="text-slate-650 text-xs font-sans leading-relaxed text-justify"
                        titleClass="font-extrabold text-slate-900 text-xs uppercase"
                        subtextClass="text-[9px] font-mono text-slate-400"
                        accentColor="#0F172A"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-chicago"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-stone-50 p-12 flex flex-col justify-between ${fontSize} leading-normal text-left border-l-[14px]`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Inter', sans-serif", 
                color: textColor,
                borderLeftColor: accentColor
            }}
        >
            <div>
                {/* Clean industrial header block */}
                <header className="mb-6 flex justify-between items-start border-b pb-6 border-slate-200">
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <p className="text-xs font-bold uppercase mt-1" style={{ color: goldAccent }}>
                            // {contact.jobTitle || 'Lead Civil Infrastructure Planner'}
                        </p>
                    </div>

                    {/* Aligned coordinate panel */}
                    <div className="text-right text-[10px] font-mono text-slate-500 space-y-0.5">
                        {contact.email && <p>E: {contact.email}</p>}
                        {fullPhone && <p>T: {fullPhone}</p>}
                        {city && <p>L: {city}, {contact.country || 'US'}</p>}
                    </div>
                </header>

                {/* Profile statement */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Grid details */}
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

export default React.memo(ChicagoTemplate);
