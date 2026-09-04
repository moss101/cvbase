
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { BadgeCheck, Brain, Globe, Leaf, Link, Mail, MapPin, Phone, Trophy } from 'lucide-react';

const LeafyTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#6b9080'; 
    const lightBg = `${primaryColor}15`; // Light background tint
    
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
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Profile
                        </h2>
                        <div className="text-[11px] leading-relaxed text-gray-600 text-justify pl-5 border-l border-dashed border-gray-200" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Experience
                        </h2>
                        <div className="space-y-8 border-l-2 ml-2 pl-8 relative" style={{ borderColor: `${primaryColor}30` }}>
                            {experience.map((exp, i) => (
                                <div key={exp.id} className="relative break-inside-avoid">
                                    {/* Leaf/Dot Marker */}
                                     <span className="absolute -left-[38px] top-1 w-4 h-4 bg-white border-2 rounded-full flex items-center justify-center shadow-sm" style={{ borderColor: primaryColor }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                     </span>

                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[13px] text-gray-800">{exp.jobTitle}</h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: primaryColor }}>{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-gray-500 mb-3 uppercase tracking-wide">{exp.company}, {exp.location}</p>
                                    <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Education
                        </h2>
                        <div className="space-y-5 border-l-2 ml-2 pl-8 relative" style={{ borderColor: `${primaryColor}30` }}>
                            {education.map(edu => (
                                <div key={edu.id} className="relative break-inside-avoid">
                                    <span className="absolute -left-[37px] top-2 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: primaryColor }}></span>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[12px] text-gray-800">{edu.school}</h3>
                                        <span className="text-[10px] text-gray-400">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <p className="text-[11px] font-medium" style={{ color: primaryColor }}>{edu.degree}</p>
                                    <p className="text-[10px] text-gray-500 italic">{edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2 break-after-avoid" style={{ borderColor: `${primaryColor}40` }}>
                            <Brain aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: primaryColor }} /> Expertise
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: `${primaryColor}15`, color: '#4a4a4a' }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Projects
                        </h2>
                        <div className="space-y-6 border-l-2 ml-2 pl-8 relative" style={{ borderColor: `${primaryColor}30` }}>
                            {projects.map((item, i) => (
                                <div key={item.id} className="relative break-inside-avoid">
                                    <span className="absolute -left-[37px] top-2 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: primaryColor }}></span>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[12px] text-gray-800">{item.name}</h3>
                                        <span className="text-[10px] text-gray-400 font-medium">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[10px] font-bold mb-1" style={{ color: primaryColor }}>{item.technologies}</p>
                                    <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2 break-after-avoid" style={{ borderColor: `${primaryColor}40` }}>
                            <BadgeCheck aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: primaryColor }} /> Certifications
                        </h2>
                        <div className="space-y-4">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-gray-800 text-[11px]">{cert.name}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2 break-after-avoid" style={{ borderColor: `${primaryColor}40` }}>
                            <Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: primaryColor }} /> Languages
                        </h2>
                        <ul className="space-y-3">
                            {languages.map((lang, i) => (
                                <li key={i} className="flex justify-between items-center break-inside-avoid">
                                    <span className="font-bold text-gray-700">{lang.language}</span>
                                    <span className="text-[10px] text-gray-500 italic">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2 break-after-avoid" style={{ borderColor: `${primaryColor}40` }}>
                            <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: primaryColor }} /> Awards
                        </h2>
                        <div className="space-y-3">
                            {awards.map((award, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="font-bold text-gray-700">{award.title}</p>
                                    <p className="text-[10px] text-gray-500">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Trainings
                        </h2>
                        <div className="space-y-4 pl-4">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[12px] text-gray-800">{item.course}</h3>
                                        <span className="text-[10px] text-gray-400">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] font-medium" style={{ color: primaryColor }}>{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Publications
                        </h2>
                        <div className="space-y-4 pl-4">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[12px] text-gray-800">{item.title}</h3>
                                        <span className="text-[10px] text-gray-400">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] font-medium mb-1" style={{ color: primaryColor }}>{item.publisher}</p>
                                    <div className="text-[11px] leading-relaxed text-gray-600">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Volunteer
                        </h2>
                        <div className="space-y-4 pl-4">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[12px] text-gray-800">{item.role}</h3>
                                        <span className="text-[10px] text-gray-400">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[11px] font-medium mb-1" style={{ color: primaryColor }}>{item.organization}</p>
                                    <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700 break-after-avoid">
                            <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Additional
                        </h2>
                        <div className="space-y-4 pl-4">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-[12px] text-gray-800">{item.title}</h3>
                                        <span className="text-[10px] text-gray-400">{item.date}</span>
                                    </div>
                                    <p className="text-[11px] font-medium mb-1" style={{ color: primaryColor }}>{item.subtitle}</p>
                                    <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-leafy"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#4a4a4a] ${fontSize} font-sans relative overflow-hidden flex flex-col`} style={{ fontFamily: settings?.fontFamily || "'Lato', sans-serif" }}>
            
            {/* Decorative Header Background - Simplified and Robust */}
            <div className="absolute top-0 left-0 w-full h-[220px] z-0" style={{ 
                background: `linear-gradient(135deg, ${lightBg} 0%, white 100%)`,
                borderBottomRightRadius: '50% 40px',
                borderBottomLeftRadius: '50% 40px'
            }}></div>

            <div className="relative z-10 px-14 pt-14 pb-10 flex flex-col h-full">
                
                {/* Header Section */}
                <header className="flex items-center gap-8 mb-14">
                    {contact.photo && (
                        <div className="w-32 h-32 rounded-full overflow-hidden border-[6px] border-white shadow-lg shrink-0 relative z-20">
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1 pt-2">
                        <h1 className="text-5xl font-light text-gray-800 mb-2 tracking-tight leading-none">
                            {contact.firstName} <span className="font-bold" style={{ color: primaryColor }}>{contact.lastName}</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-lg tracking-widest uppercase font-bold text-gray-500">
                                {contact.jobTitle}
                            </p>
                             <span className="h-0.5 w-16 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                        </div>
                        
                        {/* Contact Details Row */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs font-medium text-gray-600">
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
                                    <span>{city}</span>
                                </div>
                             )}
                             {contact.linkedin && (
                                <div className="flex items-center gap-2">
                                    <Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: primaryColor }} />
                                    <span>LinkedIn</span>
                                </div>
                             )}
                        </div>
                    </div>
                    {/* Leaf Accent */}
                    <Leaf aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-6xl absolute top-8 right-10 opacity-10 rotate-12" style={{ color: primaryColor }} />
                </header>

                <div className="grid grid-cols-12 gap-12 flex-1">
                    
                    {/* Left Sidebar (4 cols) */}
                    <aside className="col-span-4 space-y-12 pt-2">
                        
                        {renderRun(['skills', 'languages', 'certifications', 'awards'])}
                    </aside>

                    {/* Main Content (8 cols) */}
                    <main className="col-span-8 space-y-10">
                        
                        {renderRun(['summary', 'experience', 'projects', 'education', 'trainings', 'publications', 'volunteer', 'custom'])}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default React.memo(LeafyTemplate);
