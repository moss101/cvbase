
import React from 'react';

interface ContentHeaderProps {
    title: string;
    description: string;
}

const ContentHeader: React.FC<ContentHeaderProps> = ({ title, description }) => {
    return (
        // Section titles sit at the same scale as Career OS space headers.
        <div className="mb-8">
            <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-content-primary sm:text-[28px]">{title}</h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-content-secondary">{description}</p>
        </div>
    );
};

export default ContentHeader;
