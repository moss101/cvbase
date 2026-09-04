
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const VogueTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="text-center max-w-2xl mx-auto">
                        <div className="text-xs leading-7 font-serif italic text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-center text-base font-bold uppercase tracking-[0.2em] mb-8 border-b border-gray-200 pb-2 font-sans break-after-avoid">Experience</h2>
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div key={exp.id} className="grid grid-cols-12 gap-4 break-inside-avoid">
                                    <div className="col-span-3 text-right pt-1">
                                        <p className="font-sans font-bold text-[9px] uppercase tracking-wide">{exp.company}</p>
                                        <p className="font-sans text-[9px] text-gray-400 mt-1">{exp.startDate} — {exp.endDate}</p>
                                    </div>
                                    <div className="col-span-9 border-l border-gray-200 pl-6">
                                        <h3 className="font-serif font-bold text-sm mb-2 italic">{exp.jobTitle}</h3>
                                        <div className="font-sans text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Education</h2>
                        <div className="space-y-4 text-center">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <h3 className="font-bold text-xs">{edu.school}</h3>
                                    <p className="font-serif italic text-gray-600">{edu.degree}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{edu.startDate} — {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Skills</h2>
                        <div className="text-center font-sans text-gray-600 leading-6 uppercase text-[9px] tracking-wide">
                            {skills.join('  •  ')}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-center text-base font-bold uppercase tracking-[0.2em] mb-8 border-b border-gray-200 pb-2 font-sans break-after-avoid">Selected Works</h2>
                        <div className="grid grid-cols-2 gap-8">
                            {projects.map(item => (
                                <div key={item.id} className="text-center break-inside-avoid">
                                    <h3 className="font-bold text-sm uppercase tracking-wide mb-1 font-sans">{item.name}</h3>
                                    <p className="text-[9px] font-sans text-gray-400 mb-2">{item.technologies}</p>
                                    <div className="font-serif text-xs text-gray-600 italic" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Certifications</h2>
                         <div className="space-y-4 text-center">
                            {certifications.map(cert => (
                                <div className="break-inside-avoid" key={cert.id}>
                                    <h3 className="font-bold text-xs">{cert.name}</h3>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Honors</h2>
                         <div className="space-y-4 text-center">
                            {awards.map(award => (
                                <div className="break-inside-avoid" key={award.id}>
                                    <h3 className="font-bold text-xs">{award.title}</h3>
                                    <p className="font-serif italic text-gray-600">{award.issuer}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Training</h2>
                         <div className="space-y-4 text-center">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-xs">{item.course}</h3>
                                    <p className="font-serif italic text-gray-600">{item.institution}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Publications</h2>
                         <div className="space-y-4 text-center">
                            {publications.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-xs">{item.title}</h3>
                                    <p className="font-serif italic text-gray-600">{item.publisher}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Volunteering</h2>
                         <div className="space-y-4 text-center">
                            {volunteer.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-xs">{item.role}</h3>
                                    <p className="font-serif italic text-gray-600">{item.organization}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.startDate} - {item.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans break-after-avoid">Additional</h2>
                         <div className="space-y-4 text-center">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-xs">{item.title}</h3>
                                    <p className="font-serif italic text-gray-600">{item.subtitle}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.date}</p>
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
        <div id={isCardPreview ? undefined : "resume-preview-vogue"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#1a1a1a] p-14 ${fontSize}`} style={{ fontFamily: settings?.fontFamily || "'Merriweather', serif" }}>
            
            <header className="text-center mb-12">
                <h1 className="text-5xl font-black uppercase tracking-widest mb-3 leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {contact.firstName} <span className="font-light">{contact.lastName}</span>
                </h1>
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-6">{contact.jobTitle}</p>
                
                <div className="flex justify-center gap-6 text-[9px] uppercase tracking-wider text-gray-600 font-sans border-t border-b border-black py-3">
                    {fullPhone && <span>{fullPhone}</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {fullAddress && <span>{city}, {countryName}</span>}
                    {contact.linkedin && <span>LinkedIn</span>}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-10 max-w-3xl mx-auto">
                
                {renderRun(['summary', 'experience', 'projects'])}

                <div className="grid grid-cols-2 gap-12">
                     {renderRun(['education', 'skills'])}
                </div>

                {renderRun(['certifications', 'awards', 'trainings', 'publications', 'volunteer', 'custom'])}

            </div>
        </div>
    );
};

export default React.memo(VogueTemplate);
