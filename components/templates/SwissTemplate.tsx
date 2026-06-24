
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const SwissTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#2563eb';
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-swiss"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} p-10 text-gray-800`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
             <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24; }`}
            </style>
            <header className="mb-12 flex justify-between items-end border-b-4 border-black pb-6">
                <div>
                    <h1 className="text-5xl font-extrabold uppercase tracking-tighter mb-1">{contact.firstName} <span style={{ color: primaryColor }}>{contact.lastName}</span></h1>
                    <p className="text-xl font-light tracking-wide text-gray-600">{contact.jobTitle}</p>
                </div>
                <div className="text-right text-xs space-y-1 font-medium text-gray-500">
                    {contact.email && <p>{contact.email}</p>}
                    {fullPhone && <p>{fullPhone}</p>}
                    {contact.linkedin && <p className="break-all">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</p>}
                    {fullAddress && <p>{fullAddress}</p>}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-10">
                {/* Left Column - Main Content */}
                <div className="col-span-7 space-y-10">
                     {summary.professionalSummary && (
                        <section>
                             <h2 className="text-2xl font-black uppercase mb-4">Profile</h2>
                             <div className="text-sm leading-7 text-gray-600 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                        </section>
                     )}

                    {experience.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-black uppercase mb-6">Experience</h2>
                            <div className="space-y-8">
                                {experience.map(exp => (
                                    <div key={exp.id}>
                                        <h3 className="text-lg font-bold" style={{ color: primaryColor }}>{exp.jobTitle}</h3>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wide text-gray-800">{exp.company}</span>
                                            <span className="text-xs font-medium text-gray-400">{exp.startDate} - {exp.endDate}</span>
                                        </div>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('projects') && projects.length > 0 && (
                        <section>
                             <h2 className="text-2xl font-black uppercase mb-6">Key Projects</h2>
                             <div className="space-y-6">
                                {projects.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                                        <p className="text-xs font-medium mb-2" style={{ color: primaryColor }}>{item.technologies}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}
                     {visibleSections.includes('publications') && publications && publications.length > 0 && (
                        <section>
                             <h2 className="text-2xl font-black uppercase mb-6">Publications</h2>
                             <div className="space-y-4">
                                {publications.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                                        <p className="text-xs font-bold mb-1" style={{ color: primaryColor }}>{item.publisher}, {item.date}</p>
                                        <p className="text-xs text-gray-600">{item.description}</p>
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}
                     {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                        <section>
                             <h2 className="text-2xl font-black uppercase mb-6">Volunteering</h2>
                             <div className="space-y-4">
                                {volunteer.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-base font-bold text-gray-900">{item.role}</h3>
                                        <p className="text-xs font-bold mb-1" style={{ color: primaryColor }}>{item.organization}</p>
                                        <p className="text-xs text-gray-400 mb-2">{item.startDate} - {item.endDate}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}
                     {visibleSections.includes('custom') && custom && custom.length > 0 && (
                        <section>
                             <h2 className="text-2xl font-black uppercase mb-6">Additional</h2>
                             <div className="space-y-4">
                                {custom.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                                        <p className="text-xs font-bold mb-1" style={{ color: primaryColor }}>{item.subtitle}</p>
                                        <p className="text-xs text-gray-400 mb-2">{item.date}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}
                </div>

                {/* Right Column - Visuals & Sidebar */}
                <div className="col-span-5 space-y-10 pt-2">
                    {skills.length > 0 && (
                        <section className="bg-gray-50 p-6 rounded-2xl">
                            <h2 className="text-xl font-black uppercase mb-4 text-center">Skills</h2>
                            <div className="flex flex-wrap justify-center gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold shadow-sm">{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                     {education.length > 0 && (
                        <section>
                            <h2 className="text-xl font-black uppercase mb-4">Education</h2>
                            <div className="space-y-4 border-l-4 pl-4" style={{ borderColor: primaryColor }}>
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <h3 className="text-sm font-bold text-gray-900">{edu.degree}</h3>
                                        <p className="text-xs font-bold" style={{ color: primaryColor }}>{edu.school}</p>
                                        <p className="text-xs text-gray-400">{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <section>
                             <h2 className="text-xl font-black uppercase mb-4">Certifications</h2>
                             <ul className="space-y-2">
                                {certifications.map((cert, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                        <span className="material-symbols-outlined text-lg" style={{ color: primaryColor }}>workspace_premium</span>
                                        {cert.name}
                                    </li>
                                ))}
                             </ul>
                        </section>
                    )}
                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <section>
                             <h2 className="text-xl font-black uppercase mb-4">Languages</h2>
                             <ul className="space-y-2">
                                {languages.map((lang, i) => (
                                    <li key={i} className="flex justify-between text-xs font-medium text-gray-600">
                                        <span>{lang.language}</span>
                                        <span style={{ color: primaryColor }}>{lang.proficiency}</span>
                                    </li>
                                ))}
                             </ul>
                        </section>
                    )}
                     {visibleSections.includes('awards') && awards && awards.length > 0 && (
                        <section>
                             <h2 className="text-xl font-black uppercase mb-4">Awards</h2>
                             <div className="space-y-2 border-l-4 pl-4" style={{ borderColor: primaryColor }}>
                                {awards.map((award, i) => (
                                    <div key={i}>
                                        <h3 className="text-sm font-bold text-gray-900">{award.title}</h3>
                                        <p className="text-xs text-gray-500">{award.issuer}</p>
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}
                    {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                        <section>
                             <h2 className="text-xl font-black uppercase mb-4">Trainings</h2>
                             <div className="space-y-2 border-l-4 pl-4" style={{ borderColor: primaryColor }}>
                                {trainings.map((item, i) => (
                                    <div key={i}>
                                        <h3 className="text-sm font-bold text-gray-900">{item.course}</h3>
                                        <p className="text-xs text-gray-500">{item.institution}</p>
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SwissTemplate;
