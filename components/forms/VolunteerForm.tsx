import React, { useState } from 'react';
import type { Volunteer } from '../../types';
import ContentHeader from '../common/ContentHeader';
import FormActions from '../common/FormActions';
import { VolunteerIcon } from '../common/icons';

interface VolunteerFormProps {
    data: Volunteer[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const VolunteerCard: React.FC<{ item: Volunteer; onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; onRemove: (id: string) => void; }> = ({ item, onChange, onRemove }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(item.id, e);
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border border-border rounded-xl mb-6 bg-white shadow-sm pdf-item">
            <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-green-50 text-green-600 rounded-full">
                         <VolunteerIcon />
                    </span>
                    <h3 className="font-bold text-dark">{item.organization || 'New Volunteer Role'}</h3>
                </div>
                <div className="flex items-center gap-4">
                     <button type="button" className="text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                         <span className="material-symbols-outlined">expand_more</span>
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
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">Organization</label>
                                <input type="text" name="organization" value={item.organization} onChange={handleChange} placeholder="e.g. Red Cross" className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">Role</label>
                                <input type="text" name="role" value={item.role} onChange={handleChange} placeholder="e.g. Community Volunteer" className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">Start Date</label>
                                <input type="text" name="startDate" value={item.startDate} onChange={handleChange} placeholder="e.g. Jan 2022" className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div>
                                <label className="font-semibold mb-2 block text-sm text-gray-700">End Date</label>
                                <input type="text" name="endDate" value={item.endDate} onChange={handleChange} placeholder="e.g. Present" className="w-full p-3 border border-border rounded-lg" />
                            </div>
                             <div className="md:col-span-2">
                                <label className="font-semibold mb-2 block text-sm text-gray-700">Location</label>
                                <input type="text" name="location" value={item.location} onChange={handleChange} placeholder="e.g. London, UK" className="w-full p-3 border border-border rounded-lg" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="font-semibold text-sm text-gray-700 mb-2 block">Description</label>
                                <textarea
                                    name="description"
                                    value={item.description}
                                    onChange={handleChange}
                                    placeholder="Describe your responsibilities and impact..."
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

const VolunteerForm: React.FC<VolunteerFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    return (
        <>
            <ContentHeader
                title="Volunteering"
                description="Showcase your community involvement and volunteer work."
            />
            {data.map((item) => (
                <VolunteerCard
                    key={item.id}
                    item={item}
                    onChange={onChange}
                    onRemove={onRemove}
                />
            ))}
            <button
                type="button"
                className="w-full p-5 bg-white border-2 border-dashed border-border rounded-xl cursor-pointer text-gray-500 font-semibold transition-all text-base hover:border-primary hover:text-primary hover:bg-primary-light"
                onClick={onAdd}
            >
                + Add Volunteer Experience
            </button>
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default VolunteerForm;
