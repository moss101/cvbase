
import React, { useEffect, useId, useRef, useState } from 'react';
import { SparklesIcon } from './common/icons';
import { Menu, Globe, ChevronDown, DatabaseBackup, MoreHorizontal, FileText, Check } from 'lucide-react';
import { useTranslation, LANGUAGE_OPTIONS } from '../services/translationService';

interface HeaderActionsProps {
    onAiEnhanceClick: () => void;
    onLoadExample: () => void;
    saveState: 'idle' | 'saving' | 'saved';
    onSaveDraft: () => void;
    onOpenJsonBackup: () => void;
    onMenuClick?: () => void;
    /** Rendered first in the toolbar (the builder's undo/redo pair). */
    leading?: React.ReactNode;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ 
    onAiEnhanceClick, 
    onLoadExample, 
    saveState,
    onSaveDraft,
    onOpenJsonBackup,
    onMenuClick,
    leading
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
                // The catalogue strings carry a ✓ glyph; the button draws a real icon instead.
                return (
                    <>
                        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        {t('btn.saved', '✓ Saved!').replace(/^✓\s*/, '')}
                    </>
                );
            default:
                return t('btn.save', 'Save');
        }
    };
    
    // One quiet toolbar: every builder action stays one click away, Save is the only filled button.
    const quiet = 'inline-flex items-center gap-1.5 rounded-[10px] border border-transparent px-3 py-2 text-[13px] font-semibold text-content-secondary transition-colors duration-150 hover:bg-surface-canvas hover:text-content-primary cursor-pointer';
    const outline = 'inline-flex items-center gap-1.5 rounded-[10px] border border-border-default bg-surface-panel px-3.5 py-2 text-[13px] font-semibold text-content-primary transition-colors duration-150 hover:border-action-primary/50 hover:text-action-primary cursor-pointer';

    return (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-5">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-2">
                {onMenuClick && (
                    <button 
                        onClick={onMenuClick}
                        className="lg:hidden flex items-center justify-center rounded-[10px] border border-border-default bg-surface-panel p-2 text-content-primary transition-colors hover:text-action-primary cursor-pointer"
                        title={t('label.openNavigation', 'Open Navigation')}
                        aria-label={t('label.openNavigation', 'Open Navigation')}
                    >
                        <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
                    </button>
                )}
                {leading}
                {leading && <span className="mx-1 h-5 w-px bg-border-default" aria-hidden="true" />}
                <label className="relative flex items-center">
                    <span className="sr-only">{t('label.selectLanguage', 'Language')}</span>
                    <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-content-muted" aria-hidden="true" />
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="appearance-none rounded-[10px] border border-border-default bg-surface-panel py-2 pl-9 pr-9 text-[13px] font-semibold text-content-primary transition-colors hover:border-action-primary/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/40"
                    >
                        {LANGUAGE_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                                {opt.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-content-muted" aria-hidden="true" />
                </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
                <MoreActions onLoadExample={onLoadExample} onOpenJsonBackup={onOpenJsonBackup} triggerClass={quiet} />
                <button onClick={onAiEnhanceClick} className={outline}>
                    <SparklesIcon />
                    {t('btn.aiEnhance', 'AI Enhance')}
                </button>
                <button onClick={onSaveDraft} className={outline}>
                    {t('btn.saveDraft', 'Save Draft')}
                </button>
                <button 
                    disabled={saveState !== 'idle'}
                    className="inline-flex min-w-[88px] items-center justify-center rounded-[10px] border border-action-primary bg-action-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70">
                    {getSaveButtonContent()}
                </button>
            </div>
        </div>
    );
};

/** Less frequent builder actions — load the example CV, JSON backup — one click behind "More". */
const MoreActions: React.FC<{ onLoadExample: () => void; onOpenJsonBackup: () => void; triggerClass: string }> = ({ onLoadExample, onOpenJsonBackup, triggerClass }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-content-primary transition-colors hover:bg-surface-canvas cursor-pointer';
    const choose = (fn: () => void) => { setOpen(false); fn(); };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={triggerClass}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
            >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                {t('btn.more', 'More')}
            </button>
            {open && (
                <div id={menuId} role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-border-default bg-surface-panel p-1.5 shadow-lg">
                    <button type="button" role="menuitem" className={item} onClick={() => choose(onLoadExample)}>
                        <FileText className="h-4 w-4 text-content-muted" aria-hidden="true" />
                        {t('btn.loadExample', 'Load Example')}
                    </button>
                    <button type="button" role="menuitem" className={item} onClick={() => choose(onOpenJsonBackup)}>
                        <DatabaseBackup className="h-4 w-4 text-content-muted" aria-hidden="true" />
                        {t('btn.backup', 'JSON Backup')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HeaderActions;
