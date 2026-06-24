
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const ProfessionalTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const themeColor = settings?.themeColor || '#3b82f6';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-professional"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} p-8 text-slate-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24 }`}</style>
            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-8">
                    <header>
                        <h1 className="text-4xl font-bold text-slate-800">{(contact.firstName || 'YOUR').toUpperCase()} {(contact.lastName || 'NAME').toUpperCase()}</h1>
                        <h2 className="text-lg font-medium mt-2" style={{color: themeColor}}>{contact.jobTitle || 'Your Job Title'}</h2>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 items-center">
                            {contact.email && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">mail</span><span>{contact.email}</span></div>}
                            {contact.linkedin && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">link</span><span>LinkedIn</span></div>}
                            {fullAddress && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">location_on</span><span>{fullAddress}</span></div>}
                            {contact.phone && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">call</span><span>{fullPhone}</span></div>}
                        </div>
                    </header>
                    {summary.professionalSummary && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">SUMMARY</h3>
                            <div className="text-slate-600 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                        </section>
                    )}
                    {experience.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">EXPERIENCE</h3>
                            <div className="space-y-6">
                                {experience.map(exp => (
                                    <div key={exp.id} className="grid grid-cols-4 gap-2 break-inside-avoid">
                                        <div className="col-span-3">
                                            <h4 className="text-lg font-semibold text-slate-800">{exp.jobTitle}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{exp.company}</p>
                                        </div>
                                        <div className="col-span-1 text-sm text-slate-500 text-right">
                                            <p>{exp.startDate} - {exp.endDate}</p>
                                            <p>{exp.location}</p>
                                        </div>
                                        <div className="col-span-4 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {visibleSections.includes('projects') && projects.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">PROJECTS</h3>
                            <div className="space-y-6">
                                {projects.map(item => (
                                    <div key={item.id} className="grid grid-cols-4 gap-2 break-inside-avoid">
                                        <div className="col-span-3">
                                            <h4 className="text-lg font-semibold text-slate-800">{item.name}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{item.technologies}</p>
                                        </div>
                                        <div className="col-span-1 text-sm text-slate-500 text-right">
                                            <p>{item.startDate} - {item.endDate}</p>
                                        </div>
                                        <div className="col-span-4 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {education.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">EDUCATION</h3>
                            <div className="space-y-4">
                                {education.map(edu => (
                                    <div key={edu.id} className="flex justify-between items-start break-inside-avoid">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-800">{edu.degree}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{edu.school}</p>
                                        </div>
                                        <p className="text-sm text-slate-500 text-right shrink-0 ml-4">{edu.startDate} - {edu.endDate}<br />{edu.location}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">TRAINING</h3>
                             <div className="space-y-4">
                                {trainings.map(item => (
                                    <div key={item.id} className="flex justify-between items-start break-inside-avoid">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-800">{item.course}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{item.institution}</p>
                                        </div>
                                        <p className="text-sm text-slate-500 text-right shrink-0 ml-4">{item.date}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('publications') && publications && publications.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">PUBLICATIONS</h3>
                             <div className="space-y-4">
                                {publications.map(item => (
                                    <div key={item.id} className="flex justify-between items-start break-inside-avoid">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-800">{item.title}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{item.publisher}</p>
                                            {item.description && <p className="text-slate-600 text-sm mt-1">{item.description}</p>}
                                        </div>
                                        <p className="text-sm text-slate-500 text-right shrink-0 ml-4">{item.date}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">VOLUNTEERING</h3>
                             <div className="space-y-4">
                                {volunteer.map(item => (
                                    <div key={item.id} className="flex justify-between items-start break-inside-avoid">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-800">{item.role}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{item.organization}</p>
                                            {item.description && <p className="text-slate-600 text-sm mt-1">{item.description}</p>}
                                        </div>
                                        <p className="text-sm text-slate-500 text-right shrink-0 ml-4">{item.startDate} - {item.endDate}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {visibleSections.includes('custom') && custom && custom.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">ADDITIONAL</h3>
                             <div className="space-y-4">
                                {custom.map(item => (
                                    <div key={item.id} className="flex justify-between items-start break-inside-avoid">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-800">{item.title}</h4>
                                            <p className="font-medium" style={{color: themeColor}}>{item.subtitle}</p>
                                            {item.description && <p className="text-slate-600 text-sm mt-1">{item.description}</p>}
                                        </div>
                                        <p className="text-sm text-slate-500 text-right shrink-0 ml-4">{item.date}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>

                <div className="col-span-1 bg-slate-50 p-6 rounded-lg space-y-8">
                    {contact.photo && (
                        <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                    {skills.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">SKILLS</h3>
                            <p className="text-slate-600 leading-relaxed">{skills.join(' • ')}</p>
                        </section>
                    )}
                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                         <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">CERTIFICATIONS</h3>
                            <div className="flex flex-col gap-2">
                                {certifications.map(cert => (
                                    <div key={cert.id} className="break-inside-avoid">
                                        <p className="font-semibold text-slate-800">{cert.name}</p>
                                        {cert.expiryDate && <p className="text-xs text-slate-500">Expires: {cert.expiryDate}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {visibleSections.includes('languages') && languages?.length > 0 && (
                         <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">LANGUAGES</h3>
                            <div className="flex flex-col gap-2">
                                {languages.map(lang => (
                                    <div key={lang.id} className="break-inside-avoid">
                                        <p className="font-semibold text-slate-800">{lang.language}</p>
                                        <p className="text-sm text-slate-500">{lang.proficiency}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                     {visibleSections.includes('awards') && awards && awards.length > 0 && (
                         <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">AWARDS</h3>
                            <div className="flex flex-col gap-2">
                                {awards.map(award => (
                                    <div key={award.id} className="break-inside-avoid">
                                        <p className="font-semibold text-slate-800">{award.title}</p>
                                        <p className="text-xs text-slate-500">{award.issuer}, {award.date}</p>
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

export default ProfessionalTemplate;
