import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const GsbExecutiveTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#0F172A'; // Midnight slate / navy
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-gray-400 break-after-avoid" style={{ color: accentColor }}>
                            Professional Summary
                        </h2>
                        <div className="text-xs text-gray-750 text-justify font-normal leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400 break-after-avoid" style={{ color: accentColor }}>
                            Professional Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="group break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-0.5 font-bold">
                                        <h3 className="text-xs text-slate-900 font-bold">{exp.jobTitle}</h3>
                                        <span className="text-xs text-gray-600 font-semibold">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs italic text-gray-700 mb-1">
                                        <span>{exp.company}</span>
                                        <span className="text-[10px] font-normal not-italic text-gray-500">{exp.location}</span>
                                    </div>
                                    <div className="text-xs text-gray-700 leading-relaxed pl-3 border-l border-gray-100" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400 break-after-avoid" style={{ color: accentColor }}>
                            Education
                        </h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-0.5 font-bold">
                                        <h3 className="text-xs text-slate-900 font-bold">{edu.school}</h3>
                                        <span className="text-xs text-gray-650 font-semibold">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs text-gray-700 italic">
                                        <span>{edu.degree}</span>
                                        <span className="text-[10px] font-normal not-italic text-gray-500">{edu.location}</span>
                                    </div>
                                    {edu.description && (
                                        <p className="text-xs text-gray-650 mt-1 whitespace-pre-wrap">{edu.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400 break-after-avoid" style={{ color: accentColor }}>
                            Skills & expertise
                        </h2>
                        <div className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-bold text-slate-800">Core Capabilities: </span>
                            {skills.join(' • ')}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-gray-400 break-after-avoid" style={{ color: accentColor }}>
                            Selected Projects
                        </h2>
                        <div className="space-y-3">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-0.5 font-bold">
                                        <h3 className="text-xs text-slate-900 font-bold">{proj.name}</h3>
                                        <span className="text-xs text-gray-600 font-semibold">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] italic text-slate-600 mb-1">Technologies: {proj.technologies}</p>
                                    )}
                                    <div className="text-xs text-gray-700 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-gray-400 break-after-avoid" style={{ color: accentColor }}>
                            Certifications
                        </h2>
                        <div className="text-xs text-gray-700 leading-relaxed">
                            {certifications.map((cert, index) => (
                                <span key={cert.id}>
                                    {index > 0 && ' • '}
                                    <span className="font-semibold">{cert.name}</span>
                                    {cert.number && ` (ID: ${cert.number})`}
                                    {cert.expiryDate && ` - Exp: ${cert.expiryDate}`}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages" className="col-span-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1 break-after-avoid" style={{ borderColor: '#ddd' }}>
                            Languages
                        </h3>
                        <ul className="text-xs text-gray-700 space-y-0.5">
                            {languages.map(lang => (
                                <li className="break-inside-avoid" key={lang.id}>
                                    <span className="font-semibold">{lang.language}</span> — {lang.proficiency}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <div key="awards" data-section="awards" className="col-span-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1 break-after-avoid" style={{ borderColor: '#ddd' }}>
                            Honors & Awards
                        </h3>
                        <ul className="text-xs text-gray-700 space-y-0.5">
                            {awards.map(award => (
                                <li className="break-inside-avoid" key={award.id}>
                                    <span className="font-semibold">{award.title}</span>, {award.issuer} ({award.date})
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <div key="trainings" data-section="trainings" className="col-span-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1 break-after-avoid" style={{ borderColor: '#ddd' }}>
                            Professional Training
                        </h3>
                        <ul className="text-xs text-gray-700 space-y-0.5">
                            {trainings.map(item => (
                                <li className="break-inside-avoid" key={item.id}>
                                    <span className="font-semibold">{item.course}</span> - {item.institution}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <div key="publications" data-section="publications" className="col-span-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1 break-after-avoid" style={{ borderColor: '#ddd' }}>
                            Selected Publications
                        </h3>
                        <ul className="text-xs text-gray-700 space-y-0.5">
                            {publications.map(item => (
                                <li className="break-inside-avoid" key={item.id}>
                                    <span className="font-semibold">{item.title}</span> - {item.publisher} ({item.date})
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <div key="volunteer" data-section="volunteer" className="col-span-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b pb-0.5 mb-1.5 break-after-avoid" style={{ borderColor: '#ddd' }}>
                            Volunteering & Leadership
                        </h3>
                        <div className="space-y-2">
                            {volunteer.map(item => (
                                <div key={item.id} className="text-xs break-inside-avoid">
                                    <div className="flex justify-between items-baseline font-semibold">
                                        <span>{item.role}, {item.organization}</span>
                                        <span className="text-[10px] font-normal text-gray-500">{item.startDate} - {item.endDate}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-gsb-executive"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white ${fontSize} flex flex-col p-12 text-gray-900 leading-relaxed`}
            style={{ fontFamily: settings?.fontFamily || 'Georgia, serif' }}
        >
            {/* Header Section */}
            <header className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase mb-1">
                    {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                </h1>
                {contact.jobTitle && (
                    <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase mb-3">
                        {contact.jobTitle}
                    </p>
                )}
                
                {/* Contact Minimal Text Flow Bar */}
                <div className="text-gray-600 text-[10px] flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
                    {fullPhone && <span>{fullPhone}</span>}
                    {fullPhone && contact.email && <span className="text-gray-300">|</span>}
                    {contact.email && <span className="break-all">{contact.email}</span>}
                    {contact.email && fullAddress && <span className="text-gray-300">|</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                    {fullAddress && contact.linkedin && <span className="text-gray-300">|</span>}
                    {contact.linkedin && <span className="break-all">{contact.linkedin}</span>}
                    {contact.linkedin && contact.website && <span className="text-gray-300">|</span>}
                    {contact.website && <span className="break-all">{contact.website}</span>}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="space-y-5">
                {/* Executive Summary */}
                {renderRun(['summary', 'experience', 'projects', 'education', 'skills', 'certifications'])}

                {/* Additional Optional Sections in continuous flow */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {renderRun(['languages', 'awards', 'trainings', 'publications', 'volunteer'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(GsbExecutiveTemplate);
