
import React from 'react';
import { SparklesIcon } from './common/icons';
import { useTranslation, LANGUAGE_OPTIONS } from '../services/translationService';

interface HeaderActionsProps {
    onAiEnhanceClick: () => void;
    onLoadExample: () => void;
    saveState: 'idle' | 'saving' | 'saved';
    onSaveDraft: () => void;
    onOpenJsonBackup: () => void;
    onMenuClick?: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ 
    onAiEnhanceClick, 
    onLoadExample, 
    saveState,
    onSaveDraft,
    onOpenJsonBackup,
    onMenuClick
}) => {
    const { language, setLanguage, t } = useTranslation();

    const getSaveButtonContent = () => {
        switch (saveState) {
            case 'saving':
                return (
                    <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        {t('btn.saving', 'Saving...')}
                    </>
                );
            case 'saved':
                return t('btn.saved', '✓ Saved!');
            default:
                return t('btn.save', 'Save');
        }
    };
    
    return (
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-2">
                {onMenuClick && (
                    <button 
                        onClick={onMenuClick}
                        className="lg:hidden flex items-center justify-center p-2 rounded-xl border-2 border-border text-dark hover:border-primary hover:text-primary active:scale-95 transition bg-white mr-1 cursor-pointer"
                        title="Open Navigation"
                    >
                        <span className="material-symbols-outlined text-lg leading-none">menu</span>
                    </button>
                )}
                <span className="material-symbols-outlined text-gray-400 text-lg">language</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-1 hidden sm:inline">
                    {t('label.selectLanguage', 'Language')}
                </span>
                <div className="relative">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="appearance-none bg-white border-2 border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-dark shadow-sm hover:border-primary hover:text-primary cursor-pointer transition-all focus:outline-none focus:border-primary"
                    >
                        {LANGUAGE_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                                {opt.flag} &nbsp; {opt.name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold flex items-center">
                        <span className="material-symbols-outlined text-lg leading-none">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end flex-wrap items-center">
                <button 
                    onClick={onAiEnhanceClick}
                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-primary-light rounded-xl cursor-pointer font-bold text-xs uppercase tracking-wider transition-all text-primary shadow-sm hover:border-primary hover:text-primary hover:-translate-y-0.5 hover:shadow-md">
                    <SparklesIcon />
                    {t('btn.aiEnhance', 'AI Enhance')}
                </button>
                
                <button 
                    onClick={onLoadExample}
                    className="px-5 py-3 bg-white border-2 border-border rounded-xl cursor-pointer font-bold text-xs uppercase tracking-wider transition-all text-dark shadow-sm hover:border-primary hover:text-primary hover:-translate-y-0.5 hover:shadow-md">
                    {t('btn.loadExample', 'Load Example')}
                </button>

                <button 
                    onClick={onSaveDraft}
                    className="px-5 py-3 bg-white border-2 border-border rounded-xl cursor-pointer font-bold text-xs uppercase tracking-wider transition-all text-dark shadow-sm hover:border-primary hover:text-primary hover:-translate-y-0.5 hover:shadow-md">
                    {t('btn.saveDraft', 'Save Draft')}
                </button>

                <button 
                    onClick={onOpenJsonBackup}
                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-border rounded-xl cursor-pointer font-bold text-xs uppercase tracking-wider transition-all text-dark shadow-sm hover:border-primary hover:text-primary hover:-translate-y-0.5 hover:shadow-md">
                    <span className="material-symbols-outlined text-[16px] leading-none">backup</span>
                    {t('btn.backup', 'JSON Backup')}
                </button>

                <button 
                    disabled={saveState !== 'idle'}
                    className="px-5 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all border-2 border-primary shadow-sm hover:bg-primary-dark hover:border-primary-dark hover:-translate-y-0.5 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]">
                    {getSaveButtonContent()}
                </button>
            </div>
        </div>
    );
};

export default HeaderActions;
