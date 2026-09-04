import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { useTranslation } from '../../services/translationService';

const REASONS = [
    {
        key: 'atsFriendly',
        title: 'ATS-friendly by construction',
        description: 'Every template is parsed cleanly by applicant tracking systems, so your CV reaches human eyes.',
    },
    {
        key: 'guidedEditor',
        title: 'A guided, beginner-proof editor',
        description: 'Step-by-step structure with no design or writing experience required.',
    },
    {
        key: 'currentTemplates',
        title: 'Templates that stay current',
        description: 'Contemporary layouts refreshed regularly to match what recruiters expect today.',
    },
    {
        key: 'oneClickExport',
        title: 'One-click, watermark-free export',
        description: 'Your polished PDF is ready to send the moment you are.',
    },
    {
        key: 'privateByDefault',
        title: 'Private by default',
        description: 'Your personal information stays encrypted. You own your data — export or erase it anytime.',
    },
];

interface Stat {
    key: string;
    target: number;
    prefix?: string;
    suffix: string;
    label: string;
}

const STATS: Stat[] = [
    { key: 'atsPassRate', target: 94, suffix: '%', label: 'average ATS pass rate' },
    { key: 'firstDraft', target: 8, prefix: '~', suffix: ' min', label: 'to a finished first draft' },
    { key: 'templates', target: 40, suffix: '+', label: 'professional templates' },
    { key: 'privateEncrypted', target: 100, suffix: '%', label: 'private & encrypted' },
];

/** Counts from 0 to target when scrolled into view. */
const CountUp: React.FC<{ stat: Stat }> = ({ stat }) => {
    const ref = useRef<HTMLParagraphElement>(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const duration = 1400;
        const start = performance.now();
        let frame: number;
        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * stat.target));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [inView, stat.target]);

    return (
        <p ref={ref} className="font-display text-4xl sm:text-5xl font-medium tracking-[-0.02em] text-ink tabular-nums">
            {stat.prefix}{value}<span className="text-ember">{stat.suffix}</span>
        </p>
    );
};

const WhyCVBase: React.FC = () => {
    const { t } = useTranslation();
    return (
        <section id="why-cvbase" className="py-24 lg:py-36 bg-paper-deep/50 border-y border-ink/[0.06]">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
                    {/* Copy + checklist */}
                    <motion.div
                        initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    >
                        <p className="font-label text-[0.7rem] tracking-[0.24em] uppercase text-ink-faint">
                            04 <span className="text-ember">—</span> {t('landing.whyCvBase.eyebrow', 'Why CVbase')}
                        </p>
                        <h2 className="mt-5 font-display font-medium tracking-[-0.015em] text-ink text-4xl sm:text-5xl leading-[1.08] [text-wrap:balance]">
                            {t('landing.whyCvBase.heading.prefix', 'Past the robots. In front of')} <span className="italic text-ember">{t('landing.whyCvBase.heading.highlight', 'the humans')}</span>.
                        </h2>
                        <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
                            {t('landing.whyCvBase.intro', 'Most CVs are rejected by software before a recruiter ever reads them. CVbase is engineered for both audiences — machine-readable structure underneath, beautiful typesetting on top.')}
                        </p>

                        <ul className="mt-10 space-y-0 divide-y divide-ink/[0.07]">
                            {REASONS.map((reason, i) => (
                                <motion.li
                                    key={reason.title}
                                    initial={{ opacity: 0, x: -16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: '-40px' }}
                                    transition={{ duration: 0.55, delay: 0.06 * i, ease: [0.32, 0.72, 0, 1] }}
                                    className="flex items-start gap-4 py-4"
                                >
                                    <span className="mt-1 shrink-0 font-label text-[0.62rem] text-ember tracking-wide" aria-hidden="true">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <p className="font-semibold text-ink">{t(`landing.whyCvBase.reasons.${reason.key}.title`, reason.title)}</p>
                                        <p className="mt-0.5 text-[0.93rem] text-ink-soft leading-relaxed">{t(`landing.whyCvBase.reasons.${reason.key}.description`, reason.description)}</p>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Stats ledger + ink quote card */}
                    <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                        className="lg:pt-12"
                    >
                        {/* Spec-sheet style stats: hairline grid, no cards */}
                        <div className="rounded-[1.75rem] bg-ink/[0.04] ring-1 ring-ink/[0.07] p-2">
                            <div className="rounded-[calc(1.75rem-0.5rem)] bg-paper-bright shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] overflow-hidden">
                                <div className="px-7 pt-6 pb-4 border-b border-ink/[0.07] flex items-center justify-between">
                                    <span className="font-label text-[0.62rem] tracking-[0.22em] uppercase text-ink-faint">{t('landing.whyCvBase.statsLabel', 'By the numbers')}</span>
                                    <span className="w-2 h-2 rounded-full bg-ember" aria-hidden="true" />
                                </div>
                                <div className="grid grid-cols-2">
                                    {STATS.map((stat, i) => (
                                        <div
                                            key={stat.label}
                                            className={`px-7 py-7 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} border-ink/[0.07]`}
                                        >
                                            <CountUp stat={stat} />
                                            <p className="mt-2 text-[0.85rem] text-ink-soft leading-snug">{t(`landing.whyCvBase.stats.${stat.key}`, stat.label)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Pull-quote on ink */}
                        <div className="mt-6 rounded-[1.75rem] bg-ink p-8 sm:p-9 shadow-[0_28px_60px_-18px_rgba(27,23,19,0.5)] relative overflow-hidden">
                            <span className="absolute -top-6 left-6 font-display text-[7rem] leading-none text-paper/[0.08] select-none" aria-hidden="true">“</span>
                            <blockquote className="relative font-display text-paper text-xl sm:text-[1.35rem] leading-snug font-light italic">
                                {t('landing.whyCvBase.quote.text', 'I sent the same experience on a new CVbase template and started getting callbacks within a week. The AI suggestions made my bullet points actually sound impressive.')}
                            </blockquote>
                            <div className="relative mt-6 flex items-center justify-between">
                                <p className="text-[0.88rem] font-semibold text-paper">
                                    Daniel K. <span className="font-normal text-paper/50">{t('landing.whyCvBase.quote.attribution', '— hired as Data Analyst')}</span>
                                </p>
                                <div className="flex gap-1 text-ember" aria-label={t('landing.whyCvBase.starsAriaLabel', '5 out of 5 stars')}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />
                                        </svg>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default WhyCVBase;
