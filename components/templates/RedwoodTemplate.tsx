
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Mail, MapPin, Phone, Star } from 'lucide-react';

const RedwoodTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#800020'; // Burgundy/Redwood
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Parse Key Achievements if available in summary or generic
    const summaryParts = summary.professionalSummary.split('KEY ACHIEVEMENTS');
    const summaryText = summaryParts[0];
    const achievementsText = summaryParts[1] || '';
    const keyAchievements = achievementsText.split('*').map(s => s.trim()).filter(Boolean);

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 break-after-avoid">Experience</h3>
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="text-base font-light text-gray-800">{exp.jobTitle}</h4>
                                        <span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-xs font-bold text-[#d6336c] mb-2">{exp.company}</p>
                                    <div className="text-xs leading-relaxed text-gray-600 pl-2 border-l-2 border-gray-100" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-2 mb-4 break-after-avoid">Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <h3 className="font-bold text-sm text-white/90">{edu.degree}</h3>
                                    <p className="text-xs text-white/70">{edu.school}</p>
                                    <p className="text-[9px] text-white/50 mt-0.5">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="mt-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 break-after-avoid">Projects</h3>
                        <div className="space-y-6">
                            {projects.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="text-sm font-bold text-gray-800">{item.name}</h4>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[10px] text-[#d6336c] font-bold mb-1">{item.technologies}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-2 mb-4 break-after-avoid">Certifications</h2>
                        <div className="space-y-2">
                            {certifications.map((cert, i) => (
                                <div key={i} className="text-xs break-inside-avoid">
                                    <span>{cert.name}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-2 mb-4 break-after-avoid">Languages</h2>
                        <div className="space-y-2">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between text-xs break-inside-avoid">
                                    <span>{lang.language}</span>
                                    <span className="text-white/60">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-2 mb-4 break-after-avoid">Awards</h2>
                        <div className="space-y-2">
                            {awards.map((award, i) => (
                                <div key={i} className="text-xs break-inside-avoid">
                                    <span className="font-bold block">{award.title}</span>
                                    <span className="text-white/60">{award.issuer}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="mt-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 break-after-avoid">Trainings</h3>
                        <div className="space-y-6">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="text-sm font-bold text-gray-800">{item.course}</h4>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[10px] text-[#d6336c] font-bold mb-1">{item.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="mt-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 break-after-avoid">Publications</h3>
                        <div className="space-y-6">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[10px] text-[#d6336c] font-bold mb-1">{item.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="mt-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 break-after-avoid">Volunteering</h3>
                        <div className="space-y-6">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="text-sm font-bold text-gray-800">{item.role}</h4>
                                        <span className="text-xs text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[10px] text-[#d6336c] font-bold mb-1">{item.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="mt-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 break-after-avoid">Additional</h3>
                        <div className="space-y-6">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                    </div>
                                    <p className="text-[10px] text-[#d6336c] font-bold mb-1">{item.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return (
                    <section key="skills" data-section="skills">
                        <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-2 mb-4 break-after-avoid">Skills</h2>
                        <div className="text-xs space-y-2 font-light leading-relaxed">
                             {skills.join(' • ')}
                        </div>
                    </section>
                );
            case 'summary':
                return (summaryText || keyAchievements.length > 0) ? (
                    <div key="summary" data-section="summary">
                        {summaryText && (
                            <section className="mb-10">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-4 break-after-avoid">Summary</h3>
                                <div className="text-xs leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryText) }} />
                            </section>
                        )}

                        {keyAchievements.length > 0 && (
                            <section className="mb-10">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-4 break-after-avoid">Key Achievements</h3>
                                <div className="space-y-4">
                                    {keyAchievements.map((ach, i) => (
                                        <div key={i} className="flex gap-4 break-inside-avoid">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-[#d6336c]">
                                                <Star aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" />
                                            </div>
                                            <div>
                                                <p className="text-xs leading-relaxed">{ach}</p>
                                            </div>
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
        <div id={isCardPreview ? undefined : "resume-preview-redwood"} className="w-[794px] min-h-[1123px] h-auto bg-white text-[#333] text-[10px] flex" style={{ fontFamily: "'Roboto', sans-serif" }}>
            
            {/* Sidebar */}
            <aside className="w-[35%] text-white p-8 flex flex-col gap-8" style={{ backgroundColor: '#4a192c' }}>
                <div>
                    <h1 className="text-4xl font-light uppercase tracking-wider mb-1">{contact.firstName}</h1>
                    <h1 className="text-4xl font-bold uppercase tracking-wider">{contact.lastName}</h1>
                </div>


                {renderRun(['skills', 'education', 'languages', 'certifications', 'awards'])}
            </aside>

            {/* Main Content */}
            <main className="w-[65%] p-10 text-gray-700">
                <header className="mb-10">
                    <h2 className="text-2xl font-light text-[#d6336c] mb-2" style={{ color: '#d6336c' }}>{contact.jobTitle}</h2>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {fullPhone && <span className="flex items-center gap-1"><Phone aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" /> {fullPhone}</span>}
                        {contact.email && <span className="flex items-center gap-1"><Mail aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" /> {contact.email}</span>}
                        {fullAddress && <span className="flex items-center gap-1"><MapPin aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-sm" /> {city}</span>}
                    </div>
                </header>

                {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}

            </main>
        </div>
    );
};

export default React.memo(RedwoodTemplate);
