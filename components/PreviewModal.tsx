
import React from 'react';
import type { ResumeData, TemplateId, SectionId, ResumeSettings } from '../types';
import ResumePreview from './ResumePreview';
import { templateMap } from './templates/TemplatePreviewRegistry';


interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: ResumeData;
    selectedTemplate: TemplateId;
    visibleSections: SectionId[];
    settings: ResumeSettings;
}



const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, formData, selectedTemplate, visibleSections, settings }) => {
    if (!isOpen) return null;

    const TemplateComponent = templateMap[selectedTemplate] || ResumePreview;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex justify-center items-start p-8 overflow-y-auto animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative mt-8 mb-8"
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute -top-10 right-0 text-white text-4xl font-bold bg-black/30 rounded-full w-10 h-10 flex items-center justify-center leading-none hover:bg-black/50 transition-colors z-10"
                    aria-label="Close preview"
                >
                    &times;
                </button>
                {/* Changed h-[1123px] to min-h-[1123px] h-auto to support multi-page scrolling */}
                <div className="w-[794px] min-h-[1123px] h-auto shadow-2xl bg-white">
                     <TemplateComponent formData={formData} isCardPreview={false} visibleSections={visibleSections} settings={settings} />
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;