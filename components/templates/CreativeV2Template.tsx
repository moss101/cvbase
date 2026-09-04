
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Award, BookOpen, Brain, Briefcase, Code, Contact, Ellipsis, Globe, GraduationCap, HeartHandshake, IdCard, Lightbulb, Star, Trophy } from 'lucide-react';

const CreativeV2Template: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#34d399';
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Simplified parsing for Key Achievements from summary
    const summaryParts = summary.professionalSummary.split('KEY ACHIEVEMENTS');
    const summaryText = summaryParts[0];
    const achievementsText = summaryParts[1] || '';
    const keyAchievements = achievementsText.split('*').map(s => s.trim()).filter(Boolean);

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Brain aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />SKILLS</h2>
                        <div className="flex flex-wrap gap-1">
                            {skills.map((skill, index) => (
                                <span key={index} className="text-xs px-2 py-1 bg-white rounded shadow-sm border border-gray-100">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Code aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />PROJECTS</h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm">{item.name}</h3>
                                        <p className="text-xs text-gray-500">{item.startDate} - {item.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold">{item.technologies}</p>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="mb-6">
                         <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Award aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />CERTIFICATIONS</h2>
                         <div className="space-y-1 text-xs">
                            {certifications.map(cert => (
                                <p className="break-inside-avoid" key={cert.id}>{cert.name}</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages?.length > 0 ? (
                    <section key="languages" data-section="languages" className="mb-6">
                         <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Globe aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />LANGUAGES</h2>
                         <div className="space-y-1 text-xs">
                            {languages.map(lang => (
                                <p className="break-inside-avoid" key={lang.id}>{lang.language} ({lang.proficiency})</p>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards" className="mb-6">
                         <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />AWARDS</h2>
                         <div className="space-y-1 text-xs">
                            {awards.map(award => (
                                <div className="break-inside-avoid" key={award.id}>
                                    <p className="font-bold">{award.title}</p>
                                    <p className="text-gray-500">{award.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Lightbulb aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />TRAININGS</h2>
                        <div className="space-y-2">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-sm">{item.course}</h3>
                                    <p className="text-xs text-gray-600">{item.institution}</p>
                                    <p className="text-[10px] text-gray-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><BookOpen aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />PUBLICATIONS</h2>
                        <div className="space-y-2">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-sm">{item.title}</h3>
                                    <p className="text-xs text-gray-600">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><HeartHandshake aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />VOLUNTEER</h2>
                        <div className="space-y-2">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-sm">{item.role}</h3>
                                    <p className="text-xs text-gray-600">{item.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Ellipsis aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />ADDITIONAL</h2>
                        <div className="space-y-2">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-sm">{item.title}</h3>
                                    <p className="text-xs text-gray-600">{item.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'summary':
                return (
                     <section key="summary" data-section="summary" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><IdCard aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />SUMMARY</h2>
                        <div className="text-xs leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryText) }} />
                    </section>
                );
            case 'experience':
                return (
                     <section key="experience" data-section="experience" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><Briefcase aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />EXPERIENCE</h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-sm">{exp.jobTitle}</h3>
                                        <p className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</p>
                                    </div>
                                    <p className="text-xs font-semibold">{exp.company}, {exp.location}</p>
                                    <div className="mt-1 text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'education':
                return (
                     <section key="education" data-section="education" className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 break-after-avoid"><GraduationCap aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />EDUCATION</h2>
                         {education.map(edu => (
                            <div key={edu.id} className="text-xs mb-2 break-inside-avoid">
                                <p className="font-bold">{edu.degree}</p>
                                <p>{edu.school}</p>
                                <p className="text-gray-500">{edu.startDate} - {edu.endDate}</p>
                            </div>
                         ))}
                    </section>
                );
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div id={isCardPreview ? undefined : "resume-preview-creative-v2"} className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex text-gray-700`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <aside className="w-[40%] bg-gray-50 p-6 relative">
                 <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute -top-1/4 -left-1/4">
                        <defs>
                            <pattern id="creative-bg" patternUnits="userSpaceOnUse" width="60" height="60" patternTransform="scale(1) rotate(45)">
                                <rect x="0" y="0" width="100%" height="100%" fill="transparent"/>
                                <path d="M-10 20 l20-20 M0 10 l10-10 M0 40 l40-40 M30 50 l20-20" stroke={accentColor} strokeWidth="0.5" opacity="0.1"/>
                            </pattern>
                        </defs>
                        <rect x="0" y="0" width="200%" height="200%" fill="url(#creative-bg)"/>
                    </svg>
                 </div>
                 <div className="relative z-10">
                    {contact.photo && (
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 shadow-lg mb-4" style={{ borderColor: accentColor }}>
                            <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <section className="mb-6">
                        <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2"><Contact aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />CONTACTS</h2>
                        <div className="space-y-1 text-xs">
                             {contact.phone && <p>{fullPhone}</p>}
                             {contact.email && <p>{contact.email}</p>}
                             {contact.linkedin && <p>{contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</p>}
                             {fullAddress && <p>{fullAddress}</p>}
                        </div>
                    </section>
                     {keyAchievements.length > 0 && (
                        <section className="mb-6">
                            <h2 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2"><Star aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-[24px]" style={{ color: accentColor }} />KEY ACHIEVEMENTS</h2>
                            <ul className="space-y-2 text-xs">
                                {keyAchievements.map((ach, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="mt-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></span>
                                        <span>{ach}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {renderRun(['education', 'skills', 'certifications', 'languages', 'awards'])}
                </div>
            </aside>
            <main className="w-[60%] p-8">
                <header className="mb-6">
                    <div className="bg-gray-800 text-white p-4 rounded-lg">
                        <h1 className="text-3xl font-bold">{contact.firstName || 'YOUR'} {contact.lastName || 'NAME'}</h1>
                        <p className="font-light tracking-widest" style={{ color: accentColor }}>{contact.jobTitle || 'Your Job Title'}</p>
                    </div>
                </header>
                {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}
            </main>
        </div>
    );
};

export default React.memo(CreativeV2Template);
