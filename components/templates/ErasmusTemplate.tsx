
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const ErasmusTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const headerColor = settings?.themeColor || '#2563eb';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-erasmus"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} p-12 text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}
            </style>
            
            <header className="flex justify-between items-start mb-12">
                <div>
                    <h1 className="text-5xl font-bold mb-1 tracking-tight" style={{ color: headerColor }}>{contact.firstName} {contact.lastName}</h1>
                    <p className="text-xl text-gray-600 font-light">{contact.jobTitle}</p>
                </div>
                <div className="text-right text-xs space-y-1.5 text-gray-500">
                    {fullPhone && <div className="flex items-center justify-end gap-2"><span>{fullPhone}</span><span className="material-symbols-outlined text-sm" style={{ color: headerColor }}>call</span></div>}
                    {contact.email && <div className="flex items-center justify-end gap-2"><span>{contact.email}</span><span className="material-symbols-outlined text-sm" style={{ color: headerColor }}>mail</span></div>}
                    {fullAddress && <div className="flex items-center justify-end gap-2"><span>{fullAddress}</span><span className="material-symbols-outlined text-sm" style={{ color: headerColor }}>location_on</span></div>}
                    {contact.linkedin && <div className="flex items-center justify-end gap-2"><span className="break-all">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span><span className="material-symbols-outlined text-sm" style={{ color: headerColor }}>link</span></div>}
                </div>
            </header>

            <div className="grid grid-cols-3 gap-12">
                {/* Main Column */}
                <div className="col-span-2 space-y-10">
                    {summary.professionalSummary && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-3 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Summary</h2>
                            <div className="text-sm leading-7 text-gray-600 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                        </section>
                    )}

                    {experience.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Experience</h2>
                            <div className="space-y-6">
                                {experience.map(exp => (
                                    <div key={exp.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-gray-800">{exp.jobTitle}</h3>
                                            <span className="text-xs font-medium text-gray-400">{exp.startDate} - {exp.endDate}</span>
                                        </div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: headerColor }}>{exp.company}</p>
                                        <div className="text-sm leading-6 text-gray-600" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {visibleSections.includes('projects') && projects.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Projects</h2>
                            <div className="space-y-6">
                                {projects.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-gray-800">{item.name}</h3>
                                            <span className="text-xs font-medium text-gray-400">{item.startDate} - {item.endDate}</span>
                                        </div>
                                        <p className="text-xs italic mb-1" style={{ color: headerColor }}>{item.technologies}</p>
                                        <div className="text-sm leading-6 text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {visibleSections.includes('publications') && publications && publications.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Publications</h2>
                            <div className="space-y-4">
                                {publications.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                                        <p className="text-xs font-semibold mb-1" style={{ color: headerColor }}>{item.publisher}, {item.date}</p>
                                        <div className="text-sm leading-6 text-gray-600">{item.description}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Volunteering</h2>
                            <div className="space-y-4">
                                {volunteer.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-gray-800">{item.role}</h3>
                                            <span className="text-xs font-medium text-gray-400">{item.startDate} - {item.endDate}</span>
                                        </div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: headerColor }}>{item.organization}</p>
                                        <div className="text-sm leading-6 text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                     {visibleSections.includes('custom') && custom && custom.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Additional</h2>
                            <div className="space-y-4">
                                {custom.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                                            <span className="text-xs font-medium text-gray-400">{item.date}</span>
                                        </div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: headerColor }}>{item.subtitle}</p>
                                        <div className="text-sm leading-6 text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="col-span-1 space-y-10">
                    {education.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Education</h2>
                            <div className="space-y-4">
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <h3 className="text-sm font-bold text-gray-900">{edu.degree}</h3>
                                        <p className="text-xs font-semibold mt-0.5" style={{ color: headerColor }}>{edu.school}</p>
                                        <p className="text-xs text-gray-400 mt-1">{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Trainings</h2>
                            <div className="space-y-4">
                                {trainings.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-sm font-bold text-gray-900">{item.course}</h3>
                                        <p className="text-xs font-semibold mt-0.5" style={{ color: headerColor }}>{item.institution}</p>
                                        <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {skills.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-gray-50 rounded text-xs font-semibold" style={{ color: headerColor }}>{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Languages</h2>
                            <div className="space-y-2">
                                {languages.map((lang, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-dashed border-gray-200 pb-1">
                                        <span className="text-sm font-medium text-gray-700">{lang.language}</span>
                                        <span className="text-xs text-gray-400">{lang.proficiency}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Certificates</h2>
                            <ul className="space-y-3">
                                {certifications.map((cert, i) => (
                                    <li key={i} className="text-xs text-gray-600 leading-relaxed">
                                        <span className="font-bold block text-gray-800">{cert.name}</span>
                                        {cert.expiryDate && <span className="text-gray-400">Expires: {cert.expiryDate}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {visibleSections.includes('awards') && awards && awards.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ color: headerColor, borderColor: `${headerColor}40` }}>Awards</h2>
                            <ul className="space-y-3">
                                {awards.map((award, i) => (
                                    <li key={i} className="text-xs text-gray-600 leading-relaxed">
                                        <span className="font-bold block text-gray-800">{award.title}</span>
                                        <span className="text-gray-400">{award.issuer} - {award.date}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErasmusTemplate;
