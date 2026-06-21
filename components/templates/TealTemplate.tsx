
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const TealTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const themeColor = settings?.themeColor || '#008080';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-teal"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}
            </style>
            <aside className="w-[35%] text-white p-8 flex flex-col items-center" style={{backgroundColor: themeColor}}>
                {contact.photo && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg mb-6">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                <section className="mb-10 text-center">
                    <h1 className="text-4xl font-light tracking-wider break-words">{contact.firstName?.toUpperCase() || 'YOUR'}</h1>
                    <h1 className="text-4xl font-bold tracking-wider break-words">{contact.lastName?.toUpperCase() || 'NAME'}</h1>
                </section>

                {skills.length > 0 && (
                    <section className="mb-8 w-full">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-400 pb-2">Skills</h2>
                        <p className="mt-4 text-sm font-light text-gray-200 leading-relaxed">
                            {skills.join(' • ')}
                        </p>
                    </section>
                )}

                 {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section className='w-full mb-8'>
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-400 pb-2">Certifications</h2>
                        <div className="mt-4 space-y-2">
                            {certifications.map(cert => (
                                <div key={cert.id} className="break-inside-avoid">
                                    <p className="font-semibold">{cert.name}</p>
                                    {cert.expiryDate && <p className="text-xs text-gray-300">Expires: {cert.expiryDate}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('languages') && languages?.length > 0 && (
                    <section className='w-full mb-8'>
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-400 pb-2">Languages</h2>
                        <div className="mt-4 space-y-2">
                            {languages.map(lang => (
                                <div key={lang.id} className="break-inside-avoid">
                                    <p className="font-semibold">{lang.language}</p>
                                    <p className="text-xs text-gray-300">{lang.proficiency}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('awards') && awards && awards.length > 0 && (
                    <section className='w-full mb-8'>
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-400 pb-2">Awards</h2>
                        <div className="mt-4 space-y-2">
                            {awards.map(award => (
                                <div key={award.id} className="break-inside-avoid">
                                    <p className="font-semibold">{award.title}</p>
                                    <p className="text-xs text-gray-300">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </aside>
            <main className="w-[65%] bg-white p-8">
                <section className="mb-6">
                    <h2 className="text-xl font-semibold" style={{color: themeColor}}>{contact.jobTitle || 'Your Job Title'}</h2>
                    <div className="flex flex-wrap items-center text-sm mt-2 text-gray-600">
                        {contact.email && (
                             <div className="flex items-center mr-4 mb-1">
                                <span className="material-symbols-outlined text-lg mr-1.5">mail</span>
                                <a className="hover:underline" style={{color: 'inherit'}} href={`mailto:${contact.email}`}>{contact.email}</a>
                            </div>
                        )}
                       {contact.linkedin && (
                            <div className="flex items-center mr-4 mb-1">
                                <span className="material-symbols-outlined text-lg mr-1.5">link</span>
                                <a className="hover:underline" style={{color: 'inherit'}} href={contact.linkedin}>LinkedIn</a>
                            </div>
                       )}
                       {contact.phone && (
                            <div className="flex items-center mr-4 mb-1">
                                <span className="material-symbols-outlined text-lg mr-1.5">call</span>
                                <span>{fullPhone}</span>
                            </div>
                       )}
                        {fullAddress && (
                             <div className="flex items-center mb-1">
                                <span className="material-symbols-outlined text-lg mr-1.5">location_on</span>
                                <span>{fullAddress}</span>
                            </div>
                        )}
                    </div>
                </section>

                {summary.professionalSummary && (
                     <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Summary</h2>
                        <div className="mt-4 leading-relaxed text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}
               
                {experience.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Experience</h2>
                        <div className="mt-4 space-y-5">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{exp.jobTitle}</h3>
                                        <span className="text-xs font-medium text-gray-500">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold" style={{color: themeColor}}>{exp.company}</p>
                                        <span className="text-xs text-gray-500">{exp.location}</span>
                                    </div>
                                    <div className="mt-2 text-gray-700" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Projects</h2>
                        <div className="mt-4 space-y-5">
                            {projects.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{item.name}</h3>
                                        <span className="text-xs font-medium text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    {item.technologies && <p className="font-semibold" style={{color: themeColor}}>{item.technologies}</p>}
                                    {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:underline" style={{color: 'inherit'}}>{item.link}</a>}
                                    <div className="mt-2 text-gray-700" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {education.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Education</h2>
                        <div className="mt-4 space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{edu.degree}</h3>
                                        <span className="text-xs font-medium text-gray-500">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold" style={{color: themeColor}}>{edu.school}</p>
                                        <span className="text-xs text-gray-500">{edu.location}</span>
                                    </div>
                                     {edu.description && (
                                         <p className="mt-1 text-gray-600">{edu.description}</p>
                                     )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Trainings</h2>
                        <div className="mt-4 space-y-4">
                            {trainings.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{item.course}</h3>
                                        <span className="text-xs font-medium text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="font-semibold" style={{color: themeColor}}>{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('publications') && publications && publications.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Publications</h2>
                        <div className="mt-4 space-y-4">
                            {publications.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{item.title}</h3>
                                        <span className="text-xs font-medium text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="font-semibold" style={{color: themeColor}}>{item.publisher}</p>
                                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Volunteering</h2>
                        <div className="mt-4 space-y-4">
                            {volunteer.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{item.role}</h3>
                                        <span className="text-xs font-medium text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="font-semibold" style={{color: themeColor}}>{item.organization}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('custom') && custom && custom.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase mb-2 border-b border-gray-200 pb-2" style={{color: themeColor}}>Additional</h2>
                        <div className="mt-4 space-y-4">
                            {custom.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[1.2em]">{item.title}</h3>
                                        <span className="text-xs font-medium text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="font-semibold" style={{color: themeColor}}>{item.subtitle}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </main>
        </div>
    );
};

export default TealTemplate;
