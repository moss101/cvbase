import React from 'react';
// FIX: Imported AISuggestion type to resolve module export error.
import type { AISuggestion } from '../../types';
import { CheckIcon, SparklesIcon } from './icons';
import { useDialog } from '../../lib/useDialog';
import { useTranslation } from '../../services/translationService';

interface ImprovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestions: AISuggestion[];
    onApplySuggestion: (original: string, suggestion: string) => void;
}

const ImprovementModal: React.FC<ImprovementModalProps> = ({ isOpen, onClose, suggestions, onApplySuggestion }) => {
    const { t } = useTranslation();
    const dialog = useDialog({ open: isOpen, onClose });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" {...dialog.overlayProps}>
            <div
                {...dialog.panelProps}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col outline-none"
            >
                <header className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <SparklesIcon />
                        <h2 id={dialog.titleId} className="text-2xl font-bold text-dark">{t('improvementModal.title', 'AI Bullet Point Suggestions')}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('btn.close', 'Close')} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl font-bold">&times;</button>
                </header>
                <div className="p-6 overflow-y-auto">
                    {suggestions.length > 0 ? (
                        <div className="space-y-4">
                            {suggestions.map((s, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-50 rounded-lg border border-border">
                                    <div className="col-span-12 md:col-span-5">
                                        <p className="text-xs font-semibold text-gray-500 mb-1">{t('improvementModal.original', 'Original:')}</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{s.original}</p>
                                    </div>
                                    <div className="col-span-12 md:col-span-5">
                                        <p className="text-xs font-semibold text-green-700 mb-1">{t('improvementModal.suggestion', 'Suggestion:')}</p>
                                        <p className="text-sm text-gray-900 font-medium leading-relaxed">{s.suggestion}</p>
                                    </div>
                                    <div className="col-span-12 md:col-span-2 flex justify-end">
                                        <button 
                                            onClick={() => onApplySuggestion(s.original, s.suggestion)}
                                            className="flex items-center justify-center gap-1.5 w-full md:w-auto px-3 py-2 text-sm font-semibold text-white bg-success rounded-md hover:bg-green-600 transition-colors"
                                        >
                                            <CheckIcon />
                                            {t('improvementModal.apply', 'Apply')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center p-10">
                            <p className="text-lg font-semibold text-gray-700">{t('improvementModal.noneTitle', 'No suggestions available.')}</p>
                            <p className="text-gray-500">{t('improvementModal.noneDesc', 'The AI found your bullet points to be well-written, or could not parse the content.')}</p>
                        </div>
                    )}
                </div>
                <footer className="p-4 bg-gray-50 border-t border-border text-right">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg font-bold cursor-pointer text-base transition-all bg-primary text-white hover:bg-primary-dark"
                    >
                        {t('improvementModal.done', 'Done')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ImprovementModal;