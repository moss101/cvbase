import React from 'react';
import { useTranslation } from '../../services/translationService';

interface PDFQualityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectQuality: (quality: 'standard' | 'high') => void;
}

const PDFQualityModal: React.FC<PDFQualityModalProps> = ({ isOpen, onClose, onSelectQuality }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col transform transition-all scale-100 p-6"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">download</span>
                        {t('pdf.modal.title', 'Export PDF Quality')}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Subtitle */}
                <p className="text-gray-600 text-sm mb-5">
                    {t('pdf.modal.subtitle', 'Please select an export mode. High quality provides superior resolution but results in a larger file size.')}
                </p>

                {/* Choices */}
                <div className="space-y-3 mb-6">
                    {/* Standard Quality Option */}
                    <button
                        onClick={() => onSelectQuality('standard')}
                        className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary-light hover:bg-primary-light/5 active:bg-primary-light/10 transition-all flex items-start gap-4 group"
                    >
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px] block">compress</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-sm group-hover:text-primary transition-colors">
                                {t('pdf.quality.standard', 'Standard Quality')}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('pdf.quality.standard_desc', 'Smaller file size (~300KB), fast load times. Great for emails and online uploads.')}
                            </p>
                        </div>
                    </button>

                    {/* High Quality Option */}
                    <button
                        onClick={() => onSelectQuality('high')}
                        className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary-light hover:bg-primary-light/5 active:bg-primary-light/10 transition-all flex items-start gap-4 group"
                    >
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px] block">high_quality</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-sm group-hover:text-primary transition-colors">
                                {t('pdf.quality.high', 'High Quality')}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('pdf.quality.high_desc', 'Retains crisp typography & high-definition vector graphics. Perfect for print/physical copies.')}
                            </p>
                        </div>
                    </button>
                </div>

                {/* Footer Cancel */}
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-all"
                    >
                        {t('btn.cancel', 'Cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PDFQualityModal;
