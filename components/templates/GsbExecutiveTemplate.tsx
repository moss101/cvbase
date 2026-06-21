import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const GsbExecutiveTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#0F172A'; // Midnight slate / navy
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-gsb-executive"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-gray-900 leading-relaxed`}
            style={{ fontFamily: settings?.fontFamily || 'Georgia, serif' }}
        >
            {/* Header Section */}
            <header className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase mb-1">
                    {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                </h1>
                {contact.jobTitle && (
                    <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase mb-3">
                        {contact.jobTitle}
                    </p>
                )}
                
                {/* Contact Minimal Text Flow Bar */}
                <div className="text-gray-600 text-[10px] flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
                    {fullPhone && <span>{fullPhone}</span>}
                    {fullPhone && contact.email && <span className="text-gray-300">|</span>}
                    {contact.email && <span className="break-all">{contact.email}</span>}
                    {contact.email && fullAddress && <span className="text-gray-300">|</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                    {fullAddress && contact.linkedin && <span className="text-gray-300">|</span>}
                    {contact.linkedin && <span className="break-all">{contact.linkedin}</span>}
                    {contact.linkedin && contact.website && <span className="text-gray-300">|</span>}
                    {contact.website && <span className="break-all">{contact.website}</span>}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="space-y-5">
                {/* Executive Summary */}
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-gray-400" style={{ color: accentColor }}>
                            Professional Summary
                        </h2>
                        <div className="text-xs text-gray-750 text-justify font-normal leading-relaxed" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400" style={{ color: accentColor }}>
                            Professional Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="group">
                                    <div className="flex justify-between items-baseline mb-0.5 font-bold">
                                        <h3 className="text-xs text-slate-900 font-bold">{exp.jobTitle}</h3>
                                        <span className="text-xs text-gray-600 font-semibold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs italic text-gray-700 mb-1">
                                        <span>{exp.company}</span>
                                        <span className="text-[10px] font-normal not-italic text-gray-500">{exp.location}</span>
                                    </div>
                                    <div className="text-xs text-gray-700 leading-relaxed pl-3 border-l border-gray-100" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400" style={{ color: accentColor }}>
                            Selected Projects
                        </h2>
                        <div className="space-y-3">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-0.5 font-bold">
                                        <h3 className="text-xs text-slate-900 font-bold">{proj.name}</h3>
                                        <span className="text-xs text-gray-600 font-semibold">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] italic text-slate-600 mb-1">Technologies: {proj.technologies}</p>
                                    )}
                                    <div className="text-xs text-gray-700 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400" style={{ color: accentColor }}>
                            Education
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5 font-bold">
                                        <h3 className="text-xs text-slate-900 font-bold">{edu.school}</h3>
                                        <span className="text-xs text-gray-650 font-semibold">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-gray-700 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-gray-500">{edu.location}</span>
                                    </div>
                                    {edu.description && (
                                        <p className="text-xs text-gray-650 mt-1 whitespace-pre-wrap">{edu.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Skills Section */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400" style={{ color: accentColor }}>
                            Skills & expertise
                        </h2>
                        <div className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-bold text-slate-800">Core Capabilities: </span>
                            {skills.join(' • ')}
                        </div>
                    </section>
                )}

                {/* Certifications */}
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-gray-400" style={{ color: accentColor }}>
                            Certifications
                        </h2>
                        <div className="text-xs text-gray-700 leading-relaxed">
                            {certifications.map((cert, index) => (
                                <span key={cert.id}>
                                    {index > 0 && ' • '}
                                    <span className="font-semibold">{cert.name}</span>
                                    {cert.number && ` (ID: ${cert.number})`}
                                    {cert.expiryDate && ` - Exp: ${cert.expiryDate}`}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Additional Optional Sections in continuous flow */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1" style={{ borderColor: '#ddd' }}>
                                Languages
                            </h3>
                            <ul className="text-xs text-gray-700 space-y-0.5">
                                {languages.map(lang => (
                                    <li key={lang.id}>
                                        <span className="font-semibold">{lang.language}</span> — {lang.proficiency}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {visibleSections.includes('awards') && awards.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1" style={{ borderColor: '#ddd' }}>
                                Honors & Awards
                            </h3>
                            <ul className="text-xs text-gray-700 space-y-0.5">
                                {awards.map(award => (
                                    <li key={award.id}>
                                        <span className="font-semibold">{award.title}</span>, {award.issuer} ({award.date})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {visibleSections.includes('trainings') && trainings.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1" style={{ borderColor: '#ddd' }}>
                                Professional Training
                            </h3>
                            <ul className="text-xs text-gray-700 space-y-0.5">
                                {trainings.map(item => (
                                    <li key={item.id}>
                                        <span className="font-semibold">{item.course}</span> - {item.institution}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {visibleSections.includes('publications') && publications.length > 0 && (
                        <div className="col-span-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1" style={{ borderColor: '#ddd' }}>
                                Selected Publications
                            </h3>
                            <ul className="text-xs text-gray-700 space-y-0.5">
                                {publications.map(item => (
                                    <li key={item.id}>
                                        <span className="font-semibold">{item.title}</span> - {item.publisher} ({item.date})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                        <div className="col-span-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1.5" style={{ borderColor: '#ddd' }}>
                                Volunteering & Leadership
                            </h3>
                            <div className="space-y-2">
                                {volunteer.map(item => (
                                    <div key={item.id} className="text-xs">
                                        <div className="flex justify-between items-baseline font-semibold">
                                            <span>{item.role}, {item.organization}</span>
                                            <span className="text-[10px] font-normal text-gray-500">{item.startDate} - {item.endDate}</span>
                                        </div>
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

export default GsbExecutiveTemplate;
