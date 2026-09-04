
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Link, Mail, MapPin, Phone } from 'lucide-react';

// Helper for proficiency dots
const Dots = ({ level, color }: { level: string; color: string }) => {
    let score = 3;
    const l = level.toLowerCase();
    if (l.includes('native') || l.includes('expert')) score = 5;
    else if (l.includes('fluent') || l.includes('advanced')) score = 4;
    else if (l.includes('intermediate')) score = 3;
    else if (l.includes('beginner')) score = 2;

    return (
        <div className="flex gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <span
                    key={i}
                    className={`inline-block h-2.5 w-2.5 rounded-full ${i < score ? '' : 'bg-gray-200'}`}
                    style={{ backgroundColor: i < score ? color : undefined }}
                />
            ))}
        </div>
    );
};

const Rule = ({ dark = false }: { dark?: boolean }) => (
  <div className={dark ? "h-px bg-white/15 w-full" : "h-px bg-gray-200 w-full"} />
);

const EscobarTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    // Default colors from the design
    const primaryBlue = settings?.themeColor || '#1E88E5';
    const sidebarBg = '#1F2B3B'; // Keep sidebar dark for contrast
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mt-7">
                        <div className="flex items-end gap-3 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">SUMMARY</h2>
                            <Rule />
                        </div>
                        <div className="mt-2 text-[13px] leading-relaxed text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mt-7">
                        <div className="flex items-end gap-3 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">EXPERIENCE</h2>
                            <Rule />
                        </div>

                        {experience.map((exp) => (
                            <div key={exp.id} className="mt-4 break-inside-avoid">
                                <div className="flex items-baseline justify-between">
                                    <h3 className="text-[15px] font-bold text-gray-900">{exp.jobTitle}</h3>
                                    <span className="text-[12px] text-gray-600">{exp.startDate} - {exp.endDate}</span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[13px] font-semibold" style={{ color: primaryBlue }}>{exp.company}</span>
                                    <span className="text-[12px] text-gray-600">{exp.location}</span>
                                </div>
                                <div className="mt-2 text-[13px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mt-7">
                        <div className="flex items-end gap-3 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">EDUCATION</h2>
                            <Rule />
                        </div>
                        {education.map((edu) => (
                            <div key={edu.id} className="mt-3 break-inside-avoid">
                                <p className="text-[13px] font-semibold text-gray-900">{edu.degree}</p>
                                <p className="text-[12px] text-gray-600">{edu.school}</p>
                                <p className="text-[12px] text-gray-500">{edu.startDate} - {edu.endDate} · {edu.location}</p>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="mb-7">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">SKILLS</h2>
                            <Rule dark />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-white/10 px-2 py-1 rounded text-[11px] font-medium text-gray-200 border border-white/5">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mt-7">
                        <div className="flex items-end gap-3 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">PROJECTS</h2>
                            <Rule />
                        </div>
                        {projects.map((item) => (
                            <div key={item.id} className="mt-4 break-inside-avoid">
                                <div className="flex items-baseline justify-between">
                                    <h3 className="text-[15px] font-bold text-gray-900">{item.name}</h3>
                                    <span className="text-[12px] text-gray-600">{item.startDate} - {item.endDate}</span>
                                </div>
                                <p className="text-[13px] font-semibold mb-1" style={{ color: primaryBlue }}>{item.technologies}</p>
                                <div className="text-[13px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="mb-7">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">CERTIFICATIONS</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {certifications.map((cert, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-[13px] font-semibold text-white">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-[11px] text-gray-400 mt-0.5">Expires: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages" className="mt-7">
                        <div className="flex items-end gap-3 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">LANGUAGES</h2>
                            <Rule />
                        </div>
                        <div className="mt-3 grid gap-3">
                            {languages.map((lang, i) => (
                                <div key={i} className="break-inside-avoid">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[13px] text-gray-900">{lang.language}</p>
                                        <span className="text-[12px] text-gray-500">{lang.proficiency}</span>
                                    </div>
                                    <Dots level={lang.proficiency} color={primaryBlue} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards" className="mb-7">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">AWARDS</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {awards.map((award, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-[13px] font-semibold text-white">{award.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-7">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">TRAINING</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {trainings.map((item, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-[13px] font-semibold text-white">{item.course}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mt-7">
                        <div className="flex items-end gap-3 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">PUBLICATIONS</h2>
                            <Rule />
                        </div>
                        {publications.map((pub) => (
                            <div key={pub.id} className="mt-3 break-inside-avoid">
                                <p className="text-[13px] font-semibold text-gray-900">{pub.title}</p>
                                <p className="text-[12px] text-gray-600">{pub.publisher}, {pub.date}</p>
                                <div className="text-[12px] text-gray-700 mt-1">{pub.description}</div>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-7">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">VOLUNTEERING</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {volunteer.map((vol, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-[13px] font-semibold text-white">{vol.role}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{vol.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-7">
                        <div className="flex items-end gap-3 mb-4 break-after-avoid">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">ADDITIONAL</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {custom.map((item, i) => (
                                <div className="break-inside-avoid" key={i}>
                                    <p className="text-[13px] font-semibold text-white">{item.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{item.subtitle}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-escobar"} className={`w-[794px] min-h-[1123px] h-auto bg-white shadow-sm border border-gray-200 flex ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>

            {/* LEFT COLUMN (≈66%) */}
            <div className="w-2/3 px-10 pt-10 pb-8">
                {/* Header */}
                <header>
                    <h1 className="text-[34px] leading-none tracking-tight font-extrabold text-gray-900 uppercase">{contact.firstName} {contact.lastName}</h1>
                    <p className="mt-1 text-[14px] font-semibold" style={{ color: primaryBlue }}>
                        {contact.jobTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-gray-600">
                        {contact.email && <span className="inline-flex items-center gap-1"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> {contact.email}</span>}
                        {contact.linkedin && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1"><Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> LinkedIn</span>
                            </>
                        )}
                        {(fullPhone || fullAddress) && (
                             <>
                                <span className="text-gray-300">•</span>
                                {fullPhone && <span className="inline-flex items-center gap-1"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> {fullPhone}</span>}
                                {fullAddress && <span className="inline-flex items-center gap-1 ml-2"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[14px]" /> {city}</span>}
                             </>
                        )}
                    </div>
                </header>

                {/* SUMMARY */}
                {renderRun(['summary', 'experience', 'projects', 'education', 'languages', 'publications'])}
            </div>

            {/* RIGHT SIDEBAR (≈34%) */}
            <aside className="w-1/3 text-white px-7 pt-10 pb-8 border-l border-gray-200/20" style={{ backgroundColor: sidebarBg }}>
                
                {/* Photo Area if needed in sidebar - though currently in header */}
                {contact.photo && (
                    <div className="mb-8 flex justify-center">
                        <div className="w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden">
                             <img src={contact.photo} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                )}

                {/* SKILLS */}
                {renderRun(['skills', 'certifications', 'awards', 'trainings', 'volunteer', 'custom'])}

            </aside>
        </div>
    );
};

export default React.memo(EscobarTemplate);
