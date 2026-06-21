
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const GlobalTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const themeColor = settings?.themeColor || '#000000';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-global"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-black p-12 ${fontSize}`} style={{ fontFamily: settings?.fontFamily || 'Georgia, serif' }}>
            <header className="border-b-2 pb-6 mb-8 flex justify-between items-start" style={{ borderColor: themeColor }}>
                <div className="w-2/3">
                    <h1 className="text-4xl font-bold uppercase tracking-wider mb-2 leading-tight" style={{ color: themeColor }}>{contact.firstName} <br/>{contact.lastName}</h1>
                    <p className="text-xl italic text-gray-700 font-serif">{contact.jobTitle}</p>
                </div>
                <div className="w-1/3 text-right text-sm space-y-1.5 text-gray-800 font-sans">
                    <p className="font-semibold">{contact.email}</p>
                    <p>{fullPhone}</p>
                    <p>{fullAddress}</p>
                    <p>{contact.linkedin && contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</p>
                    <p>{contact.website && contact.website.replace(/^https?:\/\/(www\.)?/, '')}</p>
                </div>
            </header>

            <div className="space-y-7">
                
                {summary.professionalSummary && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Professional Profile</h2>
                        <div className="text-justify leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {experience.length > 0 && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Experience</h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between font-bold text-base mb-1">
                                        <h3 className="text-lg">{exp.jobTitle}</h3>
                                        <span className="font-sans text-sm text-gray-600">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="italic mb-2 font-medium" style={{ color: themeColor }}>{exp.company} | {exp.location}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Key Projects</h2>
                        <div className="space-y-5">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between font-bold text-base mb-1">
                                        <h3 className="text-[1.05em]">{item.name}</h3>
                                        <span className="font-sans text-sm text-gray-600">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="italic mb-1 text-sm font-sans" style={{ color: themeColor }}>{item.technologies}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {education.length > 0 && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="flex justify-between font-bold">
                                        <h3 className="text-[1.05em]">{edu.school}</h3>
                                        <span className="font-sans text-sm text-gray-600">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="italic">{edu.degree}</span>
                                        <span className="text-gray-600 text-sm font-sans">{edu.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {skills.length > 0 && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Skills</h2>
                        <p className="leading-relaxed text-gray-800">{skills.join(' • ')}</p>
                    </section>
                )}

                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-6">
                         {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Certifications</h2>
                                <ul className="space-y-2">
                                    {certifications.map(cert => (
                                        <li key={cert.id} className="flex justify-between items-baseline">
                                            <span className="font-bold text-gray-800">{cert.name}</span>
                                            {cert.expiryDate && <span className="text-sm text-gray-500 font-sans whitespace-nowrap ml-2">{cert.expiryDate}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                         {visibleSections.includes('languages') && languages.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Languages</h2>
                                <ul className="space-y-2">
                                    {languages.map(lang => (
                                        <li key={lang.id} className="flex justify-between items-baseline">
                                            <span className="font-bold text-gray-800">{lang.language}</span>
                                            <span className="text-sm text-gray-600 italic font-serif">{lang.proficiency}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <div className="space-y-6">
                         {visibleSections.includes('awards') && awards.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Awards</h2>
                                <ul className="space-y-2">
                                    {awards.map(award => (
                                        <li key={award.id}>
                                            <div className="font-bold text-gray-800">{award.title}</div>
                                            <div className="text-sm text-gray-600 italic">{award.issuer}</div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Training</h2>
                                <ul className="space-y-2">
                                    {trainings.map(item => (
                                        <li key={item.id}>
                                            <div className="font-bold text-gray-800">{item.course}</div>
                                            <div className="text-sm text-gray-600 italic">{item.institution}</div>
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
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Publications</h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <h3 className="font-bold text-gray-800 text-[1.05em]">{item.title}</h3>
                                    <p className="italic text-sm text-gray-600">{item.publisher}, {item.date}</p>
                                    {item.description && <p className="mt-1 text-gray-800">{item.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Volunteering</h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between font-bold mb-1">
                                        <h3 className="text-[1.05em]">{item.role}</h3>
                                        <span className="font-sans text-sm text-gray-600">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="italic mb-1 text-gray-700">{item.organization}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {visibleSections.includes('custom') && custom.length > 0 && (
                    <section>
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Additional Information</h2>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between font-bold mb-1">
                                        <h3 className="text-[1.05em]">{item.title}</h3>
                                        <span className="font-sans text-sm text-gray-600">{item.date}</span>
                                    </div>
                                    <p className="italic mb-1 text-gray-700">{item.subtitle}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </div>
    );
};

export default GlobalTemplate;
