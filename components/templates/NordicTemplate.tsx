import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const NordicTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const pineColor = '#1F342B'; // Earthy deep pine green
    const sageColor = '#476255'; // Moss sage green
    const lightSage = '#F1F5F3'; // Nordic snow light sage tint
    const darkCharcoal = '#2B302E'; // Deep charcoal

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSectionHeader = (title: string) => (
        <div className="mb-4">
            <h2 className="text-xs font-black tracking-[0.25em] uppercase text-left pb-1" style={{ color: pineColor }}>
                {title}
            </h2>
            <div className="w-8 h-[2px] rounded" style={{ backgroundColor: sageColor }}></div>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <div className="break-after-avoid">{renderSectionHeader('Overview')}</div>
                        <div className="leading-relaxed text-stone-600 text-justify block pr-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <div className="break-after-avoid">{renderSectionHeader('History')}</div>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="relative pl-4 border-l border-stone-200 break-inside-avoid">
                                    {/* Beautiful Dot accent */}
                                    <div className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full border border-white" style={{ backgroundColor: sageColor }}></div>

                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold text-xs text-stone-900 tracking-wide uppercase">{exp.jobTitle}</h3>
                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400 font-sans">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <p className="text-[10px] text-stone-500 italic mb-2">
                                        {exp.company} • {exp.location}
                                    </p>
                                    <div className="text-stone-600 text-xs text-justify pr-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="p-4 rounded-xl border border-stone-100 bg-white">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 break-after-avoid" style={{ color: pineColor }}>
                            Academic Degrees
                        </h3>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[11px] border-b last:border-0 border-stone-150 pb-3 last:pb-0 break-inside-avoid">
                                    <p className="font-bold text-stone-900">{edu.school}</p>
                                    <p className="text-stone-500 italic text-[10px]">{edu.degree}</p>
                                    <p className="text-[9px] font-sans text-stone-400 tracking-wide mt-1">
                                        {edu.startDate} – {edu.endDate} • {edu.location}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="p-4 rounded-xl border border-stone-200" style={{ backgroundColor: lightSage }}>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 break-after-avoid" style={{ color: pineColor }}>
                            Core Qualifiers
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[9px] font-bold px-2 py-1 bg-white text-stone-700 rounded-lg shadow-sm border border-stone-200/45 cursor-pointer hover:border-stone-400 transition-all"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects">
                        <div className="break-after-avoid">{renderSectionHeader('Endeavors')}</div>
                        <div className="space-y-5">
                            {projects.map(proj => (
                                <div key={proj.id} className="relative pl-4 border-l border-stone-100 break-inside-avoid">
                                    <div className="absolute -left-[4px] top-1.5 w-[7px] h-[7px] rounded-full" style={{ backgroundColor: '#D4C5B9' }}></div>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-stone-800 text-xs uppercase leading-tight">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-sans">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] uppercase tracking-wide text-stone-400 font-semibold mt-0.5 mb-2">
                                            Systems: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="p-4 rounded-xl border border-stone-200/55" style={{ backgroundColor: lightSage }}>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 break-after-avoid" style={{ color: pineColor }}>
                            Credentials
                        </h3>
                        <ul className="space-y-2 text-[10px]">
                            {certifications.map(cert => (
                                <li key={cert.id} className="flex justify-between items-baseline font-medium break-inside-avoid">
                                    <span className="text-stone-800 font-extrabold truncate max-w-[130px]">{cert.name}</span>
                                    <span className="text-stone-400 text-[9px] italic flex-shrink-0">{cert.expiryDate}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages" className="p-4 rounded-xl border border-stone-100 bg-white">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 break-after-avoid" style={{ color: pineColor }}>
                            Linguistics
                        </h3>
                        <div className="space-y-2">
                            {languages.map(lang => (
                                <div key={lang.id} className="flex justify-between text-[11px] break-inside-avoid">
                                    <span className="font-bold text-stone-700">{lang.language}</span>
                                    <span className="text-stone-400 italic text-[10px]">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards" className="p-4 rounded-xl border border-stone-200/55" style={{ backgroundColor: lightSage }}>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 break-after-avoid" style={{ color: pineColor }}>
                            Awards & Honors
                        </h3>
                        <ul className="space-y-2 text-[10px]">
                            {awards.map(aw => (
                                <li key={aw.id} className="flex flex-col break-inside-avoid">
                                    <span className="text-stone-800 font-bold">{aw.title}</span>
                                    <span className="text-stone-400 text-[9px]">{aw.issuer}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="p-4 rounded-xl border border-stone-100 bg-white">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 break-after-avoid" style={{ color: pineColor }}>
                            Programs
                        </h3>
                        <ul className="space-y-2 text-[10px]">
                            {trainings.map(t => (
                                <li key={t.id} className="flex flex-col break-inside-avoid">
                                    <span className="text-stone-800 font-bold">{t.course}</span>
                                    <span className="text-stone-400 text-[9px]">{t.institution}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications" className="p-4 rounded-xl border border-stone-250 bg-[#FCFAF5]">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 break-after-avoid" style={{ color: pineColor }}>
                            Publications
                        </h3>
                        <ul className="space-y-2 text-[10px]">
                            {publications.map(pub => (
                                <li key={pub.id} className="flex flex-col break-inside-avoid">
                                    <span className="text-stone-800 font-bold leading-normal">{pub.title}</span>
                                    <span className="text-stone-400 text-[9px] italic">{pub.publisher}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="p-4 rounded-xl border border-stone-100 bg-white">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 break-after-avoid" style={{ color: pineColor }}>
                            Volunteering
                        </h3>
                        <ul className="space-y-2 text-[10px]">
                            {volunteer.map(v => (
                                <li key={v.id} className="flex flex-col break-inside-avoid">
                                    <span className="text-stone-800 font-bold">{v.role}</span>
                                    <span className="text-stone-400 text-[9px]">{v.organization}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <div className="break-after-avoid">{renderSectionHeader('Additional')}</div>
                        <div className="space-y-4">
                            {custom.map(item => (
                                <div key={item.id} className="bg-stone-100/50 p-3 rounded border border-stone-200/40 break-inside-avoid">
                                    <h4 className="font-bold text-stone-900 text-xs">{item.title}</h4>
                                    {item.subtitle && <p className="text-[10px] text-stone-500 italic mt-0.5">{item.subtitle}</p>}
                                    {item.description && <div className="text-stone-600 text-xs mt-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
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
        <div 
            id={isCardPreview ? undefined : "resume-preview-nordic"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-stone-50 border border-stone-200/50 flex flex-col justify-between ${fontSize} text-stone-800 leading-relaxed text-left relative`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Inter', sans-serif",
                color: darkCharcoal
            }}
        >
            <div>
                {/* Asymmetric Nordic Forest Top Header */}
                <header className="grid grid-cols-12 gap-0 text-white" style={{ backgroundColor: pineColor }}>
                    <div className="col-span-8 p-10 flex flex-col justify-center">
                        <h1 className="text-4xl font-light tracking-[0.1em] uppercase mb-1">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <p className="text-xs uppercase tracking-[0.25em] font-medium text-stone-300">
                            {contact.jobTitle || 'Lead Specialist'}
                        </p>
                    </div>
                    {/* Sage Accent Contact box */}
                    <div className="col-span-4 p-8 flex flex-col justify-center text-[10px] space-y-1.5 font-medium border-l border-white/10" style={{ backgroundColor: sageColor }}>
                        {contact.email && <p className="truncate">✉ {contact.email}</p>}
                        {fullPhone && <p>☎ {fullPhone}</p>}
                        {city && <p>📍 {city}</p>}
                        {contact.linkedin && <p className="truncate lowercase opacity-90">in: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</p>}
                        {contact.website && <p className="truncate lowercase opacity-90">w: {contact.website.replace(/^https?:\/\/(www\.)?/, '')}</p>}
                    </div>
                </header>

                {/* Sub-header background shape to represent landscape minimalism */}
                <div className="h-2 w-full" style={{ backgroundColor: '#D4C5B9' }}></div>

                {/* Main Content Area */}
                <main className="grid grid-cols-12 gap-8 p-10">
                    
                    {/* Left main compartment - 7 Columns */}
                    <div className="col-span-7 space-y-6">
                        
                        {/* Summary */}
                        {renderRun(['summary', 'experience', 'projects', 'custom'])}
                    </div>

                    {/* Right compact compartment - 5 Columns */}
                    <div className="col-span-5 space-y-6">
                        
                        {/* Skills Box with Nordic Snow Tints */}
                        {renderRun(['skills', 'education', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer'])}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default React.memo(NordicTemplate);
