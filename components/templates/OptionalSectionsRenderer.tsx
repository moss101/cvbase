import React from 'react';
import type { ResumeData, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';

interface OptionalSectionsRendererProps {
    formData: ResumeData;
    visibleSections: SectionId[];
    excludeSections?: SectionId[];
    fontClass?: string;
    textClass?: string;
    titleClass?: string;
    subtextClass?: string;
    accentColor?: string;
    compact?: boolean;
    renderHeader: (title: string, stationCode?: string) => React.ReactNode;
    /** Explicit ordered list of sections to render (already filtered for
     *  visibility by the caller, typically via `orderedSections` +
     *  `sectionRuns`). When omitted the renderer orders its own optional
     *  sections by `formData.sectionOrder` itself. */
    sections?: readonly SectionId[];
}

/** The sections this renderer knows how to draw, in their default order. */
export const OPTIONAL_RENDERER_SECTIONS: readonly SectionId[] = [
    'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom',
];

export const OptionalSectionsRenderer: React.FC<OptionalSectionsRendererProps> = ({
    formData,
    visibleSections,
    excludeSections = [],
    fontClass = 'font-sans',
    textClass = 'text-slate-600 text-xs',
    titleClass = 'font-bold text-slate-800 text-xs',
    subtextClass = 'italic text-stone-500 text-[10px]',
    accentColor = '#0284C7',
    compact = false,
    renderHeader,
    sections,
}) => {
    const { certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const exclude = new Set(excludeSections);

    const hasItems = (items: unknown[] | undefined) => Array.isArray(items) && items.length > 0;

    const spacingClass = compact ? 'mb-2.5' : 'mb-4';
    const itemSpacingClass = compact ? 'space-y-1' : 'space-y-2';

    const order = (sections ?? orderedSections(formData, visibleSections, OPTIONAL_RENDERER_SECTIONS))
        .filter((id) => !exclude.has(id));

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'certifications':
                if (!hasItems(certifications)) return null;
                return (
                    <section key="certifications" data-section="certifications" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader('Certifications', 'CERT')}</div>
                        <div className={itemSpacingClass}>
                            {certifications.map((cert) => (
                                <div key={cert.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className={titleClass}>{cert.name}</h3>
                                        {cert.expiryDate && (
                                            <span className={subtextClass}>{cert.expiryDate}</span>
                                        )}
                                    </div>
                                    {cert.number && (
                                        <p className={`${subtextClass} leading-tight`}>License / ID: {cert.number}</p>
                                    )}
                                    {cert.description && (
                                        <p className={`${textClass} leading-relaxed mt-0.5`}>{cert.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'languages':
                if (!hasItems(languages)) return null;
                return (
                    <section key="languages" data-section="languages" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader('Languages', 'LANG')}</div>
                        <div className="flex flex-wrap gap-2">
                            {languages.map((lang) => (
                                <div 
                                    key={lang.id} 
                                    className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[11px] leading-tight flex items-baseline gap-1"
                                >
                                    <span className={titleClass}>{lang.language}</span>
                                    <span className={`${subtextClass} text-[9px]`}>({lang.proficiency})</span>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'awards':
                if (!hasItems(awards)) return null;
                return (
                    <section key="awards" data-section="awards" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader('Awards', 'AWRD')}</div>
                        <div className={itemSpacingClass}>
                            {awards.map((award) => (
                                <div key={award.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className={titleClass}>{award.title}</h3>
                                        <span className={subtextClass}>{award.date}</span>
                                    </div>
                                    <p className={subtextClass}>{award.issuer}</p>
                                    {award.description && (
                                        <p className={`${textClass} leading-relaxed mt-0.5`}>{award.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'trainings':
                if (!hasItems(trainings)) return null;
                return (
                    <section key="trainings" data-section="trainings" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader('Trainings & Courses', 'TRNG')}</div>
                        <div className={itemSpacingClass}>
                            {trainings.map((t) => (
                                <div key={t.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className={titleClass}>{t.course}</h3>
                                        <span className={subtextClass}>{t.date}</span>
                                    </div>
                                    <p className={subtextClass}>{t.institution}</p>
                                    {t.description && (
                                        <p className={`${textClass} leading-relaxed mt-0.5`}>{t.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'publications':
                if (!hasItems(publications)) return null;
                return (
                    <section key="publications" data-section="publications" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader('Publications', 'PUBL')}</div>
                        <div className={itemSpacingClass}>
                            {publications.map((pub) => (
                                <div key={pub.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className={titleClass}>{pub.title}</h3>
                                        <span className={subtextClass}>{pub.date}</span>
                                    </div>
                                    <p className={subtextClass}>{pub.publisher}</p>
                                    {pub.link && (
                                        <a 
                                            href={pub.link} 
                                            target="_blank" 
                                            referrerPolicy="no-referrer"
                                            rel="noopener noreferrer" 
                                            className="text-[10px] hover:underline block leading-tight break-all"
                                            style={{ color: accentColor }}
                                        >
                                            {pub.link}
                                        </a>
                                    )}
                                    {pub.description && (
                                        <p className={`${textClass} leading-relaxed mt-0.5`}>{pub.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'volunteer':
                if (!hasItems(volunteer)) return null;
                return (
                    <section key="volunteer" data-section="volunteer" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader('Volunteering', 'VOL')}</div>
                        <div className={itemSpacingClass}>
                            {volunteer.map((v) => (
                                <div key={v.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className={titleClass}>{v.role} @ {v.organization}</h3>
                                        <span className={subtextClass}>{v.startDate} – {v.endDate}</span>
                                    </div>
                                    {v.location && <p className={subtextClass}>{v.location}</p>}
                                    {v.description && (
                                        <p className={`${textClass} leading-relaxed mt-0.5`}>{v.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'custom':
                if (!hasItems(custom)) return null;
                return (
                    <section key="custom" data-section="custom" className={spacingClass}>
                        <div className="break-after-avoid">{renderHeader(custom[0]?.title ? 'Additional Profile' : 'Custom Section', 'CUST')}</div>
                        <div className={itemSpacingClass}>
                            {custom.map((item) => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className={titleClass}>{item.title}</h3>
                                        <span className={subtextClass}>{item.date}</span>
                                    </div>
                                    {item.subtitle && <p className={subtextClass}>{item.subtitle}</p>}
                                    {item.description && (
                                        <p className={`${textClass} leading-relaxed mt-0.5`}>{item.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`mt-2 ${fontClass}`}>
            {order.map(renderSection)}
        </div>
    );
};
