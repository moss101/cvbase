
import React from 'react';

interface FormActionsProps {
    onClear: () => void;
    onNext: () => void;
}

const FormActions: React.FC<FormActionsProps> = ({ onClear, onNext }) => {
    return (
        <div className="flex gap-5 justify-end mt-10 pt-8 border-t border-border">
            <button
                type="button"
                className="px-10 py-4 rounded-xl font-bold cursor-pointer text-base transition-all bg-white border border-border text-dark hover:border-dark hover:-translate-y-0.5 hover:shadow-md"
                onClick={onClear}
            >
                Clear Section
            </button>
            <button
                type="button"
                className="px-10 py-4 rounded-xl font-bold cursor-pointer text-base transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-dark hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30"
                onClick={onNext}
            >
                Save & Next
            </button>
        </div>
    );
};

export default FormActions;
