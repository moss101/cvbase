import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const GenevaTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const bluePrimary = '#1E3A8A'; // Geneva Royal Blue
    const grayBorder = '#E2E8F0'; // Soft dividing border

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderHeader = (title: string) => (
        <div className="mb-3 mt-6">
            <h2 className="text-xs font-sans font-bold uppercase tracking-wider pb-1 border-b-2 text-stone-900" style={{ borderBottomColor: bluePrimary }}>
                {title}
            </h2>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-geneva"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-white p-14 flex flex-col justify-between ${fontSize} leading-relaxed text-left`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Inter', sans-serif", 
                color: '#334155'
            }}
        >
            <div>
                {/* Traditional High-Contrast Swiss Geneva Corporate Header */}
                <header className="border-b-4 pb-6 mb-6 flex justify-between items-start" style={{ borderBottomColor: bluePrimary }}>
                    <div>
                        <h1 className="text-3xl font-black uppercase text-stone-900 tracking-tight leading-none mb-2">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Name'}
                        </h1>
                        <p className="text-[10px] font-sans font-semibold text-stone-500 uppercase tracking-widest leading-none">
                            {contact.jobTitle || 'Executive Operations Director'}
                        </p>
                    </div>

                    {/* Right Corporate Card block */}
                    <div className="text-right text-[10px] font-sans text-stone-600 font-bold space-y-1">
                        {contact.email && <p className="hover:underline">{contact.email}</p>}
                        {fullPhone && <p>{fullPhone}</p>}
                        {city && <p>{city}, {contact.country || 'CH'}</p>}
                    </div>
                </header>

                {/* Professional Statement */}
                {summary.professionalSummary && (
                    <section className="mb-4">
                        <div className="text-stone-750 text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {/* Experience History */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('experience')}
                        <div className="space-y-4">
                            {experience.map(exp => (
                                <div key={exp.id} className="pb-3 border-b" style={{ borderColor: grayBorder }}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-extrabold text-stone-900 uppercase text-[11px] tracking-wide font-sans">
                                            {exp.jobTitle} <span className="text-stone-400 font-medium font-serif">@</span> {exp.company}
                                        </h3>
                                        <span className="text-[10px] uppercase font-sans font-black text-stone-400">
                                            {exp.startDate} – {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[9.5px] uppercase tracking-wider text-stone-405 font-bold mb-2">
                                        {exp.location}
                                    </p>
                                    <div className="text-stone-600 text-xs text-justify font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {visibleSections.includes('projects') && projects.length > 0 && (
                    <section className="mb-4">
                        {renderHeader('projects')}
                        <div className="space-y-4">
                            {projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-stone-830 uppercase font-sans text-[11px]">{proj.name}</h3>
                                        <span className="text-[9px] text-stone-400 font-sans">[{proj.startDate} – {proj.endDate}]</span>
                                    </div>
                                    {proj.technologies && (
                                        <p className="text-[9px] text-stone-400 font-mono mb-1.5 uppercase">
                                            Tech Stack: {proj.technologies}
                                        </p>
                                    )}
                                    <div className="text-stone-600 text-xs text-justify font-sans" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Geneva Admin Fields Column Grid */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        {education.length > 0 && (
                            <section>
                                {renderHeader('education')}
                                <div className="space-y-3 font-sans">
                                    {education.map(edu => (
                                        <div key={edu.id} className="text-[10px]">
                                            <p className="font-extrabold text-stone-900 uppercase">{edu.school}</p>
                                            <p className="text-stone-650 italic">{edu.degree}</p>
                                            <p className="text-[8.5px] text-stone-400 mt-0.5">{edu.startDate} – {edu.endDate} • {edu.location}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div>
                        {skills.length > 0 && (
                            <section>
                                {renderHeader('skills')}
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {skills.map(skill => (
                                        <span 
                                            key={skill} 
                                            className="text-[9px] font-sans font-bold px-2 py-0.5 bg-stone-100 text-[#1E3A8A] rounded border border-slate-200"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                <OptionalSectionsRenderer
                    formData={formData}
                    visibleSections={visibleSections}
                    excludeSections={['projects']}
                    fontClass="font-sans"
                    textClass="text-stone-600 text-xs font-sans leading-relaxed text-justify"
                    titleClass="font-extrabold text-stone-900 text-xs uppercase"
                    subtextClass="text-[9px] font-sans text-stone-400"
                    accentColor="#1E3A8A"
                    renderHeader={(title) => renderHeader(title.toLowerCase())}
                />
            </div>
        </div>
    );
};

export default GenevaTemplate;
