
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const GoldenTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    
    // Construct full address for display
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Colors from spec
    const goldColor = settings?.themeColor || '#A38041';
    const lightGoldBorder = `${goldColor}40`; // Opacity for borders
    const beigeBg = '#F5F0E0'; // Keep static or derive? Keeping static for 'Golden' feel
    const darkText = '#252525';
    const iconWhite = '#F8F9FA';
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    return (
        <div id={isCardPreview ? undefined : "resume-preview-golden"} className={`w-[794px] min-h-[1123px] h-auto bg-white flex flex-col ${fontSize}`} style={{ fontFamily: settings?.fontFamily || "'Inter', sans-serif", color: darkText }}>
            
            {/* Header */}
            <header className="w-full min-h-[176px] shrink-0 px-[35px] py-[30px] flex justify-between items-center" style={{ backgroundColor: goldColor }}>
                <div className="flex flex-col gap-[13px] text-white w-2/3">
                    <h1 className="font-bold text-[32px] leading-[1.2] uppercase tracking-wide break-words">
                        {contact.firstName}<br/>{contact.lastName}
                    </h1>
                    <p className="font-semibold text-[24px] leading-[1.2]" style={{ color: '#F2F2F2' }}>
                        {contact.jobTitle}
                    </p>
                </div>

                {/* Contact Info */}
                <div className="flex flex-col gap-[8px] items-end text-[15px] font-medium w-1/3" style={{ color: iconWhite }}>
                    {contact.email && (
                        <div className="flex items-center gap-[8px]">
                            <div className="w-[26px] h-[26px] rounded-full border border-white flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                            </div>
                            <span className="break-all text-right">{contact.email}</span>
                        </div>
                    )}
                    {fullPhone && (
                        <div className="flex items-center gap-[8px]">
                            <div className="w-[26px] h-[26px] rounded-full border border-white flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px]">call</span>
                            </div>
                            <span className="text-right">{fullPhone}</span>
                        </div>
                    )}
                    {fullAddress && (
                            <div className="flex items-center gap-[8px]">
                            <div className="w-[26px] h-[26px] rounded-full border border-white flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                            </div>
                            <span className="text-right">{city}, {countryName}</span>
                        </div>
                    )}
                    {contact.linkedin && (
                        <div className="flex items-center gap-[8px]">
                            <div className="w-[26px] h-[26px] rounded-full border border-white flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px]">link</span>
                            </div>
                            <span className="text-right">LinkedIn</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Content Container with Gradient Background for Sidebar Extension */}
            <div className="flex-1 w-full px-[13px] py-[20px] flex gap-[26px]" style={{ background: `linear-gradient(to right, ${beigeBg} 38.5%, #FFFFFF 38.5%)` }}>
                
                {/* Sidebar */}
                <aside className="w-[281px] shrink-0 p-[13px] flex flex-col gap-[24px]">
                    
                    {summary.professionalSummary && (
                        <section>
                            <div className="mb-[12px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>SUMMARY</h2>
                                <div className="h-[1px] w-full" style={{ backgroundColor: goldColor }}></div>
                            </div>
                            <div className="text-[16px] leading-[1.4] font-normal break-words" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                        </section>
                    )}

                    {skills.length > 0 && (
                            <section>
                            <div className="mb-[12px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>SKILLS</h2>
                                <div className="h-[1px] w-full" style={{ backgroundColor: goldColor }}></div>
                            </div>
                            <div className="text-[16px] leading-[1.5] font-normal" style={{ color: 'rgba(37, 37, 37, 0.8)' }}>
                                <ul className="list-disc list-inside">
                                    {skills.map((skill, i) => (
                                        <li key={i}>{skill}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                        {visibleSections.includes('languages') && languages.length > 0 && (
                            <section>
                            <div className="mb-[12px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>LANGUAGES</h2>
                                <div className="h-[1px] w-full" style={{ backgroundColor: goldColor }}></div>
                            </div>
                            <div className="text-[16px] leading-[1.5] font-normal space-y-2" style={{ color: 'rgba(37, 37, 37, 0.8)' }}>
                                {languages.map((lang, i) => (
                                    <div key={i} className="flex justify-between">
                                        <span className="font-semibold">{lang.language}</span>
                                        <span>{lang.proficiency}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                        {visibleSections.includes('awards') && awards.length > 0 && (
                            <section>
                            <div className="mb-[12px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>REWARDS</h2>
                                <div className="h-[1px] w-full" style={{ backgroundColor: goldColor }}></div>
                            </div>
                            <div className="text-[16px] leading-[1.5] font-normal space-y-2" style={{ color: 'rgba(37, 37, 37, 0.8)' }}>
                                {awards.map((award, i) => (
                                    <div key={i}>
                                        <p className="font-semibold">{award.title}</p>
                                        <p className="text-[14px] opacity-80">{award.issuer}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                            <section>
                            <div className="mb-[12px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>VOLUNTEERING</h2>
                                <div className="h-[1px] w-full" style={{ backgroundColor: goldColor }}></div>
                            </div>
                            <div className="text-[16px] leading-[1.5] font-normal space-y-2" style={{ color: 'rgba(37, 37, 37, 0.8)' }}>
                                {volunteer.map((vol, i) => (
                                    <div key={i}>
                                        <p className="font-semibold">{vol.role}</p>
                                        <p className="text-[14px] opacity-80">{vol.organization}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col gap-[30px]">
                    
                    {experience.length > 0 && (
                        <section>
                            <div className="mb-[14px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>EXPERIENCE</h2>
                                <div className="h-[2px] w-full" style={{ backgroundColor: lightGoldBorder }}></div>
                            </div>
                            <div className="flex flex-col gap-[22px]">
                                {experience.map(exp => (
                                    <div key={exp.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline mb-[3px]">
                                            <h3 className="text-[18px] font-medium tracking-[-0.25px]" style={{ color: darkText }}>{exp.jobTitle}</h3>
                                            <span className="text-[15px] font-normal tracking-[-0.25px]" style={{ color: goldColor }}>{exp.startDate} - {exp.endDate}</span>
                                        </div>
                                        <p className="text-[16px] font-semibold mb-[8px]" style={{ color: darkText }}>{exp.company}</p>
                                        <div className="text-[15px] leading-[1.6] tracking-[-0.5px]" style={{ color: 'rgba(37, 37, 37, 0.8)' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('projects') && projects.length > 0 && (
                            <section>
                            <div className="mb-[14px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>PROJECTS</h2>
                                <div className="h-[2px] w-full" style={{ backgroundColor: lightGoldBorder }}></div>
                            </div>
                            <div className="flex flex-col gap-[22px]">
                                {projects.map(item => (
                                    <div key={item.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline mb-[3px]">
                                            <h3 className="text-[18px] font-medium tracking-[-0.25px]" style={{ color: darkText }}>{item.name}</h3>
                                            <span className="text-[15px] font-normal tracking-[-0.25px]" style={{ color: goldColor }}>{item.startDate} - {item.endDate}</span>
                                        </div>
                                        <p className="text-[16px] font-semibold mb-[8px]" style={{ color: darkText }}>{item.technologies}</p>
                                        <div className="text-[15px] leading-[1.6] tracking-[-0.5px]" style={{ color: 'rgba(37, 37, 37, 0.8)' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {education.length > 0 && (
                        <section>
                            <div className="mb-[14px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>EDUCATION</h2>
                                <div className="h-[2px] w-full" style={{ backgroundColor: lightGoldBorder }}></div>
                            </div>
                            <div className="flex flex-col gap-[18px]">
                                {education.map(edu => (
                                    <div key={edu.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline mb-[3px]">
                                            <h3 className="text-[18px] font-semibold tracking-[-0.25px]" style={{ color: darkText }}>{edu.school}</h3>
                                            <span className="text-[15px] font-normal tracking-[-0.25px]" style={{ color: goldColor }}>{edu.startDate} - {edu.endDate}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[18px] font-medium tracking-[-0.25px]" style={{ color: darkText }}>{edu.degree}</p>
                                            <p className="text-[16px] font-normal tracking-[-0.25px]" style={{ color: '#858585' }}>{edu.location}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                        <section>
                            <div className="mb-[14px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>TRAINING</h2>
                                <div className="h-[2px] w-full" style={{ backgroundColor: lightGoldBorder }}></div>
                            </div>
                            <div className="flex flex-col gap-[12px]">
                                {trainings.map((item, i) => (
                                    <div key={item.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline mb-[3px]">
                                            <h3 className="text-[18px] font-medium tracking-[-0.25px]" style={{ color: darkText }}>{item.course}</h3>
                                            <span className="text-[15px] font-normal tracking-[-0.25px]" style={{ color: goldColor }}>{item.date}</span>
                                        </div>
                                        <p className="text-[16px]" style={{ color: '#858585' }}>{item.institution}</p>
                                        {item.description && <div className="text-[15px] leading-[1.6] tracking-[-0.5px] mt-1" style={{ color: 'rgba(37, 37, 37, 0.8)' }}>{item.description}</div>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('certifications') && certifications.length > 0 && (
                        <section>
                            <div className="mb-[14px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>CERTIFICATIONS</h2>
                                <div className="h-[2px] w-full" style={{ backgroundColor: lightGoldBorder }}></div>
                            </div>
                            <div className="flex flex-col gap-[8px]">
                                {certifications.map((cert, i) => (
                                    <div key={i} className="flex justify-between items-baseline break-inside-avoid">
                                        <p className="text-[18px] font-medium tracking-[-0.25px]" style={{ color: darkText }}>{cert.name}</p>
                                        <p className="text-[15px] font-normal tracking-[-0.25px]" style={{ color: '#858585' }}>{cert.expiryDate}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {visibleSections.includes('publications') && publications.length > 0 && (
                        <section>
                            <div className="mb-[14px]">
                                <h2 className="text-[24px] font-bold tracking-[0.4px] mb-[5px]" style={{ color: darkText }}>PUBLICATIONS</h2>
                                <div className="h-[2px] w-full" style={{ backgroundColor: lightGoldBorder }}></div>
                            </div>
                            <div className="flex flex-col gap-[12px]">
                                {publications.map((pub, i) => (
                                    <div key={i} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[18px] font-medium tracking-[-0.25px]" style={{ color: darkText }}>{pub.title}</p>
                                            <p className="text-[15px] font-normal tracking-[-0.25px]" style={{ color: goldColor }}>{pub.date}</p>
                                        </div>
                                        <p className="text-[16px]" style={{ color: '#858585' }}>{pub.publisher}</p>
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

export default GoldenTemplate;
