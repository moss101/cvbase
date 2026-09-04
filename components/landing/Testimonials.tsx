import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../../services/translationService';

interface Testimonial {
    key: string;
    quote: string;
    name: string;
    role: string;
    tone: string;
    variant?: 'featured' | 'ember';
}

const TESTIMONIALS: Testimonial[] = [
    {
        key: 'tomasRivera',
        quote: 'The recruiter told me it was the cleanest CV she\'d seen all quarter. I went from a 12% response rate to landing a marketing director role in six weeks.',
        name: 'Tomás Rivera',
        role: 'Marketing Director · retail',
        tone: 'bg-[#8A4B38]',
        variant: 'featured',
    },
    {
        key: 'priyaSharma',
        quote: 'I rebuilt my CV on a Sunday evening and had three interview invitations within ten days. The ATS checker caught two formatting issues my old CV had been silently failing on for months.',
        name: 'Priya Sharma',
        role: 'Software Engineer · fintech',
        tone: 'bg-[#3F3A33]',
    },
    {
        key: 'meganObrien',
        quote: 'As a career changer moving from nursing into health-tech, I had no idea how to frame my experience. The AI assistant turned my ward duties into transferable achievements recruiters actually responded to.',
        name: 'Megan O\'Brien',
        role: 'Clinical Product Specialist',
        tone: 'bg-[#6B5D4D]',
    },
    {
        key: 'danielKovacs',
        quote: 'My ATS score went from 61 to 96 after following the suggestions. Same experience, same skills — completely different outcome.',
        name: 'Daniel Kovács',
        role: 'Finance Analyst · banking',
        tone: 'bg-[#2C2722]',
        variant: 'ember',
    },
    {
        key: 'chloeAdebayo',
        quote: 'Graduated with zero work experience and a lot of panic. The template structured my projects and internships so well that I got callbacks from two of the Big Four.',
        name: 'Chloe Adebayo',
        role: 'Graduate Analyst · consulting',
        tone: 'bg-[#A3582F]',
    },
    {
        key: 'sandraWeiss',
        quote: 'After 15 years in one company I hadn\'t touched my CV in a decade. Rebuilt it in an evening, applied to four senior roles, interviewed for three. The export quality alone is worth it.',
        name: 'Sandra Weiss',
        role: 'Senior Project Manager · engineering',
        tone: 'bg-[#56504A]',
    },
];

const Stars: React.FC<{ className?: string }> = ({ className = 'text-ember' }) => {
    const { t } = useTranslation();
    return (
    <div className={`flex gap-1 ${className}`} aria-label={t('landing.testimonials.starsAriaLabel', '5 out of 5 stars')}>
        {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />
            </svg>
        ))}
    </div>
    );
};

const Avatar: React.FC<{ item: Testimonial; light?: boolean }> = ({ item, light }) => (
    <span className={`grid place-items-center w-10 h-10 rounded-[0.7rem] ${item.tone} text-paper text-[0.72rem] font-semibold shrink-0 ${light ? 'ring-1 ring-paper/30' : ''}`}>
        {item.name.split(' ').map((n) => n[0]).join('')}
    </span>
);

