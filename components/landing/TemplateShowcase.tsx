import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { exampleData } from '../../exampleData';
import { AVAILABLE_TEMPLATES } from '../../constants';
import type { SectionId, TemplateId, ResumeSettings } from '../../types';
import GsbExecutiveTemplate from '../templates/GsbExecutiveTemplate';
import ModernTemplate from '../templates/ModernTemplate';
import CreativeTemplate from '../templates/CreativeTemplate';
import { useTranslation } from '../../services/translationService';

interface TemplateShowcaseProps {
    onViewTemplates: () => void;
    onUseTemplate?: (templateId: TemplateId) => void;
}

const PREVIEW_SETTINGS: ResumeSettings = {
    themeColor: '#008080',
    fontSize: 'small',
    fontFamily: 'Arial, sans-serif',
};

const PREVIEW_SECTIONS: SectionId[] = [
    'contact', 'summary', 'experience', 'education', 'skills',
    'projects', 'certifications', 'languages',
];

// A4 canvas the templates are designed against (px)
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const FEATURED: { id: TemplateId; badgeKey: string; badge: string; badgeStyle: 'plain' | 'ember'; Component: React.FC<any> }[] = [
    { id: 'gsb-executive', badgeKey: 'executive', badge: 'Executive', badgeStyle: 'plain', Component: GsbExecutiveTemplate },
    { id: 'modern', badgeKey: 'mostChosen', badge: 'Most chosen', badgeStyle: 'ember', Component: ModernTemplate },
    { id: 'creative', badgeKey: 'creative', badge: 'Creative', badgeStyle: 'plain', Component: CreativeTemplate },
];

/** Renders a real template at full A4 size and scales it to fill the card width. */
const LiveTemplateThumb: React.FC<{ Component: React.FC<any> }> = ({ Component }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => setScale(el.clientWidth / A4_WIDTH);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="absolute inset-0 overflow-hidden bg-white">
            {scale > 0 && (
                <div
                    className="pointer-events-none select-none bg-white"
                    style={{
                        width: A4_WIDTH,
                        height: A4_HEIGHT,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <Component
                        formData={exampleData}
                        isCardPreview={true}
                        visibleSections={PREVIEW_SECTIONS}
                        settings={PREVIEW_SETTINGS}
                    />
                </div>
            )}
        </div>
    );
};

const HoverCTA: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const { t } = useTranslation();
    return (
        <div className="absolute inset-0 grid place-items-center bg-ink/0 group-hover:bg-ink/20 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <button
                onClick={onClick}
                className="opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 px-6 py-3 rounded-full bg-ink hover:bg-ember text-paper text-[0.85rem] font-semibold shadow-[0_16px_40px_-10px_rgba(27,23,19,0.6)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
                {t('landing.templateShowcase.useTemplate', 'Use this template →')}
            </button>
        </div>
    );
};

const cardShell =
    'group relative rounded-[1.75rem] bg-ink/[0.04] ring-1 ring-ink/[0.07] p-2 pb-0 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_32px_70px_-24px_rgba(27,23,19,0.35)] hover:-translate-y-1';

const docFace =
    'relative aspect-[3/4] rounded-t-[calc(1.75rem-0.5rem)] bg-paper-bright border border-b-0 border-ink/[0.06] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-2';

const TemplateShowcase: React.FC<TemplateShowcaseProps> = ({ onViewTemplates, onUseTemplate }) => {
    const { t } = useTranslation();
    const templateCount = AVAILABLE_TEMPLATES.length;
    const cardOffsets = ['', 'lg:translate-y-10', 'sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto lg:max-w-none w-full lg:translate-y-4'];

    return (
        <section id="templates-showcase" className="py-24 lg:py-36">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                {/* Editorial header — left aligned with CTA on the same baseline */}
                <motion.div
                    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 lg:mb-20"
                >
                    <div className="max-w-2xl">
                        <p className="font-label text-[0.7rem] tracking-[0.24em] uppercase text-ink-faint">
                            01 <span className="text-ember">—</span> {t('landing.templateShowcase.eyebrow', 'Templates')}
                        </p>
                        <h2 className="mt-5 font-display font-medium tracking-[-0.015em] text-ink text-4xl sm:text-5xl leading-[1.08] [text-wrap:balance]">
                            {templateCount}+ {t('landing.templateShowcase.heading.middle', 'ways to look brilliant')} <span className="italic text-ember">{t('landing.templateShowcase.heading.highlight', 'on paper')}</span>.
                        </h2>
                    </div>
                    <p className="max-w-sm text-ink-soft leading-relaxed lg:text-right lg:pb-1.5">
                        {t('landing.templateShowcase.intro', 'From boardroom-classic to portfolio-bold — every layout recruiter-approved and ATS-tested before it ships.')}
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
                    {FEATURED.map(({ id, badgeKey, badge, badgeStyle, Component }, index) => (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 36 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.7, delay: index * 0.1, ease: [0.32, 0.72, 0, 1] }}
                            className={`${cardShell} ${cardOffsets[index]}`}
                        >
                            <span
                                className={`absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md font-label text-[0.62rem] tracking-[0.18em] uppercase ${
                                    badgeStyle === 'ember'
                                        ? 'bg-ember text-paper shadow-[0_6px_16px_-4px_rgba(200,68,44,0.5)]'
                                        : 'bg-paper-bright/90 border border-ink/[0.08] text-ink-soft backdrop-blur'
                                }`}
                            >
                                {t(`landing.templateShowcase.badge.${badgeKey}`, badge)}
                            </span>
                            <div className={docFace}>
                                <LiveTemplateThumb Component={Component} />
                                <HoverCTA onClick={() => (onUseTemplate ? onUseTemplate(id) : onViewTemplates())} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
                    className="mt-16 lg:mt-24 text-center"
                >
                    <button
                        onClick={onViewTemplates}
                        className="group inline-flex items-center gap-3 pl-7 pr-2 py-2 rounded-full text-base font-semibold text-ink border border-ink/15 hover:border-ink active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    >
                        {t('landing.templateShowcase.browseAll.prefix', 'Browse all')} {templateCount}+ {t('landing.templateShowcase.browseAll.suffix', 'templates')}
                        <span className="grid place-items-center w-10 h-10 rounded-full bg-ink/[0.06] text-ink transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-ink group-hover:text-paper group-hover:translate-x-0.5" aria-hidden="true">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </button>
                </motion.div>
            </div>
        </section>
    );
};

export default TemplateShowcase;
