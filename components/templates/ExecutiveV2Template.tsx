
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Mail, MapPin, Phone } from 'lucide-react';

const ExecutiveV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const sidebarBg = settings?.themeColor || '#2d3748';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-2 break-after-avoid">PROFESSIONAL SUMMARY</h2>
                        <div className="text-xs leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">EXPERIENCE</h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                        <p className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-600">{exp.company} | {exp.location}</p>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3 break-after-avoid">EDUCATION</h2>
                        {education.map(edu => (
                            <div key={edu.id} className="text-xs mb-3 break-inside-avoid">
                                <p className="font-bold text-gray-100">{edu.degree}</p>
                                <p className="text-gray-400">{edu.school}</p>
                                <p className="text-gray-500">{edu.startDate} - {edu.endDate}</p>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3 break-after-avoid">SKILLS</h2>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            {skills.map((skill, index) => (
                                <li className="break-inside-avoid" key={index}>{skill}</li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">PROJECTS</h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.name}</h3>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-600">{item.technologies}</p>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3 break-after-avoid">CERTIFICATIONS</h2>
                        <div className="text-xs space-y-1">
                            {certifications.map((cert, index) => (
                                <p className="break-inside-avoid" key={index}>{cert.name}</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages?.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3 break-after-avoid">LANGUAGES</h2>
                        <div className="text-xs space-y-1">
                            {languages.map((lang, index) => (
                                <p className="break-inside-avoid" key={index}>{lang.language}: {lang.proficiency}</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3 break-after-avoid">AWARDS</h2>
                        <div className="text-xs space-y-1">
                            {awards.map((award, index) => (
                                <div key={index} className="mb-2 break-inside-avoid">
                                    <p className="font-bold text-gray-100">{award.title}</p>
                                    <p className="text-gray-500">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">TRAINING</h2>
                        <div className="space-y-2">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.course}</h3>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">PUBLICATIONS</h2>
                        <div className="space-y-2">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">VOLUNTEERING</h2>
                        <div className="space-y-2">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.role}</h3>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">ADDITIONAL</h2>
                        <div className="space-y-2">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.subtitle}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-executive-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <aside className="w-[35%] text-gray-300 p-6 flex flex-col space-y-6" style={{ backgroundColor: sidebarBg }}>
                {contact.photo && (
                    <div className="w-36 h-36 mx-auto rounded-full overflow-hidden">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                {renderRun(['education', 'skills', 'certifications', 'languages', 'awards'])}
            </aside>
            <main className="w-[65%] p-8">
                <header className="mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-800">{contact.firstName || 'YOUR'} {contact.lastName || 'NAME'}</h1>
                    <p className="text-lg text-gray-600 font-medium">{contact.jobTitle || 'Your Job Title'}</p>
                    <div className="flex items-center gap-x-4 gap-y-1 text-xs mt-2 text-gray-500">
                        {contact.phone && <div className="flex items-center gap-1.5"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{fullPhone}</span></div>}
                        {contact.email && <div className="flex items-center gap-1.5"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{contact.email}</span></div>}
                        {fullAddress && <div className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{fullAddress}</span></div>}
                    </div>
                </header>
                 {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}
            </main>
        </div>
    );
};

export default React.memo(ExecutiveV2Template);