const Testimonials: React.FC = () => {
    const { t } = useTranslation();
    const featured = TESTIMONIALS.find((item) => item.variant === 'featured')!;
    const rest = TESTIMONIALS.filter((item) => item.variant !== 'featured');

    return (
        <section id="testimonials" className="py-24 lg:py-36">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14 lg:mb-20"
                >
                    <div className="max-w-2xl">
                        <p className="font-label text-[0.7rem] tracking-[0.24em] uppercase text-ink-faint">
                            05 <span className="text-ember">—</span> {t('landing.testimonials.eyebrow', 'Field reports')}
                        </p>
                        <h2 className="mt-5 font-display font-medium tracking-[-0.015em] text-ink text-4xl sm:text-5xl leading-[1.08] [text-wrap:balance]">
                            {t('landing.testimonials.heading.prefix', 'Loved by job seekers. Feared by')} <span className="italic text-ember">{t('landing.testimonials.heading.highlight', 'rejection piles')}</span>.
                        </h2>
                    </div>
                    <div className="flex flex-col gap-1.5 font-label text-[0.7rem] tracking-[0.16em] uppercase text-ink-faint lg:text-right lg:pb-1.5">
                        <span>{t('landing.testimonials.stat.rating', '4.9/5 average rating')}</span>
                        <span>{t('landing.testimonials.stat.cvsCreated', '250,000+ CVs created')}</span>
                        <span>{t('landing.testimonials.stat.countries', 'Trusted in 70+ countries')}</span>
                    </div>
                </motion.div>

                {/* Featured pull-quote */}
                <motion.figure
                    initial={{ opacity: 0, y: 36 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    className="mb-6 rounded-[1.75rem] bg-ink/[0.04] ring-1 ring-ink/[0.07] p-2"
                >
                    <div className="rounded-[calc(1.75rem-0.5rem)] bg-paper-bright shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] px-7 py-10 sm:px-14 sm:py-14 lg:grid lg:grid-cols-12 lg:gap-10 items-end">
                        <blockquote className="lg:col-span-9 font-display font-light italic text-ink text-2xl sm:text-[2.1rem] leading-[1.25] tracking-[-0.01em] [text-wrap:balance]">
                            {t('landing.testimonials.featured.prefix', '“The recruiter told me it was the')} <span className="text-ember not-italic font-medium">{t('landing.testimonials.featured.highlight', "cleanest CV she'd seen all quarter")}</span>
                            {t('landing.testimonials.featured.suffix', '. I went from a 12% response rate to landing a marketing director role in six weeks.”')}
                        </blockquote>
                        <figcaption className="lg:col-span-3 mt-8 lg:mt-0 flex lg:flex-col items-center lg:items-end gap-3 lg:gap-2.5">
                            <Avatar item={featured} />
                            <div className="lg:text-right">
                                <p className="text-[0.92rem] font-semibold text-ink">{featured.name}</p>
                                <p className="text-[0.82rem] text-ink-faint">{t(`landing.testimonials.item.${featured.key}.role`, featured.role)}</p>
                            </div>
                            <Stars className="text-ember lg:mt-1" />
                        </figcaption>
                    </div>
                </motion.figure>

                {/* Masonry wall */}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
                    {rest.map((item, i) => {
                        const ember = item.variant === 'ember';
                        return (
                            <motion.figure
                                key={item.name}
                                initial={{ opacity: 0, y: 28 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.65, delay: 0.05 * (i % 3), ease: [0.32, 0.72, 0, 1] }}
                                className={`break-inside-avoid mb-5 flex flex-col rounded-[1.4rem] border p-7 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 ${
                                    ember
                                        ? 'bg-ember border-ember shadow-[0_24px_50px_-18px_rgba(200,68,44,0.5)]'
                                        : 'bg-paper-bright border-ink/[0.08] hover:shadow-[0_24px_50px_-20px_rgba(27,23,19,0.25)]'
                                }`}
                            >
                                <Stars className={ember ? 'text-paper' : 'text-ember'} />
                                <blockquote className={`mt-4 text-[0.95rem] leading-relaxed flex-1 ${ember ? 'text-paper' : 'text-ink-soft'}`}>
                                    “{t(`landing.testimonials.item.${item.key}.quote`, item.quote)}”
                                </blockquote>
                                <figcaption className="mt-6 flex items-center gap-3">
                                    <Avatar item={item} light={ember} />
                                    <div>
                                        <p className={`text-[0.9rem] font-semibold ${ember ? 'text-paper' : 'text-ink'}`}>{item.name}</p>
                                        <p className={`text-[0.8rem] ${ember ? 'text-paper/65' : 'text-ink-faint'}`}>{t(`landing.testimonials.item.${item.key}.role`, item.role)}</p>
                                    </div>
                                </figcaption>
                            </motion.figure>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
