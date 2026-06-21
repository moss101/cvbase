
import React from 'react';
import type { Project } from '../../types';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import ProjectCard from './ProjectCard';

interface ProjectsFormProps {
    data: Project[];
    onChange: (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange, onAdd, onRemove, onClear, onNext }) => {
    return (
        <>
            <ContentHeader
                title="Projects"
                description="Showcase your personal or professional projects to demonstrate your skills."
            />
            {data.map((item) => (
                <ProjectCard
                    key={item.id}
                    item={item}
                    onChange={onChange}
                    onRemove={onRemove}
                />
            ))}
            <button
                type="button"
                className="w-full p-5 bg-white border-2 border-dashed border-border rounded-lg cursor-pointer text-gray-500 font-semibold transition-all text-base hover:border-primary hover:text-primary hover:bg-primary-light"
                onClick={onAdd}
            >
                + Add Project
            </button>
            <TipsCard activeSection="projects" />
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default ProjectsForm;
