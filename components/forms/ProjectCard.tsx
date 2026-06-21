import React from 'react';
import type { Project } from '../../types';
import AITipHelper from '../common/AITipHelper';

interface ProjectCardProps {
    item: Project;
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onRemove: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ item, onChange, onRemove }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(item.id, e);
    const isCurrent = item.endDate === 'Present';

    const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        const syntheticEvent = {
            target: { name: 'endDate', value: isChecked ? 'Present' : '' }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(item.id, syntheticEvent);
    };

    return (
        <div className="border border-border rounded-2xl p-8 mb-5 bg-gray-50/50 transition-all hover:shadow-md hover:border-gray-300 relative pdf-item">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-dark">{item.name || 'New Project'}</h3>
                {/* FIX: Changed 'id' to 'item.id' as 'id' was not defined in this scope. */}
                <button type="button" className="px-4 py-2 bg-red-100 text-danger border border-red-200 rounded-md text-sm font-semibold transition-all hover:bg-danger hover:text-white" onClick={() => onRemove(item.id)}>Delete</button>
            </div>
            <form className="grid grid-cols-2 gap-6">
                <div>
                    <label className="font-semibold mb-2 flex items-center text-sm text-gray-700">
                        <span>Project Name</span>
                        <AITipHelper section="projects" fieldName="Project Name" currentValue={item.name} />
                    </label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="name" value={item.name} onChange={handleChange} />
                </div>
                <div>
                    <label className="font-semibold mb-2 flex items-center text-sm text-gray-700">
                        <span>Link</span>
                        <AITipHelper section="projects" fieldName="Project Link" currentValue={item.link} />
                    </label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="link" placeholder="https://github.com/user/repo" value={item.link} onChange={handleChange} />
                </div>
                <div className="col-span-2">
                    <label className="font-semibold mb-2 flex items-center text-sm text-gray-700">
                        <span>Technologies Used</span>
                        <AITipHelper section="projects" fieldName="Technologies Used" currentValue={item.technologies} />
                    </label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="technologies" placeholder="e.g., React, Node.js, PostgreSQL" value={item.technologies} onChange={handleChange} />
                </div>
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">Start Date</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white" name="startDate" value={item.startDate} onChange={handleChange} placeholder="e.g. Jan 2021" />
                </div>
                <div>
                    <label className="font-semibold mb-2 block text-sm text-gray-700">End Date</label>
                    <input type="text" className="w-full p-3 border border-border rounded-lg bg-white disabled:bg-gray-100" name="endDate" value={isCurrent ? '' : item.endDate} onChange={handleChange} disabled={isCurrent} placeholder="e.g. Present" />
                     <div className="mt-2 flex items-center">
                        <input type="checkbox" id={`current-project-${item.id}`} checked={isCurrent} onChange={handleCurrentChange} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                        <label htmlFor={`current-project-${item.id}`} className="ml-2 block text-sm text-gray-900">Ongoing project</label>
                    </div>
                </div>
                <div className="col-span-2">
                    <label className="font-semibold flex items-center text-sm text-gray-700 mb-2">
                        <span>Description</span>
                        <AITipHelper section="projects" fieldName="Project Description" currentValue={item.description} />
                    </label>
                    <textarea className="w-full p-3 border border-border rounded-lg bg-white min-h-[120px] resize-y" name="description" value={item.description} onChange={handleChange} placeholder="Describe the project, your role, and the outcome." />
                </div>
            </form>
        </div>
    );
};


export default ProjectCard;