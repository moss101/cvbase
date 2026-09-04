
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Link, Mail, MapPin, Phone } from 'lucide-react';

const OakTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#a98677'; // Clay/Brownish
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Profile
                        </h2>
                        <div className="text-xs leading-relaxed text-gray-600 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                         <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Professional Experience
                        </h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-end mb-1 border-b border-gray-200 pb-1">
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                            <p className="text-xs font-bold uppercase" style={{ color: accentColor }}>{exp.company}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="text-xs leading-relaxed text-gray-600 mt-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Education
                        </h2>
                        <div className="space-y-4 text-right">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <p className="text-xs text-gray-400 mb-1">{edu.endDate}</p>
                                    <h3 className="font-bold text-xs text-gray-800">{edu.degree}</h3>
                                    <p className="text-xs italic text-gray-600">{edu.school}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Skills
                        </h2>
                        <div className="space-y-2">
                            {skills.map((skill, i) => (
                                <div key={i} className="flex flex-col items-end break-inside-avoid">
                                    <span className="text-xs font-medium mb-1">{skill}</span>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                         <div className="h-full rounded-full" style={{ width: '80%', backgroundColor: accentColor }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                         <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Projects
                        </h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-800">{item.name}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.technologies}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Certifications
                        </h2>
                         <div className="space-y-2 text-right">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-xs">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-[9px] text-gray-500">Exp: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Languages
                        </h2>
                         <div className="space-y-2 text-right">
                            {languages.map((lang, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-xs">{lang.language}</p>
                                    <p className="text-[9px] text-gray-500">{lang.proficiency}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Awards
                        </h2>
                         <div className="space-y-2 text-right">
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
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                         <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Trainings
                        </h2>
                        <div className="space-y-4">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-800">{item.course}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                         <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Publications
                        </h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.publisher}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                         <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Volunteering
                        </h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-800">{item.role}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.organization}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                         <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 break-after-avoid">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Additional
                        </h2>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.subtitle}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-oak"} className="w-[794px] min-h-[1123px] h-auto bg-white text-[#333] text-[10px] p-10 font-sans" style={{ fontFamily: "'Roboto', sans-serif" }}>
            <header className="text-center mb-8">
                <div className="inline-block border-2 px-10 py-3 mb-4" style={{ borderColor: '#333' }}>
                    <h1 className="text-4xl font-bold uppercase tracking-widest">{contact.firstName} {contact.lastName}</h1>
                </div>
                <div className="w-full py-2 text-white uppercase tracking-[0.2em] font-bold text-sm" style={{ backgroundColor: accentColor }}>
                    {contact.jobTitle}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8 h-full">
                {/* Sidebar */}
                <aside className="col-span-4 border-r border-gray-200 pr-6 flex flex-col gap-8">
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Contact
                        </h2>
                        <div className="space-y-3 text-xs text-gray-600">
                             {fullPhone && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1">{fullPhone}</span> <Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] bg-gray-200 p-1 rounded text-gray-600 text-[14px] box-content" /></div>}
                             {contact.email && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1 break-all">{contact.email}</span> <Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] bg-gray-200 p-1 rounded text-gray-600 text-[14px] box-content" /></div>}
                             {fullAddress && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1">{city}, {countryName}</span> <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] bg-gray-200 p-1 rounded text-gray-600 text-[14px] box-content" /></div>}
                             {contact.linkedin && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1">LinkedIn</span> <Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] bg-gray-200 p-1 rounded text-gray-600 text-[14px] box-content" /></div>}
                        </div>
                    </section>

                    {renderRun(['education', 'skills', 'languages', 'certifications', 'awards'])}
                </aside>

                {/* Main Content */}
                <main className="col-span-8 space-y-8">
                     {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}
                </main>
            </div>
        </div>
    );
};

export default React.memo(OakTemplate);
