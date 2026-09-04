import React, { useState } from 'react';
import { Pencil, ChevronDown, X } from 'lucide-react';
import type { CustomSection } from '../../types';
import ContentHeader from '../common/ContentHeader';
import FormActions from '../common/FormActions';
import { CustomIcon } from '../common/icons';
import { useTranslation, type Translate } from '../../services/translationService';

interface CustomSectionFormProps {
    data: CustomSection[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const CustomCard: React.FC<{ item: CustomSection; onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; onRemove: (id: string) => void; t: Translate; }> = ({ item, onChange, onRemove, t }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(item.id, e);
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border border-border rounded-xl mb-6 bg-white shadow-sm pdf-item">
            <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-orange-50 text-orange-600 rounded-full">
                         <CustomIcon />
                    </span>
                    <h3 className="font-bold text-dark">{item.title || t('customForm.newItem', 'New Item')}</h3>
                </div>
                <div className="flex items-center gap-4">
                     <button type="button" className="text-gray-400 hover:text-primary transition-colors" aria-label={t('cardCommon.edit', 'Edit')}>
                        <Pencil aria-hidden="true" />
                    </button>
                    <button type="button" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-label={isExpanded ? t('cardCommon.collapse', 'Collapse') : t('cardCommon.expand', 'Expand')}>
                         <ChevronDown aria-hidden="true" />
                    </button>
                </div>
            </div>
            {isExpanded && (
                <div className="p-6 border-t border-border bg-gray-50/50">
                    <div className="relative p-6 bg-white border border-border rounded-xl">
                        <button
                            type="button"
                            className="absolute top-3 right-3 text-gray-400 hover:text-danger transition-colors"
                            onClick={() => onRemove(item.id)}
                            aria-label={t('customForm.removeSection', 'Remove custom section')}
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('custom.name', 'Activity / Title')}</label>
                                <input type="text" name="title" value={item.title} onChange={handleChange} placeholder={t('customForm.titlePlaceholder', 'e.g. Conference Speaker')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('custom.subtitle', 'Subtitle / Organization')}</label>
                                <input type="text" name="subtitle" value={item.subtitle} onChange={handleChange} placeholder={t('customForm.subtitlePlaceholder', 'e.g. Tech Summit 2023')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('customForm.dateLabel', 'Date / Timeframe')}</label>
                                <input type="text" name="date" value={item.date} onChange={handleChange} placeholder={t('awardsForm.datePlaceholder', 'e.g. June 2023')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="font-semibold text-sm text-gray-700 mb-2 block">{t('cardCommon.description', 'Description')}</label>
                                <textarea
                                    name="description"
                                    value={item.description}
                                    onChange={handleChange}
                                    placeholder={t('customForm.descPlaceholder', 'Details...')}
                                    className="w-full p-3 border border-border rounded-lg min-h-[80px] resize-y"
                                />
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomSectionForm: React.FC<CustomSectionFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    const { t } = useTranslation();
    return (
        <>
            <ContentHeader
                title={t('customForm.headerTitle', 'Additional Activities')}
                description={t('customForm.headerDesc', 'Add custom entries for things like conferences, hobbies, military service, or patents.')}
            />
            {data.map((item) => (
                <CustomCard
                    key={item.id}
                    item={item}
                    onChange={onChange}
                    onRemove={onRemove}
                    t={t}
                />
            ))}
            <button
                type="button"
                className="w-full p-5 bg-white border-2 border-dashed border-border rounded-xl cursor-pointer text-gray-500 font-semibold transition-all text-base hover:border-primary hover:text-primary hover:bg-primary-light"
                onClick={onAdd}
            >
                {t('customForm.addBtn', '+ Add Custom Item')}
            </button>
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default CustomSectionForm;
