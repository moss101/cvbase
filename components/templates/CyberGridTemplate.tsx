import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const CyberGridTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const blueTone = '#0D9488'; // Clean tech Teal/Cyan
    const gridBorderColor = '#D1D5DB'; // Slate grey Grid lines
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeaderCol = (label: string, value: string | undefined) => {
        if (!value) return null;
        return (
            <div className="p-3 border-r border-dashed border-gray-300 flex-1 min-w-[120px] last:border-r-0">
                <span className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 mb-0.5">{label}</span>
                <span className="block text-[10px] font-sans font-bold text-gray-700 truncate">{value}</span>
            </div>
        );
    };

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="border border-slate-300 p-5 bg-white mb-6">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">
                            [OBJECTIVE STATEMENT]
                        </div>
                        <div 
                            className="text-xs font-sans text-slate-700 leading-relaxed text-justify" 
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} 
                        />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="border border-slate-300 bg-white p-5">
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 mb-4 break-after-avoid">
                            <h2 className="text-[10px] font-mono font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-teal-600 rounded-sm"></span>
                                01 / Professional Chronology
                            </h2>
                            <span className="text-[8px] font-mono text-gray-400">ACTIVE_RECORDS</span>
                        </div>
                        <div className="space-y-5">
                            {experience.map(exp => (
                                <div key={exp.id} className="border-l border-teal-600/30 pl-3 break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-sans font-extrabold text-slate-900 text-xs uppercase tracking-wide">{exp.jobTitle}</h3>
                                        <span className="text-[9px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-mono font-black text-teal-600 uppercase mb-2">
                                        ★ {exp.company} // {exp.location}
                                    </p>
                                    <div className="text-slate-700 text-xs font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-3">// ACADEMIC_RECOGNITION</div>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="text-[10px] font-sans break-inside-avoid">
                                    <p className="font-extrabold text-slate-900 uppercase tracking-tight">{edu.school}</p>
                                    <p className="text-slate-500 italic font-medium mt-0.5">{edu.degree}</p>
                                    <p className="text-[9px] font-mono text-slate-400 mt-1">{edu.startDate} – {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">// CAPABILITY_MATRIX</div>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map(skill => (
                                <span 
                                    key={skill} 
                                    className="text-[9px] font-mono font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-200 cursor-pointer hover:bg-teal-50 hover:text-teal-700 transition-all"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <section key="projects" data-section="projects" className="border border-slate-300 bg-white p-5">
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 mb-4 break-after-avoid">
                            <h2 className="text-[10px] font-mono font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-teal-600 rounded-sm"></span>
                                02 / Project Implementations
                            </h2>
                            <span className="text-[8px] font-mono text-gray-400">INDEX_RECORDS</span>
                        </div>
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div key={proj.id} className="border-l border-slate-200 pl-3 break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-sans font-extrabold text-slate-800 text-xs uppercase">{proj.name}</h3>
                                        <span className="text-[9px] font-mono text-slate-400">{proj.startDate} – {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[8px] font-mono font-black text-teal-600 mt-0.5 mb-2 lowercase">
                                            import {`{ ${proj.technologies} }`}
                                        </p>
                                    )}
                                    <div className="text-slate-700 text-xs font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(proj.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <section key="certifications" data-section="certifications" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">// REg_LICENSE_RECORDS</div>
                        <div className="space-y-3 font-sans text-[10px]">
                            {certifications.map(cert => (
                                <div key={cert.id} className="border-l border-teal-600 pl-2 break-inside-avoid">
                                    <p className="font-extrabold text-slate-800 leading-tight">{cert.name}</p>
                                    <p className="text-[8px] font-mono text-[#0D9488] leading-none mt-0.5">VAL: {cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <section key="languages" data-section="languages" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">// INTL_LING_STANDARDS</div>
                        <div className="space-y-2 text-[10px] font-mono font-bold">
                            {languages.map(lang => (
                                <div key={lang.id} className="flex justify-between border-b border-slate-100 py-1 break-inside-avoid">
                                    <span className="text-slate-800 font-sans font-bold">{lang.language}</span>
                                    <span className="text-teal-600 uppercase text-[8px]">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'awards':
                return awards.length > 0 ? (
                    <section key="awards" data-section="awards" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">// HIGH_HONORS_INDEX</div>
                        <div className="space-y-2 text-[10px]">
                            {awards.map(aw => (
                                <div key={aw.id} className="border-l border-slate-300 pl-2 break-inside-avoid">
                                    <p className="font-extrabold text-slate-800 font-sans">{aw.title}</p>
                                    <p className="text-slate-400 font-mono text-[9px]">{aw.issuer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trainings':
                return trainings.length > 0 ? (
                    <section key="trainings" data-section="trainings" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">// COGNITIVE_COURSES</div>
                        <div className="space-y-2 text-[9px] font-mono">
                            {trainings.map(t => (
                                <div key={t.id} className="border-l border-dashed border-teal-500 pl-2 break-inside-avoid">
                                    <p className="font-extrabold text-slate-800 font-sans">{t.course}</p>
                                    <p className="text-slate-400">{t.institution}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'volunteer':
                return volunteer.length > 0 ? (
                    <section key="volunteer" data-section="volunteer" className="border border-slate-300 bg-white p-4">
                        <div className="text-[8px] font-mono font-black uppercase text-teal-600 mb-2">// PHILANTHROPIC_INIT</div>
                        <div className="space-y-2 text-[9px] font-sans">
                            {volunteer.map(v => (
                                <div key={v.id} className="border-l border-[#0D9488] pl-2 break-inside-avoid">
                                    <p className="font-extrabold text-slate-800">{v.role}</p>
                                    <p className="text-slate-400 italic text-[8px] font-mono">{v.organization}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'custom':
                return custom.length > 0 ? (
                    <section key="custom" data-section="custom" className="border border-slate-300 bg-white p-5">
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 mb-4 break-after-avoid">
                            <h2 className="text-[10px] font-mono font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-teal-600 rounded-sm"></span>
                                03 / Auxiliary Parameters
                            </h2>
                            <span className="text-[8px] font-mono text-gray-400">EXT_DATA</span>
                        </div>
                        <div className="space-y-4 font-sans">
                            {custom.map(item => (
                                <div className="break-inside-avoid" key={item.id}>
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase">{item.title}</h4>
                                    {item.subtitle && <p className="text-[9px] font-mono text-slate-500">{item.subtitle}</p>}
                                    {item.description && <div className="text-slate-600 text-xs mt-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
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
            id={isCardPreview ? undefined : "resume-preview-cybergrid"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FAFAFA] p-10 flex flex-col justify-between ${fontSize} text-slate-800 leading-normal text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'JetBrains Mono', monospace",
            }}
        >
            <div>
                {/* Upper Module Coordinates Label */}
                <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono tracking-widest uppercase mb-2 border-b pb-1 border-gray-200">
                    <span>SYS_LOC: SYSTEM_ACTIVE</span>
                    <span>COORDS: 42.3601° N, 71.0589° W</span>
                    <span>METRIC_DRAFT: v3.2</span>
                </div>

                {/* Main Double Block Header */}
                <header className="border border-slate-300 bg-white shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-300 mb-6">
                    {/* Primary Name Segment */}
                    <div className="p-6 md:w-3/5 bg-slate-50/75">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Profile'}
                        </h1>
                        <p className="text-[10px] uppercase tracking-widest font-bold mt-1 text-teal-700 font-mono">
                            // {contact.jobTitle || 'Systems Architect'}
                        </p>
                    </div>
                    {/* Contact Module Grid Segment */}
                    <div className="p-4 md:w-2/5 flex flex-col justify-center gap-1.5 text-[9px] font-mono font-medium text-slate-600">
                        {contact.email && <div className="flex items-center gap-1">✉ <span className="font-sans font-bold text-teal-800">{contact.email}</span></div>}
                        {fullPhone && <div>☎ {fullPhone}</div>}
                        {city && <div>📍 {city}, {contact.country || 'USA'}</div>}
                        {contact.linkedin && <div className="truncate">🔗 {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
                        {contact.website && <div className="truncate">🌐 {contact.website.replace(/^https?:\/\/(www\.)?/, '')}</div>}
                    </div>
                </header>

                {/* Professional Statement Area */}
                {renderRun(['summary'])}

                {/* Grid Framework Compartments */}
                <div className="grid grid-cols-12 gap-5">
                    {/* Primary Flow System Columns: 8 */}
                    <div className="col-span-8 space-y-5">
                        
                        {/* Experience Column Segment */}
                        {renderRun(['experience', 'projects', 'custom'])}

                    </div>

                    {/* Secondary Metrics Compartment Column: 4 */}
                    <div className="col-span-4 space-y-5">
                        
                        {/* Skills Box */}
                        {renderRun(['skills', 'education', 'certifications', 'languages', 'awards', 'trainings', 'volunteer'])}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CyberGridTemplate);
