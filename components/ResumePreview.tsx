
import React from 'react';
import type { ResumePreviewProps } from '../types';
import { countries } from '../data/locationData';

const ResumePreview: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();
    
    const themeColor = settings?.themeColor || '#ff6b4a';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    
    return (
        <div id={isCardPreview ? undefined : "resume-preview"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#333] ${fontSize} flex p-10`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <div className="w-[35%] pr-5 border-r border-gray-200 flex flex-col">
                <header className="text-center mb-5">
                    {contact.photo && (
                        <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-gray-100 shadow-md mb-4" style={{borderColor: `${themeColor}33`}}>
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <h1 className="text-[28px] font-extrabold mb-1 leading-tight break-words" style={{color: themeColor}}>{contact.firstName || 'Your'} {contact.lastName || 'Name'}</h1>
                    <p className="text-[14px] font-semibold mb-4 text-gray-600">{contact.jobTitle || 'Your Job Title'}</p>
                </header>
                <section className="mb-5">
                    <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Contact</h2>
                    {contact.email && <div className="mb-1 flex items-center break-all"><strong>Email:</strong><span className="ml-1">{contact.email}</span></div>}
                    {contact.phone && <div className="mb-1 flex items-center"><strong>Phone:</strong><span className="ml-1">{fullPhone}</span></div>}
                    {fullAddress && <div className="mb-1 flex items-center"><strong>Address:</strong><span className="ml-1">{fullAddress}</span></div>}
                    {contact.linkedin && <div className="mb-1 flex items-center break-all"><strong>LinkedIn:</strong><span className="ml-1">{contact.linkedin}</span></div>}
                    {contact.website && <div className="mb-1 flex items-center break-all"><strong>Website:</strong><span className="ml-1">{contact.website}</span></div>}
                </section>

                {skills.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Skills</h2>
                        <div className="flex flex-wrap">
                            {skills.map((skill, index) => (
                                <span key={index} className="bg-gray-100 rounded-md py-1 px-2 m-0.5">{skill}</span>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Certifications</h2>
                        {certifications.map((cert, index) => (
                            <div key={index} className="mb-1">
                                <strong>{cert.name}</strong>
                                {cert.expiryDate && ` (Expires: ${cert.expiryDate})`}
                            </div>
                        ))}
                    </section>
                )}

                {visibleSections.includes('languages') && languages?.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Languages</h2>
                        {languages.map((lang) => (
                            <div key={lang.id} className="mb-1">
                                <strong>{lang.language}:</strong><span className="ml-1">{lang.proficiency}</span>
                            </div>
                        ))}
                    </section>
                )}
                
                {visibleSections.includes('awards') && awards && awards.length > 0 && (
                     <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Awards</h2>
                        {awards.map((award) => (
                            <div key={award.id} className="mb-2">
                                <strong>{award.title}</strong>
                                <p className="italic text-gray-500">{award.issuer}, {award.date}</p>
                                {award.description && <p className="mt-0.5 text-gray-600">{award.description}</p>}
                            </div>
                        ))}
                    </section>
                )}
            </div>
            
            <div className="w-[65%] pl-5 flex flex-col">
                {summary.professionalSummary && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Professional Summary</h2>
                        <div className="leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {experience.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Experience</h2>
                        {experience.map((item) => (
                            <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.jobTitle || 'Job Title'}</h3>
                                <p className="font-semibold text-gray-700 mb-1">{item.company || 'Company'} | {item.location || 'Location'}</p>
                                <p className="italic text-gray-500">{item.startDate || 'Start Date'} - {item.endDate || 'End Date'}</p>
                                <div className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5" dangerouslySetInnerHTML={{ __html: item.description || 'Job description...' }} />
                            </div>
                        ))}
                    </section>
                )}
                    
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Projects</h2>
                        {projects.map((item) => (
                            <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.name || 'Project Name'}</h3>
                                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">{item.link}</a>}
                                <p className="italic text-gray-500">{item.startDate || 'Start Date'} - {item.endDate || 'End Date'}</p>
                                {item.technologies && <p className="font-semibold text-gray-700 mb-1">Technologies: {item.technologies}</p>}
                                <div className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5" dangerouslySetInnerHTML={{ __html: item.description || 'Project description...' }} />
                            </div>
                        ))}
                    </section>
                )}

                {education.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Education</h2>
                        {education.map((item) => (
                            <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.school || 'School/University'}</h3>
                                <p className="font-semibold text-gray-700 mb-1">{item.degree || 'Degree/Certificate'} | {item.location || 'Location'}</p>
                                <p className="italic text-gray-500">{item.startDate || 'Start Date'} - {item.endDate || 'End Date'}</p>
                                <p className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5 whitespace-pre-wrap">{item.description || 'Relevant coursework...'}</p>
                            </div>
                        ))}
                    </section>
                )}

                {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Training & Courses</h2>
                        {trainings.map((item) => (
                             <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.course}</h3>
                                <p className="font-semibold text-gray-700 mb-1">{item.institution}</p>
                                <p className="italic text-gray-500">Completed: {item.date}</p>
                                {item.description && <p className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5 whitespace-pre-wrap">{item.description}</p>}
                            </div>
                        ))}
                    </section>
                )}

                {visibleSections.includes('publications') && publications && publications.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Publications</h2>
                        {publications.map((item) => (
                             <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.title}</h3>
                                <p className="font-semibold text-gray-700 mb-1">{item.publisher}</p>
                                <p className="italic text-gray-500">Date: {item.date}</p>
                                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline block mb-1">{item.link}</a>}
                                {item.description && <p className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5 whitespace-pre-wrap">{item.description}</p>}
                            </div>
                        ))}
                    </section>
                )}

                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Volunteering</h2>
                        {volunteer.map((item) => (
                             <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.role}</h3>
                                <p className="font-semibold text-gray-700 mb-1">{item.organization} | {item.location}</p>
                                <p className="italic text-gray-500">{item.startDate} - {item.endDate}</p>
                                {item.description && <p className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5 whitespace-pre-wrap">{item.description}</p>}
                            </div>
                        ))}
                    </section>
                )}

                {visibleSections.includes('custom') && custom && custom.length > 0 && (
                    <section className="mb-5">
                        <h2 className="text-[16px] font-bold border-b-2 pb-1 mb-2.5" style={{color: themeColor, borderColor: themeColor}}>Additional Activities</h2>
                        {custom.map((item) => (
                             <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-[1.2em] font-bold">{item.title}</h3>
                                <p className="font-semibold text-gray-700 mb-1">{item.subtitle}</p>
                                <p className="italic text-gray-500">{item.date}</p>
                                {item.description && <p className="leading-snug pl-2.5 border-l-2 border-gray-200 mt-1.5 whitespace-pre-wrap">{item.description}</p>}
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </div>
    );
};

export default ResumePreview;
