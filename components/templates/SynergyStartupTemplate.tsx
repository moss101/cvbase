import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const SynergyStartupTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#4F46E5'; // Indigo-600 / Startup Tech Purple
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-synergy-startup"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-[#1E293B] leading-relaxed`}
            style={{ fontFamily: settings?.fontFamily || 'Arial, "Helvetica Neue", sans-serif' }}
        >
            {/* Minimalist Tech Signature Header */}
            <header className="mb-6 flex justify-between items-baseline border-b pb-4 border-slate-100">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-none">
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                    </h1>
                    {contact.jobTitle && (
                        <p className="text-xs font-black uppercase mt-1.5 tracking-wider" style={{ color: accentColor }}>
                            {contact.jobTitle}
                        </p>
                    )}
                </div>

                <div className="text-right text-[10px] text-slate-550 space-y-0.5">
                    {contact.email && <div>{contact.email}</div>}
                    {fullPhone && <div>{fullPhone}</div>}
                    {city && <div>{city}, {countryName || 'US'}</div>}
                    {contact.linkedin && <div className="break-all font-medium text-slate-400">{contact.linkedin}</div>}
                </div>
            </header>

            {/* Contemporary Flow */}
            <div className="space-y-4">
                {/* Core Objective Statement */}
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#414552] mb-1.5 inline-block border-l-4 pl-2" style={{ borderColor: accentColor }}>
                            Profile Narrative
                        </h2>
                        <div className="text-xs text-slate-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {/* Grid layout for structured skills block */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#414552] mb-2 inline-block border-l-4 pl-2" style={{ borderColor: accentColor }}>
                            Capabilities Stacks
                        </h2>
                        <div className="flex flex-wrap gap-1">
                            {skills.map((skill, index) => (
                                <span key={index} className="px-2 py-0.5 text-[9px] font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Career Ledger */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#414552] mb-2.5 inline-block border-l-4 pl-2" style={{ borderColor: accentColor }}>
                            Professional Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold">{exp.jobTitle}</h3>
                                        <span className="text-[10px] text-slate-500 font-bold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-[10px] text-slate-450 italic mb-1.5">
                                        <span>{exp.company}</span>
                                        <span className="text-[9.5px] font-normal not-italic text-slate-400">{exp.location}</span>
                                    </div>
                                    <div className="text-xs text-slate-655 leading-relaxed text-justify pl-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Key Initiatives / Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#414552] mb-2.5 inline-block border-l-4 pl-2" style={{ borderColor: accentColor }}>
                            Featured Initiatives
                        </h2>
                        <div className="space-y-3.5">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold">{item.name}</h3>
                                        <span className="text-[10px] text-slate-500 font-bold">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    {item.technologies && (
                                        <p className="text-[9.5px] italic text-[#4F46E5] mb-1.5 font-medium">Stack: {item.technologies}</p>
                                    )}
                                    <div className="text-xs text-slate-655 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Academic History */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#414552] mb-2.5 inline-block border-l-4 pl-2" style={{ borderColor: accentColor }}>
                            Academics
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs text-slate-900 font-extrabold">{edu.school}</h3>
                                        <span className="text-[10px] text-slate-505 font-bold">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-slate-600 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-400">{edu.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Compact multi sections blocks */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-805">Certifications</h3>
                            <div className="text-xs text-slate-600 space-y-0.5">
                                {certifications.map(c => (
                                    <div key={c.id}>• {c.name}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-805">languages</h3>
                            <div className="text-xs text-slate-600 space-y-0.5">
                                {languages.map(l => (
                                    <div key={l.id}>• {l.language} ({l.proficiency})</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SynergyStartupTemplate;
