
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const ProfessionalV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const themeColor = settings?.themeColor || '#374151';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-professional-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} p-10 text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="text-center mb-8 border-b pb-6">
                {contact.photo && (
                    <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-gray-200 shadow-md mb-4">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                <h1 className="text-4xl font-bold text-gray-800 tracking-tight">{(contact.firstName || 'YOUR').toUpperCase()} {(contact.lastName || 'NAME').toUpperCase()}</h1>
                <p className="text-lg text-gray-600 font-medium mt-1">{contact.jobTitle || 'Administrative Assistant'}</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-4 text-sm">
                    {contact.phone && <span>{fullPhone}</span>}
                    {contact.phone && contact.email && <span className="text-gray-300">|</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {(contact.phone || contact.email) && fullAddress && <span className="text-gray-300">|</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                </div>
            </header>

            <main className="space-y-6">
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>PROFESSIONAL SUMMARY</h2>
                        <div className="mt-3 text-sm leading-relaxed border-l-2 border-gray-200 pl-4 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {experience.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>EXPERIENCE</h2>
                        <div className="mt-3 space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="grid grid-cols-12 gap-4">
                                    <div className="col-span-3 text-right">
                                        <p className="font-semibold text-sm">{exp.company}</p>
                                        <p className="text-xs text-gray-500">{exp.location}</p>
                                        <p className="text-xs text-gray-500 mt-1">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <div className="col-span-9 border-l-2 border-gray-200 pl-4">
                                        <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                        <div className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>PROJECTS</h2>
                        <div className="mt-3 space-y-4">
                            {projects.map(item => (
                                <div key={item.id} className="grid grid-cols-12 gap-4">
                                    <div className="col-span-3 text-right">
                                        <p className="font-semibold text-sm">{item.technologies}</p>
                                        <p className="text-xs text-gray-500 mt-1">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <div className="col-span-9 border-l-2 border-gray-200 pl-4">
                                        <h3 className="font-bold text-sm text-gray-800">{item.name}</h3>
                                        <div className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {education.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>EDUCATION</h2>
                        <div className="mt-3 space-y-2">
                            {education.map(edu => (
                                <div key={edu.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4">
                                    <div>
                                        <h3 className="font-bold text-sm">{edu.degree}</h3>
                                        <p className="text-sm text-gray-600">{edu.school}, {edu.location}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>TRAINING</h2>
                        <div className="mt-3 space-y-2">
                            {trainings.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.course}</h3>
                                        <p className="text-sm text-gray-600">{item.institution}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('publications') && publications && publications.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>PUBLICATIONS</h2>
                        <div className="mt-3 space-y-2">
                            {publications.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.title}</h3>
                                        <p className="text-sm text-gray-600">{item.publisher}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>VOLUNTEER EXPERIENCE</h2>
                        <div className="mt-3 space-y-2">
                            {volunteer.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.role}</h3>
                                        <p className="text-sm text-gray-600">{item.organization}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('custom') && custom && custom.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>ADDITIONAL</h2>
                        <div className="mt-3 space-y-2">
                            {custom.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.title}</h3>
                                        <p className="text-sm text-gray-600">{item.subtitle}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {skills.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>SKILLS</h2>
                        <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside columns-2 text-sm">
                                {skills.map((skill, index) => (
                                    <li key={index}>{skill}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}
                
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>CERTIFICATIONS</h2>
                         <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside columns-2 text-sm">
                                {certifications.map((cert) => (
                                    <li key={cert.id}>{cert.name}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {visibleSections.includes('languages') && languages?.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>LANGUAGES</h2>
                         <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside columns-2 text-sm">
                                {languages.map((lang) => (
                                    <li key={lang.id}>{lang.language} ({lang.proficiency})</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}
                 {visibleSections.includes('awards') && awards && awards.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded" style={{ backgroundColor: themeColor }}>AWARDS</h2>
                         <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside text-sm">
                                {awards.map((award) => (
                                    <li key={award.id}>{award.title} - {award.issuer}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

            </main>
        </div>
    );
};

export default ProfessionalV2Template;
