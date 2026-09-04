
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const GlitchTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const accentColor = settings?.themeColor || '#00ff41'; 
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
                        <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> SUMMARY
                        </h2>
                        <div className="text-justify opacity-90 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                         <h2 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> EXPERIENCE_LOG
                        </h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="pl-4 glitch-border break-inside-avoid">
                                    <div className="flex justify-between mb-1">
                                        <h3 className="font-bold text-sm">{exp.jobTitle}</h3>
                                        <span className="text-[9px] bg-gray-800 px-2 py-0.5 rounded text-gray-300">{exp.startDate} :: {exp.endDate}</span>
                                    </div>
                                    <p className="text-xs mb-2" style={{ color: accentColor }}>@{exp.company}</p>
                                    <div className="opacity-80 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> EDUCATION
                        </h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <h3 className="font-bold text-xs text-white">{edu.degree}</h3>
                                    <p className="text-xs text-gray-400">{edu.school}</p>
                                    <p className="text-[9px] opacity-50">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> SKILL_SET
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="px-2 py-1 border border-gray-700 text-[9px] hover:border-white transition-colors">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <h2 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> DEPLOYMENTS
                        </h2>
                        <div className="space-y-4">
                            {projects.map(item => (
                                <div key={item.id} className="pl-4 glitch-border break-inside-avoid">
                                    <div className="flex justify-between mb-1">
                                        <h3 className="font-bold text-sm">{item.name}</h3>
                                        <span className="text-[9px] bg-gray-800 px-2 py-0.5 rounded text-gray-300">{item.startDate} :: {item.endDate}</span>
                                    </div>
                                    <p className="text-xs opacity-60 italic mb-1">&lt;stack&gt;{item.technologies}&lt;/stack&gt;</p>
                                    <div className="opacity-80 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> CERTS
                        </h2>
                        <ul className="space-y-2">
                            {certifications.map(cert => (
                                <li key={cert.id} className="text-xs break-inside-avoid">
                                    <span className="block font-bold" style={{ color: accentColor }}>&gt; {cert.name}</span>
                                    {cert.expiryDate && <span className="opacity-50 text-[9px]">Exp: {cert.expiryDate}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> AWARDS
                        </h2>
                        <ul className="space-y-2">
                            {awards.map(award => (
                                <li key={award.id} className="text-xs break-inside-avoid">
                                    <span className="block font-bold">&gt; {award.title}</span>
                                    <span className="opacity-50 text-[9px]">{award.issuer} [{award.date}]</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> TRAINING_LOG
                        </h2>
                        <div className="space-y-4">
                            {trainings.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h3 className="font-bold text-xs text-white">{item.course}</h3>
                                    <p className="text-xs text-gray-400">{item.institution}</p>
                                    <p className="text-[9px] opacity-50">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> PUB_LOG
                        </h2>
                        <ul className="space-y-2">
                            {publications.map(item => (
                                <li key={item.id} className="text-xs break-inside-avoid">
                                    <span className="block font-bold">&gt; {item.title}</span>
                                    <span className="opacity-50 text-[9px]">{item.publisher}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                         <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> VOLUNTEER
                        </h2>
                        <ul className="space-y-2">
                            {volunteer.map(item => (
                                <li key={item.id} className="text-xs break-inside-avoid">
                                    <span className="block font-bold">&gt; {item.role}</span>
                                    <span className="opacity-50 text-[9px]">{item.organization}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <h2 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 break-after-avoid">
                            <span style={{ color: accentColor }}>#</span> CUSTOM_MODULES
                        </h2>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div key={item.id} className="pl-4 glitch-border break-inside-avoid">
                                    <div className="flex justify-between mb-1">
                                        <h3 className="font-bold text-sm">{item.title}</h3>
                                        <span className="text-[9px] bg-gray-800 px-2 py-0.5 rounded text-gray-300">{item.date}</span>
                                    </div>
                                    <p className="text-xs opacity-60 italic mb-1">{item.subtitle}</p>
                                    <div className="opacity-80 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
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
        <div id={isCardPreview ? undefined : "resume-preview-glitch"} className={`w-[794px] min-h-[1123px] h-auto bg-[#0f0f0f] text-[#e0e0e0] ${fontSize} p-10 font-mono`} style={{ fontFamily: settings?.fontFamily || "'Courier New', Courier, monospace" }}>
            <style>
                {`
                    .glitch-border { border-left: 2px solid ${accentColor}; }
                    .glitch-text { text-shadow: 1px 0 0 red, -1px 0 0 blue; }
                `}
            </style>
            
            <header className="mb-8 border-b border-gray-700 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter mb-2" style={{ color: accentColor }}>
                        &lt;{contact.firstName}_{contact.lastName} /&gt;
                    </h1>
                    <p className="text-base uppercase tracking-widest opacity-80">// {contact.jobTitle}</p>
                </div>
                <div className="text-right text-xs space-y-1 opacity-70">
                    {fullPhone && <p>[PHONE] {fullPhone}</p>}
                    {contact.email && <p>[EMAIL] {contact.email}</p>}
                    {contact.linkedin && <p>[LINK] {contact.linkedin}</p>}
                    {fullAddress && <p>[LOC] {fullAddress}</p>}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-8">
                    {renderRun(['summary', 'experience', 'projects', 'custom'])}
                </div>

                <div className="col-span-4 space-y-8">
                    {renderRun(['skills', 'education', 'trainings', 'certifications', 'awards', 'publications', 'volunteer'])}
                </div>
            </div>
        </div>
    );
};

export default React.memo(GlitchTemplate);
