
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const TimelineTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#2c3e50';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-timeline"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#333] ${fontSize} flex flex-col`} style={{ fontFamily: settings?.fontFamily || "'Roboto', sans-serif" }}>
            
            {/* Header */}
            <header className="bg-white p-10 pb-6 border-b-4" style={{ borderColor: primaryColor }}>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-tight">{contact.firstName} <span style={{ color: primaryColor }}>{contact.lastName}</span></h1>
                        <p className="text-lg font-medium text-gray-500 mt-1 tracking-wide">{contact.jobTitle}</p>
                    </div>
                    {contact.photo && (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg ring-2" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}>
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
                <div className="flex gap-6 mt-6 text-xs text-gray-600 font-medium">
                     {contact.email && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">mail</span> {contact.email}</span>}
                     {fullPhone && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">call</span> {fullPhone}</span>}
                     {fullAddress && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> {city}</span>}
                     {contact.linkedin && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">link</span> LinkedIn</span>}
                </div>
            </header>

            <main className="flex-1 p-10 grid grid-cols-12 gap-8">
                
                {/* Timeline Column */}
                <div className="col-span-8">
                     {summary.professionalSummary && (
                        <div className="mb-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: primaryColor }}>person</span> Professional Profile
                            </h2>
                             <div className="text-justify leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                        </div>
                    )}

                    {experience.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: primaryColor }}>history_edu</span> Experience Timeline
                            </h2>
                            <div className="relative border-l-2 border-gray-200 ml-2 space-y-8 pb-2">
                                {experience.map((exp, idx) => (
                                    <div key={exp.id} className="relative pl-8">
                                        {/* Timeline Dot */}
                                        <span 
                                            className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white"
                                            style={{ backgroundColor: primaryColor }}
                                        ></span>
                                        
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-gray-900">{exp.jobTitle}</h3>
                                            <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: primaryColor }}>
                                                {exp.startDate} - {exp.endDate}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase">{exp.company}, {exp.location}</p>
                                        <div className="text-xs leading-relaxed text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                     {visibleSections.includes('projects') && projects.length > 0 && (
                         <div>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: primaryColor }}>code_blocks</span> Key Projects
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {projects.map(item => (
                                    <div key={item.id} className="border border-gray-200 p-3 rounded-lg hover:border-gray-400 transition-colors">
                                        <h3 className="font-bold text-xs text-gray-900">{item.name}</h3>
                                        <p className="text-[9px] text-gray-500 mb-2">{item.startDate} - {item.endDate}</p>
                                        <p className="text-[9px] font-medium mb-1" style={{ color: primaryColor }}>{item.technologies}</p>
                                        <div className="text-[9px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {visibleSections.includes('publications') && publications && publications.length > 0 && (
                         <div className="mt-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: primaryColor }}>menu_book</span> Publications
                            </h2>
                            <div className="space-y-3">
                                {publications.map(item => (
                                    <div key={item.id} className="border border-gray-200 p-3 rounded-lg hover:border-gray-400 transition-colors">
                                        <h3 className="font-bold text-xs text-gray-900">{item.title}</h3>
                                        <p className="text-[9px] text-gray-500 mb-1">{item.publisher} ({item.date})</p>
                                        <div className="text-[9px] leading-relaxed text-gray-600">{item.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                         <div className="mt-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: primaryColor }}>volunteer_activism</span> Volunteering
                            </h2>
                            <div className="space-y-3">
                                {volunteer.map(item => (
                                    <div key={item.id} className="border border-gray-200 p-3 rounded-lg hover:border-gray-400 transition-colors">
                                        <h3 className="font-bold text-xs text-gray-900">{item.role}</h3>
                                        <p className="text-[9px] text-gray-500 mb-1">{item.organization} ({item.startDate} - {item.endDate})</p>
                                        <div className="text-[9px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {visibleSections.includes('custom') && custom && custom.length > 0 && (
                         <div className="mt-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: primaryColor }}>more</span> Additional
                            </h2>
                            <div className="space-y-3">
                                {custom.map(item => (
                                    <div key={item.id} className="border border-gray-200 p-3 rounded-lg hover:border-gray-400 transition-colors">
                                        <h3 className="font-bold text-xs text-gray-900">{item.title}</h3>
                                        <p className="text-[9px] text-gray-500 mb-1">{item.subtitle} ({item.date})</p>
                                        <div className="text-[9px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="col-span-4 space-y-8">
                     {skills.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl">
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Expertise</h2>
                             <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="text-xs font-medium bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-gray-700">{skill}</span>
                                ))}
                             </div>
                        </div>
                    )}

                    {education.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl">
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Education</h2>
                             <div className="space-y-4">
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                                        <p className="text-xs font-medium" style={{ color: primaryColor }}>{edu.school}</p>
                                        <p className="text-[9px] text-gray-500 mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                    
                    {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl">
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Training</h2>
                             <div className="space-y-4">
                                {trainings.map(item => (
                                    <div key={item.id}>
                                        <h3 className="font-bold text-xs text-gray-900">{item.course}</h3>
                                        <p className="text-xs font-medium" style={{ color: primaryColor }}>{item.institution}</p>
                                        <p className="text-[9px] text-gray-500 mt-0.5">{item.date}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl">
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Credentials</h2>
                             <ul className="space-y-3">
                                {certifications.map(cert => (
                                    <li key={cert.id} className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: primaryColor }}>verified</span>
                                        <div>
                                            <p className="font-bold text-xs text-gray-800">{cert.name}</p>
                                            {cert.expiryDate && <p className="text-[9px] text-gray-500">Exp: {cert.expiryDate}</p>}
                                        </div>
                                    </li>
                                ))}
                             </ul>
                        </div>
                    )}

                     {visibleSections.includes('languages') && languages && languages.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl">
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Languages</h2>
                             <ul className="space-y-3">
                                {languages.map(lang => (
                                    <li key={lang.id} className="flex items-start gap-2 justify-between">
                                        <p className="font-bold text-xs text-gray-800">{lang.language}</p>
                                        <p className="text-[9px] text-gray-500">{lang.proficiency}</p>
                                    </li>
                                ))}
                             </ul>
                        </div>
                    )}
                    {visibleSections.includes('awards') && awards && awards.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl">
                             <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Awards</h2>
                             <ul className="space-y-3">
                                {awards.map(award => (
                                    <li key={award.id} className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: primaryColor }}>emoji_events</span>
                                        <div>
                                            <p className="font-bold text-xs text-gray-800">{award.title}</p>
                                            <p className="text-[9px] text-gray-500">{award.issuer}</p>
                                        </div>
                                    </li>
                                ))}
                             </ul>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default TimelineTemplate;
