
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Mail, MapPin, Phone } from 'lucide-react';

const OnyxTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
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
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-3 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Profile
                        </h2>
                        <div className="text-sm leading-relaxed text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-5 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Experience
                        </h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="border-l-4 border-black pl-4 break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold uppercase">{exp.jobTitle}</h3>
                                        <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{exp.company} | {exp.location}</p>
                                    <div className="text-xs leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-black text-sm uppercase border-b-2 border-black pb-1 mb-3 break-after-avoid">Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <h3 className="font-bold text-xs">{edu.school}</h3>
                                    <p className="text-xs text-gray-600">{edu.degree}</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="font-black text-sm uppercase border-b-2 border-black pb-1 mb-3 break-after-avoid">Skills</h2>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-white border border-black px-2 py-1 text-[9px] font-bold">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-5 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Projects
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {projects.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 border border-gray-200 break-inside-avoid">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <h3>{item.name}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-black mb-2 uppercase">{item.technologies}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-black text-sm uppercase border-b-2 border-black pb-1 mb-3 break-after-avoid">Certifications</h2>
                        <div className="space-y-2">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-xs">{cert.name}</p>
                                    <p className="text-[9px] text-gray-500">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="font-black text-sm uppercase border-b-2 border-black pb-1 mb-3 break-after-avoid">Languages</h2>
                        <ul className="space-y-1">
                            {languages.map((lang, i) => (
                                <li key={i} className="flex justify-between text-xs break-inside-avoid">
                                    <span className="font-semibold">{lang.language}</span>
                                    <span className="text-gray-500">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-black text-sm uppercase border-b-2 border-black pb-1 mb-3 break-after-avoid">Awards</h2>
                        <div className="space-y-2">
                            {awards.map((award, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-xs">{award.title}</p>
                                    <p className="text-[9px] text-gray-500">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-5 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Trainings
                        </h2>
                        <div className="space-y-4">
                            {trainings.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 border border-gray-200 break-inside-avoid">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <h3>{item.course}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{item.institution}</p>
                                    <div className="text-xs leading-relaxed text-gray-600">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-5 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Publications
                        </h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 border border-gray-200 break-inside-avoid">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <h3>{item.title}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{item.publisher}</p>
                                    <div className="text-xs leading-relaxed text-gray-600">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-5 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Volunteering
                        </h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 border border-gray-200 break-inside-avoid">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <h3>{item.role}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{item.organization}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="font-black text-lg uppercase tracking-tighter mb-5 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-4 bg-black inline-block"></span> Additional
                        </h2>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 border border-gray-200 break-inside-avoid">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <h3>{item.title}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{item.subtitle}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-onyx"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-black ${fontSize} flex flex-col font-sans`} style={{ fontFamily: settings?.fontFamily || "'Roboto', sans-serif" }}>
            
            {/* Heavy Header */}
            <header className="bg-black text-white p-10 flex justify-between items-center">
                <div>
                    <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-1">{contact.firstName} {contact.lastName}</h1>
                    <p className="text-lg font-medium text-gray-300 tracking-wider">{contact.jobTitle}</p>
                </div>
                <div className="text-right text-xs font-light space-y-1 text-gray-400">
                    {contact.email && <p className="flex items-center justify-end gap-2"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> {contact.email}</p>}
                    {fullPhone && <p className="flex items-center justify-end gap-2"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> {fullPhone}</p>}
                    {fullAddress && <p className="flex items-center justify-end gap-2"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> {city}, {countryName}</p>}
                </div>
            </header>

            <div className="flex flex-1">
                {/* Narrow Sidebar */}
                <aside className="w-[28%] bg-[#f5f5f5] p-8 border-r border-gray-200 flex flex-col gap-8">
                    
                    {renderRun(['education', 'skills', 'certifications', 'languages', 'awards'])}
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-10 space-y-8">
                    {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}
                </main>
            </div>
        </div>
    );
};

export default React.memo(OnyxTemplate);
