import React from 'react';
import { motion } from 'motion/react';

/**
 * A realistic miniature resume used as the hero visual.
 * Pure presentational markup — intentionally not driven by ResumeData
 * so the hero stays lightweight and loads instantly.
 */
const CVPreviewCard: React.FC = () => {
    return (
        <div className="relative" aria-hidden="true">
            {/* Back sheet peeking out, like a second page on the desk */}
            <motion.div
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: -4 }}
                transition={{ duration: 0.9, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-x-8 top-6 bottom-0 max-w-[430px] mx-auto bg-paper-deep rounded-[1.6rem] border border-ink/[0.08] shadow-[0_20px_50px_-18px_rgba(27,23,19,0.25)]"
            />

            {/* Double-bezel shell around the document */}
            <motion.div
                initial={{ opacity: 0, y: 32, rotate: 1.5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="relative w-full max-w-[430px] mx-auto rounded-[1.6rem] bg-ink/[0.05] ring-1 ring-ink/[0.08] p-2 shadow-[0_36px_80px_-24px_rgba(27,23,19,0.35)]"
            >
                <div className="bg-paper-bright rounded-[calc(1.6rem-0.5rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
                    {/* Document header */}
                    <div className="relative bg-ink px-7 py-6 flex items-center gap-4 overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-ember/25 blur-2xl" />
                        <div className="shrink-0 w-14 h-14 rounded-full bg-paper-deep grid place-items-center ring-1 ring-paper/30">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="8.5" r="3.5" fill="#1B1713" fillOpacity="0.85" />
                                <path d="M5 19.5c.8-3.4 3.7-5.5 7-5.5s6.2 2.1 7 5.5" stroke="#1B1713" strokeOpacity="0.85" strokeWidth="2.4" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="min-w-0 relative">
                            <p className="text-paper font-display font-semibold text-xl leading-tight truncate">Sarah Mitchell</p>
                            <p className="text-ember-tint/90 font-label text-[0.66rem] tracking-[0.18em] uppercase mt-1">Senior Product Manager</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="h-1 w-16 rounded-full bg-paper/25" />
                                <span className="h-1 w-10 rounded-full bg-paper/15" />
                                <span className="h-1 w-12 rounded-full bg-paper/15" />
                            </div>
                        </div>
                    </div>

                    <div className="px-7 py-6 space-y-5">
                        {/* Profile — one line "being written" by the AI */}
                        <section>
                            <h3 className="font-label text-[0.6rem] tracking-[0.2em] text-ink-faint uppercase mb-2">Profile</h3>
                            <div className="space-y-1.5">
                                <div className="h-1.5 rounded-full bg-ink/[0.12] w-full" />
                                <div className="h-1.5 rounded-full bg-ink/[0.12] w-[92%]" />
                                <div className="flex items-center gap-1 w-[70%]">
                                    <div className="h-1.5 rounded-full animate-shimmer-warm flex-1" />
                                    <span className="w-[3px] h-3 bg-ember rounded-sm animate-caret" />
                                </div>
                            </div>
                        </section>

                        {/* Experience — first bullet underlined in red like an editor's pick */}
                        <section>
                            <h3 className="font-label text-[0.6rem] tracking-[0.2em] text-ink-faint uppercase mb-2.5">Experience</h3>
                            <div className="space-y-3.5">
                                <div className="flex gap-3">
                                    <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-ember" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-[0.78rem] font-semibold text-ink">Senior Product Manager · Lumen Labs</p>
                                            <p className="font-label text-[0.6rem] text-ink-faint shrink-0">2021 – Now</p>
                                        </div>
                                        <div className="mt-1.5 space-y-1 relative">
                                            <div className="h-1.5 rounded-full bg-ink/[0.07] w-full" />
                                            <div className="relative w-[85%]">
                                                <div className="h-1.5 rounded-full bg-ink/[0.07] w-full" />
                                                {/* red pen underline */}
                                                <svg className="absolute -bottom-1.5 left-0 w-full" height="5" viewBox="0 0 200 5" fill="none" preserveAspectRatio="none">
                                                    <path d="M2 3.5C50 1 140 1 198 3" stroke="#C8442C" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-ink/25" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-[0.78rem] font-semibold text-ink">Product Analyst · Northwind</p>
                                            <p className="font-label text-[0.6rem] text-ink-faint shrink-0">2018 – 2021</p>
                                        </div>
                                        <div className="mt-1.5 space-y-1">
                                            <div className="h-1.5 rounded-full bg-ink/[0.07] w-[95%]" />
                                            <div className="h-1.5 rounded-full bg-ink/[0.07] w-[60%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Skills */}
                        <section>
                            <h3 className="font-label text-[0.6rem] tracking-[0.2em] text-ink-faint uppercase mb-2">Skills</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing', 'Figma'].map((skill) => (
                                    <span key={skill} className="px-2.5 py-1 rounded-md bg-paper-deep border border-ink/[0.07] text-ink-soft text-[0.66rem] font-semibold">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </section>

                        {/* Education */}
                        <section>
                            <h3 className="font-label text-[0.6rem] tracking-[0.2em] text-ink-faint uppercase mb-2">Education</h3>
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[0.78rem] font-semibold text-ink">BSc Business & Economics · UCL</p>
                                <p className="font-label text-[0.6rem] text-ink-faint shrink-0">2014 – 2018</p>
                            </div>
                            <div className="h-1.5 rounded-full bg-ink/[0.07] w-[55%] mt-1.5" />
                        </section>
                    </div>
                </div>
            </motion.div>

            {/* "SHORTLISTED" stamp — pressed onto the page corner */}
            <motion.div
                initial={{ opacity: 0, scale: 1.6, rotate: -18 }}
                animate={{ opacity: 1, scale: 1, rotate: -9 }}
                transition={{ duration: 0.45, delay: 1.45, ease: [0.16, 1.2, 0.4, 1] }}
                className="absolute -right-2 sm:-right-7 top-[4.5rem] select-none"
            >
                <span className="block px-4 py-2 rounded-md border-[2.5px] border-ember/80 text-ember/90 font-label font-semibold text-[0.78rem] tracking-[0.28em] uppercase bg-paper-bright/40 backdrop-blur-[1px] shadow-[0_8px_20px_-8px_rgba(200,68,44,0.4)]">
                    Shortlisted
                </span>
            </motion.div>

            {/* Floating ATS score chip */}
            <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.9, ease: [0.32, 0.72, 0, 1] }}
                className="absolute -left-2 sm:-left-10 bottom-24 bg-paper-bright/95 backdrop-blur rounded-2xl border border-ink/[0.08] shadow-[0_18px_40px_-12px_rgba(27,23,19,0.28)] px-4 py-3 flex items-center gap-3 animate-float"
            >
                <div className="relative w-11 h-11">
                    <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#E9E2D5" strokeWidth="5" />
                        <motion.circle
                            cx="22" cy="22" r="18" fill="none" stroke="#C8442C" strokeWidth="5" strokeLinecap="round"
                            strokeDasharray="113"
                            initial={{ strokeDashoffset: 113 }}
                            animate={{ strokeDashoffset: 7 }}
                            transition={{ duration: 1.4, delay: 1.1, ease: 'easeOut' }}
                        />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center font-label text-[0.72rem] font-semibold text-ink">94</span>
                </div>
                <div>
                    <p className="font-label text-[0.62rem] tracking-[0.16em] uppercase text-ink-faint leading-tight">ATS Score</p>
                    <p className="text-[0.8rem] font-semibold text-ink mt-0.5">Excellent match</p>
                </div>
            </motion.div>

            {/* Floating AI suggestion chip */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.05, ease: [0.32, 0.72, 0, 1] }}
                className="absolute -right-1 sm:-right-8 -bottom-6 bg-paper-bright/95 backdrop-blur rounded-2xl border border-ink/[0.08] shadow-[0_18px_40px_-12px_rgba(27,23,19,0.28)] px-4 py-3 flex items-center gap-2.5 animate-float"
                style={{ animationDelay: '1.2s' }}
            >
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="#FAF7F2" />
                    </svg>
                </span>
                <div>
                    <p className="font-label text-[0.62rem] tracking-[0.16em] uppercase text-ink-faint leading-tight">AI Edit</p>
                    <p className="text-[0.8rem] font-semibold text-ink mt-0.5">Stronger verbs applied</p>
                </div>
            </motion.div>
        </div>
    );
};

export default CVPreviewCard;
