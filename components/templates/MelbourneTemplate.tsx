
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Link, Mail, MapPin, Phone } from 'lucide-react';

const MelbourneTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#7c3aed'; // Violet/Purple default
    
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
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Profile</h2>
                        <div className="leading-relaxed text-justify text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                         <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Experience</h2>
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div key={exp.id} className="relative pl-4 border-l-2 break-inside-avoid" style={{ borderColor: `${primaryColor}30` }}>
                                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>

                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-800">{exp.jobTitle}</h3>
                                        <span className="text-[0.9em] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="font-semibold text-[0.95em] mb-2" style={{ color: primaryColor }}>{exp.company}, {exp.location}</p>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Education</h2>
                        <div className="space-y-5">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <h3 className="font-bold text-[1em] text-gray-800">{edu.degree}</h3>
                                    <p className="text-[0.95em] font-medium mt-1" style={{ color: primaryColor }}>{edu.school}</p>
                                    <p className="text-[0.9em] text-gray-500 mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                    <p className="text-[0.9em] text-gray-400">{edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="bg-gray-50 p-6 rounded-xl">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 text-gray-700 break-after-avoid">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="px-2 py-1 bg-white rounded border border-gray-200 text-[0.9em] font-medium text-gray-600 shadow-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                         <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Projects</h2>
                        <div className="space-y-6">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-800">{item.name}</h3>
                                        <span className="text-[0.9em] font-medium text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[0.9em] font-semibold mb-2 italic opacity-80">{item.technologies}</p>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Certifications</h2>
                        <div className="space-y-3">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-[0.95em] text-gray-800">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-[0.85em] text-gray-500 mt-0.5">Expires: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Languages</h2>
                        <ul className="space-y-2">
                            {languages.map((lang, i) => (
                                <li key={i} className="flex justify-between items-center text-[0.95em] break-inside-avoid">
                                    <span className="font-medium text-gray-700">{lang.language}</span>
                                    <span className="text-gray-500 text-[0.85em]">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Awards</h2>
                        <div className="space-y-3">
                            {awards.map((award, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-[0.95em] text-gray-800">{award.title}</p>
                                    <p className="text-[0.85em] text-gray-500 mt-0.5">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Training</h2>
                        <div className="space-y-3">
                            {trainings.map((item, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-[0.95em] text-gray-800">{item.course}</p>
                                    <p className="text-[0.85em] text-gray-500 mt-0.5">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                         <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Publications</h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-800">{item.title}</h3>
                                        <span className="text-[0.9em] font-medium text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[0.95em] font-medium mb-1" style={{ color: primaryColor }}>{item.publisher}</p>
                                    <div className="leading-relaxed text-gray-600">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                         <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Volunteering</h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[1.1em] text-gray-800">{item.role}</h3>
                                        <span className="text-[0.9em] font-medium text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[0.95em] font-medium mb-2" style={{ color: primaryColor }}>{item.organization}</p>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>Additional</h2>
                        <div className="space-y-3">
                            {custom.map((item, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-[0.95em] text-gray-800">{item.title}</p>
                                    <p className="text-[0.85em] text-gray-500 mt-0.5">{item.subtitle}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-melbourne"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#333] ${fontSize} p-10 font-sans relative`} style={{ fontFamily: settings?.fontFamily || "'Lato', sans-serif" }}>
            
            {/* Photo Circle Top Right */}
            {contact.photo && (
                <div className="absolute top-10 right-10 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg z-10">
                    <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                </div>
            )}

            {/* Header Section */}
            <header className="mb-12 pr-36">
                <h1 className="text-5xl font-bold text-gray-800 mb-2 tracking-tight" style={{ color: primaryColor }}>
                    {contact.firstName} {contact.lastName}
                </h1>
                <p className="text-xl font-medium text-gray-600 mb-6">{contact.jobTitle}</p>
                
                <div className="flex flex-col gap-1.5 text-xs text-gray-500 font-medium">
                    {contact.email && (
                        <div className="flex items-center gap-2">
                            <Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: primaryColor }} />
                            <span>{contact.email}</span>
                        </div>
                    )}
                    {fullPhone && (
                        <div className="flex items-center gap-2">
                            <Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: primaryColor }} />
                            <span>{fullPhone}</span>
                        </div>
                    )}
                    {fullAddress && (
                        <div className="flex items-center gap-2">
                            <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: primaryColor }} />
                            <span>{fullAddress}</span>
                        </div>
                    )}
                    {contact.linkedin && (
                         <div className="flex items-center gap-2">
                            <Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: primaryColor }} />
                            <span>{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                
                {/* Left Column (Main) */}
                <div className="col-span-8 space-y-10">
                     {renderRun(['summary', 'experience', 'projects', 'publications', 'volunteer'])}
                </div>

                {/* Right Column (Sidebar) */}
                <div className="col-span-4 space-y-10 pt-2">
                    
                     {renderRun(['skills', 'education', 'certifications', 'languages', 'awards', 'trainings', 'custom'])}

                </div>
            </div>
        </div>
    );
};

export default React.memo(MelbourneTemplate);
