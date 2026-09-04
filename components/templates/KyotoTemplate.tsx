import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const KyotoTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const mainAccent = '#8E4A38'; // Earth Terracotta/Rust
    const textColor = '#2C2B29'; // Deep ink charcoal
    const dividerColor = 'rgba(142, 74, 56, 0.18)'; 
    const isSmallFont = settings?.fontSize === 'small';

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    // Helper to render section title with beautiful minimalist Kyoto styling
    const renderSectionHeader = (title: string) => (
        <div className="flex items-center gap-4 mb-4 mt-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mainAccent }}></span>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase font-serif" style={{ color: mainAccent }}>
                {title}
            </h2>
            <div className="flex-1 h-[1px]" style={{ backgroundColor: dividerColor }}></div>
        </div>
    );

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary">
                        <div className="break-after-avoid">{renderSectionHeader('Statement')}</div>
                        <div className="leading-relaxed text-justify text-stone-700 pl-4 border-l border-stone-200/65" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience">
                        <div className="break-after-avoid">{renderSectionHeader('Presence')}</div>
                        <div className="space-y-6 pl-4 border-l border-stone-200/65">
                            {experience.map(exp => (
                                <div key={exp.id} className="group break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm tracking-wide text-stone-900 font-sans">{exp.jobTitle}</h3>
                                        <span className="text-[10px] uppercase font-sans font-bold tracking-wider opacity-80" style={{ color: mainAccent }}>
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-medium text-stone-500 italic mb-2">
                                        {exp.company} • {exp.location}
                                    </p>
                                    <div className="text-stone-700 text-xs text-justify pr-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Education
                        </h3>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="text-stone-800 text-[11px] break-inside-avoid">
                                    <p className="font-bold text-stone-900 font-sans">{edu.school}</p>
                                    <p className="text-stone-600 font-medium italic">{edu.degree}</p>
                                    <p className="text-[10px] text-stone-400 font-sans tracking-wide mt-0.5">
                                        {edu.startDate} – {edu.endDate}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[10px] font-sans font-medium px-2 py-0.5 bg-stone-100 text-stone-600 rounded-sm hover:bg-stone-200/70 cursor-pointer border border-stone-200/40"
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
                        <div className="space-y-6 pl-4 border-l border-stone-200/65">
                            {projects.map(proj => (
                                <div className="break-inside-avoid" key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-sm tracking-wide text-stone-900 font-sans">{proj.name}</h3>
                                        <span className="text-[10px] font-sans font-bold tracking-wider" style={{ color: mainAccent }}>
                                            {proj.startDate} – {proj.endDate}
                                        </span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] uppercase tracking-wider font-sans text-stone-400 font-bold mb-2">
                                            Systems: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-700 text-xs text-justify pr-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Certificates
                        </h3>
                        <div className="space-y-3">
                            {certifications.map(cert => (
                                <div key={cert.id} className="text-stone-800 text-[10px] break-inside-avoid">
                                    <p className="font-bold font-sans text-stone-900 leading-tight">{cert.name}</p>
                                    <p className="text-stone-500 italic text-[9px] mt-0.5">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Languages
                        </h3>
                        <div className="space-y-2">
                            {languages.map(lang => (
                                <div key={lang.id} className="flex justify-between text-[11px] font-sans break-inside-avoid">
                                    <span className="font-bold text-stone-700">{lang.language}</span>
                                    <span className="text-stone-400 italic text-[10px]">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Awards
                        </h3>
                        <div className="space-y-3 text-[10px] font-sans">
                            {awards.map(aw => (
                                <div className="break-inside-avoid" key={aw.id}>
                                    <p className="font-bold text-stone-900 leading-tight">{aw.title}</p>
                                    <p className="text-stone-500 italic mt-0.5">{aw.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Trainings
                        </h3>
                        <div className="space-y-3 text-[10px]">
                            {trainings.map(t => (
                                <div className="break-inside-avoid" key={t.id}>
                                    <p className="font-bold text-stone-900 font-sans leading-tight">{t.course}</p>
                                    <p className="text-stone-500 italic mt-0.5">{t.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'publications':
                return publications.length > 0 ? (
                    <section key="publications" data-section="publications">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Publications
                        </h3>
                        <div className="space-y-3 text-[10px]">
                            {publications.map(p => (
                                <div className="break-inside-avoid" key={p.id}>
                                    <p className="font-bold text-stone-900 font-sans leading-tight">{p.title}</p>
                                    <p className="text-stone-500 italic mt-0.5">{p.publisher}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-serif mb-3 break-after-avoid" style={{ color: mainAccent }}>
                            Volunteer
                        </h3>
                        <div className="space-y-3 text-[10px]">
                            {volunteer.map(v => (
                                <div className="break-inside-avoid" key={v.id}>
                                    <p className="font-bold text-stone-900 font-sans leading-tight">{v.role}</p>
                                    <p className="text-stone-500 italic mt-0.5">{v.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom">
                        <div className="break-after-avoid">{renderSectionHeader('Perspectives')}</div>
                        <div className="space-y-4 pl-4 border-l border-stone-200/65">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-bold text-stone-900 font-sans text-xs">{item.title}</h4>
                                        {item.date && <span className="text-[10px] font-sans text-stone-400">{item.date}</span>}
                                    </div>
                                    {item.subtitle && <p className="text-[10px] text-stone-500 italic mb-2">{item.subtitle}</p>}
                                    {item.description && <div className="text-stone-600 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
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
            id={isCardPreview ? undefined : "resume-preview-kyoto"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FDFCF7] p-12 flex flex-col justify-between ${fontSize} leading-relaxed text-left border-t-8`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Georgia', serif", 
                color: textColor,
                borderTopColor: mainAccent
            }}
        >
            <div>
                {/* Header Section */}
                <header className="border-b pb-8 mb-8 text-center" style={{ borderColor: dividerColor }}>
                    <h1 className="text-3xl font-light tracking-[0.15em] uppercase font-serif mb-2" style={{ color: textColor }}>
                        {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Master Candidate'}
                    </h1>
                    <p className="text-xs uppercase tracking-[0.25em] mb-4 font-sans font-semibold italic opacity-95" style={{ color: mainAccent }}>
                        {contact.jobTitle || 'Professional Title'}
                    </p>
                    
                    {/* Contact Grid */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] tracking-wider uppercase font-sans text-stone-500 font-medium">
                        {contact.email && <span className="flex items-center gap-1">✉ {contact.email}</span>}
                        {fullPhone && <span className="flex items-center gap-1">☎ {fullPhone}</span>}
                        {fullAddress && <span className="flex items-center gap-1">📍 {city || 'Location'}</span>}
                        {contact.linkedin && (
                            <span className="flex items-center gap-1 lowercase">
                                🔗 {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                        )}
                        {contact.website && (
                            <span className="flex items-center gap-1 lowercase">
                                🌐 {contact.website.replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                        )}
                    </div>
                </header>

                {/* Main Content Grid */}
                <main className="grid grid-cols-12 gap-8">
                    {/* Left/Main Column - 8 Cols */}
                    <div className="col-span-8 space-y-6">
                        
                        {/* Executive Summary */}
                        {renderRun(['summary', 'experience', 'projects', 'custom'])}
                    </div>

                    {/* Right COLUMN - 4 Cols (Sidebar style) */}
                    <div className="col-span-4 space-y-6 pl-4 border-l" style={{ borderColor: dividerColor }}>
                        
                        {/* Education */}
                        {renderRun(['education', 'skills', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer'])}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default React.memo(KyotoTemplate);
