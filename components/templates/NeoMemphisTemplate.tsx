import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const NeoMemphisTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const mainAccent = '#6366F1'; // Memphis Indigo 
    const blockYellow = '#FEF08A'; // Pale Yellow
    const blockPurple = '#E0E7FF'; // Pale Indigo
    const blockGreen = '#D1FAE5'; // Soft Mint

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSectionHeader = (title: string, color: string) => (
        <div 
            className="border-3 border-stone-900 py-1.5 px-3 mb-4 inline-block font-mono font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_0px_#1C1917]"
            style={{ backgroundColor: color }}
        >
            {title}
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-neomemphis"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FAFAF9] p-10 flex flex-col justify-between ${fontSize} text-stone-900 border-4 border-stone-900 shadow-[10px_10px_0px_0px_#1C1917]`}
            style={{ fontFamily: settings?.fontFamily || "'Inter', sans-serif" }}
        >
            <div>
                {/* Header Section */}
                <header className="grid grid-cols-12 gap-5 border-3 border-stone-900 p-6 shadow-[5px_5px_0px_0px_#1C1917] mb-8" style={{ backgroundColor: blockYellow }}>
                    <div className="col-span-8 flex flex-col justify-center">
                        <h1 className="text-3xl font-black tracking-tight uppercase border-b-3 border-stone-900 pb-2 mb-2 leading-none">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <p className="font-mono text-xs uppercase font-extrabold tracking-wider text-indigo-700">
                            ⚡ {contact.jobTitle || 'Executive Innovator'}
                        </p>
                    </div>
                    <div className="col-span-4 border-l-3 border-stone-900 pl-4 flex flex-col justify-center gap-1.5 font-mono text-[9px] font-bold text-stone-800">
                        {contact.email && <div className="truncate">✉ {contact.email}</div>}
                        {fullPhone && <div>☎ {fullPhone}</div>}
                        {city && <div>📍 {city}</div>}
                        {contact.linkedin && <div className="truncate text-indigo-600 hover:underline">🔗 {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
                        {contact.website && <div className="truncate text-indigo-600 hover:underline">🌐 {contact.website.replace(/^https?:\/\/(www\.)?/, '')}</div>}
                    </div>
                </header>

                {/* Two-Column Memphis Panel */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Main Flow - Left 7 columns */}
                    <div className="col-span-7 space-y-6">
                        
                        {/* Summary Block */}
                        {summary.professionalSummary && (
                            <div className="border-3 border-stone-900 p-5 shadow-[4px_4px_0px_0px_#1C1917]" style={{ backgroundColor: '#FFFFFF' }}>
                                {renderSectionHeader('Profile statement', blockGreen)}
                                <div className="leading-relaxed text-stone-800 font-medium text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                            </div>
                        )}

                        {/* Experience Block */}
                        {experience.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Work Experience', blockPurple)}
                                <div className="space-y-5">
                                    {experience.map(exp => (
                                        <div key={exp.id} className="border-l-3 border-indigo-600 pl-3">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="font-extrabold text-stone-900 text-xs uppercase">{exp.jobTitle}</h3>
                                                <span className="font-mono text-[9px] bg-stone-900 text-white px-1.5 py-0.5 rounded font-bold">
                                                    {exp.startDate} – {exp.endDate}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-mono font-bold text-indigo-600 mb-2">
                                                ★ {exp.company} • {exp.location}
                                            </p>
                                            <div className="text-stone-700 text-xs font-medium" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Projects Block */}
                        {visibleSections.includes('projects') && projects.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Signature Projects', blockYellow)}
                                <div className="space-y-4">
                                    {projects.map(proj => (
                                        <div key={proj.id} className="border-l-3 border-stone-900 pl-3">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="font-extrabold text-stone-900 text-xs uppercase">{proj.name}</h3>
                                                <span className="font-mono text-[9px] text-stone-500 font-black">{proj.startDate} – {proj.endDate}</span>
                                            </div>
                                            {proj.technologies && (
                                                <p className="text-[9px] font-mono font-semibold text-stone-400 mt-0.5">
                                                    STACK: {proj.technologies}
                                                </p>
                                            )}
                                            <div className="text-stone-700 text-xs mt-2" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Fields Block */}
                        {visibleSections.includes('custom') && custom.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Additional Scope', blockGreen)}
                                <div className="space-y-4">
                                    {custom.map(item => (
                                        <div key={item.id} className="border-l-2 border-stone-300 pl-3">
                                            <h4 className="font-extrabold text-xs uppercase">{item.title}</h4>
                                            {item.subtitle && <p className="text-[10px] italic text-stone-500">{item.subtitle}</p>}
                                            {item.description && <div className="text-stone-600 text-xs mt-1" dangerouslySetInnerHTML={{ __html: item.description }} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Sidebar Area - Right 5 columns */}
                    <div className="col-span-5 space-y-6">
                        
                        {/* Skills block */}
                        {skills.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Core Toolkit', blockYellow)}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="font-mono text-[9px] font-bold px-2 py-1 bg-stone-900 text-white rounded border border-stone-900 hover:bg-[#FEF08A] hover:text-stone-900 shadow-[2px_2px_0px_0px_#6366F1] transition-all cursor-pointer"
                                        >
                                            ✦ {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Education block */}
                        {education.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Education', blockPurple)}
                                <div className="space-y-4">
                                    {education.map(edu => (
                                        <div key={edu.id} className="border-b border-stone-200 last:border-0 pb-3 last:pb-0">
                                            <p className="font-extrabold text-stone-900 text-[11px] uppercase">{edu.school}</p>
                                            <p className="text-[10px] font-mono font-bold text-indigo-600 italic">{edu.degree}</p>
                                            <p className="text-[9px] font-mono text-stone-400 mt-1">{edu.startDate} – {edu.endDate} • {edu.location}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Certifications block */}
                        {visibleSections.includes('certifications') && certifications.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Registry Cr.', blockGreen)}
                                <div className="space-y-3 font-mono text-[10px]">
                                    {certifications.map(cert => (
                                        <div key={cert.id} className="bg-stone-50 p-2 border-2 border-stone-900 shadow-[2px_2px_0px_0px_#1C1917]">
                                            <p className="font-black text-stone-900 uppercase leading-snug">{cert.name}</p>
                                            <p className="text-[9px] text-stone-400 mt-0.5">VAL: {cert.expiryDate || 'ACTIVE'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Languages block */}
                        {visibleSections.includes('languages') && languages.length > 0 && (
                            <div className="border-3 border-stone-900 p-5 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Languages', blockPurple)}
                                <div className="space-y-2 font-mono text-[9px] font-bold">
                                    {languages.map(lang => (
                                        <div key={lang.id} className="flex justify-between items-center border-b border-stone-100 py-1">
                                            <span className="text-stone-900 uppercase">🗣 {lang.language}</span>
                                            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] uppercase">{lang.proficiency}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Awards box */}
                        {visibleSections.includes('awards') && awards.length > 0 && (
                            <div className="border-3 border-stone-900 p-4 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Honors', blockYellow)}
                                <div className="space-y-2 text-[9px] font-mono">
                                    {awards.map(aw => (
                                        <div key={aw.id} className="border-l-2 border-indigo-500 pl-2">
                                            <p className="font-black text-stone-900">{aw.title}</p>
                                            <p className="text-stone-400">{aw.issuer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trainings & volunteer short-lists */}
                        {visibleSections.includes('trainings') && trainings.length > 0 && (
                            <div className="border-3 border-stone-900 p-4 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Trainings', blockGreen)}
                                <div className="space-y-2 text-[9px] font-mono">
                                    {trainings.map(t => (
                                        <div key={t.id} className="border-l-2 border-stone-900 pl-2">
                                            <p className="font-black text-stone-900">{t.course}</p>
                                            <p className="text-stone-500">{t.institution}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Volunteer short-lists */}
                        {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                            <div className="border-3 border-stone-900 p-4 bg-white shadow-[4px_4px_0px_0px_#1C1917]">
                                {renderSectionHeader('Community', blockPurple)}
                                <div className="space-y-2 text-[9px] font-mono">
                                    {volunteer.map(v => (
                                        <div key={v.id} className="border-l-2 border-stone-900 pl-2">
                                            <p className="font-black text-indigo-700">{v.role}</p>
                                            <p className="text-stone-500">{v.organization}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Remaining dynamic optional sections (publications, custom) */}
                        <OptionalSectionsRenderer
                            formData={formData}
                            visibleSections={visibleSections}
                            excludeSections={['projects', 'certifications', 'languages', 'awards', 'trainings', 'volunteer']}
                            fontClass="font-mono bg-white border-3 border-stone-900 p-5 shadow-[4px_4px_0px_0px_#1C1917]"
                            textClass="text-stone-700 text-[10px] font-mono mt-1"
                            titleClass="font-black text-stone-900 text-[11px] uppercase"
                            subtextClass="text-[9px] font-mono text-stone-400 block"
                            accentColor={mainAccent}
                            renderHeader={(title) => renderSectionHeader(title, blockYellow)}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeoMemphisTemplate;
