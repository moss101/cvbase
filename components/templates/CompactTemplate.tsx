
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const CompactTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    // Compact layout benefits from slightly tighter text, but legible.
    const fontSize = settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const themeColor = settings?.themeColor || '#2c3e50';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-compact"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-gray-900 p-10 ${fontSize} leading-snug`} style={{ fontFamily: settings?.fontFamily || "'Arial', sans-serif" }}>
            {/* Header */}
            <header className="border-b-2 border-gray-800 pb-4 mb-5 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight leading-none">{contact.firstName} {contact.lastName}</h1>
                    <p className="text-lg font-bold text-gray-600 uppercase tracking-wide mt-1">{contact.jobTitle}</p>
                </div>
                <div className="text-right text-xs text-gray-600 space-y-1 font-medium">
                    <p>{contact.email} {fullPhone && `• ${fullPhone}`}</p>
                    <p>{fullAddress}</p>
                    <p>{contact.linkedin && contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')} {contact.website && `• ${contact.website.replace(/^https?:\/\/(www\.)?/, '')}`}</p>
                </div>
            </header>

            {/* Summary */}
            {summary.professionalSummary && (
                <section className="mb-5">
                    <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Professional Summary</h2>
                    <div className="text-justify text-gray-700" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                </section>
            )}

            {/* Skills - Top priority for Compact */}
            {skills.length > 0 && (
                <section className="mb-5">
                    <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Core Competencies</h2>
                    <div className="flex flex-wrap gap-x-1 gap-y-1">
                        {skills.map((skill, i) => (
                            <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-semibold text-[9px] border border-gray-200">{skill}</span>
                        ))}
                    </div>
                </section>
            )}

            {/* Experience */}
            {experience.length > 0 && (
                <section className="mb-5">
                    <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Experience</h2>
                    <div className="space-y-4">
                        {experience.map(exp => (
                            <div key={exp.id}>
                                <div className="flex justify-between items-baseline font-bold text-[1.05em]">
                                    <h3>{exp.jobTitle}</h3>
                                    <span className="text-gray-600 text-[0.9em] font-medium">{exp.startDate} – {exp.endDate}</span>
                                </div>
                                <div className="flex justify-between items-baseline text-gray-700 italic mb-1 text-[0.95em]">
                                    <span>{exp.company}</span>
                                    <span>{exp.location}</span>
                                </div>
                                <div className="text-gray-700 pl-1" dangerouslySetInnerHTML={{ __html: exp.description }} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Projects */}
            {visibleSections.includes('projects') && projects.length > 0 && (
                <section className="mb-5">
                    <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Projects</h2>
                    <div className="space-y-3">
                        {projects.map(item => (
                            <div key={item.id}>
                                <div className="flex justify-between font-bold text-[1.05em]">
                                    <h3>{item.name}</h3>
                                    <span className="text-gray-600 text-[0.9em] font-medium">{item.startDate} – {item.endDate}</span>
                                </div>
                                {item.technologies && <p className="text-[0.9em] text-gray-600 italic mb-0.5">Tech: {item.technologies}</p>}
                                <div className="text-gray-700 pl-1" dangerouslySetInnerHTML={{ __html: item.description }} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Education */}
            {education.length > 0 && (
                <section className="mb-5">
                    <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Education</h2>
                    <div className="space-y-2">
                        {education.map(edu => (
                            <div key={edu.id} className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold">{edu.school}</div>
                                    <div className="text-gray-700">{edu.degree}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-gray-600 font-medium">{edu.startDate} – {edu.endDate}</div>
                                    <div className="text-gray-500 italic text-[0.9em]">{edu.location}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 2-Column Grid for Smaller Sections */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Certifications</h2>
                        <ul className="space-y-1 text-[0.95em]">
                            {certifications.map(cert => (
                                <li key={cert.id} className="flex justify-between">
                                    <span className="font-semibold">{cert.name}</span>
                                    <span className="text-gray-500 text-[0.9em]">{cert.expiryDate}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {visibleSections.includes('languages') && languages.length > 0 && (
                     <section>
                        <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Languages</h2>
                        <ul className="space-y-1 text-[0.95em]">
                            {languages.map(lang => (
                                <li key={lang.id} className="flex justify-between">
                                    <span className="font-semibold">{lang.language}</span>
                                    <span className="text-gray-500 italic text-[0.9em]">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                
                {visibleSections.includes('awards') && awards.length > 0 && (
                    <section>
                         <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Awards</h2>
                         <ul className="space-y-1 text-[0.95em]">
                            {awards.map(award => (
                                <li key={award.id}>
                                    <span className="font-semibold">{award.title}</span> <span className="text-gray-500">- {award.issuer}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {visibleSections.includes('trainings') && trainings.length > 0 && (
                    <section>
                         <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Training</h2>
                         <ul className="space-y-1 text-[0.95em]">
                            {trainings.map(item => (
                                <li key={item.id}>
                                    <span className="font-semibold">{item.course}</span> <span className="text-gray-500">- {item.institution}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                 {visibleSections.includes('publications') && publications.length > 0 && (
                    <section>
                         <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Publications</h2>
                         <ul className="space-y-1 text-[0.95em]">
                            {publications.map(item => (
                                <li key={item.id}>
                                    <span className="font-semibold italic">{item.title}</span> <span className="text-gray-500">- {item.publisher}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                    <section>
                         <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Volunteering</h2>
                         <ul className="space-y-1 text-[0.95em]">
                            {volunteer.map(item => (
                                <li key={item.id}>
                                    <span className="font-semibold">{item.role}</span> <span className="text-gray-500">@ {item.organization}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                
                {visibleSections.includes('custom') && custom.length > 0 && (
                    <section>
                         <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: themeColor }}>Other</h2>
                         <ul className="space-y-1 text-[0.95em]">
                            {custom.map(item => (
                                <li key={item.id}>
                                    <span className="font-semibold">{item.title}</span> <span className="text-gray-500">- {item.subtitle}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
};

export default CompactTemplate;
