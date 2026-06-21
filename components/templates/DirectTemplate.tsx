
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const DirectTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const accentColor = settings?.themeColor || '#2d3748';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-direct"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-gray-800 p-14 ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || "'Open Sans', sans-serif" }}>
            
            {/* Header */}
            <header className="mb-12 border-l-8 pl-8 py-2" style={{ borderColor: accentColor }}>
                <h1 className="text-4xl font-black text-gray-900 uppercase tracking-widest mb-2 leading-none">{contact.firstName} {contact.lastName}</h1>
                <p className="text-xl text-gray-600 font-bold mb-4 tracking-wide">{contact.jobTitle}</p>
                <div className="flex flex-wrap gap-6 text-sm font-medium text-gray-500">
                    {contact.email && <span className="flex items-center gap-1">✉ {contact.email}</span>}
                    {fullPhone && <span className="flex items-center gap-1">☎ {fullPhone}</span>}
                    {city && <span className="flex items-center gap-1">⚲ {city}</span>}
                </div>
            </header>

            <main className="space-y-10">
                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Profile</h2>
                        <div className="text-gray-700 leading-relaxed text-justify border-l-2 border-gray-100 pl-4" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {skills.length > 0 && (
                     <section>
                        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Core Skills</h2>
                        <div className="flex flex-wrap gap-2 border-l-2 border-gray-100 pl-4">
                            {skills.map((skill, i) => (
                                <span key={i} className="border border-gray-300 rounded px-3 py-1 text-sm font-semibold text-gray-600 bg-gray-50">{skill}</span>
                            ))}
                        </div>
                    </section>
                )}

                {experience.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-5">Professional Experience</h2>
                        <div className="space-y-8 border-l-2 border-gray-200 ml-1 pl-8">
                            {experience.map(exp => (
                                <div key={exp.id} className="relative">
                                    {/* Timeline Node */}
                                    <span className="absolute -left-[39px] top-1.5 w-4 h-4 bg-white border-4 rounded-full" style={{ borderColor: accentColor }}></span>
                                    
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.2em] text-gray-900">{exp.jobTitle}</h3>
                                        <span className="text-sm font-bold text-gray-500 uppercase tracking-tight">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 uppercase mb-2">{exp.company} | {exp.location}</p>
                                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-5">Key Projects</h2>
                        <div className="space-y-6 border-l-2 border-gray-200 ml-1 pl-8">
                            {projects.map(item => (
                                <div key={item.id} className="relative">
                                     <span className="absolute -left-[37px] top-2 w-3 h-3 bg-gray-300 rounded-full"></span>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{item.name}</h3>
                                        <span className="text-sm text-gray-500 font-medium">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 italic mb-2">{item.technologies}</p>
                                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {education.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-4">Education</h2>
                        <div className="grid grid-cols-1 gap-4 border-l-2 border-gray-100 pl-4 ml-2">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <h3 className="font-bold text-[1.1em] text-gray-900">{edu.school}</h3>
                                    <div className="flex justify-between text-gray-600 items-baseline">
                                        <span className="text-[1.05em] font-medium">{edu.degree}</span>
                                        <span className="text-sm">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">{edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-8">
                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Certifications</h2>
                                <ul className="space-y-2 border-l-2 border-gray-100 pl-4">
                                    {certifications.map(cert => (
                                        <li key={cert.id}>
                                            <p className="font-bold text-gray-800">{cert.name}</p>
                                            <p className="text-sm text-gray-500">{cert.expiryDate}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                         {visibleSections.includes('languages') && languages.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Languages</h2>
                                <ul className="space-y-2 border-l-2 border-gray-100 pl-4">
                                    {languages.map(lang => (
                                        <li key={lang.id} className="flex justify-between">
                                            <span className="font-bold text-gray-800">{lang.language}</span>
                                            <span className="text-gray-500 text-sm">{lang.proficiency}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <div className="space-y-8">
                         {visibleSections.includes('awards') && awards.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Awards</h2>
                                <ul className="space-y-2 border-l-2 border-gray-100 pl-4">
                                    {awards.map(award => (
                                        <li key={award.id}>
                                            <p className="font-bold text-gray-800">{award.title}</p>
                                            <p className="text-sm text-gray-500">{award.issuer}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Training</h2>
                                <ul className="space-y-2 border-l-2 border-gray-100 pl-4">
                                    {trainings.map(item => (
                                        <li key={item.id}>
                                            <p className="font-bold text-gray-800">{item.course}</p>
                                            <p className="text-sm text-gray-500">{item.institution}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                </div>

                 {/* Full width extras */}
                 {visibleSections.includes('publications') && publications.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">Publications</h2>
                        <div className="space-y-3 border-l-2 border-gray-100 pl-4 ml-2">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <p className="font-bold text-gray-900">{item.title} <span className="font-normal text-gray-500 text-sm italic">- {item.publisher}</span></p>
                                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {[
                    { id: 'volunteer', title: 'Volunteering', data: volunteer },
                    { id: 'custom', title: 'Additional', data: custom }
                ].map(section => (
                     visibleSections.includes(section.id as any) && section.data && section.data.length > 0 && (
                        <section key={section.id}>
                            <h2 className="text-sm font-bold uppercase text-gray-500 tracking-widest mb-3">{section.title}</h2>
                            <div className="space-y-3 border-l-2 border-gray-100 pl-4 ml-2">
                                {section.data.map((item: any) => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-bold text-gray-900">{item.role || item.title}</p>
                                            <span className="text-sm text-gray-500">{item.date || (item.startDate ? `${item.startDate} - ${item.endDate}` : '')}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{item.organization || item.subtitle}</p>
                                        <div className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                     )
                ))}

            </main>
        </div>
    );
};

export default DirectTemplate;
