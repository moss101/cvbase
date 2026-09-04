import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../../services/translationService';

interface FinalCTAProps {
    onStartBuilding: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onStartBuilding }) => {
    const { t } = useTranslation();
    return (
        <section id="pricing" className="relative bg-ink overflow-hidden">
            {/* Faint paper texture inside the ink */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                aria-hidden="true"
                style={{
                    backgroundImage: 'linear-gradient(to bottom, rgba(250,247,242,0.5) 1px, transparent 1px)',
                    backgroundSize: '100% 48px',
                }}
            />
            {/* Warm ember glow rising from below */}
            <div className="absolute -bottom-56 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(200,68,44,0.22),transparent)]" aria-hidden="true" />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-28 lg:py-40 text-center">
                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                    className="font-label text-[0.7rem] tracking-[0.26em] uppercase text-paper/40"
                >
                    {t('landing.finalCta.eyebrow', 'Free to start · no credit card · cancel anytime')}
                </motion.p>

                <motion.h2
                    initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.9, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                    className="mt-8 mx-auto max-w-4xl font-display font-medium tracking-[-0.02em] text-paper text-4xl sm:text-6xl lg:text-[4.4rem] leading-[1.06] [text-wrap:balance]"
                >
                    {t('landing.finalCta.heading.prefix', 'Eight minutes from now, you could be holding a')}{' '}
                    <span className="relative inline-block whitespace-nowrap">
                        <span className="italic text-ember-tint">{t('landing.finalCta.heading.highlight', 'better CV')}</span>
                        {/* HIRED stamp pressed over the corner of the phrase */}
                        <motion.span
                            initial={{ opacity: 0, scale: 1.7, rotate: -20 }}
                            whileInView={{ opacity: 1, scale: 1, rotate: -10 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.4, delay: 0.9, ease: [0.16, 1.2, 0.4, 1] }}
                            className="absolute -top-9 -right-6 sm:-right-12 block px-3.5 py-1.5 rounded-md border-[2.5px] border-ember text-ember font-label font-semibold text-[0.85rem] sm:text-base tracking-[0.3em] uppercase select-none"
                            aria-hidden="true"
                        >
                            {t('landing.finalCta.hiredStamp', 'Hired')}
                        </motion.span>
                    </span>
                    .
                </motion.h2>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    className="mt-12"
                >
                    <button
                        onClick={onStartBuilding}
                        className="group inline-flex items-center gap-3 pl-8 pr-2.5 py-2.5 rounded-full text-lg font-semibold text-ink bg-paper hover:bg-paper-bright active:scale-[0.98] shadow-[0_24px_60px_-16px_rgba(250,247,242,0.35)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    >
                        {t('landing.finalCta.ctaButton', 'Start building now')}
                        <span className="grid place-items-center w-12 h-12 rounded-full bg-ember text-paper transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105" aria-hidden="true">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </button>
                    <p className="mt-7 text-[0.92rem] text-paper/45">
                        {t('landing.finalCta.subtext', 'Join 250,000+ job seekers whose CVs finally work as hard as they do.')}
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default FinalCTA;
