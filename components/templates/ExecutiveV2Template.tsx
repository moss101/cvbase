
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const ExecutiveV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const sidebarBg = settings?.themeColor || '#2d3748';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-executive-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 20 }`}
            </style>
            <aside className="w-[35%] text-gray-300 p-6 flex flex-col space-y-6" style={{ backgroundColor: sidebarBg }}>
                {contact.photo && (
                    <div className="w-36 h-36 mx-auto rounded-full overflow-hidden">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                {education.length > 0 && (
                    <section>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3">EDUCATION</h2>
                        {education.map(edu => (
                            <div key={edu.id} className="text-xs mb-3">
                                <p className="font-bold text-gray-100">{edu.degree}</p>
                                <p className="text-gray-400">{edu.school}</p>
                                <p className="text-gray-500">{edu.startDate} - {edu.endDate}</p>
                            </div>
                        ))}
                    </section>
                )}
                {skills.length > 0 && (
                    <section>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3">SKILLS</h2>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            {skills.map((skill, index) => (
                                <li key={index}>{skill}</li>
                            ))}
                        </ul>
                    </section>
                )}
                 {visibleSections.includes('certifications') && certifications.length > 0 && (
                     <section>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3">CERTIFICATIONS</h2>
                        <div className="text-xs space-y-1">
                            {certifications.map((cert, index) => (
                                <p key={index}>{cert.name}</p>
                            ))}
                        </div>
                    </section>
                 )}
                 {visibleSections.includes('languages') && languages?.length > 0 && (
                     <section>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3">LANGUAGES</h2>
                        <div className="text-xs space-y-1">
                            {languages.map((lang, index) => (
                                <p key={index}>{lang.language}: {lang.proficiency}</p>
                            ))}
                        </div>
                    </section>
                 )}
                 {visibleSections.includes('awards') && awards && awards.length > 0 && (
                     <section>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider border-b border-gray-500 pb-1 mb-3">AWARDS</h2>
                        <div className="text-xs space-y-1">
                            {awards.map((award, index) => (
                                <div key={index} className="mb-2">
                                    <p className="font-bold text-gray-100">{award.title}</p>
                                    <p className="text-gray-500">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                 )}
            </aside>
            <main className="w-[65%] p-8">
                <header className="mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-800">{contact.firstName || 'YOUR'} {contact.lastName || 'NAME'}</h1>
                    <p className="text-lg text-gray-600 font-medium">{contact.jobTitle || 'Your Job Title'}</p>
                    <div className="flex items-center gap-x-4 gap-y-1 text-xs mt-2 text-gray-500">
                        {contact.phone && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined">call</span><span>{fullPhone}</span></div>}
                        {contact.email && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined">email</span><span>{contact.email}</span></div>}
                        {fullAddress && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined">location_on</span><span>{fullAddress}</span></div>}
                    </div>
                </header>
                 {summary.professionalSummary && (
                    <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-2">PROFESSIONAL SUMMARY</h2>
                        <div className="text-xs leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                 )}
                 {experience.length > 0 && (
                    <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">EXPERIENCE</h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                        <p className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-600">{exp.company} | {exp.location}</p>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">PROJECTS</h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.name}</h3>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-600">{item.technologies}</p>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">TRAINING</h2>
                        <div className="space-y-2">
                            {trainings.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.course}</h3>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('publications') && publications && publications.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">PUBLICATIONS</h2>
                        <div className="space-y-2">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">VOLUNTEERING</h2>
                        <div className="space-y-2">
                            {volunteer.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.role}</h3>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('custom') && custom && custom.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">ADDITIONAL</h2>
                        <div className="space-y-2">
                            {custom.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default ExecutiveV2Template;
