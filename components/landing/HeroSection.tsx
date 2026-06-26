import React from 'react';
import { motion } from 'motion/react';
import { EASE_OUT_EXPO, EASE_IN_OUT_CUBIC } from './easing';
import CVPreviewCard from './CVPreviewCard';

interface HeroSectionProps {
    onCreateCV: () => void;
    onViewTemplates: () => void;
}

const AVATARS = [
    { initials: 'JT', tone: 'bg-[#3F3A33]' },
    { initials: 'AO', tone: 'bg-[#6B5D4D]' },
    { initials: 'MK', tone: 'bg-[#8A4B38]' },
    { initials: 'RS', tone: 'bg-[#2C2722]' },
    { initials: 'LP', tone: 'bg-[#A3582F]' },
];

const fadeUp = {
    hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.8, delay: 0.09 * i, ease: EASE_OUT_EXPO },
    }),
};

const HeroSection: React.FC<HeroSectionProps> = ({ onCreateCV, onViewTemplates }) => {
    return (
        <section id="top" className="relative overflow-hidden pt-36 lg:pt-48 pb-24 lg:pb-32">
            {/* Typesetter's baseline grid, fading out toward the fold */}
            <div
                className="absolute inset-0 -z-10 opacity-[0.35]"
                aria-hidden="true"
                style={{
                    backgroundImage: 'linear-gradient(to bottom, rgba(27,23,19,0.055) 1px, transparent 1px)',
                    backgroundSize: '100% 56px',
                    maskImage: 'linear-gradient(to bottom, black 0%, transparent 75%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 75%)',
                }}
            />
            {/* Warm light falling from the top-left, like a desk lamp on paper */}
            <div className="absolute -top-48 -left-32 w-[720px] h-[720px] rounded-full bg-[radial-gradient(circle,rgba(200,68,44,0.07)_0%,transparent_65%)] -z-10" aria-hidden="true" />
            <div className="absolute top-24 right-0 w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(27,23,19,0.045)_0%,transparent_65%)] -z-10" aria-hidden="true" />

            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-20 lg:gap-12 items-center">
                    {/* Copy — left-aligned, editorial */}
                    <div>
                        <motion.p
                            custom={0}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="font-label text-[0.72rem] tracking-[0.22em] uppercase text-ink-faint"
                        >
                            The CV builder <span className="text-ember">·</span> rated 4.9/5 by 250,000+ job seekers
                        </motion.p>

                        <motion.h1
                            custom={1}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-7 font-display font-medium text-ink tracking-[-0.02em] text-[2.9rem] leading-[1.04] sm:text-6xl lg:text-[4.6rem] [text-wrap:balance]"
                        >
                            The difference between applied and{' '}
                            <span className="relative inline-block italic font-semibold text-ember whitespace-nowrap">
                                hired
                                {/* Red editor's-pen circle, drawn on after the type settles */}
                                <svg
                                    className="absolute -inset-x-5 -inset-y-2.5 w-[calc(100%+2.5rem)] h-[calc(100%+1.25rem)]"
                                    viewBox="0 0 200 90"
                                    fill="none"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                >
                                    <motion.path
                                        d="M156 14C108 2 18 10 12 42c-5 28 56 42 104 38 50-4 76-20 70-40-5-17-38-26-70-26"
                                        stroke="#C8442C"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 0.9 }}
                                        transition={{ duration: 0.9, delay: 1.1, ease: EASE_IN_OUT_CUBIC }}
                                    />
                                </svg>
                            </span>
                            .
                        </motion.h1>

                        <motion.p
                            custom={2}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-7 text-lg text-ink-soft leading-relaxed max-w-[34rem]"
                        >
                            Recruiters spend seven seconds on a CV. CVbase gives you templates typeset like
                            fine print, an AI editor that sharpens every line, and a structure tracking
                            systems actually parse — so your seven seconds count.
                        </motion.p>

                        <motion.div
                            custom={3}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-10 flex flex-col sm:flex-row sm:items-center gap-5"
                        >
                            <button
                                onClick={onCreateCV}
                                className="group flex items-center justify-between sm:justify-center gap-3 pl-7 pr-2 py-2 rounded-full text-base font-semibold text-paper bg-ink hover:bg-ink/90 active:scale-[0.98] shadow-[0_16px_40px_-14px_rgba(27,23,19,0.5)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                            >
                                Create my CV — free
                                <span className="grid place-items-center w-11 h-11 rounded-full bg-ember text-paper transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105" aria-hidden="true">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </button>
                            <button
                                onClick={onViewTemplates}
                                className="group self-center sm:self-auto text-base font-semibold text-ink transition-colors duration-300 hover:text-ember"
                            >
                                <span className="border-b border-ink/25 pb-0.5 transition-colors duration-300 group-hover:border-ember">
                                    Browse the 75+ templates
                                </span>
                            </button>
                        </motion.div>

                        <motion.ul
                            custom={4}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-2.5 font-label text-[0.7rem] tracking-[0.18em] uppercase text-ink-faint"
                            aria-label="Key benefits"
                        >
                            {['ATS-proof', 'AI-assisted', 'Private by default'].map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                    <span className="text-ember" aria-hidden="true">✓</span>
                                    {item}
                                </li>
                            ))}
                        </motion.ul>

                        <motion.div
                            custom={5}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-10 flex items-center gap-4"
                        >
                            <div className="flex -space-x-2" aria-hidden="true">
                                {AVATARS.map((avatar) => (
                                    <span
                                        key={avatar.initials}
                                        className={`grid place-items-center w-9 h-9 rounded-[0.7rem] ${avatar.tone} text-paper text-[0.62rem] font-semibold ring-[3px] ring-paper`}
                                    >
                                        {avatar.initials}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[0.88rem] text-ink-soft leading-snug">
                                <span className="font-semibold text-ink">2,140 CVs</span> built this week —
                                <br className="hidden sm:block" /> most finished in under ten minutes.
                            </p>
                        </motion.div>
                    </div>

                    {/* Visual */}
                    <div className="px-2 sm:px-10 lg:px-0 lg:pr-4">
                        <CVPreviewCard />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
