
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const CorporateV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#dc2626';
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-corporate-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }`}
            </style>
            <aside className="w-[30%] bg-gray-100 p-6 flex flex-col space-y-6">
                <section>
                    <div className="space-y-3">
                        {contact.phone && <div className="flex items-center gap-3"><span className="material-symbols-outlined text-white p-1 rounded-full" style={{backgroundColor: accentColor}}>call</span><span className="text-xs">{fullPhone}</span></div>}
                        {contact.email && <div className="flex items-center gap-3"><span className="material-symbols-outlined text-white p-1 rounded-full" style={{backgroundColor: accentColor}}>email</span><span className="text-xs">{contact.email}</span></div>}
                        {fullAddress && <div className="flex items-center gap-3"><span className="material-symbols-outlined text-white p-1 rounded-full" style={{backgroundColor: accentColor}}>home</span><span className="text-xs">{fullAddress}</span></div>}
                    </div>
                </section>
                {skills.length > 0 && (
                     <section>
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2">SKILLS</h2>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            {skills.map((skill, index) => <li key={index}>{skill}</li>)}
                        </ul>
                    </section>
                )}
                 {visibleSections.includes('certifications') && certifications.length > 0 && (
                     <section>
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2">CERTIFICATIONS</h2>
                        <div className="text-xs space-y-1">
                            {certifications.map((cert, index) => (
                                <p key={index}>{cert.name}</p>
                            ))}
                        </div>
                    </section>
                 )}
                 {visibleSections.includes('languages') && languages?.length > 0 && (
                     <section>
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2">LANGUAGES</h2>
                        <div className="text-xs space-y-1">
                            {languages.map((lang, index) => (
                                <p key={index}>{lang.language} ({lang.proficiency})</p>
                            ))}
                        </div>
                    </section>
                 )}
                  {visibleSections.includes('awards') && awards && awards.length > 0 && (
                     <section>
                        <h2 className="font-bold text-sm uppercase tracking-wider mb-2">AWARDS</h2>
                        <div className="text-xs space-y-1">
                            {awards.map((award, index) => (
                                <div key={index} className="mb-2">
                                    <p className="font-bold">{award.title}</p>
                                    <p className="text-gray-500">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                 )}
            </aside>
            <main className="w-[70%] p-8">
                <header className="mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-800">{contact.firstName || 'YOUR'} {contact.lastName || 'NAME'}</h1>
                    <p className="text-lg text-gray-600 font-medium">{contact.jobTitle || 'Your Job Title'}</p>
                </header>
                 {summary.professionalSummary && (
                    <section className="mb-6">
                        <div className="text-xs leading-relaxed border-l-4 pl-3 text-justify" style={{borderColor: accentColor}} dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                 )}
                 {experience.length > 0 && (
                    <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">EXPERIENCE</h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{exp.jobTitle}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                        <p className="text-xs font-semibold text-gray-600">{exp.company} | {exp.location}</p>
                                        <p className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
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
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.name}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                        <p className="text-xs font-semibold text-gray-600">{item.technologies}</p>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {education.length > 0 && (
                    <section>
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">EDUCATION</h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{edu.degree}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{edu.school}, {edu.location}</p>
                                         <p className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">TRAINING</h2>
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.course}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.institution}</p>
                                         <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('publications') && publications && publications.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">PUBLICATIONS</h2>
                        <div className="space-y-3">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.title}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.publisher}</p>
                                         <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">VOLUNTEERING</h2>
                        <div className="space-y-3">
                            {volunteer.map(item => (
                                <div key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.role}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.organization}</p>
                                         <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('custom') && custom && custom.length > 0 && (
                     <section className="mb-6">
                        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b-2 border-gray-200 pb-1 mb-3">ADDITIONAL</h2>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div key={item.id}>
                                    <div className="p-2 rounded" style={{backgroundColor: accentColor}}>
                                        <h3 className="font-bold text-sm text-white">{item.title}</h3>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                         <p className="text-xs font-semibold text-gray-600">{item.subtitle}</p>
                                         <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default CorporateV2Template;
