
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { BadgeCheck, Briefcase, CircleCheck, Globe, GraduationCap, Trophy, User } from 'lucide-react';

const TecAtsTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const themeColor = settings?.themeColor || '#0d9488'; // Teal
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <div className="flex items-center mb-3 border-b pb-2 border-gray-200 break-after-avoid">
                            <User aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] mr-2 text-xl" style={{ color: themeColor }} />
                            <h3 className="font-bold text-gray-800 tracking-wider uppercase text-sm">Professional Summary</h3>
                        </div>
                        <div className="text-sm leading-relaxed text-justify text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <div className="flex items-center mb-4 border-b pb-2 border-gray-200 break-after-avoid">
                            <Briefcase aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] mr-2 text-xl" style={{ color: themeColor }} />
                            <h3 className="font-bold text-gray-800 tracking-wider uppercase text-sm">Experience</h3>
                        </div>
                        <div className="space-y-6">
                            {experience.map((job, index) => (
                                <div key={index} className="break-inside-avoid">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{job.jobTitle}</h4>
                                            <p className="text-sm font-medium italic" style={{ color: themeColor }}>{job.company}</p>
                                        </div>
                                        <div className="text-right text-xs text-gray-500 font-semibold">
                                            <div>{job.startDate} – {job.endDate}</div>
                                            <div>{job.location}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs leading-relaxed text-gray-600 mt-2 pl-2 border-l-2 border-gray-100" dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <div className="flex items-center mb-4 border-b pb-2 border-gray-200 break-after-avoid">
                            <GraduationCap aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] mr-2 text-xl" style={{ color: themeColor }} />
                            <h3 className="font-bold text-gray-800 tracking-wider uppercase text-sm">Education</h3>
                        </div>
                        <div className="space-y-4">
                            {education.map((edu, index) => (
                                <div key={index} className="break-inside-avoid">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{edu.degree}</h4>
                                            <p className="text-sm font-medium text-gray-600">{edu.school}</p>
                                        </div>
                                        <div className="text-right text-xs text-gray-500 font-semibold">
                                            <div>{edu.startDate} – {edu.endDate}</div>
                                            <div>{edu.location}</div>
                                        </div>
                                    </div>
                                    {edu.description && <div className="text-xs mt-1 text-gray-500">{edu.description}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <div className="flex items-center mb-3 border-b pb-2 border-gray-200 break-after-avoid">
                            <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] mr-2 text-xl" style={{ color: themeColor }} />
                            <h3 className="font-bold text-gray-800 tracking-wider uppercase text-sm">Skills</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-8">
                            {skills.map((skill, index) => (
                                <div key={index} className="flex items-center text-sm text-gray-700 break-inside-avoid">
                                    <div className="w-2 h-2 rounded-full mr-3 shrink-0" style={{ backgroundColor: themeColor }}></div>
                                    {skill}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <div className="flex items-center mb-3 border-b pb-2 border-gray-200 break-after-avoid">
                            <BadgeCheck aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] mr-2 text-xl" style={{ color: themeColor }} />
                            <h3 className="font-bold text-gray-800 tracking-wider uppercase text-sm">Certifications</h3>
                        </div>
                        <ul className="space-y-2">
                            {certifications.map((cert, index) => (
                                <li key={index} className="flex items-start text-sm text-gray-700 break-inside-avoid">
                                    <CircleCheck aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm mr-2 mt-0.5" style={{ color: themeColor }} />
                                    <span>
                                        <span className="block font-medium">{cert.name}</span>
                                        <span className="text-xs text-gray-500">{cert.expiryDate}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <div className="flex items-center mb-3 border-b pb-2 border-gray-200 break-after-avoid">
                            <Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] mr-2 text-xl" style={{ color: themeColor }} />
                            <h3 className="font-bold text-gray-800 tracking-wider uppercase text-sm">Languages</h3>
                        </div>
                        <ul className="space-y-2">
                            {languages.map((lang, index) => (
                                <li key={index} className="text-sm flex justify-between break-inside-avoid">
                                    <span className="font-semibold text-gray-700" style={{ color: themeColor }}>{lang.language}</span>
                                    <span className="text-gray-600">{lang.proficiency}</span>
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
        <div id={isCardPreview ? undefined : "resume-preview-tec-ats"} className={`w-[794px] min-h-[1123px] h-auto bg-white shadow-sm border border-gray-200 ${fontSize} font-sans text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>

            {/* Header */}
            <div className="px-10 pt-10 pb-5">
                <h1 className="text-4xl font-bold text-gray-800 mb-1 uppercase tracking-tight">{contact.firstName} {contact.lastName}</h1>
                <h2 className="text-xl font-medium" style={{ color: themeColor }}>{contact.jobTitle}</h2>
            </div>

            {/* Contact Bar */}
            <div className="text-white px-10 py-3 flex flex-wrap justify-between items-center text-xs" style={{ backgroundColor: themeColor }}>
                {fullPhone && <div><span className="font-bold opacity-90 mr-1">PHONE</span> {fullPhone}</div>}
                {contact.email && <div><span className="font-bold opacity-90 mr-1">EMAIL</span> {contact.email}</div>}
                {fullAddress && <div><span className="font-bold opacity-90 mr-1">ADDRESS</span> {city}, {countryName}</div>}
                {contact.linkedin && <div><span className="font-bold opacity-90 mr-1">LINKEDIN</span> {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
            </div>

            {/* Main Content */}
            <div className="px-10 py-8 space-y-8">
                
                {/* Summary */}
                {renderRun(['summary', 'skills', 'experience', 'education'])}

                {/* Two Column Grid for Certifications, Languages, etc */}
                <div className="grid grid-cols-2 gap-10">
                    {renderRun(['certifications', 'languages'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(TecAtsTemplate);
