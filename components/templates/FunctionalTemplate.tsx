
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
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

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4 break-after-avoid" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Professional Summary</h2>
                        <div className="px-3 text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4 break-after-avoid" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Work History</h2>
                        <div className="px-3 space-y-6">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{exp.jobTitle}</h3>
                                        <span className="font-mono text-[0.9em] bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-gray-700 font-semibold italic mb-2">{exp.company}, {exp.location}</p>
                                    <div className="leading-relaxed pl-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4 break-after-avoid" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Education</h2>
                        <div className="px-3 space-y-3">
                            {education.map(edu => (
                                <div key={edu.id} className="flex justify-between border-b border-gray-100 pb-2 last:border-0 break-inside-avoid">
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
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4 break-after-avoid" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Skills & Competencies</h2>
                        <div className="grid grid-cols-3 gap-y-2 gap-x-4 px-3">
                            {skills.map((skill, i) => (
                                <div key={i} className="flex items-center gap-2 break-inside-avoid">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: borderColor }}></div>
                                    <span className="font-medium">{skill}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-sm font-bold uppercase p-2 pl-3 mb-3 border-l-4 break-after-avoid" style={{ backgroundColor: headerBg, borderColor: borderColor }}>Key Projects</h2>
                        <div className="px-3 space-y-5">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-900">{item.name}</h3>
                                        <span className="font-mono text-[0.9em] text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="text-gray-600 text-[0.95em] mb-2"><strong>Tech:</strong> {item.technologies}</p>}
                                    <div className="leading-relaxed pl-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Certifications</h2>
                        <div className="space-y-2">
                            {certifications.map(cert => (
                                <div className="break-inside-avoid" key={cert.id}>
                                    <p className="font-bold text-gray-800">{cert.name}</p>
                                    <p className="text-[0.9em] text-gray-600">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Languages</h2>
                        <div className="space-y-2">
                            {languages.map(lang => (
                                <div key={lang.id} className="flex justify-between break-inside-avoid">
                                    <span className="font-medium">{lang.language}</span>
                                    <span className="text-gray-600">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Awards</h2>
                        <div className="space-y-2">
                            {awards.map(award => (
                                <div className="break-inside-avoid" key={award.id}>
                                    <p className="font-bold text-gray-800">{award.title}</p>
                                    <p className="text-[0.9em] text-gray-600">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Trainings</h2>
                        <div className="space-y-2">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <p className="font-bold text-gray-800">{item.course}</p>
                                    <p className="text-[0.9em] text-gray-600">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Publications</h2>
                        <div className="space-y-2">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <p className="font-bold text-gray-800">{item.title}</p>
                                    <p className="text-[0.9em] text-gray-600 italic">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Volunteering</h2>
                        <div className="space-y-2">
                            {volunteer.map(vol => (
                                <div className="break-inside-avoid" key={vol.id}>
                                    <p className="font-bold text-gray-800">{vol.role}</p>
                                    <p className="text-[0.9em] text-gray-600">{vol.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-sm font-bold uppercase border-b-2 mb-3 pb-1 break-after-avoid" style={{ borderColor: borderColor }}>Additional</h2>
                        <div className="space-y-2">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <p className="font-bold text-gray-800">{item.title}</p>
                                    <p className="text-[0.9em] text-gray-600">{item.subtitle}</p>
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
                {renderRun(['skills', 'summary', 'experience', 'projects', 'education'])}
                
                <div className="grid grid-cols-2 gap-8 px-3">
                    <div className="space-y-8">
                        {renderRun(['certifications', 'trainings', 'publications'])}
                    </div>

                    <div className="space-y-8">
                         {renderRun(['languages', 'awards', 'volunteer', 'custom'])}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(FunctionalTemplate);
