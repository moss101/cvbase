
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Link, Mail, MapPin, Phone, User } from 'lucide-react';

const CreativeTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#0d6efd';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-2 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>PROFILE</h3>
                        <div className="text-xs leading-relaxed text-slate-600 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>WORK EXPERIENCE</h3>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{exp.jobTitle || 'Job Title'}</h4>
                                        <p className="text-xs text-slate-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-xs font-semibold text-slate-600">{exp.company || 'Company'}</p>
                                        <p className="text-xs text-slate-500">{exp.location || 'Location'}</p>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 break-after-avoid" style={{ color: primaryColor }}>EDUCATION</h3>
                        {education.map(edu => (
                            <div key={edu.id} className="mb-3 break-inside-avoid">
                                <h4 className="font-bold text-sm">{edu.degree || 'Degree'}</h4>
                                <p className="font-semibold text-xs text-slate-600">{edu.school || 'School'}</p>
                                <p className="text-xs text-slate-500">{edu.startDate} - {edu.endDate}</p>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 break-after-avoid" style={{ color: primaryColor }}>SKILLS</h3>
                        <div className="space-y-1">
                            {skills.map((skill, index) => (
                                <p key={index} className="text-xs font-semibold break-inside-avoid">{skill}</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>PROJECTS</h3>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.name || 'Project Name'}</h4>
                                        <p className="text-xs text-slate-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.technologies}</p>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 break-after-avoid" style={{ color: primaryColor }}>CERTIFICATIONS</h3>
                        {certifications.map(cert => (
                            <div key={cert.id} className="mb-2 break-inside-avoid">
                                <p className="text-xs font-semibold">{cert.name}</p>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'languages':
                return languages?.length > 0 ? (
                    <section key="languages" data-section="languages" className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 break-after-avoid" style={{ color: primaryColor }}>LANGUAGES</h3>
                        {languages.map(lang => (
                            <div key={lang.id} className="mb-2 break-inside-avoid">
                                <p className="text-xs font-semibold">{lang.language} ({lang.proficiency})</p>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards" className='w-full'>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 break-after-avoid" style={{ color: primaryColor }}>AWARDS</h3>
                        {awards.map(award => (
                            <div key={award.id} className="mb-2 break-inside-avoid">
                                <p className="text-xs font-bold">{award.title}</p>
                                <p className="text-xs font-semibold text-slate-500">{award.issuer}</p>
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>TRAINING</h3>
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.course}</h4>
                                        <p className="text-xs text-slate-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>PUBLICATIONS</h3>
                        <div className="space-y-3">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.title}</h4>
                                        <p className="text-xs text-slate-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>VOLUNTEERING</h3>
                        <div className="space-y-3">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.role}</h4>
                                        <p className="text-xs text-slate-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.organization}</p>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 pb-1 mb-3 break-after-avoid" style={{ borderColor: primaryColor, color: primaryColor }}>ADDITIONAL</h3>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-sm font-bold">{item.title}</h4>
                                        <p className="text-xs text-slate-500">{item.date}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">{item.subtitle}</p>
                                    <div className="mt-1 text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div id={isCardPreview ? undefined : "resume-preview-creative"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-slate-800 ${fontSize} flex`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <aside className="w-[35%] bg-slate-100 p-6 flex flex-col space-y-6 items-center">
                {contact.photo && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md mb-2">
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                <section className='w-full'>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>CONTACT</h3>
                    <div className="space-y-2 text-xs">
                        {contact.phone && <div className="flex items-center gap-2"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{fullPhone}</span></div>}
                        {contact.email && <div className="flex items-center gap-2"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{contact.email}</span></div>}
                        {fullAddress && <div className="flex items-center gap-2"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{fullAddress}</span></div>}
                        {contact.website && <div className="flex items-center gap-2"><Link aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{contact.website}</span></div>}
                        {contact.linkedin && <div className="flex items-center gap-2"><User aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>LinkedIn</span></div>}
                    </div>
                </section>
                {renderRun(['education', 'skills', 'certifications', 'languages', 'awards'])}
            </aside>
            <main className="w-[65%] p-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-wide">{(contact.firstName || 'YOUR').toUpperCase()} {(contact.lastName || 'NAME').toUpperCase()}</h1>
                    <h2 className="text-lg font-semibold tracking-wider mt-1" style={{ color: primaryColor }}>{contact.jobTitle || 'Your Job Title'}</h2>
                </header>
                {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}
            </main>
        </div>
    );
};

export default React.memo(CreativeTemplate);
