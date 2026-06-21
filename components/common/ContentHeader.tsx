
import React from 'react';

interface ContentHeaderProps {
    title: string;
    description: string;
}

const ContentHeader: React.FC<ContentHeaderProps> = ({ title, description }) => {
    return (
        <div className="mb-10">
            <h1 className="text-5xl font-extrabold mb-4">{title}</h1>
            <p className="text-gray-500 text-lg leading-relaxed">{description}</p>
        </div>
    );
};

export default ContentHeader;
