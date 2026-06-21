
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const ImpactTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const accentColor = settings?.themeColor || '#000000';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-impact"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-gray-900 p-10 ${fontSize} leading-relaxed`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold uppercase mb-1 text-black">{contact.firstName} {contact.lastName}</h1>
                <p className="text-lg font-bold mb-2" style={{ color: accentColor }}>{contact.jobTitle}</p>
                <div className="text-sm flex flex-wrap justify-center gap-3 text-gray-600">
                    {fullPhone && <span>{fullPhone}</span>}
                    {fullPhone && contact.email && <span>|</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {contact.email && fullAddress && <span>|</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                    {fullAddress && contact.linkedin && <span>|</span>}
                    {contact.linkedin && <span>{contact.linkedin}</span>}
                </div>
            </header>

            {summary.professionalSummary && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Professional Summary</h2>
                    <div className="text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                </section>
            )}

            {skills.length > 0 && (
                <section className="mb-6">
                     <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Core Competencies</h2>
                     <div className="grid grid-cols-3 gap-2">
                        {skills.map((skill, i) => (
                            <div key={i} className="flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: accentColor }}></span>
                                <span>{skill}</span>
                            </div>
                        ))}
                     </div>
                </section>
            )}

            {experience.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Professional Experience</h2>
                    <div className="space-y-5">
                        {experience.map(exp => (
                            <div key={exp.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{exp.company}, <span className="font-normal italic">{exp.location}</span></h3>
                                    <span>{exp.startDate} – {exp.endDate}</span>
                                </div>
                                <p className="font-bold underline mb-1" style={{ textDecorationColor: accentColor }}>{exp.jobTitle}</p>
                                <div dangerouslySetInnerHTML={{ __html: exp.description }} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {visibleSections.includes('projects') && projects.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Projects</h2>
                    <div className="space-y-4">
                        {projects.map(item => (
                            <div key={item.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{item.name}</h3>
                                    <span>{item.startDate} – {item.endDate}</span>
                                </div>
                                {item.technologies && <p className="italic text-gray-700 mb-1">Stack: {item.technologies}</p>}
                                <div dangerouslySetInnerHTML={{ __html: item.description }} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {education.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Education</h2>
                    <div className="space-y-3">
                        {education.map(edu => (
                            <div key={edu.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{edu.school}, <span className="font-normal italic">{edu.location}</span></h3>
                                    <span>{edu.startDate} – {edu.endDate}</span>
                                </div>
                                <p>{edu.degree}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Professional Training</h2>
                    <div className="space-y-3">
                        {trainings.map(item => (
                            <div key={item.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{item.course}</h3>
                                    <span>{item.date}</span>
                                </div>
                                <p>{item.institution}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            
            {visibleSections.includes('publications') && publications && publications.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Publications</h2>
                    <div className="space-y-3">
                        {publications.map(item => (
                            <div key={item.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{item.title}</h3>
                                    <span>{item.date}</span>
                                </div>
                                <p className="italic">{item.publisher}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            
            {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Volunteering</h2>
                    <div className="space-y-3">
                        {volunteer.map(item => (
                            <div key={item.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{item.role}</h3>
                                    <span>{item.startDate} – {item.endDate}</span>
                                </div>
                                <p className="italic">{item.organization}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {visibleSections.includes('custom') && custom && custom.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Additional Activities</h2>
                    <div className="space-y-3">
                        {custom.map(item => (
                            <div key={item.id}>
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{item.title}</h3>
                                    <span>{item.date}</span>
                                </div>
                                <p className="italic">{item.subtitle}</p>
                                <div dangerouslySetInnerHTML={{ __html: item.description }} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

             {visibleSections.includes('certifications') && certifications.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Certifications</h2>
                    <div className="space-y-1">
                        {certifications.map(cert => (
                            <div key={cert.id} className="flex justify-between">
                                <span className="font-bold">{cert.name}</span>
                                {cert.expiryDate && <span>Expires: {cert.expiryDate}</span>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

             {visibleSections.includes('awards') && awards && awards.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b-2 mb-3" style={{ borderColor: accentColor }}>Awards & Honors</h2>
                    <div className="space-y-1">
                        {awards.map(award => (
                            <div key={award.id}>
                                <span className="font-bold">{award.title}</span>, {award.issuer} <span className="italic">({award.date})</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default ImpactTemplate;
