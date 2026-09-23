import React from 'react';
import { Sparkles, RefreshCw, Save, Download, Globe } from 'lucide-react';
import BottomSheet from '../mobile/BottomSheet';
import type { LanguageOption } from '../../services/translationService';

interface MobileMoreSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onAiEnhance: () => void;
    onLoadExample: () => void;
    onSaveDraft: () => void;
    onOpenJsonBackup: () => void;
    language: string;
    onLanguageChange: (code: string) => void;
    languageOptions: LanguageOption[];
    t: (key: string, fallback: string) => string;
}

/** Where HeaderActions' desktop toolbar row (AI Enhance, Load Example, Save
 *  Draft, JSON Backup, language) lives on mobile. Extracted from
 *  ResumeBuilder.tsx to keep that file's line count manageable; no behaviour
 *  change. */
const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
    isOpen, onClose, onAiEnhance, onLoadExample, onSaveDraft, onOpenJsonBackup,
    language, onLanguageChange, languageOptions, t,
}) => (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('mobileMoreSheet.title', 'More')}>
        <div className="divide-y divide-border px-2 pb-2">
            <button
                type="button"
                onClick={() => { onClose(); onAiEnhance(); }}
                className="tap-target flex w-full items-center gap-3 px-3 text-left"
            >
                <Sparkles size={18} strokeWidth={1.75} className="text-primary" />
                <span className="text-[14.5px] font-semibold text-dark">{t('btn.aiEnhance', 'AI Enhance')}</span>
            </button>
            <button
                type="button"
                onClick={() => { onClose(); onLoadExample(); }}
                className="tap-target flex w-full items-center gap-3 px-3 text-left"
            >
                <RefreshCw size={18} strokeWidth={1.75} className="text-gray-500" />
                <span className="text-[14.5px] font-semibold text-dark">{t('btn.loadExample', 'Load Example')}</span>
            </button>
            <button
                type="button"
                onClick={() => { onClose(); onSaveDraft(); }}
                className="tap-target flex w-full items-center gap-3 px-3 text-left"
            >
                <Save size={18} strokeWidth={1.75} className="text-gray-500" />
                <span className="text-[14.5px] font-semibold text-dark">{t('btn.saveDraft', 'Save Draft')}</span>
            </button>
            <button
                type="button"
                onClick={() => { onClose(); onOpenJsonBackup(); }}
                className="tap-target flex w-full items-center gap-3 px-3 text-left"
            >
                <Download size={18} strokeWidth={1.75} className="text-gray-500" />
                <span className="text-[14.5px] font-semibold text-dark">{t('btn.backup', 'JSON Backup')}</span>
            </button>
            <label className="flex items-center gap-3 px-3 py-2.5">
                <Globe size={18} strokeWidth={1.75} className="shrink-0 text-gray-500" />
                <select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    className="w-full bg-transparent text-[14.5px] font-semibold text-dark focus:outline-none"
                >
                    {languageOptions.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                            {opt.name}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    </BottomSheet>
);

export default MobileMoreSheet;
