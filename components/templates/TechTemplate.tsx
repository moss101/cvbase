
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

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

    return (
        <div id={isCardPreview ? undefined : "resume-preview-tech"} className={`w-[794px] min-h-[1123px] h-auto bg-white flex ${fontSize}`} style={{ fontFamily: settings?.fontFamily || "'Roboto', sans-serif" }}>
             <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>
            
            {/* Left Main Column (68%) */}
            <main className="w-[68%] p-10 pr-8 flex flex-col gap-8 text-gray-700">
                
                {/* Header */}
                <header className="mb-4">
                    <h1 className="text-4xl font-bold uppercase tracking-tight text-[#1e293b] mb-2">{contact.firstName} <span style={{ color: accentColor }}>{contact.lastName}</span></h1>
                    <p className="text-lg font-medium tracking-wide text-[#64748b] uppercase">{contact.jobTitle}</p>
                    
                    {/* Contact Row */}
                    <div className="flex flex-wrap gap-y-2 gap-x-4 mt-6 text-xs text-gray-500">
                        {fullPhone && <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" style={{ color: accentColor }}>call</span>{fullPhone}</div>}
                        {contact.email && <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" style={{ color: accentColor }}>mail</span>{contact.email}</div>}
                        {contact.linkedin && <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" style={{ color: accentColor }}>link</span>LinkedIn</div>}
                        {fullAddress && <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" style={{ color: accentColor }}>location_on</span>{city}</div>}
                    </div>
                </header>

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1">Experience</h2>
                        <div className="flex flex-col gap-6">
                            {experience.map(exp => (
                                <div key={exp.id}>
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
                )}

                {/* Education */}
                {education.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1">Education</h2>
                        <div className="flex flex-col gap-4">
                            {education.map(edu => (
                                <div key={edu.id}>
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
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1">Projects</h2>
                        <div className="flex flex-col gap-5">
                            {projects.map(item => (
                                <div key={item.id}>
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
                )}

                {/* Trainings (Restored) */}
                {visibleSections.includes('trainings') && trainings.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1">Training & Courses</h2>
                        <div className="flex flex-col gap-4">
                            {trainings.map(item => (
                                <div key={item.id}>
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
                )}

                {/* Publications (Restored) */}
                {visibleSections.includes('publications') && publications.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1">Publications</h2>
                        <div className="flex flex-col gap-4">
                            {publications.map(item => (
                                <div key={item.id}>
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
                )}

                {/* Custom */}
                {visibleSections.includes('custom') && custom.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-200 pb-1">Additional</h2>
                        <div className="flex flex-col gap-4">
                            {custom.map(item => (
                                <div key={item.id}>
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
                )}
            </main>

            {/* Right Sidebar (32%) */}
            <aside className="w-[32%] bg-[#f8fafc] p-8 flex flex-col gap-8 border-l border-gray-100">
                
                {contact.photo && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-sm mx-auto">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}

                {summary.professionalSummary && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Profile</h2>
                        <div className="text-xs leading-relaxed text-gray-600 italic text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                )}

                {visibleSections.includes('awards') && awards.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Achievements</h2>
                        <div className="flex flex-col gap-4">
                            {awards.map((award, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-[#1e293b] shadow-sm">
                                        <span className="material-symbols-outlined text-sm">emoji_events</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">{award.title}</p>
                                        <p className="text-[10px] text-gray-500">{award.issuer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {skills.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-white border border-gray-200 px-3 py-1.5 rounded-md text-[10px] font-semibold text-gray-700 shadow-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('languages') && languages.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Languages</h2>
                        <div className="flex flex-col gap-3">
                            {languages.map((lang, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-gray-700">{lang.language}</span>
                                        <span className="text-gray-400 text-[9px]">{lang.proficiency}</span>
                                    </div>
                                    {renderDots(lang.proficiency)}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Certifications</h2>
                        <ul className="space-y-3">
                            {certifications.map((cert, i) => (
                                <li key={i} className="text-xs">
                                    <strong className="block text-gray-800">{cert.name}</strong>
                                    {cert.expiryDate && <span className="text-gray-400 text-[9px]">Expires: {cert.expiryDate}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                
                {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Volunteering</h2>
                        <div className="flex flex-col gap-3">
                            {volunteer.map((vol, i) => (
                                <div key={i}>
                                    <p className="text-xs font-bold text-gray-800">{vol.role}</p>
                                    <p className="text-[10px] text-gray-500">{vol.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </aside>
        </div>
    );
};

export default TechTemplate;
