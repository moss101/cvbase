
import React from 'react';
import type { ResumeData, TemplateId, ResumeSettings } from '../types';
import ResumePreview from './ResumePreview';
import { templateMap } from './templates/TemplatePreviewRegistry';

interface HeadlessPreviewProps {
    templateId: TemplateId;
    data: ResumeData;
}

// Typed by TemplateId so the typecheck enforces a renderer for every template.

const HeadlessPreview: React.FC<HeadlessPreviewProps> = ({ templateId, data }) => {
    const Component = templateMap[templateId] || ResumePreview;
    
    // Default settings for the screenshot
    const settings: ResumeSettings = {
        themeColor: '', // Use template default
        fontSize: 'medium',
        fontFamily: 'Arial, sans-serif'
    };

    const visibleSections = ['contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

    // Render cleanly without extra wrapper styles to allow Puppeteer to manipulate size
    return (
        <div id="headless-capture-root" style={{ display: 'inline-block' }}>
            <Component 
                formData={data} 
                isCardPreview={false} 
                visibleSections={visibleSections as any} 
                settings={settings}
            />
        </div>
    );
};

export default HeadlessPreview;
