
import React from 'react';
import type { Education } from '../../types';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import ItemCard from './ItemCard';

interface EducationFormProps {
    data: Education[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const EducationForm: React.FC<EducationFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    return (
        <>
            <ContentHeader
                title="Education"
                description="List your educational background, starting with the most recent."
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
                + Add Education
            </button>
            <TipsCard activeSection="education" />
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default EducationForm;
