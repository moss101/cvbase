
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const GlobalTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const themeColor = settings?.themeColor || '#000000';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Professional Profile</h2>
                        <div className="text-justify leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Experience</h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between font-bold text-base mb-1">
                                        <h3 className="text-lg">{exp.jobTitle}</h3>
                                        <span className="font-sans text-sm text-gray-600">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="italic mb-2 font-medium" style={{ color: themeColor }}>{exp.company} | {exp.location}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
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
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Skills</h2>
                        <p className="leading-relaxed text-gray-800">{skills.join(' • ')}</p>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Key Projects</h2>
                        <div className="space-y-5">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold text-base mb-1">
                                        <h3 className="text-[1.05em]">{item.name}</h3>
                                        <span className="font-sans text-sm text-gray-600">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="italic mb-1 text-sm font-sans" style={{ color: themeColor }}>{item.technologies}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Certifications</h2>
                        <ul className="space-y-2">
                            {certifications.map(cert => (
                                <li key={cert.id} className="flex justify-between items-baseline break-inside-avoid">
                                    <span className="font-bold text-gray-800">{cert.name}</span>
                                    {cert.expiryDate && <span className="text-sm text-gray-500 font-sans whitespace-nowrap ml-2">{cert.expiryDate}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Languages</h2>
                        <ul className="space-y-2">
                            {languages.map(lang => (
                                <li key={lang.id} className="flex justify-between items-baseline break-inside-avoid">
                                    <span className="font-bold text-gray-800">{lang.language}</span>
                                    <span className="text-sm text-gray-600 italic font-serif">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Awards</h2>
                        <ul className="space-y-2">
                            {awards.map(award => (
                                <li className="break-inside-avoid" key={award.id}>
                                    <div className="font-bold text-gray-800">{award.title}</div>
                                    <div className="text-sm text-gray-600 italic">{award.issuer}</div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-3 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Training</h2>
                        <ul className="space-y-2">
                            {trainings.map(item => (
                                <li className="break-inside-avoid" key={item.id}>
                                    <div className="font-bold text-gray-800">{item.course}</div>
                                    <div className="text-sm text-gray-600 italic">{item.institution}</div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Publications</h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-gray-800 text-[1.05em]">{item.title}</h3>
                                    <p className="italic text-sm text-gray-600">{item.publisher}, {item.date}</p>
                                    {item.description && <p className="mt-1 text-gray-800">{item.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Volunteering</h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold mb-1">
                                        <h3 className="text-[1.05em]">{item.role}</h3>
                                        <span className="font-sans text-sm text-gray-600">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="italic mb-1 text-gray-700">{item.organization}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="font-bold text-sm uppercase tracking-[0.15em] mb-4 border-b pb-1 font-sans break-after-avoid" style={{ color: themeColor, borderColor: '#e5e7eb' }}>Additional Information</h2>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between font-bold mb-1">
                                        <h3 className="text-[1.05em]">{item.title}</h3>
                                        <span className="font-sans text-sm text-gray-600">{item.date}</span>
                                    </div>
                                    <p className="italic mb-1 text-gray-700">{item.subtitle}</p>
                                    <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
                
                {renderRun(['summary', 'experience', 'projects', 'education', 'skills'])}

                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-6">
                         {renderRun(['certifications', 'languages'])}
                    </div>

                    <div className="space-y-6">
                         {renderRun(['awards', 'trainings'])}
                    </div>
                </div>
                
                 {/* Full width extras */}
                 {renderRun(['publications', 'volunteer', 'custom'])}

            </div>
        </div>
    );
};

export default React.memo(GlobalTemplate);
