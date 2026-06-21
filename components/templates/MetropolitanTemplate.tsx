import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';
import { OptionalSectionsRenderer } from './OptionalSectionsRenderer';

const MetropolitanTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const luxuryGold = '#B59A57'; // High-end gold accent
    const metropolitanCharcoal = '#1F1F1F'; // Pure dark granite/charcoal
    const lightIvory = '#FAF9F5'; // Off-white luxury ivory page

    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSectionHeader = (title: string) => (
        <div className="text-center mb-6 mt-10">
            <div className="text-[10px] font-sans tracking-[0.3em] font-extrabold uppercase text-stone-400 mb-1">
                Curriculum Vitae Section
            </div>
            <h2 className="text-sm font-light tracking-[0.2em] font-serif uppercase inline-block border-b-2 pb-2 px-10" style={{ color: luxuryGold, borderColor: luxuryGold }}>
                {title}
            </h2>
        </div>
    );

    return (
        <div 
            id={isCardPreview ? undefined : "resume-preview-metropolitan"} 
            className={`w-[794px] min-h-[1123px] h-auto bg-[#FCFAF5] p-12 flex flex-col justify-between ${fontSize} leading-loose border-2 border-stone-200/90 shadow-sm`}
            style={{ 
                fontFamily: settings?.fontFamily || "'Georgia', serif",
                color: metropolitanCharcoal
            }}
        >
            {/* Elegant outer double border wrapper */}
            <div className="border-4 border-double border-stone-350 p-6 flex-1 flex flex-col justify-between" style={{ borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                <div>
                    {/* Header */}
                    <header className="text-center pt-4 pb-8 border-b-2 border-stone-200/50">
                        <h1 className="text-3xl font-light tracking-[0.2em] font-serif uppercase mb-2" style={{ color: metropolitanCharcoal }}>
                            {contact.firstName ? `${contact.firstName} ${contact.lastName}` : 'Candidate Profile'}
                        </h1>
                        <p className="text-xs uppercase tracking-[0.4em] font-sans font-bold italic mb-6" style={{ color: luxuryGold }}>
                            {contact.jobTitle || 'Executive Principal'}
                        </p>
                        
                        {/* Elegant Central Contacts */}
                        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[10px] uppercase font-sans tracking-widest text-stone-500 font-extrabold">
                            {contact.email && <span>{contact.email}</span>}
                            {fullPhone && <span className="text-[#B59A57]">◆</span>}
                            {fullPhone && <span>{fullPhone}</span>}
                            {city && <span className="text-[#B59A57]">◆</span>}
                            {city && <span>{city}</span>}
                        </div>
                        
                        {(contact.linkedin || contact.website) && (
                            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[9px] lowercase font-sans tracking-wide text-stone-400 font-semibold mt-2.5">
                                {contact.linkedin && <span>in: {contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                                {contact.website && <span className="text-[#B59A57]">◇</span>}
                                {contact.website && <span>w: {contact.website.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                            </div>
                        )}
                    </header>

                    {/* Statement / Bio */}
                    {summary.professionalSummary && (
                        <section className="mt-8 text-center px-6">
                            <p className="text-[10px] font-sans tracking-[0.25em] text-stone-400 font-bold uppercase mb-3">Professional Executive Summary</p>
                            <div className="leading-relaxed text-justify text-stone-700 font-serif italic text-sm text-[11.5px] px-4 border-l-2 border-r-2 border-stone-150" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                        </section>
                    )}

                    {/* Section Grid System */}
                    <div className="space-y-6">
                        
                        {/* Professional Experience */}
                        {experience.length > 0 && (
                            <section>
                                {renderSectionHeader('Professional Experience')}
                                <div className="space-y-8">
                                    {experience.map(exp => (
                                        <div key={exp.id} className="group">
                                            <div className="flex justify-between items-baseline border-b border-stone-200/70 pb-1 mb-2">
                                                <h3 className="font-bold text-xs uppercase tracking-wider font-serif text-stone-900">
                                                    {exp.jobTitle} <span className="text-stone-400 font-light italic font-sans text-[10px]">at</span> {exp.company}
                                                </h3>
                                                <span className="text-[10px] tracking-widest uppercase font-sans text-stone-400 font-bold">
                                                    {exp.startDate} – {exp.endDate}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-sans uppercase font-bold tracking-widest text-[#B59A57] mb-3">📍 {exp.location}</p>
                                            <div className="text-stone-600 text-xs text-justify pr-2 font-serif leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Projects section */}
                        {visibleSections.includes('projects') && projects.length > 0 && (
                            <section>
                                {renderSectionHeader('Strategic Initiatives & Projects')}
                                <div className="space-y-6">
                                    {projects.map(proj => (
                                        <div key={proj.id}>
                                            <div className="flex justify-between items-baseline border-b border-stone-100 pb-1 mb-2">
                                                <h3 className="font-bold text-xs uppercase tracking-wider font-serif text-stone-900">{proj.name}</h3>
                                                <span className="text-[9px] font-sans text-stone-400 uppercase tracking-widest">{proj.startDate} – {proj.endDate}</span>
                                            </div>
                                            {proj.technologies && (
                                                <p className="text-[9px] uppercase tracking-widest font-sans text-stone-400 font-bold mb-3">
                                                    Infrastructure: <span style={{ color: luxuryGold }}>{proj.technologies}</span>
                                                </p>
                                            )}
                                            <div className="text-stone-600 text-xs text-justify font-serif" dangerouslySetInnerHTML={{ __html: proj.description }} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Hybrid Two-Column Grid for Secondary details */}
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            {/* Left Box details: Education and Certifications */}
                            <div className="space-y-6">
                                {/* Education */}
                                {education.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Education
                                        </h3>
                                        <div className="space-y-4">
                                            {education.map(edu => (
                                                <div key={edu.id} className="text-[11px] font-serif">
                                                    <p className="font-bold text-stone-900 leading-tight uppercase font-sans tracking-wide text-[10px]">{edu.school}</p>
                                                    <p className="text-stone-500 italic mt-0.5">{edu.degree}</p>
                                                    <p className="text-[9px] text-stone-400 font-sans tracking-widest uppercase mt-1">
                                                        {edu.startDate} – {edu.endDate} • {edu.location}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Skills */}
                                {skills.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Core Alignments
                                        </h3>
                                        <p className="font-serif leading-relaxed text-stone-700 italic text-[12px]">{skills.join('  ◆  ')}</p>
                                    </section>
                                )}

                                {/* Certifications */}
                                {visibleSections.includes('certifications') && certifications.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Certifications
                                        </h3>
                                        <ul className="space-y-2 text-[11px] font-serif text-stone-700">
                                            {certifications.map(cert => (
                                                <li key={cert.id} className="flex flex-col">
                                                    <span className="font-bold uppercase tracking-wide text-[10px] font-sans text-stone-800">{cert.name}</span>
                                                    <span className="text-stone-400 text-[9px] font-sans tracking-wider uppercase">{cert.expiryDate}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </div>

                            {/* Right Box details: Languages, Awards, Volunteering */}
                            <div className="space-y-6">
                                {/* Languages */}
                                {visibleSections.includes('languages') && languages.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Languages
                                        </h3>
                                        <div className="space-y-2">
                                            {languages.map(lang => (
                                                <div key={lang.id} className="flex justify-between text-[11px] font-serif text-stone-700">
                                                    <span className="font-bold text-stone-800">{lang.language}</span>
                                                    <span className="text-stone-400 italic text-[10px]">{lang.proficiency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Awards */}
                                {visibleSections.includes('awards') && awards.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Awards & Honors
                                        </h3>
                                        <ul className="space-y-2 text-[11px] font-serif text-stone-700">
                                            {awards.map(aw => (
                                                <li key={aw.id} className="flex flex-col">
                                                    <span className="font-bold text-[10px] font-sans uppercase tracking-wide text-stone-800">{aw.title}</span>
                                                    <span className="text-stone-400 text-[9px]">{aw.issuer}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                {/* Volunteering */}
                                {visibleSections.includes('volunteer') && volunteer.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Philanthropy
                                        </h3>
                                        <ul className="space-y-2 text-[11px] font-serif text-stone-750">
                                            {volunteer.map(v => (
                                                <li key={v.id} className="flex flex-col">
                                                    <span className="font-bold text-[10px] font-sans uppercase text-stone-800 tracking-wide">{v.role}</span>
                                                    <span className="text-stone-500 text-[10px] italic">{v.organization}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                {visibleSections.includes('trainings') && trainings.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                            Eductive Programs
                                        </h3>
                                        <ul className="space-y-2 text-[11px] font-serif text-stone-750">
                                            {trainings.map(t => (
                                                <li key={t.id} className="flex flex-col">
                                                    <span className="font-bold text-[10px] font-sans uppercase text-stone-800 tracking-wide">{t.course}</span>
                                                    <span className="text-stone-500 text-[10px]">{t.institution}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-2" style={{ borderColor: 'rgba(181, 154, 87, 0.15)' }}>
                            <OptionalSectionsRenderer
                                formData={formData}
                                visibleSections={visibleSections}
                                excludeSections={['projects', 'languages', 'awards', 'volunteer', 'trainings']}
                                fontClass="font-serif"
                                textClass="text-stone-750 text-xs font-serif leading-relaxed text-justify"
                                titleClass="font-sans font-bold text-[10px] uppercase tracking-wide text-stone-800"
                                subtextClass="text-[9.5px] font-sans text-stone-400"
                                accentColor={luxuryGold}
                                renderHeader={(title) => (
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans pb-2 mb-3 mt-6 border-b-2" style={{ color: luxuryGold, borderColor: 'rgba(181, 154, 87, 0.25)' }}>
                                        {title}
                                    </h3>
                                )}
                            />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetropolitanTemplate;
