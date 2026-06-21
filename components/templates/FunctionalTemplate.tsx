
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const FunctionalTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();
    
    // Style constants
    const headerBg = '#f3f4f6'; // gray-100
    const borderColor = '#9ca3af'; // gray-400

    return (
        <div id={isCardPreview ? undefined : "resume-preview-functional"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-gray-800 p-12 ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="border-b-4 pb-6 mb-8" style={{ borderColor: borderColor }}>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2 uppercase">{contact.firstName} {contact.lastName}</h1>
                <p className="text-xl font-light text-gray-600 mb-4">{contact.jobTitle}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-700">
                    {contact.email && <span className="flex items-center gap-1">✉ {contact.email}</span>}
                    {fullPhone && <span className="flex items-center gap-1">📞 {fullPhone}</span>}
                    {fullAddress && <span className="flex items-center gap-1">📍 {city}</span>}
                    {contact.linkedin && <span className="flex items-center gap-1">in {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                </div>
            </header>

            <div className="space-y-8">
                {/* Skills First Approach for Functional */}
                {skills.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Skills & Competencies</h2>
                        <div className="grid grid-cols-3 gap-y-2 gap-x-4 px-3">
                            {skills.map((skill, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: borderColor }}></div>
                                    <span className="font-medium">{skill}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Professional Summary</h2>
                        <div className="px-3 text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {experience.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Work History</h2>
                        <div className="px-3 space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{exp.jobTitle}</h3>
                                        <span className="font-mono text-[0.9em] bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-gray-700 font-semibold italic mb-2">{exp.company}, {exp.location}</p>
                                    <div className="leading-relaxed pl-1 text-gray-700" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Key Projects</h2>
                        <div className="px-3 space-y-5">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{item.name}</h3>
                                        <span className="font-mono text-[0.9em] text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="text-gray-600 text-[0.95em] mb-2"><strong>Tech:</strong> {item.technologies}</p>}
                                    <div className="leading-relaxed pl-1 text-gray-700" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {education.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Education</h2>
                        <div className="px-3 space-y-3">
                            {education.map(edu => (
                                <div key={edu.id} className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{edu.school}</h3>
                                        <p className="text-gray-700">{edu.degree}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-600 font-medium">{edu.startDate} - {edu.endDate}</p>
                                        <p className="text-gray-500 text-[0.9em]">{edu.location}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                <div className="grid grid-cols-2 gap-8 px-3">
                    <div className="space-y-8">
                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Certifications</h2>
                                <div className="space-y-2">
                                    {certifications.map(cert => (
                                        <div key={cert.id}>
                                            <p className="font-bold text-gray-800">{cert.name}</p>
                                            <p className="text-[0.9em] text-gray-600">{cert.expiryDate}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                         {visibleSections.includes('trainings') && trainings.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Trainings</h2>
                                <div className="space-y-2">
                                    {trainings.map(item => (
                                        <div key={item.id}>
                                            <p className="font-bold text-gray-800">{item.course}</p>
                                            <p className="text-[0.9em] text-gray-600">{item.institution}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {visibleSections.includes('publications') && publications.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Publications</h2>
                                <div className="space-y-2">
                                    {publications.map(item => (
                                        <div key={item.id}>
                                            <p className="font-bold text-gray-800">{item.title}</p>
                                            <p className="text-[0.9em] text-gray-600 italic">{item.publisher}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-8">
                         {visibleSections.includes('languages') && languages.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Languages</h2>
                                <div className="space-y-2">
                                    {languages.map(lang => (
                                        <div key={lang.id} className="flex justify-between">
                                            <span className="font-medium">{lang.language}</span>
                                            <span className="text-gray-600">{lang.proficiency}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                         {visibleSections.includes('awards') && awards.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Awards</h2>
                                <div className="space-y-2">
                                    {awards.map(award => (
                                        <div key={award.id}>
                                            <p className="font-bold text-gray-800">{award.title}</p>
                                            <p className="text-[0.9em] text-gray-600">{award.issuer}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Volunteering</h2>
                                <div className="space-y-2">
                                    {volunteer.map(vol => (
                                        <div key={vol.id}>
                                            <p className="font-bold text-gray-800">{vol.role}</p>
                                            <p className="text-[0.9em] text-gray-600">{vol.organization}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                         {visibleSections.includes('custom') && custom.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1" style={{ borderColor: borderColor }}>Additional</h2>
                                <div className="space-y-2">
                                    {custom.map(item => (
                                        <div key={item.id}>
                                            <p className="font-bold text-gray-800">{item.title}</p>
                                            <p className="text-[0.9em] text-gray-600">{item.subtitle}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FunctionalTemplate;
