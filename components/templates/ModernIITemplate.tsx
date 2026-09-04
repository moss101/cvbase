
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Globe, Link, Mail, MapPin, Phone } from 'lucide-react';

const ModernIITemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    // Default to teal if no theme color, matching the prompt's style
    const themeColor = settings?.themeColor || '#0f766e'; // teal-700 roughly
    
    // Font sizes
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const headingSize = settings?.fontSize === 'small' ? 'text-lg' : settings?.fontSize === 'large' ? 'text-2xl' : 'text-xl';
    const nameSize = settings?.fontSize === 'small' ? 'text-3xl' : settings?.fontSize === 'large' ? 'text-5xl' : 'text-4xl';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Helper for hex to rgba for backgrounds
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const sidebarBg = hexToRgba(themeColor, 0.05); // teal-50 approx
    const tagBg = hexToRgba(themeColor, 0.2); // teal-200 approx

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <div key="summary" data-section="summary">
                        <h2 className={`${headingSize} font-bold border-b-2 pb-2 mb-4 uppercase tracking-wider break-after-avoid`} style={{ color: themeColor, borderColor: themeColor }}>Professional Summary</h2>
                        <div className="leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </div>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-10">
                        <h2 className="text-2xl font-bold mb-6 uppercase tracking-wide break-after-avoid" style={{ color: themeColor }}>Experience</h2>
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-xl font-bold text-gray-800">{exp.jobTitle}</h3>
                                        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline mb-3">
                                        <p className="text-base font-semibold text-gray-600">{exp.company}</p>
                                        <p className="text-sm text-gray-500 italic">{exp.location}</p>
                                    </div>
                                    <div className="leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mb-10">
                        <h2 className="text-2xl font-bold mb-6 uppercase tracking-wide break-after-avoid" style={{ color: themeColor }}>Education</h2>
                        <div className="space-y-6">
                            {education.map(edu => (
                                <div key={edu.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-lg font-bold text-gray-800">{edu.degree}</h3>
                                        <span className="text-sm text-gray-500 font-medium">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-base text-gray-600">{edu.school}</p>
                                        <p className="text-sm text-gray-500 italic">{edu.location}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <div key="skills" data-section="skills">
                        <h2 className={`${headingSize} font-bold border-b-2 pb-2 mb-4 uppercase tracking-wider break-after-avoid`} style={{ color: themeColor, borderColor: themeColor }}>Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1 rounded-full font-medium text-xs" style={{ backgroundColor: tagBg, color: '#134e4a' }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-10">
                        <h2 className="text-2xl font-bold mb-6 uppercase tracking-wide break-after-avoid" style={{ color: themeColor }}>Projects</h2>
                        <div className="space-y-6">
                            {projects.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                                        <span className="text-sm text-gray-500 font-medium">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-sm font-semibold mb-2" style={{ color: themeColor }}>{item.technologies}</p>
                                    <div className="leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <div key="certifications" data-section="certifications">
                        <h2 className={`${headingSize} font-bold border-b-2 pb-2 mb-4 uppercase tracking-wider break-after-avoid`} style={{ color: themeColor, borderColor: themeColor }}>Certifications</h2>
                        <div className="space-y-4">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-gray-800">{cert.name}</p>
                                    {cert.description && <p className="text-gray-600 text-xs">{cert.description}</p>}
                                    <p className="text-gray-500 text-[10px]">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages">
                        <h2 className={`${headingSize} font-bold border-b-2 pb-2 mb-4 uppercase tracking-wider break-after-avoid`} style={{ color: themeColor, borderColor: themeColor }}>Languages</h2>
                        <div className="space-y-2">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between break-inside-avoid">
                                    <span className="font-bold text-gray-800">{lang.language}</span>
                                    <span className="text-gray-600">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <div key="awards" data-section="awards">
                        <h2 className={`${headingSize} font-bold border-b-2 pb-2 mb-4 uppercase tracking-wider break-after-avoid`} style={{ color: themeColor, borderColor: themeColor }}>Awards</h2>
                        <div className="space-y-2">
                            {awards.map((award, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-gray-800">{award.title}</p>
                                    <p className="text-gray-600 text-xs">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            default: {
                const generic: Partial<Record<SectionId, { title: string; data: any[] | undefined }>> = {
                    publications: { title: 'Publications', data: publications },
                    volunteer: { title: 'Volunteering', data: volunteer },
                    custom: { title: 'Additional', data: custom },
                    trainings: { title: 'Training', data: trainings },
                };
                const section = generic[id];
                return section && section.data && section.data.length > 0 ? (
                    <section key={id} data-section={id} className="mb-10">
                        <h2 className="text-2xl font-bold mb-6 uppercase tracking-wide break-after-avoid" style={{ color: themeColor }}>{section.title}</h2>
                        <div className="space-y-6">
                            {section.data.map((item: any) => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-lg font-bold text-gray-800">{item.title || item.role || item.course}</h3>
                                        <span className="text-sm text-gray-500 font-medium">{item.date || item.startDate}</span>
                                    </div>
                                    <p className="text-base text-gray-600 mb-2">{item.subtitle || item.organization || item.publisher || item.institution}</p>
                                    {item.description && <div className="leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            }
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div id={isCardPreview ? undefined : "resume-preview-modern-ii"} className={`w-[794px] min-h-[1123px] h-auto bg-white shadow-sm border border-gray-200 flex ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            
            {/* Left Column */}
            <div className="w-1/3 p-8 text-gray-700 flex flex-col gap-8" style={{ backgroundColor: sidebarBg }}>
                
                {/* Contact Info */}
                <div className="space-y-3 text-sm">
                    {fullPhone && (
                        <div className="flex items-center gap-3">
                            <Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[18px]" style={{ color: themeColor }} />
                            <span>{fullPhone}</span>
                        </div>
                    )}
                    {contact.email && (
                        <div className="flex items-center gap-3">
                            <Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[18px]" style={{ color: themeColor }} />
                            <span className="break-all">{contact.email}</span>
                        </div>
                    )}
                    {fullAddress && (
                        <div className="flex items-center gap-3">
                            <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[18px]" style={{ color: themeColor }} />
                            <span>{city}, {countryName}</span>
                        </div>
                    )}
                    {contact.website && (
                        <div className="flex items-center gap-3">
                            <Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[18px]" style={{ color: themeColor }} />
                            <span className="break-all">{contact.website}</span>
                        </div>
                    )}
                     {contact.linkedin && (
                        <div className="flex items-center gap-3">
                            <Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[18px]" style={{ color: themeColor }} />
                            <span className="break-all">LinkedIn</span>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {renderRun(['summary', 'skills', 'certifications', 'languages', 'awards'])}

            </div>

            {/* Right Column */}
            <div className="w-2/3 p-8 bg-white">
                
                {/* Header Area */}
                <div className="flex items-center gap-6 mb-8">
                    <div className="flex-grow">
                        <h1 className={`${nameSize} font-bold leading-none mb-2 uppercase tracking-tight`} style={{ color: themeColor }}>
                            {contact.firstName} <br /> {contact.lastName}
                        </h1>
                        <p className="text-2xl text-gray-500 font-light uppercase tracking-widest">{contact.jobTitle}</p>
                    </div>
                    {contact.photo && (
                        <div className="w-32 h-32 shrink-0 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm">
                            <img src={contact.photo} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                <div className="w-full h-1 bg-gray-200 mb-8"></div>

                {/* Experience */}
                {renderRun(['experience', 'projects', 'education', 'publications', 'volunteer', 'custom', 'trainings'])}


            </div>
        </div>
    );
};

export default React.memo(ModernIITemplate);
