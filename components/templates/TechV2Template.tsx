
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Calendar, Globe, Link, Mail, MapPin, Phone, Trophy, User } from 'lucide-react';

const TechV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#2563eb';
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
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-3 border-b border-gray-200 pb-2 break-after-avoid">Professional Summary</h2>
                        <div className="text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-4 border-b border-gray-200 pb-2 break-after-avoid">Experience</h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">{exp.jobTitle}</h3>
                                            <p className="font-medium text-sm" style={{ color: accentColor }}>{exp.company}</p>
                                        </div>
                                        <div className="text-right text-xs text-gray-500">
                                            <div className="flex items-center gap-1 justify-end mb-0.5">
                                                <Calendar aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[12px]" />
                                                {exp.startDate} – {exp.endDate}
                                            </div>
                                            <div className="flex items-center gap-1 justify-end">
                                                <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[12px]" />
                                                {exp.location}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm leading-relaxed text-gray-600 pl-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-4 border-b border-gray-200 pb-2 break-after-avoid">Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="break-inside-avoid">
                                    <h3 className="font-bold text-base text-gray-900">{edu.degree}</h3>
                                    <p className="font-medium text-sm" style={{ color: accentColor }}>{edu.school}</p>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Calendar aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[12px]" />
                                        {edu.startDate} – {edu.endDate}
                                    </div>
                                    {edu.description && <p className="text-sm text-gray-600 mt-1">{edu.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Skills</span>
                            <div className="h-[1px] flex-1 bg-white/20 mb-1.5"></div>
                        </div>
                        <ul className="space-y-2 text-[11px] text-gray-300">
                            {skills.map((skill, i) => (
                                <li key={i} className="flex items-center gap-2 break-inside-avoid">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#93c5fd]"></span>
                                    {skill}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-4 border-b border-gray-200 pb-2 break-after-avoid">Projects</h2>
                         <div className="space-y-5">
                            {projects.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-base text-gray-900">{item.name}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} – {item.endDate}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-500 italic mb-1">{item.technologies}</p>
                                    <div className="text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Certifications</span>
                            <div className="h-[1px] flex-1 bg-white/20 mb-1.5"></div>
                        </div>
                        <div className="space-y-3">
                            {certifications.map((cert, i) => (
                                <div key={i} className="break-inside-avoid">
                                    <h4 className="font-medium text-sm" style={{ color: '#93c5fd' }}>{cert.name}</h4>
                                    <p className="text-[10px] text-gray-400">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Languages</span>
                            <div className="h-[1px] flex-1 bg-white/20 mb-1.5"></div>
                        </div>
                        <div className="space-y-2 text-[11px] text-gray-300">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between break-inside-avoid">
                                    <span>{lang.language}</span>
                                    <span className="opacity-70">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Achievements</span>
                            <div className="h-[1px] flex-1 bg-white/20 mb-1.5"></div>
                        </div>
                        <div className="space-y-3">
                            {awards.map((award, i) => (
                                <div key={i} className="flex items-start gap-3 text-[11px] text-gray-300 break-inside-avoid">
                                    <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm mt-0.5" style={{ color: '#93c5fd' }} />
                                    <div>
                                        <span className="font-medium block text-white">{award.title}</span>
                                        <span className="text-[10px] opacity-70">{award.issuer}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-4 border-b border-gray-200 pb-2 break-after-avoid">Training</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {trainings.map(item => (
                                <div key={item.id} className="bg-gray-50 p-3 rounded border border-gray-100 text-center break-inside-avoid">
                                    <div className="font-bold text-sm text-gray-800">{item.course}</div>
                                    <div className="text-xs text-gray-500 mt-1">{item.institution}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-4 border-b border-gray-200 pb-2 break-after-avoid">Publications</h2>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">{item.publisher}</p>
                                    <div className="text-sm leading-relaxed text-gray-600">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 mb-4 border-b border-gray-200 pb-2 break-after-avoid">Volunteering</h2>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm text-gray-900">{item.role}</h3>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-xs font-medium mb-1" style={{ color: accentColor }}>{item.organization}</p>
                                    <div className="text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-tech-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-gray-100 flex ${fontSize}`} style={{ fontFamily: settings?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif' }}>
            
            <div className="flex w-full bg-white shadow-sm border border-gray-200 overflow-hidden min-h-full">
                
                {/* Sidebar */}
                <aside className="w-1/3 bg-gradient-to-b from-slate-800 to-slate-900 text-white p-8 flex flex-col gap-8">
                    <div className="text-center">
                        {contact.photo ? (
                             <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center p-1" style={{ background: `linear-gradient(135deg, ${accentColor}, #1d4ed8)` }}>
                                <img src={contact.photo} alt="Profile" className="w-full h-full rounded-full object-cover" />
                             </div>
                        ) : (
                            <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}, #1d4ed8)` }}>
                                <User aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-4xl" />
                            </div>
                        )}
                        <h1 className="text-2xl font-bold uppercase tracking-wide mb-1 leading-tight">{contact.firstName} {contact.lastName}</h1>
                        <p className="text-sm font-medium" style={{ color: '#93c5fd' }}>{contact.jobTitle}</p>
                    </div>

                    {/* Contact */}
                    <section>
                         <div className="flex items-end gap-3 mb-4">
                            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Contact</span>
                            <div className="h-[1px] flex-1 bg-white/20 mb-1.5"></div>
                         </div>
                         <div className="space-y-3 text-[11px] text-gray-300">
                            {fullPhone && <div className="flex items-center gap-3"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: '#93c5fd' }} />{fullPhone}</div>}
                            {contact.email && <div className="flex items-center gap-3"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: '#93c5fd' }} /><span className="break-all">{contact.email}</span></div>}
                            {fullAddress && <div className="flex items-center gap-3"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: '#93c5fd' }} />{city}</div>}
                            {contact.linkedin && <div className="flex items-center gap-3"><Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: '#93c5fd' }} /><span>LinkedIn</span></div>}
                            {contact.website && <div className="flex items-center gap-3"><Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" style={{ color: '#93c5fd' }} /><span className="break-all">{contact.website}</span></div>}
                         </div>
                    </section>

                    {/* Skills */}
                    {renderRun(['skills', 'certifications', 'awards', 'languages'])}

                </aside>

                {/* Main Content */}
                <main className="flex-1 p-10 bg-white text-gray-800 flex flex-col gap-8">
                    
                    {renderRun(['summary', 'experience', 'education', 'projects', 'trainings', 'publications', 'volunteer'])}

                </main>
            </div>
        </div>
    );
};

export default React.memo(TechV2Template);
