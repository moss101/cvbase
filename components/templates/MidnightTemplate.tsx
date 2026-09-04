
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { BadgeCheck, Calendar, Globe, Link, Mail, MapPin, Phone, Trophy } from 'lucide-react';

const MidnightTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    // Default to Teal if no theme color, but respect settings
    const themeColor = settings?.themeColor || '#0f766e'; // teal-700 equivalent
    // Lighter shade for text/accents could be derived, but using themeColor for consistency
    const accentText = themeColor; 
    const sidebarBg = themeColor;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const fontFamily = settings?.fontFamily || 'Arial, sans-serif';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Helper for Skill Bars visualization
    const getSkillLevel = (index: number) => {
       // Mock variation for visual interest if no explicit level
       return [90, 85, 80, 95, 75, 85][index % 6]; 
    };

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-2">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wide border-b border-gray-200 pb-2 break-after-avoid">Summary</h3>
                        <div className="leading-relaxed text-justify text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2 break-after-avoid">Experience</h3>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-[1.1em]">{exp.jobTitle}</h4>
                                            <p className="font-semibold" style={{ color: accentText }}>{exp.company}</p>
                                        </div>
                                        <div className="text-gray-500 text-[0.9em] font-medium whitespace-nowrap">{exp.startDate} - {exp.endDate}</div>
                                    </div>
                                    <div className="text-gray-500 mb-2 flex items-center gap-1 text-[0.9em]">
                                        <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1em]" />
                                        {exp.location}
                                    </div>
                                    <div className="leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2 break-after-avoid">Education</h3>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="break-inside-avoid">
                                    <h4 className="font-bold text-gray-900 text-[1.1em]">{edu.degree}</h4>
                                    <p className="font-semibold" style={{ color: accentText }}>{edu.school}</p>
                                    <div className="flex items-center gap-4 text-gray-500 mt-1 text-[0.9em]">
                                        <span className="flex items-center gap-1">
                                            <Calendar aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1em]" />
                                            {edu.startDate} - {edu.endDate}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1em]" />
                                            {edu.location}
                                        </span>
                                    </div>
                                    {edu.description && <div className="mt-2 text-gray-700 leading-relaxed">{edu.description}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h3 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-white/30 pb-1 break-after-avoid">Skills</h3>
                        <div className="space-y-3">
                            {skills.map((skill, i) => (
                                <div key={i} className="break-inside-avoid">
                                    <span className="text-[0.95em] font-medium block mb-1">{skill}</span>
                                    <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-white h-full rounded-full" style={{ width: `${getSkillLevel(i)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2 break-after-avoid">Projects</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {projects.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-bold text-gray-900 text-[1em]">{item.name}</h4>
                                        <span className="text-gray-500 text-[0.9em]">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[0.9em] font-medium mb-1" style={{ color: accentText }}>{item.technologies}</p>
                                    <div className="leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h3 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-white/30 pb-1 break-after-avoid">Certifications</h3>
                        <div className="space-y-4">
                            {certifications.map((cert, i) => (
                                <div key={cert.id} className="flex gap-3 break-inside-avoid">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <BadgeCheck aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[1em]">{cert.name}</h4>
                                        <p className="text-[0.9em] opacity-80">Expires: {cert.expiryDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h3 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-white/30 pb-1 break-after-avoid">Languages</h3>
                        <div className="space-y-2">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between items-center break-inside-avoid">
                                    <span className="text-[0.95em]">{lang.language}</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(dot => (
                                            <div 
                                                key={dot} 
                                                className={`w-1.5 h-1.5 rounded-full ${dot <= (lang.proficiency.includes('Native') ? 5 : lang.proficiency.includes('Fluent') ? 4 : 3) ? 'bg-white' : 'bg-white/20'} break-inside-avoid`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h3 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-white/30 pb-1 break-after-avoid">Achievements</h3>
                        <div className="space-y-4">
                            {awards.map((award, i) => (
                                <div key={award.id} className="flex gap-3 break-inside-avoid">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[1em]">{award.title}</h4>
                                        <p className="text-[0.9em] opacity-80">{award.issuer} • {award.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h3 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-white/30 pb-1 break-after-avoid">Training</h3>
                        <div className="space-y-3">
                            {trainings.map((item, i) => (
                                <div key={item.id} className="break-inside-avoid">
                                    <h4 className="font-bold text-[1em]">{item.course}</h4>
                                    <p className="text-[0.9em] opacity-80">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2 break-after-avoid">Publications</h3>
                        <div className="space-y-3">
                            {publications.map(pub => (
                                <div key={pub.id} className="break-inside-avoid">
                                    <h4 className="font-bold text-gray-900">{pub.title}</h4>
                                    <p className="text-[0.9em] text-gray-600 italic">{pub.publisher} - {pub.date}</p>
                                    <div className="mt-1 text-gray-700">{pub.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2 break-after-avoid">Volunteering</h3>
                        <div className="space-y-3">
                            {volunteer.map(vol => (
                                <div key={vol.id} className="break-inside-avoid">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-gray-900">{vol.role}</h4>
                                        <span className="text-[0.9em] text-gray-500">{vol.startDate} - {vol.endDate}</span>
                                    </div>
                                    <p className="text-[0.9em] font-medium" style={{ color: accentText }}>{vol.organization}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(vol.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h3 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-white/30 pb-1 break-after-avoid">Additional</h3>
                        <div className="space-y-3">
                            {custom.map((item, i) => (
                                <div key={item.id} className="break-inside-avoid">
                                    <h4 className="font-bold text-[1em]">{item.title}</h4>
                                    <p className="text-[0.9em] opacity-80">{item.subtitle}</p>
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
        <div 
            id={isCardPreview ? undefined : "resume-preview-midnight"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white shadow-lg flex ${fontSize}`} 
            style={{ fontFamily: fontFamily, color: '#374151' }}
        >

            {/* Main Content - Left Side (65%) */}
            <div className="w-[65%] p-10 pr-8 flex flex-col gap-8">
                
                {/* Summary */}
                {renderRun(['summary', 'experience', 'education', 'projects', 'publications', 'volunteer'])}
            </div>

            {/* Sidebar - Right Side (35%) */}
            <div className="w-[35%] text-white p-8 flex flex-col gap-8" style={{ backgroundColor: sidebarBg }}>
                
                {/* Profile Info */}
                <div className="mb-2">
                    <h1 className="text-3xl font-bold mb-2 leading-tight uppercase tracking-wide break-words">{contact.firstName}<br/>{contact.lastName}</h1>
                    <p className="text-sm font-medium mb-6 opacity-90 uppercase tracking-widest border-t border-white/30 pt-2 inline-block">{contact.jobTitle}</p>
                    
                    <div className="space-y-3 text-[0.95em]">
                        {contact.email && (
                            <div className="flex items-center gap-2 break-all">
                                <Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                <span>{contact.email}</span>
                            </div>
                        )}
                        {contact.linkedin && (
                            <div className="flex items-center gap-2 break-all">
                                <Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                <span>LinkedIn</span>
                            </div>
                        )}
                        {fullPhone && (
                            <div className="flex items-center gap-2">
                                <Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                <span>{fullPhone}</span>
                            </div>
                        )}
                        {fullAddress && (
                            <div className="flex items-center gap-2">
                                <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                <span>{city}, {countryName}</span>
                            </div>
                        )}
                        {contact.website && (
                            <div className="flex items-center gap-2 break-all">
                                <Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[1.2em]" />
                                <span>{contact.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Key Achievements (Awards) */}
                {renderRun(['awards', 'certifications', 'skills', 'trainings', 'languages', 'custom'])}

            </div>
        </div>
    );
};

export default React.memo(MidnightTemplate);
