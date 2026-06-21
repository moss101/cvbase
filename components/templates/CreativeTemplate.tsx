
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const CreativeTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#0d6efd';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-creative"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-slate-800 ${fontSize} flex`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
             <style>
                {`.material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 20; }`}
            </style>
            <aside className="w-[35%] bg-slate-100 p-6 flex flex-col space-y-6 items-center">
                {contact.photo && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md mb-2">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                <section className='w-full'>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>CONTACT</h3>
                    <div className="space-y-2 text-xs">
                        {contact.phone && <div className="flex items-center gap-2"><span className="material-symbols-outlined">call</span><span>{fullPhone}</span></div>}
                        {contact.email && <div className="flex items-center gap-2"><span className="material-symbols-outlined">mail</span><span>{contact.email}</span></div>}
                        {fullAddress && <div className="flex items-center gap-2"><span className="material-symbols-outlined">location_on</span><span>{fullAddress}</span></div>}
                        {contact.website && <div className="flex items-center gap-2"><span className="material-symbols-outlined">link</span><span>{contact.website}</span></div>}
                        {contact.linkedin && <div className="flex items-center gap-2"><span className="material-symbols-outlined">person</span><span>LinkedIn</span></div>}
                    </div>
                </section>
                {education.length > 0 && (
                    <section className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>EDUCATION</h3>
                        {education.map(edu => (
                            <div key={edu.id} className="mb-3">
                                <h4 className="font-bold text-sm">{edu.degree || 'Degree'}</h4>
                                <p className="font-semibold text-xs text-slate-600">{edu.school || 'School'}</p>
                                <p className="text-xs text-slate-500">{edu.startDate} - {edu.endDate}</p>
                            </div>
                        ))}
                    </section>
                )}
                {skills.length > 0 && (
                    <section className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>SKILLS</h3>
                        <div className="space-y-1">
                            {skills.map((skill, index) => (
                                <p key={index} className="text-xs font-semibold">{skill}</p>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>CERTIFICATIONS</h3>
                        {certifications.map(cert => (
                            <div key={cert.id} className="mb-2">
                                <p className="text-xs font-semibold">{cert.name}</p>
                            </div>
                        ))}
                    </section>
                )}
                {visibleSections.includes('languages') && languages?.length > 0 && (
                    <section className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>LANGUAGES</h3>
                        {languages.map(lang => (
                            <div key={lang.id} className="mb-2">
                                <p className="text-xs font-semibold">{lang.language} ({lang.proficiency})</p>
                            </div>
                        ))}
                    </section>
                )}
                {visibleSections.includes('awards') && awards && awards.length > 0 && (
                    <section className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>AWARDS</h3>
                        {awards.map(award => (
                            <div key={award.id} className="mb-2">
                                <p className="text-xs font-bold">{award.title}</p>
                                <p className="text-xs font-semibold text-slate-500">{award.issuer}</p>
                            </div>
                        ))}
                    </section>
                )}
            </aside>
            <main className="w-[65%] p-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-wide">{(contact.firstName || 'YOUR').toUpperCase()} {(contact.lastName || 'NAME').toUpperCase()}</h1>
                    <h2 className="text-lg font-semibold tracking-wider mt-1" style={{ color: primaryColor }}>{contact.jobTitle || 'Your Job Title'}</h2>
                </header>
                {summary.professionalSummary && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-2" style={{ borderColor: primaryColor, color: primaryColor }}>PROFILE</h3>
                        <div className="text-xs leading-relaxed text-slate-600 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}
                {experience.length > 0 && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>WORK EXPERIENCE</h3>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{exp.jobTitle || 'Job Title'}</h4>
                                        <p className="text-xs text-slate-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-xs font-semibold text-slate-600">{exp.company || 'Company'}</p>
                                        <p className="text-xs text-slate-500">{exp.location || 'Location'}</p>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                 {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>PROJECTS</h3>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.name || 'Project Name'}</h4>
                                        <p className="text-xs text-slate-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.technologies}</p>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>TRAINING</h3>
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.course}</h4>
                                        <p className="text-xs text-slate-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('publications') && publications && publications.length > 0 && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>PUBLICATIONS</h3>
                        <div className="space-y-3">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.title}</h4>
                                        <p className="text-xs text-slate-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>VOLUNTEERING</h3>
                        <div className="space-y-3">
                            {volunteer.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.role}</h4>
                                        <p className="text-xs text-slate-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.organization}</p>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {visibleSections.includes('custom') && custom && custom.length > 0 && (
                    <section className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>ADDITIONAL</h3>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.title}</h4>
                                        <p className="text-xs text-slate-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.subtitle}</p>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default CreativeTemplate;
