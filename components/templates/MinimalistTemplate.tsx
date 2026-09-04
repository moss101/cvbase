
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const MinimalistTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
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
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Professional Summary</h2>
                        <div className="text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-6">
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Work Experience</h2>
                        <div className="space-y-5">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold">
                                        <h3 className="text-[1.1em]">{exp.jobTitle}</h3>
                                        <span>{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline italic mb-1">
                                        <span style={{ color: accentColor }}>{exp.company}</span>
                                        <span>{exp.location}</span>
                                    </div>
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mb-6">
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Education</h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline font-bold">
                                        <h3 className="text-[1.1em]">{edu.school}</h3>
                                        <span>{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span>{edu.degree}</span>
                                        <span className="italic">{edu.location}</span>
                                    </div>
                                    {edu.description && <p className="mt-1">{edu.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="mb-6">
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Skills</h2>
                        <p>{skills.join(', ')}</p>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-6">
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Projects</h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline font-bold">
                                        <h3 className="text-[1.1em]">{item.name}</h3>
                                        <span>{item.startDate} – {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="italic mb-1">Technologies: {item.technologies}</p>}
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="mb-6">
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Certifications</h2>
                        <ul className="list-disc list-inside">
                            {certifications.map(cert => (
                                <li className="break-inside-avoid" key={cert.id}>
                                    <span className="font-semibold">{cert.name}</span>
                                    {cert.expiryDate && <span className="italic"> (Expires: {cert.expiryDate})</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages" className="mb-6">
                        <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Languages</h2>
                        <p>
                            {languages.map(l => `${l.language} (${l.proficiency})`).join(', ')}
                        </p>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards" className="mb-6">
                         <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Awards</h2>
                         <ul className="list-disc list-inside">
                            {awards.map(award => (
                                <li className="break-inside-avoid" key={award.id}>
                                    <span className="font-semibold">{award.title}</span> — {award.issuer} ({award.date})
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                         <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Training & Courses</h2>
                         <div className="space-y-2">
                            {trainings.map(training => (
                                <div className="break-inside-avoid" key={training.id}>
                                    <div className="flex justify-between font-bold">
                                        <span>{training.course}</span>
                                        <span>{training.date}</span>
                                    </div>
                                    <p className="italic">{training.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                         <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Publications</h2>
                         <div className="space-y-3">
                            {publications.map(pub => (
                                <div className="break-inside-avoid" key={pub.id}>
                                    <div className="flex justify-between font-bold">
                                        <span>{pub.title}</span>
                                        <span>{pub.date}</span>
                                    </div>
                                    <p className="italic">{pub.publisher}</p>
                                    {pub.description && <p className="mt-1">{pub.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                         <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Volunteering</h2>
                         <div className="space-y-3">
                            {volunteer.map(vol => (
                                <div className="break-inside-avoid" key={vol.id}>
                                    <div className="flex justify-between font-bold">
                                        <span>{vol.role}</span>
                                        <span>{vol.startDate} - {vol.endDate}</span>
                                    </div>
                                    <p className="italic">{vol.organization}, {vol.location}</p>
                                    {vol.description && <p className="mt-1">{vol.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                         <h2 className="text-sm font-bold uppercase border-b mb-3 pb-1 break-after-avoid" style={{ borderColor: '#e5e7eb', color: accentColor }}>Additional Activities</h2>
                         <div className="space-y-3">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold">
                                        <span>{item.title}</span>
                                        <span>{item.date}</span>
                                    </div>
                                    <p className="italic">{item.subtitle}</p>
                                    {item.description && <p className="mt-1">{item.description}</p>}
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
        <div id={isCardPreview ? undefined : "resume-preview-minimalist"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-black p-12 ${fontSize} leading-normal`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="border-b-2 pb-4 mb-6" style={{ borderColor: accentColor }}>
                <h1 className="text-3xl font-bold uppercase tracking-wide mb-2" style={{ color: accentColor }}>{contact.firstName} {contact.lastName}</h1>
                <div className="flex flex-wrap gap-x-4 text-sm text-gray-800">
                    {fullPhone && <span>{fullPhone}</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                    {contact.linkedin && <span>{contact.linkedin}</span>}
                    {contact.website && <span>{contact.website}</span>}
                </div>
            </header>

            {renderRun(['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'awards', 'trainings', 'publications', 'volunteer', 'custom', 'languages'])}
        </div>
    );
};

export default React.memo(MinimalistTemplate);
