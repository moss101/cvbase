
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const AmsterdamTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#1e40af'; // Blue default
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-amsterdam"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#333] ${fontSize} p-12 font-sans`} style={{ fontFamily: settings?.fontFamily || "'Roboto', sans-serif" }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>
            
            <header className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-[#1e3a8a] mb-1 tracking-tight" style={{ color: primaryColor }}>{contact.firstName} {contact.lastName}</h1>
                    <p className="text-xl text-[#60a5fa] font-medium" style={{ color: primaryColor, opacity: 0.8 }}>{contact.jobTitle}</p>
                </div>
                <div className="flex gap-6 mt-2 text-gray-500 text-xs">
                    {contact.email && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>mail</span>{contact.email}</div>}
                    {fullPhone && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>call</span>{fullPhone}</div>}
                    {contact.linkedin && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>link</span>LinkedIn</div>}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                
                {/* Left Column (Main Content) */}
                <div className="col-span-7 space-y-8">
                    {summary.professionalSummary && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Summary</h2>
                            <div className="text-xs leading-6 text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                        </section>
                    )}

                    {experience.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Experience</h2>
                            <div className="space-y-6">
                                {experience.map(exp => (
                                    <div key={exp.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{exp.jobTitle}</h3>
                                        <div className="text-[#60a5fa] font-medium text-xs mb-1" style={{ color: primaryColor }}>{exp.company}</div>
                                        <div className="flex items-center gap-2 text-gray-500 text-[9px] mb-2">
                                            <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                                            <span>{exp.startDate} - {exp.endDate}</span>
                                            <span className="material-symbols-outlined text-[12px] ml-2">location_on</span>
                                            <span>{exp.location}</span>
                                        </div>
                                        <div className="text-xs leading-relaxed text-gray-600 pl-2 border-l-2 border-gray-100" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {visibleSections.includes('projects') && projects.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Projects</h2>
                            <div className="space-y-5">
                                {projects.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{item.name}</h3>
                                        <p className="text-xs font-medium text-gray-500 italic mb-1">{item.technologies}</p>
                                        <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('publications') && publications && publications.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Publications</h2>
                            <div className="space-y-4">
                                {publications.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                                        <p className="text-xs text-[#60a5fa] font-medium" style={{ color: primaryColor }}>{item.publisher}</p>
                                        <p className="text-gray-400 text-[9px]">{item.date}</p>
                                        {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Volunteering</h2>
                            <div className="space-y-4">
                                {volunteer.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{item.role}</h3>
                                        <p className="text-xs text-[#60a5fa] font-medium" style={{ color: primaryColor }}>{item.organization}</p>
                                        <p className="text-gray-400 text-[9px]">{item.startDate} - {item.endDate}</p>
                                        <div className="text-xs leading-relaxed text-gray-600 pl-2 border-l-2 border-gray-100" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('custom') && custom && custom.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Additional</h2>
                            <div className="space-y-4">
                                {custom.map(item => (
                                    <div key={item.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                                        <p className="text-xs text-[#60a5fa] font-medium" style={{ color: primaryColor }}>{item.subtitle}</p>
                                        <p className="text-gray-400 text-[9px]">{item.date}</p>
                                        <div className="text-xs leading-relaxed text-gray-600 pl-2 border-l-2 border-gray-100" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column (Sidebar) */}
                <div className="col-span-5 space-y-8 pt-2">
                    {/* Address Block for Sidebar */}
                    {fullAddress && (
                        <section>
                            <div className="flex items-start gap-2 text-gray-600 text-xs">
                                <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: primaryColor }}>location_on</span>
                                <span className="font-medium">{fullAddress}</span>
                            </div>
                        </section>
                    )}

                    {education.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Education</h2>
                            <div className="space-y-4">
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <h3 className="text-sm font-bold text-gray-800">{edu.degree}</h3>
                                        <p className="text-xs text-[#60a5fa] font-medium" style={{ color: primaryColor }}>{edu.school}</p>
                                        <p className="text-gray-400 text-[9px] mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                        <p className="text-gray-400 text-[9px]">{edu.location}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {skills.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-gray-50 text-gray-700 border-b-2 border-gray-200 font-semibold text-xs">{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Certifications</h2>
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

                    {visibleSections.includes('awards') && awards && awards.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Awards</h2>
                            <ul className="space-y-3">
                                {awards.map((award, i) => (
                                    <li key={i} className="text-xs">
                                        <strong className="block text-gray-800">{award.title}</strong>
                                        <span className="text-gray-500 text-[9px]">{award.issuer} ({award.date})</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                     {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Trainings</h2>
                            <ul className="space-y-3">
                                {trainings.map((item, i) => (
                                    <li key={i} className="text-xs">
                                        <strong className="block text-gray-800">{item.course}</strong>
                                        <span className="text-gray-500 text-[9px]">{item.institution} ({item.date})</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {visibleSections.includes('languages') && languages.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 pb-1 mb-4" style={{ color: primaryColor, borderColor: primaryColor }}>Languages</h2>
                            <div className="space-y-2">
                                {languages.map((lang, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700">{lang.language}</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((dot) => (
                                                <div 
                                                    key={dot} 
                                                    className={`w-2 h-2 rounded-full ${
                                                        (lang.proficiency.toLowerCase().includes('native') && dot <= 5) || 
                                                        (lang.proficiency.toLowerCase().includes('fluent') && dot <= 4) || 
                                                        (lang.proficiency.toLowerCase().includes('conversational') && dot <= 3) 
                                                        ? 'bg-[#1e3a8a]' 
                                                        : 'bg-gray-200'
                                                    }`}
                                                    style={{ backgroundColor: (
                                                        (lang.proficiency.toLowerCase().includes('native') && dot <= 5) || 
                                                        (lang.proficiency.toLowerCase().includes('fluent') && dot <= 4) || 
                                                        (lang.proficiency.toLowerCase().includes('conversational') && dot <= 3) 
                                                    ) ? primaryColor : '#e5e7eb' }}
                                                ></div>
                                            ))}
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

export default AmsterdamTemplate;
