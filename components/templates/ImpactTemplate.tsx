
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const ImpactTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const accentColor = settings?.themeColor || '#000000';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Professional Summary</h2>
                        <div className="text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Professional Experience</h2>
                        <div className="space-y-5">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{exp.company}, <span className="font-normal italic">{exp.location}</span></h3>
                                        <span>{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="font-bold underline mb-1" style={{ textDecorationColor: accentColor }}>{exp.jobTitle}</p>
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Education</h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{edu.school}, <span className="font-normal italic">{edu.location}</span></h3>
                                        <span>{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <p>{edu.degree}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="mb-6">
                         <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Core Competencies</h2>
                         <div className="grid grid-cols-3 gap-2">
                            {skills.map((skill, i) => (
                                <div key={i} className="flex items-center break-inside-avoid">
                                    <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: accentColor }}></span>
                                    <span>{skill}</span>
                                </div>
                            ))}
                         </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Projects</h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{item.name}</h3>
                                        <span>{item.startDate} – {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="italic text-gray-700 mb-1">Stack: {item.technologies}</p>}
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Certifications</h2>
                        <div className="space-y-1">
                            {certifications.map(cert => (
                                <div key={cert.id} className="flex justify-between break-inside-avoid">
                                    <span className="font-bold">{cert.name}</span>
                                    {cert.expiryDate && <span>Expires: {cert.expiryDate}</span>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Awards & Honors</h2>
                        <div className="space-y-1">
                            {awards.map(award => (
                                <div className="break-inside-avoid" key={award.id}>
                                    <span className="font-bold">{award.title}</span>, {award.issuer} <span className="italic">({award.date})</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Professional Training</h2>
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{item.course}</h3>
                                        <span>{item.date}</span>
                                    </div>
                                    <p>{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Publications</h2>
                        <div className="space-y-3">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{item.title}</h3>
                                        <span>{item.date}</span>
                                    </div>
                                    <p className="italic">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Volunteering</h2>
                        <div className="space-y-3">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{item.role}</h3>
                                        <span>{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="italic">{item.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                        <h2 className="text-base font-bold uppercase border-b-2 mb-3 break-after-avoid" style={{ borderColor: accentColor }}>Additional Activities</h2>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold text-[1.1em]">
                                        <h3>{item.title}</h3>
                                        <span>{item.date}</span>
                                    </div>
                                    <p className="italic">{item.subtitle}</p>
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

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

            {renderRun(['summary', 'skills', 'experience', 'projects', 'education', 'trainings', 'publications', 'volunteer', 'custom', 'certifications', 'awards'])}
        </div>
    );
};

export default React.memo(ImpactTemplate);
