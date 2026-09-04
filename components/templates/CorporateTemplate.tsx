
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const ExperienceProjects: React.FC<{ description: string; themeColor: string }> = ({ description, themeColor }) => {
    const descriptionParts = description.split('--- PROJECTS ---');
    if (descriptionParts.length < 2) return null;

    const projectsText = descriptionParts[1] || '';
    
    const projects = projectsText
        .split('\n')
        .filter(line => line.includes('|'))
        .map(line => {
            const [name, desc] = line.split('|');
            return { name: name?.trim(), description: desc?.trim() };
        })
        .filter(p => p.name && p.description);

    if (projects.length === 0) return null;

    return (
        <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 dark:border-border-dark">
                <thead className="bg-slate-100 dark:bg-subtle-dark">
                    <tr>
                        <th className="p-3 text-left font-semibold w-1/3" style={{ color: themeColor }}>Project name</th>
                        <th className="p-3 text-left font-semibold" style={{ color: themeColor }}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((proj, index) => (
                        <tr key={index} className="border-t border-slate-200 dark:border-border-dark">
                            <td className="p-3 align-top font-medium text-slate-800 dark:text-heading-dark">{proj.name}</td>
                            <td className="p-3 align-top">{proj.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const CorporateTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;

    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const themeColor = settings?.themeColor || '#00b4a0';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();
    
    const formalEducation = education.filter(edu => !/certificate|course/i.test(edu.degree));
    const courses = education.filter(edu => /certificate|course/i.test(edu.degree));

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Summary</h2>
                        <div className="text-sm leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Experience</h2>
                         {experience.map(exp => {
                            const descriptionHtml = (exp.description || '').split('--- PROJECTS ---')[0];

                            return (
                                <div key={exp.id} className="mb-8 break-inside-avoid">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-heading-dark">{exp.jobTitle}</h3>
                                    <div className="flex flex-wrap justify-between items-baseline mb-2">
                                        <h4 className="text-md font-semibold" style={{ color: themeColor }}>{exp.company}</h4>
                                        <p className="text-sm text-slate-500 dark:text-text-dark">
                                            <span className="material-icons text-base align-middle mr-1">calendar_today</span> {exp.startDate} - {exp.endDate}
                                            <span className="material-icons text-base align-middle ml-4 mr-1">location_on</span> {exp.location}
                                        </p>
                                    </div>
                                    <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(descriptionHtml) }} />
                                    <ExperienceProjects description={exp.description} themeColor={themeColor} />
                                </div>
                            );
                        })}
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="mt-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                 <span key={i} className="px-4 py-1.5 text-sm bg-slate-100 dark:bg-subtle-dark border border-slate-200 dark:border-border-dark text-slate-800 dark:text-heading-dark">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Projects</h2>
                        {projects.map(item => (
                            <div key={item.id} className="mb-8 break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-heading-dark">{item.name}</h3>
                                <div className="flex flex-wrap justify-between items-baseline mb-2">
                                    <h4 className="text-md font-semibold" style={{ color: themeColor }}>{item.technologies}</h4>
                                    <p className="text-sm text-slate-500 dark:text-text-dark">
                                        <span className="material-icons text-base align-middle mr-1">calendar_today</span> {item.startDate} - {item.endDate}
                                    </p>
                                </div>
                                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="mt-8">
                         <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Certifications</h2>
                         <ul className="list-disc list-inside columns-2">
                             {certifications.map(cert => (
                                 <li key={cert.id} className="mb-1 text-sm break-inside-avoid">{cert.name}</li>
                             ))}
                         </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages?.length > 0 ? (
                    <section key="languages" data-section="languages">
                         <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Languages</h2>
                         <div className="space-y-2">
                             {languages.map(lang => (
                                 <div className="break-inside-avoid" key={lang.id}>
                                    <h3 className="font-bold text-slate-800 dark:text-heading-dark">{lang.language}</h3>
                                    <p className="text-sm">{lang.proficiency}</p>
                                </div>
                             ))}
                         </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Awards</h2>
                        <div className="flex flex-col gap-2">
                            {awards.map(award => (
                                <div className="break-inside-avoid" key={award.id}>
                                    <p className="font-semibold text-slate-800 dark:text-heading-dark">{award.title}</p>
                                    <p className="text-xs text-slate-500">{award.issuer}, {award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Trainings</h2>
                        <div className="space-y-4">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold" style={{ color: themeColor }}>{item.course}</h3>
                                    <p className="text-sm leading-relaxed">{item.institution}</p>
                                    <p className="text-xs text-slate-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Publications</h2>
                        {publications.map(item => (
                            <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-heading-dark">{item.title}</h3>
                                <p className="text-md font-semibold" style={{ color: themeColor }}>{item.publisher}, {item.date}</p>
                                {item.description && <p className="text-sm mt-1">{item.description}</p>}
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Volunteering</h2>
                        {volunteer.map(item => (
                            <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-heading-dark">{item.role}</h3>
                                <p className="text-md font-semibold" style={{ color: themeColor }}>{item.organization}</p>
                                <p className="text-sm text-slate-500 dark:text-text-dark mb-1">{item.startDate} - {item.endDate}</p>
                                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Additional</h2>
                        {custom.map(item => (
                            <div key={item.id} className="mb-4 break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-heading-dark">{item.title}</h3>
                                <p className="text-md font-semibold" style={{ color: themeColor }}>{item.subtitle}</p>
                                <p className="text-sm text-slate-500 dark:text-text-dark mb-1">{item.date}</p>
                                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                            </div>
                        ))}
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <div key="education" data-section="education" className="space-y-8">
                         {formalEducation.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Education</h2>
                                <div className="space-y-4">
                                    {formalEducation.map(edu => (
                                        <div key={edu.id} className="break-inside-avoid">
                                            <h3 className="font-bold text-slate-800 dark:text-heading-dark">{edu.degree}</h3>
                                            <p className="font-semibold" style={{ color: themeColor }}>{edu.school}</p>
                                            <p className="text-sm"><span className="material-icons text-base align-middle mr-1">calendar_today</span> {edu.startDate} - {edu.endDate}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                         {courses.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-heading-dark border-b-2 border-slate-200 dark:border-border-dark pb-1 mb-6 break-after-avoid">Courses</h2>
                                <div className="space-y-4">
                                    {courses.map(course => (
                                        <div key={course.id} className="break-inside-avoid">
                                            <h3 className="font-bold" style={{ color: themeColor }}>{course.degree}</h3>
                                            <p className="text-sm leading-relaxed">{course.school}</p>
                                            {course.description && <p className="text-xs italic mt-1 text-slate-500">{course.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                         )}
                    </div>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div id={isCardPreview ? undefined : "resume-preview-corporate"} className={`w-[794px] min-h-[1123px] h-auto bg-white dark:bg-background-dark ${fontSize} p-10 text-slate-600 dark:text-text-dark`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="text-center md:text-left mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-heading-dark tracking-tight">{(contact.firstName || 'YOUR').toUpperCase()} {(contact.lastName || 'NAME').toUpperCase()}</h1>
                <p className="text-lg font-medium mt-1" style={{ color: themeColor }}>{contact.jobTitle || 'Your Job Title'}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mt-4 text-sm">
                    {contact.phone && <div className="flex items-center"><span className="material-icons text-lg mr-2">phone</span><span>{fullPhone}</span></div>}
                    {contact.email && <div className="flex items-center"><span className="material-icons text-lg mr-2">email</span><span>{contact.email}</span></div>}
                    {contact.linkedin && <div className="flex items-center"><span className="material-icons text-lg mr-2">link</span><span>LinkedIn</span></div>}
                    {fullAddress && <div className="flex items-center"><span className="material-icons text-lg mr-2">location_on</span><span>{fullAddress}</span></div>}
                </div>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    {renderRun(['experience', 'projects', 'publications', 'volunteer', 'custom', 'skills'])}
                </div>

                <div className="lg:col-span-1 space-y-8">
                    {renderRun(['summary', 'education', 'trainings', 'certifications', 'languages', 'awards'])}
                </div>
            </main>
        </div>
    );
};

export default React.memo(CorporateTemplate);
