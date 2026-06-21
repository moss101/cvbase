
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

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

    return (
        <div id={isCardPreview ? undefined : "resume-preview-escobar"} className={`w-[794px] min-h-[1123px] h-auto bg-white shadow-sm border border-gray-200 flex ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>

            {/* LEFT COLUMN (≈66%) */}
            <div className="w-2/3 px-10 pt-10 pb-8">
                {/* Header */}
                <header>
                    <h1 className="text-[34px] leading-none tracking-tight font-extrabold text-gray-900 uppercase">{contact.firstName} {contact.lastName}</h1>
                    <p className="mt-1 text-[14px] font-semibold" style={{ color: primaryBlue }}>
                        {contact.jobTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-gray-600">
                        {contact.email && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">mail</span> {contact.email}</span>}
                        {contact.linkedin && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">link</span> LinkedIn</span>
                            </>
                        )}
                        {(fullPhone || fullAddress) && (
                             <>
                                <span className="text-gray-300">•</span>
                                {fullPhone && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span> {fullPhone}</span>}
                                {fullAddress && <span className="inline-flex items-center gap-1 ml-2"><span className="material-symbols-outlined text-[14px]">location_on</span> {city}</span>}
                             </>
                        )}
                    </div>
                </header>

                {/* SUMMARY */}
                {summary.professionalSummary && (
                    <section className="mt-7">
                        <div className="flex items-end gap-3">
                            <h2 className="text-[12px] tracking-[0.18em] text-gray-800 font-semibold uppercase">SUMMARY</h2>
                            <Rule />
                        </div>
                        <div className="mt-2 text-[13px] leading-relaxed text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* EXPERIENCE */}
                {experience.length > 0 && (
                    <section className="mt-7">
                        <div className="flex items-end gap-3">
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
                                <div className="mt-2 text-[13px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                            </div>
                        ))}
                    </section>
                )}

                {/* PROJECTS */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mt-7">
                        <div className="flex items-end gap-3">
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
                                <div className="text-[13px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />
                            </div>
                        ))}
                    </section>
                )}

                {/* EDUCATION */}
                {education.length > 0 && (
                    <section className="mt-7">
                        <div className="flex items-end gap-3">
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
                )}

                {/* LANGUAGES (Left column) */}
                {visibleSections.includes('languages') && languages.length > 0 && (
                    <section className="mt-7">
                        <div className="flex items-end gap-3">
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
                )}
                
                {/* PUBLICATIONS */}
                {visibleSections.includes('publications') && publications.length > 0 && (
                    <section className="mt-7">
                        <div className="flex items-end gap-3">
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
                )}
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
                {skills.length > 0 && (
                    <section className="mb-7">
                        <div className="flex items-end gap-3 mb-4">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">SKILLS</h2>
                            <Rule dark />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-white/10 px-2 py-1 rounded text-[11px] font-medium text-gray-200 border border-white/5">{skill}</span>
                            ))}
                        </div>
                    </section>
                )}

                {/* CERTIFICATIONS */}
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section className="mb-7">
                        <div className="flex items-end gap-3 mb-4">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">CERTIFICATIONS</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {certifications.map((cert, i) => (
                                <div key={i}>
                                    <p className="text-[13px] font-semibold text-white">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-[11px] text-gray-400 mt-0.5">Expires: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* AWARDS */}
                {visibleSections.includes('awards') && awards.length > 0 && (
                    <section className="mb-7">
                        <div className="flex items-end gap-3 mb-4">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">AWARDS</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {awards.map((award, i) => (
                                <div key={i}>
                                    <p className="text-[13px] font-semibold text-white">{award.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* TRAININGS */}
                {visibleSections.includes('trainings') && trainings.length > 0 && (
                    <section className="mb-7">
                        <div className="flex items-end gap-3 mb-4">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">TRAINING</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {trainings.map((item, i) => (
                                <div key={i}>
                                    <p className="text-[13px] font-semibold text-white">{item.course}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* VOLUNTEERING */}
                {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                    <section className="mb-7">
                        <div className="flex items-end gap-3 mb-4">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">VOLUNTEERING</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {volunteer.map((vol, i) => (
                                <div key={i}>
                                    <p className="text-[13px] font-semibold text-white">{vol.role}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{vol.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* CUSTOM */}
                {visibleSections.includes('custom') && custom.length > 0 && (
                    <section className="mb-7">
                        <div className="flex items-end gap-3 mb-4">
                            <h2 className="text-[12px] tracking-[0.18em] font-semibold uppercase text-gray-300">ADDITIONAL</h2>
                            <Rule dark />
                        </div>
                        <div className="space-y-4">
                            {custom.map((item, i) => (
                                <div key={i}>
                                    <p className="text-[13px] font-semibold text-white">{item.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{item.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </aside>
        </div>
    );
};

export default EscobarTemplate;
