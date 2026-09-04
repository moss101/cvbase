import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections, sectionLayout } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

/** Sections handed to the shared OptionalSectionsRenderer, in its default order. */
const OPTIONAL_IDS: readonly SectionId[] = ['certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

const SiliconTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const blueAccent = '#0284C7'; // Silicon Blue/Light Cyan
    const darkSlate = '#0F172A'; // Deep Slate

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="flex items-center gap-3 mt-6 mb-2">
            <h2 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                {title}
            </h2>
            <div className="h-[1.5px] bg-slate-200 grow"></div>
            <span className="text-[8px] font-mono text-slate-300">// ST_CORE</span>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('profile')}</div>
                        <div className="text-slate-700 leading-relaxed text-justify font-sans" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-4">
                        <div className="break-after-avoid">{renderHeader('experience')}</div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold text-slate-900">
                                        <h3 className="text-xs uppercase font-extrabold text-slate-950">
                                            {exp.jobTitle} <span className="text-slate-400 font-normal">@</span> {exp.company}
                                        </h3>
                                        <span className="text-[9px] font-mono text-slate-450">[{exp.startDate} - {exp.endDate}]</span>
                                    </div>
                                    <p className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">// location: {exp.location}</p>
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
                                    <p className="font-extrabold text-[#0284C7] uppercase">{edu.school}</p>
                                    <p className="text-slate-600 font-sans italic">{edu.degree}</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">{edu.startDate} – {edu.endDate} // {edu.location}</p>
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
                                    className="text-[8.5px] bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded border border-slate-300"
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
                                        <h3 className="text-xs uppercase font-extrabold text-slate-800">{proj.name}</h3>
                                        <span className="text-[9px] text-slate-400">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8.5px] text-slate-500 font-bold mb-1.5 uppercase tracking-wide">
                                            toolkit: {proj.technologies}
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
                        fontClass="font-mono"
                        textClass="text-slate-600 text-xs font-sans leading-relaxed"
                        titleClass="font-extrabold text-slate-850 text-xs uppercase"
                        subtextClass="text-[9px] font-mono text-slate-400"
                        accentColor="#0284C7"
                        renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            ),
        );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-silicon"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-12 flex flex-col justify-between ${fontSize} leading-normal text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'JetBrains Mono', monospace", 
                color: darkSlate 
            }}
        >
            <div>
                {/* Tech Clean Header */}
                <header className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black uppercase text-slate-950 tracking-tight">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <p className="text-xs font-black uppercase mt-1 tracking-wider" style={{ color: blueAccent }}>
                            &lt; {contact.jobTitle || 'Staff Backend Engineer'} /&gt;
                        </p>
                    </div>

                    {/* Meta tag style links */}
                    <div className="text-right text-[10px] font-mono text-slate-500 space-y-1">
                        {contact.email && <p>email: {contact.email}</p>}
                        {fullPhone && <p>phone: {fullPhone}</p>}
                        {city && <p>loc: {city}, {contact.country || 'US'}</p>}
                    </div>
                </header>

                {/* Professional Statement */}
                {renderRun(['summary', 'experience', 'projects'])}

                {/* Secondary splits block */}
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

export default React.memo(SiliconTemplate);
