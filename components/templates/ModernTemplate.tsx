
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { House, Mail, Phone } from 'lucide-react';

const ModernTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#4fd1c5'; 
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
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>PROFESSIONAL SUMMARY</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>EXPERIENCE</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{exp.jobTitle || 'Job Title'}</h3>
                                        <p className="text-[0.9em] text-gray-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{exp.company || 'Company'} | {exp.location}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>EDUCATION</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{edu.degree || 'Degree'}</h3>
                                        <p className="text-[0.9em] text-gray-500">{edu.startDate} - {edu.endDate}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{edu.school || 'School'} | {edu.location}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 pb-1 break-after-avoid" style={{borderColor: accentColor}}>SKILLS</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {skills.map((skill, index) => (
                                <span key={index} className="px-3 py-1 bg-white/10 rounded-full text-xs">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>PROJECTS</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{item.name || 'Project Name'}</h3>
                                        <p className="text-[0.9em] text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{item.technologies}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 pb-1 break-after-avoid" style={{borderColor: accentColor}}>CERTIFICATIONS</h2>
                         <div className="mt-3 space-y-2 text-sm">
                            {certifications.map((cert, index) => (
                                <p key={index} className="break-inside-avoid"><strong>{cert.name}</strong></p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages?.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 pb-1 break-after-avoid" style={{borderColor: accentColor}}>LANGUAGES</h2>
                         <div className="mt-3 space-y-2 text-sm">
                            {languages.map((lang, index) => (
                                <p key={index} className="break-inside-avoid"><strong>{lang.language}:</strong> {lang.proficiency}</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 pb-1 break-after-avoid" style={{borderColor: accentColor}}>AWARDS</h2>
                         <div className="mt-3 space-y-2 text-sm">
                            {awards.map((award, index) => (
                                <div key={index} className="break-inside-avoid">
                                    <p className="font-bold">{award.title}</p>
                                    <p className="text-xs text-gray-400">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>TRAINING</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{item.course}</h3>
                                        <p className="text-[0.9em] text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>PUBLICATIONS</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-3">
                            {publications.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{item.title}</h3>
                                        <p className="text-[0.9em] text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>VOLUNTEERING</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-3">
                            {volunteer.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{item.role}</h3>
                                        <p className="text-[0.9em] text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{item.organization}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                        <h2 className="text-[1.4em] font-bold uppercase tracking-wider break-after-avoid" style={{ color: accentColor }}>ADDITIONAL ACTIVITIES</h2>
                        <div className="w-16 h-1 bg-gray-200 my-2"></div>
                        <div className="space-y-3">
                            {custom.map(item => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[1.1em] font-bold">{item.title}</h3>
                                        <p className="text-[0.9em] text-gray-500">{item.date}</p>
                                    </div>
                                    <p className="font-semibold text-gray-600">{item.subtitle}</p>
                                    <div className="mt-1 text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-modern"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex text-gray-800`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <aside className="w-[38%] bg-[#2d3748] text-white p-8 flex flex-col">
                 <div className="text-center">
                    {contact.photo && (
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white/20 shadow-lg mb-4">
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-wider">{contact.firstName || 'YOUR'}</h1>
                    <h1 className="text-3xl font-light tracking-wider">{contact.lastName || 'NAME'}</h1>
                    <p className="text-md mt-2" style={{ color: accentColor }}>{contact.jobTitle || 'Your Job Title'}</p>
                </div>

                <div className="mt-8 space-y-6">
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 pb-1" style={{borderColor: accentColor}}>CONTACT</h2>
                        <div className="mt-3 space-y-2 text-sm">
                            {contact.phone && <div className="flex items-center gap-3"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{fullPhone}</span></div>}
                            {contact.email && <div className="flex items-center gap-3"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{contact.email}</span></div>}
                            {fullAddress && <div className="flex items-center gap-3"><House aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" /><span>{fullAddress}</span></div>}
                        </div>
                    </section>

                    {renderRun(['skills', 'certifications', 'languages', 'awards'])}
                </div>
            </aside>
            <main className="w-[62%] p-8">
                {renderRun(['summary', 'experience', 'projects', 'education', 'trainings', 'publications', 'volunteer', 'custom'])}
            </main>
        </div>
    );
};

export default React.memo(ModernTemplate);
