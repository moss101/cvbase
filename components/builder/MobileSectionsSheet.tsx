import React from 'react';
import BottomSheet from '../mobile/BottomSheet';
import type { SectionId } from '../../types';

interface NavSectionMeta {
    id: SectionId;
    name: string;
}

interface MobileSectionsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    sections: NavSectionMeta[];
    activeSection: SectionId;
    onSelect: (id: SectionId) => void;
    progress: number;
    t: (key: string, fallback: string) => string;
}

/** Replaces NavSidebar's nested "Toggle Sections" scrolling box on mobile —
 *  summoned on demand from MobileTopBar's center tap instead of always taking
 *  up sidebar space. Extracted from ResumeBuilder.tsx to keep that file's
 *  line count manageable; no behaviour change. */
const MobileSectionsSheet: React.FC<MobileSectionsSheetProps> = ({ isOpen, onClose, sections, activeSection, onSelect, progress, t }) => (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('mobileSectionsSheet.title', 'Sections')} heightClassName="max-h-[75vh]">
        <div className="px-3 pb-1">
            {sections.map((section) => {
                const isCurrent = section.id === activeSection;
                return (
                    <button
                        key={section.id}
                        type="button"
                        onClick={() => { onSelect(section.id); onClose(); }}
                        className={`tap-target flex w-full items-center gap-3 rounded-xl px-3 text-left transition ${isCurrent ? 'bg-primary-light' : 'active:bg-gray-50'}`}
                    >
                        <span className={`flex-1 text-[14.5px] font-semibold ${isCurrent ? 'text-primary-dark' : 'text-dark'}`}>
                            {t('nav.' + section.id, section.name)}
                        </span>
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                );
            })}
        </div>
        <div className="flex items-center justify-center gap-1.5 border-t border-border px-5 py-3.5 text-[12.5px] font-semibold text-gray-500">
            <span className="text-primary">{progress}%</span> {t('mobileSectionsSheet.filledIn', 'of this resume is filled in')}
        </div>
    </BottomSheet>
);

export default MobileSectionsSheet;
