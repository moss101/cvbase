import React from 'react';
import { motion } from 'motion/react';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
    return (
        <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.08 * index, ease: [0.21, 0.68, 0.32, 1] }}
            className="group relative bg-white rounded-2xl border border-slate-200/80 p-7 shadow-[0_2px_12px_rgba(15,40,90,0.04)] hover:shadow-[0_16px_40px_-12px_rgba(37,99,235,0.18)] hover:border-blue-200 hover:-translate-y-1.5 transition-all duration-300"
        >
            {/* Top accent line revealed on hover */}
            <span className="absolute top-0 left-7 right-7 h-[3px] rounded-b-full bg-gradient-to-r from-blue-600 to-sky-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" aria-hidden="true" />

            <div className="grid place-items-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-all duration-300">
                {icon}
            </div>
            <h3 className="mt-5 font-['Bricolage_Grotesque'] text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">{description}</p>
        </motion.article>
    );
};

export default FeatureCard;
