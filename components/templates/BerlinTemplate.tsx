
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const BerlinTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Using standard ATS friendly fonts as requested
    const mainFont = "'Arial', sans-serif";
    
    // Colors
    const black = '#212121';
    const fadedText = 'rgba(33, 33, 33, 0.6)';
    
    const fontSizeClass = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-3 break-after-avoid" style={{ color: black }}>Profile</h2>
                        <div className="leading-[1.7] text-justify" style={{ color: fadedText }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Experience</h2>
                        <div className="flex flex-col gap-6">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[11px] font-bold text-[#212121]">{exp.company}</h3>
                                        <span className="text-[10px]" style={{ color: fadedText }}>{exp.startDate} — {exp.endDate}</span>
                                    </div>
                                    <p className="text-[11px] font-bold mb-2" style={{ color: fadedText }}>{exp.jobTitle}</p>
                                    <div className="leading-[1.7]" style={{ color: fadedText }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                         <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-3 break-after-avoid" style={{ color: black }}>Education</h2>
                         <div className="flex flex-col gap-5">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex flex-col mb-1">
                                        <h3 className="text-[11px] font-bold">{edu.school}</h3>
                                        <p className="text-[10px]" style={{ color: fadedText }}>{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                    <p className="leading-[1.7]" style={{ color: fadedText }}>{edu.degree}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-3 break-after-avoid" style={{ color: black }}>Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="block w-full border-b border-gray-200 pb-1 mb-1 leading-[1.6]" style={{ color: fadedText }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Projects</h2>
                        <div className="flex flex-col gap-6">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[11px] font-bold text-[#212121]">{item.name}</h3>
                                        <span className="text-[10px]" style={{ color: fadedText }}>{item.startDate} — {item.endDate}</span>
                                    </div>
                                    <p className="text-[11px] font-bold mb-2" style={{ color: fadedText }}>{item.technologies}</p>
                                    <div className="leading-[1.7]" style={{ color: fadedText }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Certifications</h2>
                        <div className="flex flex-col gap-3">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-[11px] font-bold text-[#212121]">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-[10px] mt-0.5" style={{ color: fadedText }}>Expires: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                         <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-3 break-after-avoid" style={{ color: black }}>Languages</h2>
                         <ul className="flex flex-col gap-2">
                            {languages.map((lang, i) => (
                                <li key={i} className="flex justify-between break-inside-avoid">
                                    <span className="font-medium">{lang.language}</span>
                                    <span style={{ color: fadedText }}>{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Awards</h2>
                        <div className="flex flex-col gap-3">
                            {awards.map((award, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-[11px] font-bold text-[#212121]">{award.title}</p>
                                        <span className="text-[10px]" style={{ color: fadedText }}>{award.date}</span>
                                    </div>
                                    <p className="text-[10px] mt-0.5" style={{ color: fadedText }}>{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Publications</h2>
                        <div className="flex flex-col gap-4">
                            {publications.map((pub, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[11px] font-bold text-[#212121]">{pub.title}</h3>
                                        <span className="text-[10px]" style={{ color: fadedText }}>{pub.date}</span>
                                    </div>
                                    <p className="text-[11px] mb-1" style={{ color: fadedText }}>{pub.publisher}</p>
                                    {pub.description && <div className="leading-[1.7]" style={{ color: fadedText }}>{pub.description}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Volunteering</h2>
                        <div className="flex flex-col gap-4">
                            {volunteer.map((vol, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[11px] font-bold text-[#212121]">{vol.role}</h3>
                                        <span className="text-[10px]" style={{ color: fadedText }}>{vol.startDate} - {vol.endDate}</span>
                                    </div>
                                    <p className="text-[11px] mb-2" style={{ color: fadedText }}>{vol.organization}</p>
                                    <div className="leading-[1.7]" style={{ color: fadedText }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(vol.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-5 break-after-avoid" style={{ color: black }}>Additional</h2>
                        <div className="flex flex-col gap-4">
                            {custom.map((item, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[11px] font-bold text-[#212121]">{item.title}</h3>
                                        <span className="text-[10px]" style={{ color: fadedText }}>{item.date}</span>
                                    </div>
                                    <p className="text-[11px] mb-2" style={{ color: fadedText }}>{item.subtitle}</p>
                                    <div className="leading-[1.7]" style={{ color: fadedText }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-berlin"} className={`w-[794px] min-h-[1123px] h-auto bg-white relative ${fontSizeClass}`} style={{ fontFamily: mainFont, color: black }}>
            
            <div className="flex pt-10 px-10 gap-12">
                
                {/* Left Sidebar Column - ~35% */}
                <aside className="w-[240px] shrink-0 flex flex-col gap-10 pt-2">
                    
                    {/* Photo */}
                    {contact.photo ? (
                        <div className="w-[120px] h-[120px] rounded-lg bg-gray-200 overflow-hidden">
                            <img src={contact.photo} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-[120px] h-[120px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                            No Photo
                        </div>
                    )}

                    {/* Profile / Summary */}
                    {renderRun(['summary', 'skills'])}

                    {/* Contact Info */}
                    <section>
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.2px] mb-4" style={{ color: black }}>Contact</h2>
                        
                        <div className="flex flex-col gap-4">
                            {fullAddress && (
                                <div>
                                    <h3 className="text-[11px] font-bold mb-0.5">Location:</h3>
                                    <p style={{ color: fadedText }}>{fullAddress}</p>
                                </div>
                            )}
                            {fullPhone && (
                                <div>
                                    <h3 className="text-[11px] font-bold mb-0.5">Tel:</h3>
                                    <p style={{ color: fadedText }}>{fullPhone}</p>
                                </div>
                            )}
                            {contact.email && (
                                <div>
                                    <h3 className="text-[11px] font-bold mb-0.5">Email:</h3>
                                    <p style={{ color: fadedText }} className="break-all">{contact.email}</p>
                                </div>
                            )}
                            {contact.linkedin && (
                                <div>
                                    <h3 className="text-[11px] font-bold mb-0.5">LinkedIn:</h3>
                                    <p style={{ color: fadedText }}>{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Education */}
                    {renderRun(['education', 'languages'])}

                </aside>

                {/* Right Main Column */}
                <main className="flex-1 pt-4">
                    
                    {/* Header Info */}
                    <header className="mb-12">
                        <h1 className="text-[36px] font-bold leading-[1.2] mb-2 text-[#212121]">
                            {contact.firstName} {contact.lastName}
                        </h1>
                        <p className="text-[18px] leading-[1.5]" style={{ color: fadedText }}>
                            {contact.jobTitle}
                        </p>
                    </header>

                    <div className="flex flex-col gap-8">
                        
                        {renderRun(['experience', 'projects', 'certifications', 'publications', 'volunteer', 'awards', 'custom'])}

                    </div>
                </main>
            </div>
        </div>
    );
};

export default React.memo(BerlinTemplate);
