
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const LeafyTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#6b9080'; 
    const lightBg = `${primaryColor}15`; // Light background tint
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-leafy"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#4a4a4a] ${fontSize} font-sans relative overflow-hidden flex flex-col`} style={{ fontFamily: settings?.fontFamily || "'Lato', sans-serif" }}>
            
            {/* Decorative Header Background - Simplified and Robust */}
            <div className="absolute top-0 left-0 w-full h-[220px] z-0" style={{ 
                background: `linear-gradient(135deg, ${lightBg} 0%, white 100%)`,
                borderBottomRightRadius: '50% 40px',
                borderBottomLeftRadius: '50% 40px'
            }}></div>

            <div className="relative z-10 px-14 pt-14 pb-10 flex flex-col h-full">
                
                {/* Header Section */}
                <header className="flex items-center gap-8 mb-14">
                    {contact.photo && (
                        <div className="w-32 h-32 rounded-full overflow-hidden border-[6px] border-white shadow-lg shrink-0 relative z-20">
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1 pt-2">
                        <h1 className="text-5xl font-light text-gray-800 mb-2 tracking-tight leading-none">
                            {contact.firstName} <span className="font-bold" style={{ color: primaryColor }}>{contact.lastName}</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-lg tracking-widest uppercase font-bold text-gray-500">
                                {contact.jobTitle}
                            </p>
                             <span className="h-0.5 w-16 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                        </div>
                        
                        {/* Contact Details Row */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs font-medium text-gray-600">
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
                                    <span>{city}</span>
                                </div>
                             )}
                             {contact.linkedin && (
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm" style={{ color: primaryColor }}>link</span>
                                    <span>LinkedIn</span>
                                </div>
                             )}
                        </div>
                    </div>
                    {/* Leaf Accent */}
                    <span className="material-symbols-outlined text-6xl absolute top-8 right-10 opacity-10 rotate-12" style={{ color: primaryColor }}>eco</span>
                </header>

                <div className="grid grid-cols-12 gap-12 flex-1">
                    
                    {/* Left Sidebar (4 cols) */}
                    <aside className="col-span-4 space-y-12 pt-2">
                        
                        {skills.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2" style={{ borderColor: `${primaryColor}40` }}>
                                    <span className="material-symbols-outlined" style={{ color: primaryColor }}>psychology</span> Expertise
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: `${primaryColor}15`, color: '#4a4a4a' }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                         {visibleSections.includes('languages') && languages.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2" style={{ borderColor: `${primaryColor}40` }}>
                                    <span className="material-symbols-outlined" style={{ color: primaryColor }}>language</span> Languages
                                </h2>
                                <ul className="space-y-3">
                                    {languages.map((lang, i) => (
                                        <li key={i} className="flex justify-between items-center">
                                            <span className="font-bold text-gray-700">{lang.language}</span>
                                            <span className="text-[10px] text-gray-500 italic">{lang.proficiency}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2" style={{ borderColor: `${primaryColor}40` }}>
                                    <span className="material-symbols-outlined" style={{ color: primaryColor }}>verified</span> Certifications
                                </h2>
                                <div className="space-y-4">
                                    {certifications.map((cert, i) => (
                                        <div key={i}>
                                            <p className="font-bold text-gray-800 text-[11px]">{cert.name}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{cert.expiryDate}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {visibleSections.includes('awards') && awards.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-gray-600 border-b-2 pb-2" style={{ borderColor: `${primaryColor}40` }}>
                                    <span className="material-symbols-outlined" style={{ color: primaryColor }}>emoji_events</span> Awards
                                </h2>
                                <div className="space-y-3">
                                    {awards.map((award, i) => (
                                        <div key={i}>
                                            <p className="font-bold text-gray-700">{award.title}</p>
                                            <p className="text-[10px] text-gray-500">{award.issuer}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </aside>

                    {/* Main Content (8 cols) */}
                    <main className="col-span-8 space-y-10">
                        
                        {summary.professionalSummary && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Profile
                                </h2>
                                <div className="text-[11px] leading-relaxed text-gray-600 text-justify pl-5 border-l border-dashed border-gray-200" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                            </section>
                        )}

                        {experience.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Experience
                                </h2>
                                <div className="space-y-8 border-l-2 ml-2 pl-8 relative" style={{ borderColor: `${primaryColor}30` }}>
                                    {experience.map((exp, i) => (
                                        <div key={exp.id} className="relative">
                                            {/* Leaf/Dot Marker */}
                                             <span className="absolute -left-[38px] top-1 w-4 h-4 bg-white border-2 rounded-full flex items-center justify-center shadow-sm" style={{ borderColor: primaryColor }}>
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                             </span>
                                            
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[13px] text-gray-800">{exp.jobTitle}</h3>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: primaryColor }}>{exp.startDate} - {exp.endDate}</span>
                                            </div>
                                            <p className="text-[11px] font-semibold text-gray-500 mb-3 uppercase tracking-wide">{exp.company}, {exp.location}</p>
                                            <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.includes('projects') && projects.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Projects
                                </h2>
                                <div className="space-y-6 border-l-2 ml-2 pl-8 relative" style={{ borderColor: `${primaryColor}30` }}>
                                    {projects.map((item, i) => (
                                        <div key={item.id} className="relative">
                                            <span className="absolute -left-[37px] top-2 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: primaryColor }}></span>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[12px] text-gray-800">{item.name}</h3>
                                                <span className="text-[10px] text-gray-400 font-medium">{item.startDate} - {item.endDate}</span>
                                            </div>
                                            <p className="text-[10px] font-bold mb-1" style={{ color: primaryColor }}>{item.technologies}</p>
                                            <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {education.length > 0 && (
                            <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Education
                                </h2>
                                <div className="space-y-5 border-l-2 ml-2 pl-8 relative" style={{ borderColor: `${primaryColor}30` }}>
                                    {education.map(edu => (
                                        <div key={edu.id} className="relative">
                                            <span className="absolute -left-[37px] top-2 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: primaryColor }}></span>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[12px] text-gray-800">{edu.school}</h3>
                                                <span className="text-[10px] text-gray-400">{edu.startDate} - {edu.endDate}</span>
                                            </div>
                                            <p className="text-[11px] font-medium" style={{ color: primaryColor }}>{edu.degree}</p>
                                            <p className="text-[10px] text-gray-500 italic">{edu.location}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Trainings
                                </h2>
                                <div className="space-y-4 pl-4">
                                    {trainings.map(item => (
                                        <div key={item.id}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[12px] text-gray-800">{item.course}</h3>
                                                <span className="text-[10px] text-gray-400">{item.date}</span>
                                            </div>
                                            <p className="text-[11px] font-medium" style={{ color: primaryColor }}>{item.institution}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {visibleSections.includes('publications') && publications.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Publications
                                </h2>
                                <div className="space-y-4 pl-4">
                                    {publications.map(item => (
                                        <div key={item.id}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[12px] text-gray-800">{item.title}</h3>
                                                <span className="text-[10px] text-gray-400">{item.date}</span>
                                            </div>
                                            <p className="text-[11px] font-medium mb-1" style={{ color: primaryColor }}>{item.publisher}</p>
                                            <div className="text-[11px] leading-relaxed text-gray-600">{item.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Volunteer
                                </h2>
                                <div className="space-y-4 pl-4">
                                    {volunteer.map(item => (
                                        <div key={item.id}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[12px] text-gray-800">{item.role}</h3>
                                                <span className="text-[10px] text-gray-400">{item.startDate} - {item.endDate}</span>
                                            </div>
                                            <p className="text-[11px] font-medium mb-1" style={{ color: primaryColor }}>{item.organization}</p>
                                            <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                         {visibleSections.includes('custom') && custom.length > 0 && (
                             <section>
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-3 text-gray-700">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></span> Additional
                                </h2>
                                <div className="space-y-4 pl-4">
                                    {custom.map(item => (
                                        <div key={item.id}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-[12px] text-gray-800">{item.title}</h3>
                                                <span className="text-[10px] text-gray-400">{item.date}</span>
                                            </div>
                                            <p className="text-[11px] font-medium mb-1" style={{ color: primaryColor }}>{item.subtitle}</p>
                                            <div className="text-[11px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default LeafyTemplate;
