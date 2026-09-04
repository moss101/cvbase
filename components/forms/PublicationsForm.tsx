
import React, { useState } from 'react';
import { Pencil, ChevronDown, X } from 'lucide-react';
import type { Publication } from '../../types';
import ContentHeader from '../common/ContentHeader';
import FormActions from '../common/FormActions';
import { PublicationIcon } from '../common/icons';
import { useTranslation, type Translate } from '../../services/translationService';

interface PublicationsFormProps {
    data: Publication[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const PublicationCard: React.FC<{ item: Publication; onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; onRemove: (id: string) => void; t: Translate; }> = ({ item, onChange, onRemove, t }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(item.id, e);
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border border-border rounded-xl mb-6 bg-white shadow-sm">
            <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-purple-50 text-purple-600 rounded-full">
                         <PublicationIcon />
                    </span>
                    <h3 className="font-bold text-dark">{item.title || t('pubForm.newPublication', 'New Publication')}</h3>
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
                            aria-label={t('pubForm.removePublication', 'Remove publication')}
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('pubForm.titleLabel', 'Title')}</label>
                                <input type="text" name="title" value={item.title} onChange={handleChange} placeholder={t('pubForm.titlePlaceholder', 'e.g. Research on AI in Healthcare')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('pubForm.publisherLabel', 'Publisher')}</label>
                                <input type="text" name="publisher" value={item.publisher} onChange={handleChange} placeholder={t('pubForm.publisherPlaceholder', 'e.g. Science Journal')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('cardCommon.date', 'Date')}</label>
                                <input type="date" name="date" value={item.date} onChange={handleChange} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                             <div className="md:col-span-2">
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('pubForm.linkLabel', 'Link URL')}</label>
                                <input type="text" name="link" value={item.link} onChange={handleChange} placeholder="https://..." className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="font-semibold text-sm text-gray-700 mb-2 block">{t('cardCommon.description', 'Description')}</label>
                                <textarea
                                    name="description"
                                    value={item.description}
                                    onChange={handleChange}
                                    placeholder={t('pubForm.descPlaceholder', 'Briefly describe the publication...')}
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

const PublicationsForm: React.FC<PublicationsFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    const { t } = useTranslation();
    return (
        <>
            <ContentHeader
                title={t('publications.title', 'Publications')}
                description={t('pubForm.headerDesc', 'List your published articles, books, or research papers.')}
            />
            {data.map((item) => (
                <PublicationCard
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
                {t('publications.addBtn', '+ Add Publication')}
            </button>
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default PublicationsForm;
