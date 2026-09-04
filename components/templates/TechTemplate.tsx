
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Link, Mail, MapPin, Phone, Trophy } from 'lucide-react';

const TechTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#2563eb'; // Royal Blue default
    const secondaryColor = '#64748b'; // Slate 500
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Helper for rendering dots
    const renderDots = (level: string) => {
        let score = 3;
        const l = level.toLowerCase();
        if (l.includes('native') || l.includes('expert')) score = 5;
        else if (l.includes('fluent') || l.includes('advanced')) score = 4;
        else if (l.includes('intermediate')) score = 3;
        else if (l.includes('beginner')) score = 2;

        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((dot) => (
                    <div 
                        key={dot} 
                        className={`w-2 h-2 rounded-full ${dot <= score ? '' : 'bg-gray-200'}`}
                        style={{ backgroundColor: dot <= score ? accentColor : undefined }}
                    ></div>
                ))}
            </div>
        );
    };

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 break-after-avoid">Profile</h2>
                        <div className="text-xs leading-relaxed text-gray-600 italic text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1 break-after-avoid">Experience</h2>
                        <div className="flex flex-col gap-6">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-[#1e293b]">{exp.jobTitle}</h3>
                                        <span className="text-xs font-medium text-gray-400">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <div className="text-xs font-bold uppercase mb-2" style={{ color: accentColor }}>{exp.company} <span className="text-gray-400 font-normal normal-case">| {exp.location}</span></div>
                                    <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1 break-after-avoid">Education</h2>
                        <div className="flex flex-col gap-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-[#1e293b]">{edu.school}</h3>
                                        <span className="text-xs font-medium text-gray-400">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{edu.degree}</p>
                                    <p className="text-[9px] text-gray-400 italic">{edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 break-after-avoid">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-white border border-gray-200 px-3 py-1.5 rounded-md text-[10px] font-semibold text-gray-700 shadow-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1 break-after-avoid">Projects</h2>
                        <div className="flex flex-col gap-5">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-[#1e293b]">{item.name}</h3>
                                        <span className="text-xs font-medium text-gray-400">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: accentColor }}>{item.technologies}</p>
                                    <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 break-after-avoid">Certifications</h2>
                        <ul className="space-y-3">
                            {certifications.map((cert, i) => (
                                <li key={i} className="text-xs break-inside-avoid">
                                    <strong className="block text-gray-800">{cert.name}</strong>
                                    {cert.expiryDate && <span className="text-gray-400 text-[9px]">Expires: {cert.expiryDate}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 break-after-avoid">Languages</h2>
                        <div className="flex flex-col gap-3">
                            {languages.map((lang, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-gray-700">{lang.language}</span>
                                        <span className="text-gray-400 text-[9px]">{lang.proficiency}</span>
                                    </div>
                                    {renderDots(lang.proficiency)}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 break-after-avoid">Achievements</h2>
                        <div className="flex flex-col gap-4">
                            {awards.map((award, i) => (
                                <div key={i} className="flex items-start gap-3 break-inside-avoid">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-[#1e293b] shadow-sm">
                                        <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">{award.title}</p>
                                        <p className="text-[10px] text-gray-500">{award.issuer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1 break-after-avoid">Training & Courses</h2>
                        <div className="flex flex-col gap-4">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-[#1e293b]">{item.course}</h3>
                                        <span className="text-xs font-medium text-gray-400">{item.date}</span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: accentColor }}>{item.institution}</p>
                                    {item.description && <div className="text-xs leading-relaxed text-gray-600">{item.description}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1 break-after-avoid">Publications</h2>
                        <div className="flex flex-col gap-4">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-[#1e293b]">{item.title}</h3>
                                        <span className="text-xs font-medium text-gray-400">{item.date}</span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: accentColor }}>{item.publisher}</p>
                                    {item.link && <a href={item.link} className="text-[10px] text-blue-500 underline block mb-1">{item.link}</a>}
                                    {item.description && <div className="text-xs leading-relaxed text-gray-600">{item.description}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 break-after-avoid">Volunteering</h2>
                        <div className="flex flex-col gap-3">
                            {volunteer.map((vol, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-xs font-bold text-gray-800">{vol.role}</p>
                                    <p className="text-[10px] text-gray-500">{vol.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1 break-after-avoid">Additional</h2>
                        <div className="flex flex-col gap-4">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-[#1e293b]">{item.title}</h3>
                                        <span className="text-xs font-medium text-gray-400">{item.date}</span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: accentColor }}>{item.subtitle}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-tech"} className={`w-[794px] min-h-[1123px] h-auto bg-white flex ${fontSize}`} style={{ fontFamily: settings?.fontFamily || "'Roboto', sans-serif" }}>
            
            {/* Left Main Column (68%) */}
            <main className="w-[68%] p-10 pr-8 flex flex-col gap-8 text-gray-700">
                
                {/* Header */}
                <header className="mb-4">
                    <h1 className="text-4xl font-bold uppercase tracking-tight text-[#1e293b] mb-2">{contact.firstName} <span style={{ color: accentColor }}>{contact.lastName}</span></h1>
                    <p className="text-lg font-medium tracking-wide text-[#64748b] uppercase">{contact.jobTitle}</p>
                    
                    {/* Contact Row */}
                    <div className="flex flex-wrap gap-y-2 gap-x-4 mt-6 text-xs text-gray-500">
                        {fullPhone && <div className="flex items-center gap-1"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: accentColor }} />{fullPhone}</div>}
                        {contact.email && <div className="flex items-center gap-1"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: accentColor }} />{contact.email}</div>}
                        {contact.linkedin && <div className="flex items-center gap-1"><Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: accentColor }} />LinkedIn</div>}
                        {fullAddress && <div className="flex items-center gap-1"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: accentColor }} />{city}</div>}
                    </div>
                </header>

                {/* Experience */}
                {renderRun(['experience', 'education', 'projects', 'trainings', 'publications', 'custom'])}
            </main>

            {/* Right Sidebar (32%) */}
            <aside className="w-[32%] bg-[#f8fafc] p-8 flex flex-col gap-8 border-l border-gray-100">
                
                {contact.photo && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-sm mx-auto">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}

                {renderRun(['summary', 'awards', 'skills', 'languages', 'certifications', 'volunteer'])}

            </aside>
        </div>
    );
};

export default React.memo(TechTemplate);
