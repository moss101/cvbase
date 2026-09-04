
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { House, Mail, Phone } from 'lucide-react';

const CorporateV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#dc2626';
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-6">
                        <div className="text-xs leading-relaxed border-l-4 pl-3 text-justify" style={{borderColor: accentColor}} dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">EXPERIENCE</h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{exp.jobTitle}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                        <p className="text-xs font-semibold text-gray-600">{exp.company} | {exp.location}</p>
                                        <p className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">EDUCATION</h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{edu.degree}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{edu.school}, {edu.location}</p>
                                         <p className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid">SKILLS</h2>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            {skills.map((skill, index) => <li className="break-inside-avoid" key={index}>{skill}</li>)}
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
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.name}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                        <p className="text-xs font-semibold text-gray-600">{item.technologies}</p>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid">CERTIFICATIONS</h2>
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
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid">LANGUAGES</h2>
                        <div className="text-xs space-y-1">
                            {languages.map((lang, index) => (
                                <p className="break-inside-avoid" key={index}>{lang.language} ({lang.proficiency})</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid">AWARDS</h2>
                        <div className="text-xs space-y-1">
                            {awards.map((award, index) => (
                                <div key={index} className="mb-2 break-inside-avoid">
                                    <p className="font-bold">{award.title}</p>
                                    <p className="text-gray-500">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">TRAINING</h2>
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.course}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.institution}</p>
                                         <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">PUBLICATIONS</h2>
                        <div className="space-y-3">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.title}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.publisher}</p>
                                         <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">VOLUNTEERING</h2>
                        <div className="space-y-3">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.role}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.organization}</p>
                                         <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3 break-after-avoid">ADDITIONAL</h2>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.title}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.subtitle}</p>
                                         <p className="text-xs text-gray-500">{item.date}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-corporate-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <aside className="w-[30%] bg-gray-100 p-6 flex flex-col space-y-6">
                <section>
                    <div className="space-y-3">
                        {contact.phone && <div className="flex items-center gap-3"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px] text-white p-1 rounded-full box-content" style={{backgroundColor: accentColor}} /><span className="text-xs">{fullPhone}</span></div>}
                        {contact.email && <div className="flex items-center gap-3"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px] text-white p-1 rounded-full box-content" style={{backgroundColor: accentColor}} /><span className="text-xs">{contact.email}</span></div>}
                        {fullAddress && <div className="flex items-center gap-3"><House aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px] text-white p-1 rounded-full box-content" style={{backgroundColor: accentColor}} /><span className="text-xs">{fullAddress}</span></div>}
                    </div>
                </section>
                {renderRun(['skills', 'certifications', 'languages', 'awards'])}
            </aside>
            <main className="w-[70%] p-8">
                <header className="mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-800">{contact.firstName || 'YOUR'} {contact.lastName || 'NAME'}</h1>
                    <p className="text-lg text-gray-600 font-medium">{contact.jobTitle || 'Your Job Title'}</p>
                </header>
                 {renderRun(['summary', 'experience', 'projects', 'education', 'trainings', 'publications', 'volunteer', 'custom'])}
            </main>
        </div>
    );
};

export default React.memo(CorporateV2Template);
