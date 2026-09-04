
import React from 'react';
import type { ResumeData, TemplateId, SectionId, ResumeSettings } from '../types';
import ResumePreview from './ResumePreview';
import { templateMap } from './templates/TemplatePreviewRegistry';
import { useMobileShell } from '../lib/useMobileShell';
import { useFitScale } from '../lib/useFitScale';
import { useDialog } from '../lib/useDialog';



interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: ResumeData;
    selectedTemplate: TemplateId;
    visibleSections: SectionId[];
    settings: ResumeSettings;
}



const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, formData, selectedTemplate, visibleSections, settings }) => {
    // Hooks run unconditionally, before the `isOpen` early return below —
    // useFitScale's callback ref is designed to survive this component
    // mounting/unmounting between opens (see lib/useFitScale.ts).
    const isMobileShell = useMobileShell();
    const fit = useFitScale<HTMLDivElement>(794);
    const dialog = useDialog({ open: isOpen, onClose, label: 'Resume preview' });

    if (!isOpen) return null;

    const TemplateComponent = templateMap[selectedTemplate] || ResumePreview;
    const content = <TemplateComponent formData={formData} isCardPreview={false} visibleSections={visibleSections} settings={settings} />;

    if (isMobileShell) {
        // The desktop layout below renders the resume at its real 794px design
        // width with the page itself scrolling — fine on a wide viewport, but it
        // used to be the ONLY behavior, so opening this on a phone overflowed the
        // screen sideways. Here the page is `zoom`-scaled (not `transform`, which
        // wouldn't shrink its layout box) to the container's real width, so it
        // both fits and keeps normal, natural vertical scrolling for multi-page CVs.
        return (
            <div
                {...dialog.overlayProps}
                {...dialog.panelProps}
                className="fixed inset-0 z-[100] flex flex-col bg-dark/85 animate-fade-in outline-none"
            >
                <div
                    className="pt-safe flex shrink-0 items-center justify-between px-4 pb-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-sm font-bold text-white">Preview</span>
                    <button
                        onClick={onClose}
                        aria-label="Close preview"
                        className="tap-target flex items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                    >
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>
                <div
                    ref={fit.ref}
                    className="pb-safe min-h-0 flex-1 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="mx-auto w-[794px] bg-white shadow-2xl"
                        style={{ zoom: fit.scale || 1 } as React.CSSProperties}
                    >
                        {content}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex justify-center items-start p-8 overflow-y-auto animate-fade-in"
            {...dialog.overlayProps}
        >
            <div
                {...dialog.panelProps}
                className="relative mt-8 mb-8 outline-none"
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
