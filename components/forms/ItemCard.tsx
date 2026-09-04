import React from 'react';
import type { Experience, Education, ResumeData } from '../../types';
import { useTranslation } from '../../services/translationService';

type Item = Experience | Education;
type SectionType = 'experience' | 'education';

interface ItemCardProps {
    item: Item;
    sectionType: SectionType;
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onRemove: (id: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, sectionType, onChange, onRemove }) => {
    const { t } = useTranslation();
    const isExperience = sectionType === 'experience';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(item.id, e);

    const isCurrent = item.endDate === 'Present';

    const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        // Create a synthetic event to pass to the parent onChange handler
        const syntheticEvent = {
            target: {
                name: 'endDate',
                value: isChecked ? 'Present' : ''
            }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(item.id, syntheticEvent);
    };


    return (
        <div className="border border-border rounded-2xl p-8 mb-5 bg-gray-50/50 transition-all hover:shadow-md hover:border-gray-300 relative pdf-item">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-dark">
                    {isExperience ? ((item as Experience).jobTitle || t('itemCard.newJob', 'New Job')) : ((item as Education).school || t('itemCard.newSchool', 'New School'))}
                </h3>
                <button type="button" className="px-4 py-2 bg-red-100 text-danger border border-red-200 rounded-md text-sm font-semibold transition-all hover:bg-danger hover:text-white" onClick={() => onRemove(item.id)}>{t('btn.delete', 'Delete')}</button>
            </div>
            <form className="grid grid-cols-2 gap-6">
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{isExperience ? t('experience.jobTitle', 'Job Title') : t('itemCard.degreeCertificate', 'Degree/Certificate')}</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name={isExperience ? 'jobTitle' : 'degree'} value={isExperience ? (item as Experience).jobTitle : (item as Education).degree} onChange={handleChange} />
                </div>
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{isExperience ? t('itemCard.company', 'Company') : t('itemCard.schoolUniversity', 'School/University')}</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name={isExperience ? 'company' : 'school'} value={isExperience ? (item as Experience).company : (item as Education).school} onChange={handleChange} />
                </div>
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{t('experience.startDate', 'Start Date')}</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="startDate" value={item.startDate} onChange={handleChange} placeholder={t('itemCard.startDatePlaceholder', 'e.g. Jan 2018')} />
                </div>
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{t('experience.endDate', 'End Date')}</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-border rounded-lg bg-white disabled:bg-gray-100"
                        name="endDate"
                        value={isCurrent ? '' : item.endDate}
                        onChange={handleChange}
                        disabled={isCurrent}
                        placeholder={t('itemCard.endDatePlaceholder', 'e.g. Present')}
                    />
                    <div className="mt-2 flex items-center">
                        <input
                            type="checkbox"
                            id={`current-${item.id}`}
                            checked={isCurrent}
                            onChange={handleCurrentChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`current-${item.id}`} className="ml-2 block text-sm text-gray-900">
                            {isExperience ? t('itemCard.currentlyWorkHere', 'I currently work here') : t('itemCard.currentlyStudyHere', 'I currently study here')}
                        </label>
                    </div>
                </div>
                <div className="col-span-2">
                    <label className="font-semibold mb-2 block text-sm text-gray-700">{t('itemCard.locationLabel', 'Location')}</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="location" placeholder={t('itemCard.locationPlaceholder', 'e.g., New York, NY')} value={item.location} onChange={handleChange} />
                </div>
                <div className="col-span-2">
                    <label className="font-semibold text-sm text-gray-700 mb-2 block">{isExperience ? t('itemCard.jobDescription', 'Job Description') : t('itemCard.details', 'Details')}</label>
                    <textarea
                        className="w-full p-3 border border-border rounded-lg bg-white min-h-[120px] resize-y"
                        name="description"
                        value={item.description}
                        onChange={handleChange}
                        placeholder={isExperience ? t('itemCard.descPlaceholderExp', "Bullet points of your achievements...\n\n--- PROJECTS ---\nProject Name | Project description") : t('itemCard.descPlaceholderEdu', 'Relevant coursework, projects...')}
                    />
                </div>
            </form>
        </div>
    );
};

export default ItemCard;
