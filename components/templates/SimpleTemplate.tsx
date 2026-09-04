
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const SimpleTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
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
                        <h2 className="font-bold text-base uppercase tracking-widest mb-3 text-center break-after-avoid" style={{ color: themeColor }}>Profile</h2>
                        <div className="leading-relaxed text-justify text-gray-800 px-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="font-bold text-lg mb-4 break-after-avoid" style={{ color: themeColor }}>Experience</h2>
                        <div className="space-y-6 border-l-2 border-gray-100 pl-6 ml-2">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{exp.jobTitle}</h3>
                                        <span className="text-gray-500 font-medium text-[0.9em]">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="italic mb-2 text-gray-600 font-medium">{exp.company}, {exp.location}</p>
                                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-bold text-lg mb-4 break-after-avoid" style={{ color: themeColor }}>Education</h2>
                        <div className="space-y-4 pl-2">
                            {education.map(edu => (
                                <div key={edu.id} className="flex justify-between break-inside-avoid">
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
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="text-center px-4">
                        <h2 className="font-bold text-base uppercase tracking-widest mb-3 break-after-avoid" style={{ color: themeColor }}>Skills</h2>
                        <p className="leading-relaxed text-gray-800 font-medium">{skills.join(' • ')}</p>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="font-bold text-lg mb-4 break-after-avoid" style={{ color: themeColor }}>Projects</h2>
                        <div className="space-y-5 border-l-2 border-gray-100 pl-6 ml-2">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{item.name}</h3>
                                        <span className="text-gray-500 font-medium text-[0.9em]">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="text-gray-500 text-[0.9em] mb-2">Stack: {item.technologies}</p>}
                                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Certifications</h2>
                        <ul className="space-y-2 text-gray-700">
                            {certifications.map(cert => (
                                <li key={cert.id} className="flex flex-col break-inside-avoid">
                                    <span className="font-semibold">{cert.name}</span>
                                    <span className="text-gray-500 text-[0.9em]">{cert.expiryDate}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Languages</h2>
                        <ul className="space-y-2 text-gray-700">
                            {languages.map(lang => (
                                <li key={lang.id} className="flex justify-between break-inside-avoid">
                                    <span className="font-semibold">{lang.language}</span>
                                    <span className="text-gray-500">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Awards</h2>
                        <ul className="space-y-2 text-gray-700">
                            {awards.map(award => (
                                <li key={award.id} className="flex flex-col break-inside-avoid">
                                    <span className="font-semibold">{award.title}</span>
                                    <span className="text-gray-500 text-[0.9em]">{award.issuer}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Trainings</h2>
                        <ul className="space-y-2 text-gray-700">
                            {trainings.map(item => (
                                <li key={item.id} className="flex flex-col break-inside-avoid">
                                    <span className="font-semibold">{item.course}</span>
                                    <span className="text-gray-500 text-[0.9em]">{item.institution}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Publications</h2>
                        <ul className="space-y-2 text-gray-700">
                            {publications.map(item => (
                                <li key={item.id} className="flex flex-col break-inside-avoid">
                                    <span className="font-semibold">{item.title}</span>
                                    <span className="text-gray-500 text-[0.9em] italic">{item.publisher}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Volunteering</h2>
                        <ul className="space-y-2 text-gray-700">
                            {volunteer.map(vol => (
                                <li key={vol.id} className="flex flex-col break-inside-avoid">
                                    <span className="font-semibold">{vol.role}</span>
                                    <span className="text-gray-500 text-[0.9em]">{vol.organization}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="font-bold text-base mb-3 break-after-avoid" style={{ color: themeColor }}>Additional</h2>
                        <ul className="space-y-2 text-gray-700">
                            {custom.map(item => (
                                <li key={item.id} className="flex flex-col break-inside-avoid">
                                    <span className="font-semibold">{item.title}</span>
                                    <span className="text-gray-500 text-[0.9em]">{item.subtitle}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

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

                {renderRun(['summary', 'skills'])}

                <div className="w-24 h-0.5 bg-gray-200 mx-auto my-8"></div>

                {renderRun(['experience', 'projects', 'education'])}

                {/* Two Column Layout for Extras */}
                <div className="grid grid-cols-2 gap-10 pt-4">
                    <div className="space-y-6">
                        {renderRun(['certifications', 'trainings', 'publications'])}
                    </div>
                    
                    <div className="space-y-6">
                        {renderRun(['languages', 'awards', 'volunteer', 'custom'])}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default React.memo(SimpleTemplate);
