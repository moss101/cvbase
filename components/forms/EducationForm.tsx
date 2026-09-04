
import React from 'react';
import type { Education } from '../../types';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import ItemCard from './ItemCard';
import { useTranslation } from '../../services/translationService';

interface EducationFormProps {
    data: Education[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const EducationForm: React.FC<EducationFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    const { t } = useTranslation();
    return (
        <>
            <ContentHeader
                title={t('education.title', 'Education')}
                description={t('education.desc', 'List your educational background, starting with the most recent.')}
            />
            {data.map((item) => (
                <ItemCard
                    key={item.id}
                    item={item}
                    onChange={onChange}
                    onRemove={onRemove}
                    sectionType="education"
                />
            ))}
            <button
                type="button"
                className="w-full p-5 bg-white border-2 border-dashed border-border rounded-lg cursor-pointer text-gray-500 font-semibold transition-all text-base hover:border-primary hover:text-primary hover:bg-primary-light"
                onClick={onAdd}
            >
                {t('education.addBtn', '+ Add Education')}
            </button>
            <TipsCard activeSection="education" />
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default EducationForm;
