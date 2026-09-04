
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const UrbanTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Design variables based on spec
    const black = '#101214';
    const darkGrey = '#505050';
    const sectionHeaderColor = '#73808D';
    const fontFamily = "'Arial', sans-serif"; // ATS Friendly
    
    // Use theme color for accents if available
    const themeColor = settings?.themeColor || black;

    const fontSizeClass = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className={contact.photo ? 'mr-[80px]' : ''}>
                         <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-4 break-after-avoid" style={{ color: sectionHeaderColor }}>Professional Summary</h2>
                        <div className="leading-[1.6] text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Experience</h2>
                        <div className="flex flex-col gap-8">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[14px] font-bold" style={{ color: black }}>{exp.jobTitle}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-[11px] font-bold uppercase mb-2" style={{ color: sectionHeaderColor }}>{exp.company}, {exp.location}</p>
                                    <div className="leading-[1.6]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-4 break-after-avoid" style={{ color: sectionHeaderColor }}>Education</h2>
                        <div className="flex flex-col gap-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <h3 className="text-[11px] font-bold" style={{ color: black }}>{edu.degree}</h3>
                                    <p className="text-[11px] mb-1">{edu.school}</p>
                                    <p className="text-[10px] opacity-80">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-4 break-after-avoid" style={{ color: sectionHeaderColor }}>Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span 
                                    key={i} 
                                    className="text-[10px] px-2.5 py-1.5 rounded font-medium leading-none" 
                                    style={{ 
                                        backgroundColor: `${themeColor}1a`, // ~10% opacity
                                        color: themeColor 
                                    }}
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Projects</h2>
                        <div className="flex flex-col gap-6">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[14px] font-bold" style={{ color: black }}>{item.name}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[10px] font-bold mb-2" style={{ color: sectionHeaderColor }}>{item.technologies}</p>
                                    <div className="leading-[1.6]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-4 break-after-avoid" style={{ color: sectionHeaderColor }}>Certifications</h2>
                        <ul className="flex flex-col gap-2">
                            {certifications.map((cert, i) => (
                                <li key={i} className="text-[11px] break-inside-avoid">
                                    <span className="font-bold block" style={{ color: black }}>{cert.name}</span>
                                    {cert.expiryDate && <span className="text-[10px] opacity-80">Exp: {cert.expiryDate}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-4 break-after-avoid" style={{ color: sectionHeaderColor }}>Languages</h2>
                        <ul className="flex flex-col gap-1.5">
                            {languages.map((lang, i) => (
                                <li key={i} className="text-[11px] break-inside-avoid">
                                    <span className="font-bold" style={{ color: black }}>{lang.language}</span>: {lang.proficiency}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Awards</h2>
                        <div className="flex flex-col gap-5">
                            {awards.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[12px] font-bold" style={{ color: black }}>{item.title}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] mb-1" style={{ color: darkGrey }}>{item.issuer}</p>
                                    <div className="leading-[1.6]">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Trainings</h2>
                        <div className="flex flex-col gap-5">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[12px] font-bold" style={{ color: black }}>{item.course}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] mb-1" style={{ color: darkGrey }}>{item.institution}</p>
                                    <div className="leading-[1.6]">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Publications</h2>
                        <div className="flex flex-col gap-5">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[12px] font-bold" style={{ color: black }}>{item.title}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] mb-1" style={{ color: darkGrey }}>{item.publisher}</p>
                                    <div className="leading-[1.6]">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Volunteering</h2>
                        <div className="flex flex-col gap-5">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[12px] font-bold" style={{ color: black }}>{item.role}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[11px] mb-2" style={{ color: sectionHeaderColor }}>{item.organization}</p>
                                    <div className="leading-[1.6]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-[10px] font-normal tracking-[2px] uppercase mb-6 break-after-avoid" style={{ color: sectionHeaderColor }}>Additional</h2>
                        <div className="flex flex-col gap-5">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[12px] font-bold" style={{ color: black }}>{item.title}</h3>
                                        <span className="text-[10px] opacity-70 font-medium">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] mb-2" style={{ color: sectionHeaderColor }}>{item.subtitle}</p>
                                    <div className="leading-[1.6]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-urban"} className={`w-[794px] min-h-[1123px] h-auto bg-white relative ${fontSizeClass}`} style={{ fontFamily: fontFamily, color: darkGrey }}>
            
            {/* Top Line */}
            <div className="absolute top-0 left-0 w-full h-[4px]" style={{ backgroundColor: black }}></div>

            <div className="p-[50px] pt-[60px] flex gap-[40px] min-h-full">
                
                {/* Left Column (Sidebar) - ~30% */}
                <aside className="w-[220px] shrink-0 flex flex-col gap-[40px]">
                    
                    {/* Name & Role */}
                    <div>
                        <h1 className="text-[24px] font-bold leading-[1.2] mb-1" style={{ color: black }}>
                            {contact.firstName}<br/>{contact.lastName}
                        </h1>
                        <p className="text-[14px] font-normal" style={{ color: sectionHeaderColor }}>{contact.jobTitle}</p>
                    </div>

                    {/* Contact Info */}
                    <section className="flex flex-col gap-5 text-[11px]">
                        {contact.email && (
                            <div className="break-all">
                                <span className="font-bold block mb-1" style={{ color: black }}>Email</span>
                                <span style={{ color: darkGrey }}>{contact.email}</span>
                            </div>
                        )}
                        {fullPhone && (
                            <div>
                                <span className="font-bold block mb-1" style={{ color: black }}>Phone</span>
                                <span style={{ color: darkGrey }}>{fullPhone}</span>
                            </div>
                        )}
                        {fullAddress && (
                            <div>
                                <span className="font-bold block mb-1" style={{ color: black }}>Address</span>
                                <span style={{ color: darkGrey }}>{fullAddress}</span>
                            </div>
                        )}
                         {contact.linkedin && (
                            <div>
                                <span className="font-bold block mb-1" style={{ color: black }}>LinkedIn</span>
                                <span style={{ color: darkGrey }}>{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </div>
                        )}
                        {contact.website && (
                            <div>
                                <span className="font-bold block mb-1" style={{ color: black }}>Website</span>
                                <span style={{ color: darkGrey }}>{contact.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </div>
                        )}
                    </section>

                    {/* Education */}
                    {renderRun(['education', 'skills', 'languages', 'certifications'])}

                </aside>

                {/* Right Column (Main Content) - ~70% */}
                <main className="flex-1 flex flex-col gap-[40px] relative pt-[10px]">
                    
                    {/* Avatar - Positioned top right of content area */}
                     {contact.photo && (
                        <div className="absolute top-[-10px] right-0 w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm">
                            <img src={contact.photo} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    {/* Summary - Spacing adjusted for avatar if present */}
                    {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'awards', 'volunteer', 'custom'])}

                </main>
            </div>
        </div>
    );
};

export default React.memo(UrbanTemplate);
