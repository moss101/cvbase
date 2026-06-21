
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const MelbourneTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#7c3aed'; // Violet/Purple default
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-melbourne"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#333] ${fontSize} p-10 font-sans relative`} style={{ fontFamily: settings?.fontFamily || "'Lato', sans-serif" }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>
            
            {/* Photo Circle Top Right */}
            {contact.photo && (
                <div className="absolute top-10 right-10 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg z-10">
                    <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                </div>
            )}

            {/* Header Section */}
            <header className="mb-12 pr-36">
                <h1 className="text-5xl font-bold text-gray-800 mb-2 tracking-tight" style={{ color: primaryColor }}>
                    {contact.firstName} {contact.lastName}
                </h1>
                <p className="text-xl font-medium text-gray-600 mb-6">{contact.jobTitle}</p>
                
                <div className="flex flex-col gap-1.5 text-xs text-gray-500 font-medium">
                    {contact.email && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>mail</span>
                            <span>{contact.email}</span>
                        </div>
                    )}
                    {fullPhone && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>call</span>
                            <span>{fullPhone}</span>
                        </div>
                    )}
                    {fullAddress && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>location_on</span>
                            <span>{fullAddress}</span>
                        </div>
                    )}
                    {contact.linkedin && (
                         <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>link</span>
                            <span>{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                
                {/* Left Column (Main) */}
                <div className="col-span-8 space-y-10">
                     {summary.professionalSummary && (
                        <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Profile</h2>
                            <div className="leading-relaxed text-justify text-gray-700" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                        </section>
                    )}

                    {experience.length > 0 && (
                        <section>
                             <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Experience</h2>
                            <div className="space-y-8">
                                {experience.map(exp => (
                                    <div key={exp.id} className="relative pl-4 border-l-2" style={{ borderColor: `${primaryColor}30` }}>
                                        <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                        
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-[1.1em] text-gray-800">{exp.jobTitle}</h3>
                                            <span className="text-[0.9em] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{exp.startDate} - {exp.endDate}</span>
                                        </div>
                                        <p className="font-semibold text-[0.95em] mb-2" style={{ color: primaryColor }}>{exp.company}, {exp.location}</p>
                                        <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {visibleSections.includes('projects') && projects.length > 0 && (
                        <section>
                             <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Projects</h2>
                            <div className="space-y-6">
                                {projects.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-[1.1em] text-gray-800">{item.name}</h3>
                                            <span className="text-[0.9em] font-medium text-gray-500">{item.startDate} - {item.endDate}</span>
                                        </div>
                                        <p className="text-[0.9em] font-semibold mb-2 italic opacity-80">{item.technologies}</p>
                                        <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {visibleSections.includes('publications') && publications.length > 0 && (
                         <section>
                             <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Publications</h2>
                            <div className="space-y-4">
                                {publications.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-[1.1em] text-gray-800">{item.title}</h3>
                                            <span className="text-[0.9em] font-medium text-gray-500">{item.date}</span>
                                        </div>
                                        <p className="text-[0.95em] font-medium mb-1" style={{ color: primaryColor }}>{item.publisher}</p>
                                        <div className="leading-relaxed text-gray-600">{item.description}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                         <section>
                             <h2 className="font-bold text-sm uppercase tracking-wider mb-6 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Volunteering</h2>
                            <div className="space-y-4">
                                {volunteer.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-[1.1em] text-gray-800">{item.role}</h3>
                                            <span className="text-[0.9em] font-medium text-gray-500">{item.startDate} - {item.endDate}</span>
                                        </div>
                                        <p className="text-[0.95em] font-medium mb-2" style={{ color: primaryColor }}>{item.organization}</p>
                                        <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column (Sidebar) */}
                <div className="col-span-4 space-y-10 pt-2">
                    
                     {skills.length > 0 && (
                        <section className="bg-gray-50 p-6 rounded-xl">
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 text-gray-700">Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="px-2 py-1 bg-white rounded border border-gray-200 text-[0.9em] font-medium text-gray-600 shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {education.length > 0 && (
                        <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Education</h2>
                            <div className="space-y-5">
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <h3 className="font-bold text-[1em] text-gray-800">{edu.degree}</h3>
                                        <p className="text-[0.95em] font-medium mt-1" style={{ color: primaryColor }}>{edu.school}</p>
                                        <p className="text-[0.9em] text-gray-500 mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                        <p className="text-[0.9em] text-gray-400">{edu.location}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                         <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Certifications</h2>
                            <div className="space-y-3">
                                {certifications.map((cert, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-[0.95em] text-gray-800">{cert.name}</p>
                                        {cert.expiryDate && <p className="text-[0.85em] text-gray-500 mt-0.5">Expires: {cert.expiryDate}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {visibleSections.includes('languages') && languages.length > 0 && (
                         <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Languages</h2>
                            <ul className="space-y-2">
                                {languages.map((lang, i) => (
                                    <li key={i} className="flex justify-between items-center text-[0.95em]">
                                        <span className="font-medium text-gray-700">{lang.language}</span>
                                        <span className="text-gray-500 text-[0.85em]">{lang.proficiency}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                     {visibleSections.includes('awards') && awards.length > 0 && (
                         <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Awards</h2>
                            <div className="space-y-3">
                                {awards.map((award, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-[0.95em] text-gray-800">{award.title}</p>
                                        <p className="text-[0.85em] text-gray-500 mt-0.5">{award.issuer}, {award.date}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('trainings') && trainings.length > 0 && (
                         <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Training</h2>
                            <div className="space-y-3">
                                {trainings.map((item, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-[0.95em] text-gray-800">{item.course}</p>
                                        <p className="text-[0.85em] text-gray-500 mt-0.5">{item.institution}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                     {visibleSections.includes('custom') && custom.length > 0 && (
                         <section>
                            <h2 className="font-bold text-sm uppercase tracking-wider mb-4 border-b-2 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Additional</h2>
                            <div className="space-y-3">
                                {custom.map((item, i) => (
                                    <div key={i}>
                                        <p className="font-bold text-[0.95em] text-gray-800">{item.title}</p>
                                        <p className="text-[0.85em] text-gray-500 mt-0.5">{item.subtitle}</p>
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

export default MelbourneTemplate;
