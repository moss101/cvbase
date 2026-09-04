
import React from 'react';
import type { Language } from '../../types';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import { useTranslation, type Translate } from '../../services/translationService';

interface LanguagesFormProps {
    data: Language[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const LanguageCard: React.FC<{ item: Language; onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; onRemove: (id: string) => void; t: Translate; }> = ({ item, onChange, onRemove, t }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(item.id, e);
    return (
        <div className="border border-border rounded-2xl p-8 mb-5 bg-gray-50/50 transition-all hover:shadow-md hover:border-gray-300 relative">
             <button type="button" className="absolute top-6 right-6 px-4 py-2 bg-red-100 text-danger border border-red-200 rounded-md text-sm font-semibold transition-all hover:bg-danger hover:text-white" onClick={() => onRemove(item.id)}>{t('btn.delete', 'Delete')}</button>
            <form className="grid grid-cols-2 gap-6">
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{t('languages.lang', 'Language')}</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="language" value={item.language} onChange={handleChange} />
                </div>
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{t('languages.proficiency', 'Proficiency')}</label>
                    <select className="w-full p-3 border border-border rounded-lg bg-white appearance-none" name="proficiency" value={item.proficiency} onChange={handleChange}>
                        <option>{t('languagesForm.conversational', 'Conversational')}</option>
                        <option>{t('languagesForm.fluent', 'Fluent')}</option>
                        <option>{t('languagesForm.native', 'Native')}</option>
                    </select>
                </div>
            </form>
        </div>
    );
}

const LanguagesForm: React.FC<LanguagesFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    const { t } = useTranslation();
    return (
        <>
            <ContentHeader
                title={t('languages.title', 'Languages')}
                description={t('languages.desc', 'List any languages you are proficient in.')}
            />
            {data.map((item) => (
                <LanguageCard
                    key={item.id}
                    item={item}
                    onChange={onChange}
                    onRemove={onRemove}
                    t={t}
                />
            ))}
            <button
                type="button"
                className="w-full p-5 bg-white border-2 border-dashed border-border rounded-lg cursor-pointer text-gray-500 font-semibold transition-all text-base hover:border-primary hover:text-primary hover:bg-primary-light"
                onClick={onAdd}
            >
                {t('languages.addBtn', '+ Add Language')}
            </button>
            <TipsCard activeSection="languages" />
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default LanguagesForm;
