
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const TechBlueTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const themeColor = settings?.themeColor || '#2563eb'; // Blue 600
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-tech-blue"} className={`w-[794px] min-h-[1123px] h-auto bg-white shadow-lg p-10 font-sans text-gray-700 ${fontSize}`} style={{ fontFamily: settings?.fontFamily || "'Inter', sans-serif" }}>
             <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>

            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold mb-2 uppercase tracking-tight" style={{ color: themeColor }}>{contact.firstName} {contact.lastName}</h1>
                <h2 className="text-lg text-gray-500 mb-6 font-medium tracking-wide uppercase">{contact.jobTitle}</h2>
                
                {/* Contact Grid */}
                <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-600 border-t border-b border-gray-100 py-4">
                    {contact.email && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg" style={{ color: themeColor }}>mail</span>
                            <span>{contact.email}</span>
                        </div>
                    )}
                    {fullPhone && (
                         <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg" style={{ color: themeColor }}>call</span>
                            <span>{fullPhone}</span>
                        </div>
                    )}
                    {contact.linkedin && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg" style={{ color: themeColor }}>link</span>
                            <span>LinkedIn</span>
                        </div>
                    )}
                    {fullAddress && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg" style={{ color: themeColor }}>location_on</span>
                            <span>{city}, {countryName}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-10">
                
                {/* Left Column (2/3) */}
                <div className="col-span-2 space-y-8">
                    
                    {summary.professionalSummary && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-3 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Summary</h3>
                            <div className="text-sm leading-relaxed text-justify text-gray-600" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                        </section>
                    )}

                    {skills.length > 0 && (
                         <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Skills</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {skills.map((skill, i) => (
                                    <div key={i} className="bg-gray-50 px-3 py-2 rounded text-xs font-semibold text-gray-700 border-l-4" style={{ borderColor: themeColor }}>
                                        {skill}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {experience.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-5 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Experience</h3>
                            <div className="space-y-8">
                                {experience.map(exp => (
                                    <div key={exp.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{exp.jobTitle}</h4>
                                                <p className="font-semibold text-xs uppercase tracking-wide mt-0.5" style={{ color: themeColor }}>{exp.company}</p>
                                            </div>
                                            <div className="text-xs text-gray-400 font-medium text-right">
                                                <div className="flex items-center gap-1 justify-end"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {exp.startDate} - {exp.endDate}</div>
                                                <div className="flex items-center gap-1 justify-end mt-0.5"><span className="material-symbols-outlined text-[14px]">pin_drop</span> {exp.location}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs leading-relaxed text-gray-600 mt-3 pl-1" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column (1/3) */}
                <div className="col-span-1 space-y-8">
                    
                     {awards.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Achievements</h3>
                            <div className="space-y-4">
                                {awards.map((award, i) => (
                                    <div key={i} className="flex gap-3 items-start break-inside-avoid">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-blue-50 text-blue-600">
                                             <span className="material-symbols-outlined text-sm">emoji_events</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-xs">{award.title}</h4>
                                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{award.issuer}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {projects.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Projects</h3>
                            <div className="space-y-4">
                                {projects.map(item => (
                                    <div key={item.id} className="flex gap-3 items-start break-inside-avoid">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-blue-50 text-blue-600">
                                             <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-xs">{item.name}</h4>
                                            <p className="text-[10px] text-gray-500 mt-0.5 italic">{item.technologies}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {education.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Education</h3>
                            <div className="space-y-5">
                                {education.map(edu => (
                                    <div key={edu.id} className="break-inside-avoid">
                                        <h4 className="font-bold text-gray-800 text-xs">{edu.degree}</h4>
                                        <p className="font-medium text-xs mt-0.5" style={{ color: themeColor }}>{edu.school}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">calendar_month</span> {edu.startDate} - {edu.endDate}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {trainings.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Courses</h3>
                            <div className="space-y-3">
                                {trainings.map(item => (
                                    <div key={item.id} className="break-inside-avoid">
                                        <h4 className="font-bold text-gray-800 text-xs">{item.course}</h4>
                                        <p className="text-[10px] text-gray-600">{item.institution}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {custom.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Interests</h3>
                            <div className="space-y-3">
                                {custom.map(item => (
                                    <div key={item.id} className="break-inside-avoid flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-gray-400">favorite</span>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-xs">{item.title}</h4>
                                            <p className="text-[10px] text-gray-500">{item.subtitle}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {languages.length > 0 && (
                         <section>
                            <h3 className="text-base font-bold text-gray-800 mb-4 border-b-2 pb-1 uppercase tracking-wider" style={{ borderColor: themeColor }}>Languages</h3>
                            <div className="space-y-3">
                                {languages.map((lang, i) => (
                                    <div key={i} className="break-inside-avoid">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="font-medium text-gray-700">{lang.language}</span>
                                            <span className="text-gray-500 text-[9px]">{lang.proficiency}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: lang.proficiency.toLowerCase().includes('native') ? '100%' : lang.proficiency.toLowerCase().includes('fluent') ? '85%' : '60%', backgroundColor: themeColor }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TechBlueTemplate;
