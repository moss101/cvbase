
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const HarvardTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#8B0000'; // Dark Red/Burgundy
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Executive Summary</h2>
                        <div className="text-xs leading-relaxed text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Professional Experience</h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{exp.startDate} - {exp.endDate}</div>
                                        {exp.endDate === 'Present' && <span className="text-[9px] font-bold uppercase tracking-wide block mt-1" style={{ color: accentColor }}>Current</span>}
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{exp.jobTitle}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-2">{exp.company} | {exp.location}</p>
                                        <div className="text-xs leading-relaxed text-gray-700 space-y-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-xs font-bold text-gray-500 uppercase text-right pt-0.5">
                                        {edu.startDate} - {edu.endDate}
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{edu.degree}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-1">{edu.school}, {edu.location}</p>
                                        <p className="text-xs text-gray-600">{edu.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Skills</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                            {skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1 bg-gray-100 rounded border border-gray-200 text-gray-700 font-medium">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Projects</h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div key={item.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{item.startDate} - {item.endDate}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{item.name}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-2">{item.technologies}</p>
                                        <div className="text-xs leading-relaxed text-gray-700 space-y-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Certifications</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                            {certifications.map((cert, i) => (
                                <span key={i} className="font-medium text-gray-800">• {cert.name}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Languages</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                            {languages.map((lang, i) => (
                                <span key={i} className="font-medium text-gray-800">{lang.language} <span className="text-gray-500">({lang.proficiency})</span></span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Awards</h2>
                        <div className="space-y-2">
                            {awards.map(award => (
                                <div key={award.id} className="text-xs break-inside-avoid">
                                    <span className="font-bold">{award.title}</span> - {award.issuer} ({award.date})
                                    {award.description && <p className="text-gray-600 mt-0.5">{award.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Training</h2>
                        <div className="space-y-4">
                            {trainings.map(item => (
                                <div key={item.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{item.date}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{item.course}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-1">{item.institution}</p>
                                        {item.description && <p className="text-xs text-gray-700">{item.description}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Publications</h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div key={item.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{item.date}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-1">{item.publisher}</p>
                                        {item.description && <p className="text-xs text-gray-700">{item.description}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Volunteering</h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{item.startDate} - {item.endDate}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{item.role}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-1">{item.organization}</p>
                                        {item.description && <div className="text-xs leading-relaxed text-gray-700 space-y-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-1 break-after-avoid" style={{ color: accentColor, borderColor: '#eee' }}>Additional Activities</h2>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div key={item.id} className="grid grid-cols-4 gap-4 break-inside-avoid">
                                    <div className="col-span-1 text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{item.date}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                                        <p className="text-xs font-bold text-gray-600 italic mb-1">{item.subtitle}</p>
                                        {item.description && <div className="text-xs leading-relaxed text-gray-700 space-y-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
                                    </div>
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
        <div id={isCardPreview ? undefined : "resume-preview-harvard"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-gray-800`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="border-b-2 pb-6 mb-8" style={{ borderColor: accentColor }}>
                <h1 className="text-4xl font-bold mb-2" style={{ color: accentColor }}>{contact.firstName} {contact.lastName}</h1>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500">{contact.jobTitle}</p>
                <div className="mt-4 text-xs flex flex-wrap gap-6 text-gray-600">
                    {fullPhone && <div className="flex items-center gap-1"><span style={{ color: accentColor }}>📞</span>{fullPhone}</div>}
                    {contact.email && <div className="flex items-center gap-1"><span style={{ color: accentColor }}>✉️</span>{contact.email}</div>}
                    {fullAddress && <div className="flex items-center gap-1"><span style={{ color: accentColor }}>📍</span>{fullAddress}</div>}
                    {contact.website && <div className="flex items-center gap-1"><span style={{ color: accentColor }}>🌐</span>{contact.website}</div>}
                </div>
            </header>

            <main className="space-y-8">
                 {renderRun(['summary', 'education', 'experience', 'projects', 'publications', 'trainings', 'volunteer', 'custom', 'awards', 'skills', 'certifications', 'languages'])}

            </main>
        </div>
    );
};

export default React.memo(HarvardTemplate);
