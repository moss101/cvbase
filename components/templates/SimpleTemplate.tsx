
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const SimpleTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const themeColor = settings?.themeColor || '#000000';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-simple"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#222] p-14 ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || "'Verdana', sans-serif" }}>
            
            {/* Header */}
            <header className="text-center mb-10">
                <h1 className="text-3xl font-bold mb-2 tracking-tight uppercase" style={{ color: themeColor }}>{contact.firstName} {contact.lastName}</h1>
                <p className="mb-3 text-lg text-gray-600 font-medium">{contact.jobTitle}</p>
                <div className="text-sm text-gray-500 flex justify-center gap-4 flex-wrap">
                    {contact.email && <span>{contact.email}</span>}
                    {fullPhone && <span>| {fullPhone}</span>}
                    {city && <span>| {city}</span>}
                    {contact.linkedin && <span>| {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                </div>
            </header>

            <div className="space-y-8">

                {summary.professionalSummary && (
                    <section>
                        <h2 className="font-bold text-base uppercase tracking-widest mb-3 text-center" style={{ color: themeColor }}>Profile</h2>
                        <div className="leading-relaxed text-justify text-gray-800 px-4" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {skills.length > 0 && (
                    <section className="text-center px-4">
                        <h2 className="font-bold text-base uppercase tracking-widest mb-3" style={{ color: themeColor }}>Skills</h2>
                        <p className="leading-relaxed text-gray-800 font-medium">{skills.join(' • ')}</p>
                    </section>
                )}

                <div className="w-24 h-0.5 bg-gray-200 mx-auto my-8"></div>

                {experience.length > 0 && (
                    <section>
                        <h2 className="font-bold text-lg mb-4" style={{ color: themeColor }}>Experience</h2>
                        <div className="space-y-6 border-l-2 border-gray-100 pl-6 ml-2">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{exp.jobTitle}</h3>
                                        <span className="text-gray-500 font-medium text-[0.9em]">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="italic mb-2 text-gray-600 font-medium">{exp.company}, {exp.location}</p>
                                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="font-bold text-lg mb-4" style={{ color: themeColor }}>Projects</h2>
                        <div className="space-y-5 border-l-2 border-gray-100 pl-6 ml-2">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{item.name}</h3>
                                        <span className="text-gray-500 font-medium text-[0.9em]">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="text-gray-500 text-[0.9em] mb-2">Stack: {item.technologies}</p>}
                                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {education.length > 0 && (
                    <section>
                        <h2 className="font-bold text-lg mb-4" style={{ color: themeColor }}>Education</h2>
                        <div className="space-y-4 pl-2">
                            {education.map(edu => (
                                <div key={edu.id} className="flex justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{edu.school}</h3>
                                        <p className="text-gray-700">{edu.degree}</p>
                                    </div>
                                    <div className="text-right text-gray-500">
                                        <p>{edu.startDate} - {edu.endDate}</p>
                                        <p className="text-[0.9em]">{edu.location}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Two Column Layout for Extras */}
                <div className="grid grid-cols-2 gap-10 pt-4">
                    <div className="space-y-6">
                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Certifications</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {certifications.map(cert => (
                                        <li key={cert.id} className="flex flex-col">
                                            <span className="font-semibold">{cert.name}</span>
                                            <span className="text-gray-500 text-[0.9em]">{cert.expiryDate}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                             <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Trainings</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {trainings.map(item => (
                                        <li key={item.id} className="flex flex-col">
                                            <span className="font-semibold">{item.course}</span>
                                            <span className="text-gray-500 text-[0.9em]">{item.institution}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                         {visibleSections.includes('publications') && publications.length > 0 && (
                             <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Publications</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {publications.map(item => (
                                        <li key={item.id} className="flex flex-col">
                                            <span className="font-semibold">{item.title}</span>
                                            <span className="text-gray-500 text-[0.9em] italic">{item.publisher}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                    
                    <div className="space-y-6">
                        {visibleSections.includes('languages') && languages.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Languages</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {languages.map(lang => (
                                        <li key={lang.id} className="flex justify-between">
                                            <span className="font-semibold">{lang.language}</span>
                                            <span className="text-gray-500">{lang.proficiency}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {visibleSections.includes('awards') && awards.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Awards</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {awards.map(award => (
                                        <li key={award.id} className="flex flex-col">
                                            <span className="font-semibold">{award.title}</span>
                                            <span className="text-gray-500 text-[0.9em]">{award.issuer}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Volunteering</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {volunteer.map(vol => (
                                        <li key={vol.id} className="flex flex-col">
                                            <span className="font-semibold">{vol.role}</span>
                                            <span className="text-gray-500 text-[0.9em]">{vol.organization}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {visibleSections.includes('custom') && custom.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-3" style={{ color: themeColor }}>Additional</h2>
                                <ul className="space-y-2 text-gray-700">
                                    {custom.map(item => (
                                        <li key={item.id} className="flex flex-col">
                                            <span className="font-semibold">{item.title}</span>
                                            <span className="text-gray-500 text-[0.9em]">{item.subtitle}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SimpleTemplate;
