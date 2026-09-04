import React, { useState } from 'react';
import { Pencil, ChevronDown, X } from 'lucide-react';
import type { Certification } from '../../types';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import { CertificationsIcon } from '../common/icons';
import { useTranslation, type Translate } from '../../services/translationService';

interface CertificationsFormProps {
    data: Certification[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const CertificationCard: React.FC<{ item: Certification; onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; onRemove: (id: string) => void; t: Translate; }> = ({ item, onChange, onRemove, t }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(item.id, e);
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border border-border rounded-xl mb-6 bg-white shadow-sm pdf-item">
            <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-primary-light rounded-full">
                         <CertificationsIcon />
                    </span>
                    <h3 className="font-bold text-dark">{item.name || t('certForm.newCertification', 'New Certification')}</h3>
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
                            aria-label={t('certForm.removeCertification', 'Remove certification')}
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('certifications.name', 'Certification Name')}</label>
                                <input type="text" name="name" value={item.name} onChange={handleChange} placeholder={t('certForm.namePlaceholder', 'e.g. AWS Certified Solutions Architect')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('certForm.numberLabel', 'Certification Number')}</label>
                                <input type="text" name="number" value={item.number} onChange={handleChange} placeholder={t('certForm.numberPlaceholder', 'e.g. 1234567890')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">{t('certForm.expiryLabel', 'Expiry Date')}</label>
                                <input type="text" name="expiryDate" value={item.expiryDate} onChange={handleChange} placeholder={t('certForm.expiryPlaceholder', 'e.g. Dec 2025')} className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="font-semibold text-sm text-gray-700 mb-2 block">{t('cardCommon.description', 'Description')}</label>
                                <textarea
                                    name="description"
                                    value={item.description}
                                    onChange={handleChange}
                                    placeholder={t('certForm.descPlaceholder', 'Optional details about the certification')}
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


const CertificationsForm: React.FC<CertificationsFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    const { t } = useTranslation();
    return (
        <>
            <ContentHeader
                title={t('certifications.title', 'Certifications')}
                description={t('certForm.desc', "List any relevant professional certifications you've earned.")}
            />
            {data.map((item) => (
                <CertificationCard
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
                {t('certifications.addBtn', '+ Add Certification')}
            </button>
            <TipsCard activeSection="certifications" />
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default CertificationsForm;
