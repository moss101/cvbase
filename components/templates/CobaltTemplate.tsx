
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const CobaltTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Colors from spec
    const accentBlue = settings?.themeColor || '#2AAEE7'; 
    const darkText = '#101214';
    const grayText = '#73808D';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    return (
        <div id={isCardPreview ? undefined : "resume-preview-cobalt"} className={`w-[794px] min-h-[1123px] h-auto bg-white relative flex ${fontSize}`} style={{ fontFamily: 'Arial, sans-serif', color: darkText }}>
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-[4px]" style={{ backgroundColor: accentBlue }}></div>

            {/* Left Main Column */}
            <main className="w-[63%] p-10 pt-12 pr-8 flex flex-col gap-6">
                
                {/* Header */}
                <div>
                    <h1 className="text-[32px] font-bold leading-tight tracking-tight mb-1">{contact.firstName} {contact.lastName}</h1>
                    <p className="text-[14px] font-medium" style={{ color: accentBlue }}>{contact.jobTitle}</p>
                </div>

                {summary.professionalSummary && (
                    <div className="text-justify leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: grayText }}>
                            Experience <span className="h-[1px] flex-1 bg-gray-200"></span>
                        </h2>
                        <div className="space-y-5">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[13px]">{exp.jobTitle}</h3>
                                        <span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <div className="text-xs font-semibold mb-2" style={{ color: accentBlue }}>{exp.company}, {exp.location}</div>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: grayText }}>
                            Projects <span className="h-[1px] flex-1 bg-gray-200"></span>
                        </h2>
                         <div className="space-y-4">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[13px]">{item.name}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <div className="text-xs font-semibold mb-1 opacity-80">{item.technologies}</div>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {/* Volunteer */}
                 {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: grayText }}>
                            Volunteering <span className="h-[1px] flex-1 bg-gray-200"></span>
                        </h2>
                         <div className="space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[13px]">{item.role}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <div className="text-xs font-semibold mb-2" style={{ color: accentBlue }}>{item.organization}</div>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {/* Publications */}
                 {visibleSections.includes('publications') && publications.length > 0 && (
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: grayText }}>
                            Publications <span className="h-[1px] flex-1 bg-gray-200"></span>
                        </h2>
                         <div className="space-y-3">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <h3 className="font-bold text-[13px]">{item.title}</h3>
                                    <p className="text-xs text-gray-500">{item.publisher}, {item.date}</p>
                                    <div className="leading-relaxed text-gray-600 mt-1">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </main>

            {/* Right Sidebar */}
            <aside className="w-[37%] bg-gray-50 p-10 pt-12 flex flex-col gap-8 border-l border-gray-100">
                
                {/* Photo & Details */}
                <div className="flex flex-col gap-6">
                    {contact.photo && (
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm mb-2">
                            <img src={contact.photo} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-3 text-xs text-gray-600">
                         {fullAddress && (
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-sm shrink-0" style={{ color: accentBlue }}>location_on</span>
                                <span>{fullAddress}</span>
                            </div>
                        )}
                        {fullPhone && (
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-sm shrink-0" style={{ color: accentBlue }}>call</span>
                                <span>{fullPhone}</span>
                            </div>
                        )}
                        {contact.email && (
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-sm shrink-0" style={{ color: accentBlue }}>mail</span>
                                <span className="break-all">{contact.email}</span>
                            </div>
                        )}
                        {contact.linkedin && (
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-sm shrink-0" style={{ color: accentBlue }}>link</span>
                                <a href={contact.linkedin} className="break-all hover:underline">LinkedIn</a>
                            </div>
                        )}
                        {contact.website && (
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-sm shrink-0" style={{ color: accentBlue }}>language</span>
                                <a href={contact.website} className="break-all hover:underline">{contact.website}</a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Skills */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Skills</h2>
                        <div className="flex flex-col gap-2">
                            {skills.map((skill, i) => (
                                <div key={i} className="text-gray-600 font-medium">
                                    {skill}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education */}
                 {education.length > 0 && (
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Education</h2>
                        <div className="flex flex-col gap-4">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <h3 className="font-bold text-[12px] text-gray-900">{edu.degree}</h3>
                                    <p className="text-xs font-medium" style={{ color: accentBlue }}>{edu.school}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Certifications */}
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                     <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Certifications</h2>
                        <div className="flex flex-col gap-3">
                            {certifications.map((cert, i) => (
                                <div key={i}>
                                    <p className="font-bold text-[12px] text-gray-900">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-xs text-gray-500">Exp: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Languages */}
                {visibleSections.includes('languages') && languages.length > 0 && (
                     <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Languages</h2>
                        <div className="flex flex-col gap-2">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="font-medium text-gray-700">{lang.language}</span>
                                    <span className="text-xs text-gray-500">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Awards */}
                {visibleSections.includes('awards') && awards.length > 0 && (
                     <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Awards</h2>
                        <div className="flex flex-col gap-3">
                            {awards.map((award, i) => (
                                <div key={i}>
                                    <p className="font-bold text-[12px] text-gray-900">{award.title}</p>
                                    <p className="text-xs text-gray-500">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Trainings */}
                {visibleSections.includes('trainings') && trainings.length > 0 && (
                     <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Training</h2>
                        <div className="flex flex-col gap-3">
                            {trainings.map((item, i) => (
                                <div key={i}>
                                    <p className="font-bold text-[12px] text-gray-900">{item.course}</p>
                                    <p className="text-xs text-gray-500">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Custom */}
                {visibleSections.includes('custom') && custom.length > 0 && (
                     <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-800">Additional</h2>
                        <div className="flex flex-col gap-3">
                            {custom.map((item, i) => (
                                <div key={i}>
                                    <p className="font-bold text-[12px] text-gray-900">{item.title}</p>
                                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </aside>
        </div>
    );
};

export default CobaltTemplate;
