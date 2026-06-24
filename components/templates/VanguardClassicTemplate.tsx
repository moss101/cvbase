import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const VanguardClassicTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#7F1D1D'; // Deep Crimson / Burgundy
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-vanguard-classic"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-slate-900 leading-normal`}
            style={{ fontFamily: settings?.fontFamily || 'Georgia, Cambria, serif' }}
        >
            {/* Authoritative Structured Executive Header */}
            <header className="border-t-4 pt-4 mb-6" style={{ borderColor: accentColor }}>
                <div className="flex flex-col md:flex-row justify-between items-baseline gap-2">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: accentColor }}>
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        {contact.jobTitle && (
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-1">
                                {contact.jobTitle}
                            </p>
                        )}
                    </div>
                    {/* Compact Stacked Metadata Block */}
                    <div className="text-right text-[10px] text-slate-600 font-sans space-y-0.5">
                        {fullPhone && <div>Phone: {fullPhone}</div>}
                        {contact.email && <div>Email: {contact.email}</div>}
                        {fullAddress && <div>Address: {fullAddress}</div>}
                        {contact.linkedin && <div className="break-all">LinkedIn: {contact.linkedin}</div>}
                        {contact.website && <div className="break-all">Portfolio: {contact.website}</div>}
                    </div>
                </div>
            </header>

            {/* Content Flow */}
            <div className="space-y-4">
                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-1.5 pb-0.5 border-b-2 border-slate-900">
                            Executive Profile
                        </h2>
                        <div className="text-xs text-justify text-slate-750 font-normal leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900">
                            Professional Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-extrabold text-slate-950">{exp.jobTitle}</h3>
                                        <span className="text-slate-600 text-xs font-bold font-sans">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs italic text-slate-700 mb-1">
                                        <span>{exp.company}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-500 font-sans">{exp.location}</span>
                                    </div>
                                    <div className="text-xs text-slate-700 leading-relaxed font-normal text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900">
                            Selected Initiatives & Projects
                        </h2>
                        <div className="space-y-3">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-xs font-extrabold text-slate-950">{proj.name}</h3>
                                        <span className="text-slate-600 text-[10px] font-bold font-sans">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    <div className="text-xs text-slate-700 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900">
                            Education
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-xs font-extrabold text-slate-950">{edu.school}</h3>
                                        <span className="text-slate-650 text-xs font-bold font-sans">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-slate-705 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-slate-500 font-sans">{edu.location}</span>
                                    </div>
                                    {edu.description && (
                                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{edu.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Combined skills, certifications & languages for a dense bottom block */}
                <section>
                    <h2 className="text-xs font-black uppercase tracking-widest mb-2 pb-0.5 border-b-2 border-slate-900">
                        Qualifications & Skills
                    </h2>
                    <div className="space-y-1.5 text-xs text-slate-700">
                        {skills.length > 0 && (
                            <div>
                                <span className="font-extrabold text-slate-900">Core Expertise:</span> {skills.join(', ')}
                            </div>
                        )}
                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <div>
                                <span className="font-extrabold text-slate-900">Licenses & Certifications:</span> {certifications.map(c => c.name).join(' • ')}
                            </div>
                        )}
                        {visibleSections.includes('languages') && languages.length > 0 && (
                            <div>
                                <span className="font-extrabold text-slate-900">Languages:</span> {languages.map(l => `${l.language} (${l.proficiency})`).join(', ')}
                            </div>
                        )}
                        {visibleSections.includes('awards') && awards.length > 0 && (
                            <div>
                                <span className="font-extrabold text-slate-900">Awards:</span> {awards.map(a => `${a.title} (${a.date})`).join(', ')}
                            </div>
                        )}
                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                            <div>
                                <span className="font-extrabold text-slate-900">Trainings:</span> {trainings.map(t => `${t.course} – ${t.institution}`).join(' • ')}
                            </div>
                        )}
                    </div>
                </section>

                {/* Publications and Volunteer inside neat blocks */}
                <div className="grid grid-cols-2 gap-4">
                    {visibleSections.includes('publications') && publications.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b pb-0.5 mb-1.5">Publications</h3>
                            <div className="text-xs text-slate-700 space-y-1">
                                {publications.map(p => (
                                    <div key={p.id}>
                                        <div className="font-semibold">{p.title}</div>
                                        <div className="text-[10px] text-gray-500 italic">{p.publisher} ({p.date})</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b pb-0.5 mb-1.5">Leadership & Volunteering</h3>
                            <div className="text-xs text-slate-700 space-y-1">
                                {volunteer.map(v => (
                                    <div key={v.id}>
                                        <div className="font-semibold">{v.role}</div>
                                        <div className="text-[10px] text-gray-500 italic">{v.organization}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VanguardClassicTemplate;
