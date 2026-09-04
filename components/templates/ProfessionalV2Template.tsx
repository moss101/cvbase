
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const ProfessionalV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const themeColor = settings?.themeColor || '#374151';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>PROFESSIONAL SUMMARY</h2>
                        <div className="mt-3 text-sm leading-relaxed border-l-2 border-gray-200 pl-4 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>EXPERIENCE</h2>
                        <div className="mt-3 space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="grid grid-cols-12 gap-4 break-inside-avoid">
                                    <div className="col-span-3 text-right">
                                        <p className="font-semibold text-sm">{exp.company}</p>
                                        <p className="text-xs text-gray-500">{exp.location}</p>
                                        <p className="text-xs text-gray-500 mt-1">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <div className="col-span-9 border-l-2 border-gray-200 pl-4">
                                        <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                        <div className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>EDUCATION</h2>
                        <div className="mt-3 space-y-2">
                            {education.map(edu => (
                                <div key={edu.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4 break-inside-avoid">
                                    <div>
                                        <h3 className="font-bold text-sm">{edu.degree}</h3>
                                        <p className="text-sm text-gray-600">{edu.school}, {edu.location}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>SKILLS</h2>
                        <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside columns-2 text-sm">
                                {skills.map((skill, index) => (
                                    <li className="break-inside-avoid" key={index}>{skill}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>PROJECTS</h2>
                        <div className="mt-3 space-y-4">
                            {projects.map(item => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 break-inside-avoid">
                                    <div className="col-span-3 text-right">
                                        <p className="font-semibold text-sm">{item.technologies}</p>
                                        <p className="text-xs text-gray-500 mt-1">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <div className="col-span-9 border-l-2 border-gray-200 pl-4">
                                        <h3 className="font-bold text-sm text-gray-800">{item.name}</h3>
                                        <div className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>CERTIFICATIONS</h2>
                         <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside columns-2 text-sm">
                                {certifications.map((cert) => (
                                    <li className="break-inside-avoid" key={cert.id}>{cert.name}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages?.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>LANGUAGES</h2>
                         <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside columns-2 text-sm">
                                {languages.map((lang) => (
                                    <li className="break-inside-avoid" key={lang.id}>{lang.language} ({lang.proficiency})</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>AWARDS</h2>
                         <div className="mt-3 border-l-2 border-gray-200 pl-4">
                             <ul className="list-disc list-inside text-sm">
                                {awards.map((award) => (
                                    <li className="break-inside-avoid" key={award.id}>{award.title} - {award.issuer}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>TRAINING</h2>
                        <div className="mt-3 space-y-2">
                            {trainings.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4 break-inside-avoid">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.course}</h3>
                                        <p className="text-sm text-gray-600">{item.institution}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>PUBLICATIONS</h2>
                        <div className="mt-3 space-y-2">
                            {publications.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4 break-inside-avoid">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.title}</h3>
                                        <p className="text-sm text-gray-600">{item.publisher}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>VOLUNTEER EXPERIENCE</h2>
                        <div className="mt-3 space-y-2">
                            {volunteer.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4 break-inside-avoid">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.role}</h3>
                                        <p className="text-sm text-gray-600">{item.organization}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white inline-block px-3 py-1 rounded break-after-avoid" style={{ backgroundColor: themeColor }}>ADDITIONAL</h2>
                        <div className="mt-3 space-y-2">
                            {custom.map(item => (
                                <div key={item.id} className="flex justify-between items-baseline border-l-2 border-gray-200 pl-4 break-inside-avoid">
                                    <div>
                                        <h3 className="font-bold text-sm">{item.title}</h3>
                                        <p className="text-sm text-gray-600">{item.subtitle}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.date}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-professional-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} p-10 text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="text-center mb-8 border-b pb-6">
                {contact.photo && (
                    <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-gray-200 shadow-md mb-4">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                <h1 className="text-4xl font-bold text-gray-800 tracking-tight">{(contact.firstName || 'YOUR').toUpperCase()} {(contact.lastName || 'NAME').toUpperCase()}</h1>
                <p className="text-lg text-gray-600 font-medium mt-1">{contact.jobTitle || 'Administrative Assistant'}</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-4 text-sm">
                    {contact.phone && <span>{fullPhone}</span>}
                    {contact.phone && contact.email && <span className="text-gray-300">|</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {(contact.phone || contact.email) && fullAddress && <span className="text-gray-300">|</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                </div>
            </header>

            <main className="space-y-6">
                {renderRun(['summary', 'experience', 'projects', 'education', 'trainings', 'publications', 'volunteer', 'custom', 'skills', 'certifications', 'languages', 'awards'])}

            </main>
        </div>
    );
};

export default React.memo(ProfessionalV2Template);
