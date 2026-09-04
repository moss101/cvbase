import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const BerlinV3Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const textColor = '#000000'; // Precise solid ink black

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string, tag: string) => (
        <div className="my-5">
            <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-black tracking-widest pb-1 border-b border-dashed border-black">
                <span>[ {title} ]</span>
                <span className="opacity-40">{tag}</span>
            </div>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('profile', 'S_00')}</div>
                        <div className="text-stone-850 leading-relaxed text-justify px-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience', 'E_01')}</div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold text-black mb-1">
                                        <h3 className="text-xs uppercase font-black">
                                            {exp.jobTitle} @ {exp.company}
                                        </h3>
                                        <span className="text-[9.5px] font-mono text-stone-505">[{exp.startDate} - {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-wide text-stone-400 font-bold mb-1.5">// location: {exp.location}</p>
                                    <div className="text-stone-700 text-xs text-justify leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <div className="break-after-avoid">{renderHeader('education', 'A_03')}</div>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[9.5px] font-mono break-inside-avoid">
                                    <p className="font-extrabold text-black uppercase">{edu.school}</p>
                                    <p className="text-stone-500 italic">{edu.degree}</p>
                                    <p className="text-[8px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} // {edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <div className="break-after-avoid">{renderHeader('skills', 'C_04')}</div>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[9px] font-mono bg-stone-100 text-stone-900 font-black px-2 py-0.5 border border-black rounded"
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
                        <div className="break-after-avoid">{renderHeader('projects', 'P_02')}</div>
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-xs uppercase font-black">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-mono">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] text-stone-400 font-bold mb-1.5 uppercase font-mono">
                                            environments: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-700 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
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
                        fontClass="font-mono"
                        textClass="text-stone-700 text-[10px]"
                        titleClass="font-bold text-black text-xs uppercase"
                        subtextClass="text-[8px] text-stone-400 font-mono"
                        accentColor="#000000"
                        renderHeader={(title, tag) => renderHeader(title.toLowerCase(), tag || 'OPT')}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-berlinv3"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-14 flex flex-col justify-between ${fontSize} leading-relaxed text-left border border-black`}
            style={{ 
                fontFamily: settings?.fontFamily || "'JetBrains Mono', monospace", 
                color: textColor 
            }}
        >
            <div>
                {/* Ultra-pure design block header */}
                <header className="mb-6 pb-4 border-b border-black">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-widest text-black">
                                {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                            </h1>
                            <p className="text-[10.5px] font-bold uppercase mt-1 text-stone-500">
                                // role : {contact.jobTitle || 'System Operations Engineer'}
                            </p>
                        </div>
                        <div className="text-right text-[8px] font-mono opacity-50 tracking-widest leading-none">
                            BERLIN_V3_DRAFT // SECURE
                        </div>
                    </div>

                    {/* Inline metadata details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[9.5px] font-mono text-stone-700">
                        {contact.email && <span>email : {contact.email}</span>}
                        {fullPhone && <span>phone : {fullPhone}</span>}
                        {city && <span>coord : {city}, {contact.country || 'DE'}</span>}
                        {contact.linkedin && <span>linked: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                </header>

                {/* Professional Statement */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Compact grid columns */}
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

export default React.memo(BerlinV3Template);
