
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const DesignerTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    
    // Construct full address for display
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Colors from settings or default
    const textColor = '#5C6168';
    const accentColor = settings?.themeColor || '#D67215';
    const sidebarBg = '#E8EAEE';
    const mainBg = '#FFFFFF';
    
    const fontSizeClass = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    return (
        <div id={isCardPreview ? undefined : "resume-preview-designer"} className={`w-[794px] min-h-[1123px] h-auto flex ${fontSizeClass}`} style={{ fontFamily: settings?.fontFamily || "'Inter', sans-serif", backgroundColor: mainBg, color: textColor }}>
             <style>
                {`
                    .designer-tracking-header { letter-spacing: 0.275em; }
                `}
            </style>

            {/* Left Sidebar - 205px Width as per spec */}
            <aside className="w-[205px] shrink-0 p-8 flex flex-col gap-8 pt-12 relative" style={{ backgroundColor: sidebarBg }}>
                
                {/* Profile Identity */}
                <div className="ml-3">
                    <h1 className="text-[20px] font-bold leading-[24px] tracking-[0.1em] uppercase mb-3">
                         {contact.firstName}<br/>{contact.lastName}
                    </h1>
                    <div className="relative">
                         {/* Orange Dash */}
                        <div className="w-[10px] h-[6px] mb-2" style={{ backgroundColor: accentColor }}></div>
                        <p className="text-[10px] leading-[12px]">{contact.jobTitle}</p>
                    </div>
                     {/* Location with Icon */}
                     {fullAddress && (
                        <div className="mt-6 flex items-start gap-2">
                            <svg width="9" height="12" viewBox="0 0 24 24" fill={textColor} xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-[1px]">
                                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"/>
                            </svg>
                            <p className="text-[10px] leading-[12px] break-words w-[120px]">{fullAddress}</p>
                        </div>
                     )}
                </div>

                {/* Education */}
                {education.length > 0 && (
                   <section className="ml-3 mt-6">
                        <div className="mb-4">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">EDUCATION</h2>
                             <div className="w-[26px] h-[1px]" style={{ backgroundColor: textColor }}></div>
                        </div>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="flex flex-col gap-1">
                                    <h3 className="text-[10px] font-semibold leading-[12px]">{edu.degree}</h3>
                                    <p className="text-[10px] leading-[12px]">{edu.school}</p>
                                    <p className="text-[10px] leading-[12px]">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                   </section>
                )}

                {skills.length > 0 && (
                    <section className="ml-3">
                         <div className="mb-4">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">SKILLS</h2>
                             <div className="w-[26px] h-[1px]" style={{ backgroundColor: textColor }}></div>
                        </div>
                        <ul className="space-y-2">
                            {skills.map((skill, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <div className="w-[4px] h-[4px] rounded-full bg-[#5C6168]"></div>
                                    <span className="text-[10px] leading-[12px]">{skill}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Certifications (Fits sidebar style) */}
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                     <section className="ml-3">
                        <div className="mb-4">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">CERTIFICATIONS</h2>
                             <div className="w-[26px] h-[1px]" style={{ backgroundColor: textColor }}></div>
                        </div>
                        <div className="space-y-2">
                            {certifications.map((cert, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold leading-[12px]">{cert.name}</span>
                                    <span className="text-[10px] leading-[12px]">{cert.expiryDate}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Languages (Fits sidebar style) */}
                {visibleSections.includes('languages') && languages.length > 0 && (
                     <section className="ml-3">
                        <div className="mb-4">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">LANGUAGES</h2>
                             <div className="w-[26px] h-[1px]" style={{ backgroundColor: textColor }}></div>
                        </div>
                        <ul className="space-y-2">
                            {languages.map((lang, i) => (
                                <li key={i} className="flex flex-col">
                                    <span className="text-[10px] leading-[12px]">{lang.language}</span>
                                    <span className="text-[9px] opacity-80">{lang.proficiency}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </aside>

            {/* Main Content - Calculated width ~589px (794-205) */}
            <main className="flex-1 relative pt-10 px-6">
                {/* Top Area: Photo & Contact Info */}
                <div className="flex justify-between items-start mb-12 min-h-[140px]">
                     {/* Photo - Positioned relative to main content as per spec visual weight */}
                     <div className="ml-6 mt-2">
                        {contact.photo ? (
                            <div className="w-[116px] h-[116px] rounded-full bg-[#D9D9D9] overflow-hidden border-[1px] border-gray-200">
                                <img src={contact.photo} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                             <div className="w-[116px] h-[116px] rounded-full bg-[#D9D9D9] flex items-center justify-center text-gray-400 text-[10px]">
                                 No Photo
                             </div>
                        )}
                     </div>

                     {/* Contact Info - Right Aligned with lines */}
                     <div className="flex flex-col gap-3 mt-6 mr-8 w-[205px]">
                        {contact.email && (
                            <div className="flex flex-col gap-1 items-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] leading-[12px]">{contact.email}</span>
                                    {/* Email Icon */}
                                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L5.5 5L10 1.5M1 7.5H10V1.5H1V7.5Z" stroke="#5C6168" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <div className="w-full h-[1px] bg-[#5C6168]"></div>
                            </div>
                        )}
                        {fullPhone && (
                            <div className="flex flex-col gap-1 items-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] leading-[12px]">{fullPhone}</span>
                                    {/* Phone Icon */}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#5C6168" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                                    </svg>
                                </div>
                                <div className="w-full h-[1px] bg-[#5C6168]"></div>
                            </div>
                        )}
                        {contact.linkedin && (
                             <div className="flex flex-col gap-1 items-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] leading-[12px]">{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                    {/* LinkedIn Icon */}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#5C6168" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M19 3H5C3.895 3 3 3.895 3 5V19C3 20.105 3.895 21 5 21H19C20.105 21 21 20.105 21 19V5C21 3.895 20.105 3 19 3ZM8.5 17H6.5V10H8.5V17ZM7.5 9.1C6.8 9.1 6.3 8.6 6.3 8C6.3 7.4 6.8 6.9 7.5 6.9C8.2 6.9 8.7 7.4 8.7 8C8.7 8.6 8.2 9.1 7.5 9.1ZM17.5 17H15.5V13.5C15.5 12.7 14.8 12 14 12C13.2 12 12.5 12.7 12.5 13.5V17H10.5V10H12.5V11.1C12.9 10.4 13.7 10 14.5 10C16.2 10 17.5 11.3 17.5 13V17Z"/>
                                    </svg>
                                </div>
                                <div className="w-full h-[1px] bg-[#5C6168]"></div>
                            </div>
                        )}
                         {contact.website && (
                             <div className="flex flex-col gap-1 items-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] leading-[12px]">{contact.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                     {/* Globe/Link Icon */}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#5C6168" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z"/>
                                    </svg>
                                </div>
                                <div className="w-full h-[1px] bg-[#5C6168]"></div>
                            </div>
                        )}
                     </div>
                </div>

                {/* Profile Summary */}
                {summary.professionalSummary && (
                    <section className="mb-10 ml-6 mr-8">
                        <div className="mb-3">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase text-right mb-2">PROFILE</h2>
                             <div className="w-[100px] h-[1px] bg-[#5C6168] ml-auto"></div>
                        </div>
                        <div className="text-[10px] leading-[12px] text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                     <section className="ml-6 mr-8">
                        <div className="mb-6">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">EXPERIENCE</h2>
                             <div className="w-[100px] h-[1px] bg-[#5C6168]"></div>
                        </div>
                        
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    {/* Header Row */}
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-[10px] font-semibold leading-[12px] uppercase w-2/3">{exp.jobTitle}</h3>
                                        <span className="text-[10px] leading-[12px] text-right w-1/3">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    {/* Company */}
                                    <p className="text-[10px] leading-[12px] italic mb-2" style={{ color: accentColor }}>{exp.company}, {exp.location}</p>
                                    {/* Description */}
                                    <div className="text-[10px] leading-[12px]" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Projects (if present) */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="ml-6 mr-8 mt-10">
                        <div className="mb-6">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">PROJECTS</h2>
                             <div className="w-[100px] h-[1px] bg-[#5C6168]"></div>
                        </div>
                         <div className="space-y-6">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-[10px] font-semibold leading-[12px] uppercase w-2/3">{item.name}</h3>
                                        <span className="text-[10px] leading-[12px] text-right w-1/3">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[10px] leading-[12px] italic mb-2" style={{ color: accentColor }}>{item.technologies}</p>
                                    <div className="text-[10px] leading-[12px]" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {/* Other Sections displayed similarly */}
                 {visibleSections.includes('awards') && awards.length > 0 && (
                     <section className="ml-6 mr-8 mt-10">
                        <div className="mb-6">
                             <h2 className="text-[13px] font-bold designer-tracking-header uppercase mb-2">AWARDS</h2>
                             <div className="w-[100px] h-[1px] bg-[#5C6168]"></div>
                        </div>
                        <div className="space-y-4">
                            {awards.map(item => (
                                <div key={item.id} className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-[10px] font-semibold leading-[12px]">{item.title}</h3>
                                        <p className="text-[10px] leading-[12px] italic">{item.issuer}</p>
                                    </div>
                                    <span className="text-[10px] leading-[12px] text-right">{item.date}</span>
                                </div>
                            ))}
                        </div>
                     </section>
                 )}

            </main>
        </div>
    );
};

export default DesignerTemplate;
