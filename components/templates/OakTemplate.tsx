
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const OakTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#a98677'; // Clay/Brownish
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-oak"} className="w-[794px] min-h-[1123px] h-auto bg-white text-[#333] text-[10px] p-10 font-sans" style={{ fontFamily: "'Roboto', sans-serif" }}>
             <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>
            <header className="text-center mb-8">
                <div className="inline-block border-2 px-10 py-3 mb-4" style={{ borderColor: '#333' }}>
                    <h1 className="text-4xl font-bold uppercase tracking-widest">{contact.firstName} {contact.lastName}</h1>
                </div>
                <div className="w-full py-2 text-white uppercase tracking-[0.2em] font-bold text-sm" style={{ backgroundColor: accentColor }}>
                    {contact.jobTitle}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8 h-full">
                {/* Sidebar */}
                <aside className="col-span-4 border-r border-gray-200 pr-6 flex flex-col gap-8">
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-4 h-0.5 bg-gray-800"></span> Contact
                        </h2>
                        <div className="space-y-3 text-xs text-gray-600">
                             {fullPhone && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1">{fullPhone}</span> <span className="material-symbols-outlined bg-gray-200 p-1 rounded text-gray-600 text-[14px]">call</span></div>}
                             {contact.email && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1 break-all">{contact.email}</span> <span className="material-symbols-outlined bg-gray-200 p-1 rounded text-gray-600 text-[14px]">mail</span></div>}
                             {fullAddress && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1">{city}, {countryName}</span> <span className="material-symbols-outlined bg-gray-200 p-1 rounded text-gray-600 text-[14px]">location_on</span></div>}
                             {contact.linkedin && <div className="flex items-center gap-2 justify-end text-right"><span className="flex-1">LinkedIn</span> <span className="material-symbols-outlined bg-gray-200 p-1 rounded text-gray-600 text-[14px]">link</span></div>}
                        </div>
                    </section>

                    {education.length > 0 && (
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Education
                            </h2>
                            <div className="space-y-4 text-right">
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <p className="text-xs text-gray-400 mb-1">{edu.endDate}</p>
                                        <h3 className="font-bold text-xs text-gray-800">{edu.degree}</h3>
                                        <p className="text-xs italic text-gray-600">{edu.school}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {skills.length > 0 && (
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Skills
                            </h2>
                            <div className="space-y-2">
                                {skills.map((skill, i) => (
                                    <div key={i} className="flex flex-col items-end">
                                        <span className="text-xs font-medium mb-1">{skill}</span>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                             <div className="h-full rounded-full" style={{ width: '80%', backgroundColor: accentColor }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                         <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Languages
                            </h2>
                             <div className="space-y-2 text-right">
                                {languages.map((lang, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-xs">{lang.language}</p>
                                        <p className="text-[9px] text-gray-500">{lang.proficiency}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                     {visibleSections.includes('certifications') && certifications.length > 0 && (
                         <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Certifications
                            </h2>
                             <div className="space-y-2 text-right">
                                {certifications.map((cert, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-xs">{cert.name}</p>
                                        {cert.expiryDate && <p className="text-[9px] text-gray-500">Exp: {cert.expiryDate}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                     {visibleSections.includes('awards') && awards.length > 0 && (
                         <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Awards
                            </h2>
                             <div className="space-y-2 text-right">
                                {awards.map((award, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-xs">{award.title}</p>
                                        <p className="text-[9px] text-gray-500">{award.issuer}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>

                {/* Main Content */}
                <main className="col-span-8 space-y-8">
                     {summary.professionalSummary && (
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Profile
                            </h2>
                            <div className="text-xs leading-relaxed text-gray-600 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                        </section>
                    )}

                    {experience.length > 0 && (
                        <section>
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Professional Experience
                            </h2>
                            <div className="space-y-6">
                                {experience.map(exp => (
                                    <div key={exp.id}>
                                        <div className="flex justify-between items-end mb-1 border-b border-gray-200 pb-1">
                                            <div>
                                                <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                                <p className="text-xs font-bold uppercase" style={{ color: accentColor }}>{exp.company}</p>
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">{exp.startDate} – {exp.endDate}</span>
                                        </div>
                                        <div className="text-xs leading-relaxed text-gray-600 mt-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('projects') && projects.length > 0 && (
                         <section>
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Projects
                            </h2>
                            <div className="space-y-4">
                                {projects.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-sm text-gray-800">{item.name}</h3>
                                            <span className="text-xs text-gray-500">{item.startDate} – {item.endDate}</span>
                                        </div>
                                        <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.technologies}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {visibleSections.includes('trainings') && trainings.length > 0 && (
                         <section>
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Trainings
                            </h2>
                            <div className="space-y-4">
                                {trainings.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-sm text-gray-800">{item.course}</h3>
                                            <span className="text-xs text-gray-500">{item.date}</span>
                                        </div>
                                        <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.institution}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('publications') && publications.length > 0 && (
                         <section>
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Publications
                            </h2>
                            <div className="space-y-4">
                                {publications.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                            <span className="text-xs text-gray-500">{item.date}</span>
                                        </div>
                                        <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.publisher}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                         <section>
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Volunteering
                            </h2>
                            <div className="space-y-4">
                                {volunteer.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-sm text-gray-800">{item.role}</h3>
                                            <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                        </div>
                                        <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.organization}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('custom') && custom.length > 0 && (
                         <section>
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-gray-800"></span> Additional
                            </h2>
                            <div className="space-y-4">
                                {custom.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                            <span className="text-xs text-gray-500">{item.date}</span>
                                        </div>
                                        <p className="text-[9px] uppercase font-bold mb-1" style={{ color: accentColor }}>{item.subtitle}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default OakTemplate;
