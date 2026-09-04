
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Calendar, ChevronRight, Globe, Link, Mail, MapPin, Phone, Trophy, User } from 'lucide-react';

const Rule = ({ dark = false }: { dark?: boolean }) => (
  <div className={`flex-1 h-px ${dark ? 'bg-white/20' : 'bg-gray-300'}`}></div>
);

const BerlinIITemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const accentColor = settings?.themeColor || '#3b82f6'; // Blue-500 equivalent
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Professional Summary</h2>
                            <Rule />
                        </div>
                        <div className="leading-relaxed text-gray-600 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <div className="flex items-end gap-3 mb-6 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Experience</h2>
                            <Rule />
                        </div>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-[1.1em]">{exp.jobTitle}</h3>
                                            <p className="font-medium text-[0.95em]" style={{ color: accentColor }}>{exp.company}</p>
                                        </div>
                                        <div className="text-right text-[0.9em] text-gray-500">
                                            <div className="flex items-center gap-1 justify-end"><Calendar aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[13px]" /> {exp.startDate} - {exp.endDate}</div>
                                            <div className="flex items-center gap-1 justify-end mt-0.5"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[13px]" /> {exp.location}</div>
                                        </div>
                                    </div>
                                    <div className="leading-relaxed text-gray-600 mt-2 pl-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <div className="flex items-end gap-3 mb-6 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Education</h2>
                            <Rule />
                        </div>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="break-inside-avoid">
                                    <h3 className="font-bold text-gray-800 text-[1.1em]">{edu.degree}</h3>
                                    <p className="font-medium text-[0.95em]" style={{ color: accentColor }}>{edu.school}</p>
                                    <div className="flex items-center gap-4 text-[0.9em] text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><Calendar aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[13px]" /> {edu.startDate} - {edu.endDate}</span>
                                        <span className="flex items-center gap-1"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[13px]" /> {edu.location}</span>
                                    </div>
                                    {edu.description && <p className="text-gray-600 mt-1 text-[0.95em]">{edu.description}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <div key="skills" data-section="skills">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h3 className="text-[12px] tracking-[0.2em] font-semibold">SKILLS</h3>
                            <Rule dark />
                        </div>
                        <div className="space-y-3 text-[11px]">
                            {skills.map((skill, i) => (
                                <div key={i} className="flex justify-between items-center break-inside-avoid">
                                    <span className="text-gray-300">{skill}</span>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <div className="flex items-end gap-3 mb-6 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Projects</h2>
                            <Rule />
                        </div>
                        <div className="space-y-5">
                            {projects.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-[1.1em]">{item.name}</h3>
                                        <span className="text-[0.9em] text-gray-500">{item.startDate} - {item.endDate}</span>
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
                    <div key="certifications" data-section="certifications">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h3 className="text-[12px] tracking-[0.2em] font-semibold">CERTIFICATIONS</h3>
                            <Rule dark />
                        </div>
                        <div className="space-y-3 text-[11px]">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <h4 className="font-medium text-blue-300">{cert.name}</h4>
                                    {cert.expiryDate && <p className="text-white/60 text-[10px]">Exp: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h3 className="text-[12px] tracking-[0.2em] font-semibold">LANGUAGES</h3>
                            <Rule dark />
                        </div>
                        <div className="space-y-2 text-[11px] text-gray-300">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between break-inside-avoid">
                                    <span>{lang.language}</span>
                                    <span className="text-white/60">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <div key="awards" data-section="awards">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h3 className="text-[12px] tracking-[0.2em] font-semibold">ACHIEVEMENTS</h3>
                            <Rule dark />
                        </div>
                        <div className="space-y-3 text-[11px]">
                            {awards.map((award, i) => (
                                <div key={i} className="flex items-start gap-2 break-inside-avoid">
                                    <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-xs text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-gray-200 block font-medium">{award.title}</span>
                                        <span className="text-white/50">{award.issuer}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <div key="trainings" data-section="trainings">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h3 className="text-[12px] tracking-[0.2em] font-semibold">TRAINING</h3>
                            <Rule dark />
                        </div>
                        <div className="space-y-3 text-[11px]">
                            {trainings.map((item, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <h4 className="font-medium text-blue-300">{item.course}</h4>
                                    <p className="text-white/70">{item.institution}</p>
                                    <p className="text-white/50 text-[10px]">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <div className="flex items-end gap-3 mb-6 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Publications</h2>
                            <Rule />
                        </div>
                        <div className="space-y-4">
                            {publications.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-[1.05em]">{item.title}</h3>
                                        <span className="text-[0.9em] text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[0.95em] font-medium text-gray-600 mb-1 italic">{item.publisher}</p>
                                    <div className="leading-relaxed text-gray-600">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <div className="flex items-end gap-3 mb-6 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Volunteering</h2>
                            <Rule />
                        </div>
                        <div className="space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-[1.05em]">{item.role}</h3>
                                        <span className="text-[0.9em] text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[0.95em] font-medium mb-1" style={{ color: accentColor }}>{item.organization}</p>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <div className="flex items-end gap-3 mb-6 break-after-avoid">
                            <h2 className="text-[13px] font-bold text-gray-800 tracking-[0.2em] uppercase">Additional</h2>
                            <Rule />
                        </div>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div key={item.id} className="break-inside-avoid flex items-center gap-2">
                                    <ChevronRight aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm text-blue-500" />
                                    <div>
                                        <span className="font-bold text-gray-800">{item.title}</span>
                                        <span className="text-gray-500 mx-1">•</span>
                                        <span className="text-gray-600">{item.subtitle}</span>
                                    </div>
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
        <div id={isCardPreview ? undefined : "resume-preview-berlin-ii"} className={`w-[794px] min-h-[1123px] h-auto bg-white flex ${fontSize}`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>

            {/* Left Sidebar - Dark */}
            <aside className="w-[35%] bg-gradient-to-b from-slate-800 to-slate-900 text-white p-8 flex flex-col gap-8 shrink-0">
                
                {/* Profile Section */}
                <div className="text-center">
                    {contact.photo ? (
                        <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 p-1" style={{ background: `linear-gradient(135deg, ${accentColor}, #1d4ed8)` }}>
                            <img src={contact.photo} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-slate-800" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${accentColor}, #1d4ed8)` }}>
                            <User aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-4xl text-white" />
                        </div>
                    )}
                    <h1 className="font-bold text-2xl mb-1 uppercase tracking-wide break-words">{contact.firstName} <br/>{contact.lastName}</h1>
                    <p className="text-sm font-medium opacity-90 break-words" style={{ color: '#93c5fd' }}>{contact.jobTitle}</p>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                    <div className="flex items-end gap-3 mb-2">
                        <h3 className="text-[12px] tracking-[0.2em] font-semibold">CONTACT</h3>
                        <Rule dark />
                    </div>
                    <div className="space-y-3 text-[11px] text-gray-300">
                        {fullPhone && (
                            <div className="flex items-center gap-3">
                                <Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm shrink-0" style={{ color: '#60a5fa' }} />
                                <span>{fullPhone}</span>
                            </div>
                        )}
                        {contact.email && (
                            <div className="flex items-center gap-3">
                                <Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm shrink-0" style={{ color: '#60a5fa' }} />
                                <span className="break-all">{contact.email}</span>
                            </div>
                        )}
                        {fullAddress && (
                            <div className="flex items-center gap-3">
                                <MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm shrink-0" style={{ color: '#60a5fa' }} />
                                <span>{city}, {countryName}</span>
                            </div>
                        )}
                        {contact.linkedin && (
                            <div className="flex items-center gap-3">
                                <Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm shrink-0" style={{ color: '#60a5fa' }} />
                                <span>LinkedIn</span>
                            </div>
                        )}
                        {contact.website && (
                            <div className="flex items-center gap-3">
                                <Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm shrink-0" style={{ color: '#60a5fa' }} />
                                <span className="break-all">{contact.website}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Skills */}
                {renderRun(['skills', 'languages', 'certifications', 'trainings', 'awards'])}
            </aside>

            {/* Right Content Area */}
            <main className="flex-1 p-10 flex flex-col gap-8 text-gray-700">
                
                {renderRun(['summary', 'experience', 'projects', 'education', 'publications', 'volunteer', 'custom'])}

            </main>
        </div>
    );
};

export default React.memo(BerlinIITemplate);
