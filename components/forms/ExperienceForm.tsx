import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import ListKeymap from '@tiptap/extension-list-keymap';
import type { Experience, ResumeData } from '../../types';
import ContentHeader from '../common/ContentHeader';
import FormActions from '../common/FormActions';
import { generateBulletPointSuggestions } from '../../services/geminiService';
import { SparklesIcon, BoldIcon, ItalicIcon, UnderlineIcon, ListBulletIcon, ListNumberedIcon, Icon } from '../common/icons';
import { Briefcase, Calendar, Trash2, NotebookPen, Search, RefreshCw, Plus, CirclePlus } from 'lucide-react';
import AITipHelper from '../common/AITipHelper';
import { useTranslation } from '../../services/translationService';


interface ExperienceFormProps {
  data: Experience[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onNext: () => void;
  onFormDataChange: React.Dispatch<React.SetStateAction<ResumeData>>;
}

const BulletEditor = React.memo(({ html, onUpdate, placeholder }: {
  html: string;
  onUpdate: (html: string) => void;
  placeholder: string;
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        hardBreak: false,
        orderedList: { HTMLAttributes: { class: 'list-decimal list-outside pl-5' } },
        bulletList: { HTMLAttributes: { class: 'list-disc list-outside pl-5' } },
      }),
      Underline,
      ListKeymap,
      Placeholder.configure({ placeholder }),
    ],
    content: html,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4 min-h-[200px] text-gray-700 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [html, editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-xl bg-white overflow-hidden shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-border flex-wrap">
        {[
            { action: () => editor.chain().focus().toggleBold().run(), name: 'bold', icon: <BoldIcon className="w-4 h-4" /> },
            { action: () => editor.chain().focus().toggleItalic().run(), name: 'italic', icon: <ItalicIcon className="w-4 h-4" /> },
            { action: () => editor.chain().focus().toggleUnderline().run(), name: 'underline', icon: <UnderlineIcon className="w-4 h-4" /> },
            { action: () => editor.chain().focus().toggleBulletList().run(), name: 'bulletList', icon: <ListBulletIcon className="w-4 h-4" /> },
            { action: () => editor.chain().focus().toggleOrderedList().run(), name: 'orderedList', icon: <ListNumberedIcon className="w-4 h-4" /> },
        ].map(({ action, name, icon }) => (
             <button key={name} type="button" onClick={action} className={`p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors ${editor.isActive(name) ? 'bg-gray-300 text-gray-900' : ''}`} title={name}>
                {icon}
            </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

const InputGroup: React.FC<{
    label: string;
    icon: string;
    id: string;
    children: React.ReactNode;
    fullWidth?: boolean;
    currentValue?: string;
}> = ({ label, icon, id, children, fullWidth, currentValue }) => (
    <div className={fullWidth ? 'col-span-full' : ''}>
        <label htmlFor={id} className="flex items-center text-sm font-semibold text-gray-700 mb-1.5 ml-1">
            <span>{label}</span>
            <AITipHelper section="experience" fieldName={label} currentValue={currentValue} />
        </label>
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Icon name={icon} className="w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" aria-hidden="true" />
            </div>
            {children}
        </div>
    </div>
);


const ExperienceForm: React.FC<ExperienceFormProps> = ({ data, onAdd, onRemove, onClear, onNext, onFormDataChange }) => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const activeExperience = useMemo(() => data.find(e => e.id === activeId), [data, activeId]);
  const isCurrent = activeExperience?.endDate === 'Present';

  useEffect(() => {
    if (data.length > 0 && (!activeId || !data.find(d => d.id === activeId))) {
      setActiveId(data[0].id);
    } else if (data.length === 0) {
      setActiveId(null);
    }
  }, [data, activeId]);
  
  useEffect(() => {
    if (!activeExperience?.jobTitle) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      generateBulletPointSuggestions(activeExperience.jobTitle)
        .then(setSuggestions)
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [activeExperience?.jobTitle]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeExperience) return;
    const { name, value } = e.target;
    onFormDataChange(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === activeId ? { ...exp, [name]: value } : exp
      ),
    }));
  };

   const handleCurrentWorkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeExperience) return;
    const isChecked = e.target.checked;
    onFormDataChange(prev => ({
        ...prev,
        experience: prev.experience.map(exp =>
            exp.id === activeId ? { ...exp, endDate: isChecked ? 'Present' : '' } : exp
        ),
    }));
  };
  
  const handleDescriptionChange = (html: string) => {
    if (!activeExperience) return;
     onFormDataChange(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === activeId ? { ...exp, description: html } : exp
      ),
    }));
  };

  const currentDescriptionText = useMemo(() => {
      const div = document.createElement('div');
      div.innerHTML = activeExperience?.description || '';
      return div.textContent || '';
  }, [activeExperience?.description]);

  const availableSuggestions = useMemo(() => {
    return suggestions
      .filter(s => !currentDescriptionText.includes(s))
      .filter(s => s.toLowerCase().includes(search.toLowerCase()));
  }, [suggestions, currentDescriptionText, search]);

  const addSuggestion = (text: string) => {
    const currentHtml = activeExperience?.description || '';
    const newBullet = `<li>${text}</li>`;
    let newHtml;

    if (currentHtml.includes('<ul>')) {
        newHtml = currentHtml.replace('</ul>', `${newBullet}</ul>`);
    } else if (currentHtml.includes('<ol>')) {
        newHtml = currentHtml.replace('</ol>', `${newBullet}</ul>`);
    } else {
        newHtml = `${currentHtml}<ul>${newBullet}</ul>`;
    }
    handleDescriptionChange(newHtml);
  };

  return (
    <>
        <ContentHeader
            title={t('experience.title', 'Work Experience')}
            description={t('experienceForm.desc', 'Detail your professional roles. We recommend listing your 3-4 most relevant positions.')}
        />

        {/* Horizontal Card Navigation */}
        <div className="mb-8 overflow-x-auto pb-4 -mx-2 px-2 flex gap-4 snap-x no-scrollbar">
            {data.map((exp, index) => (
                <button
                    key={exp.id}
                    type="button"
                    onClick={() => setActiveId(exp.id)}
                    className={`snap-start flex-shrink-0 w-[240px] text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                        activeId === exp.id 
                        ? 'bg-white border-primary shadow-md ring-1 ring-primary' 
                        : 'bg-white border-border hover:border-primary/50 hover:shadow-sm'
                    }`}
                >
                     {activeId === exp.id && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}
                    <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${activeId === exp.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                             <Briefcase className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('experienceForm.jobIndex', 'Job {n}').replace('{n}', String(index + 1))}</span>
                    </div>
                    <h3 className={`font-bold text-sm truncate mb-0.5 ${activeId === exp.id ? 'text-dark' : 'text-gray-700'}`}>
                        {exp.jobTitle || t('experienceForm.untitledRole', 'Untitled Role')}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mb-2">{exp.company || t('experienceForm.noCompany', 'No Company')}</p>
                    <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                         <Calendar className="w-3 h-3" aria-hidden="true" />
                        {exp.startDate || t('experienceForm.start', 'Start')} - {exp.endDate || t('experienceForm.end', 'End')}
                    </p>
                </button>
            ))}

            <button
                type="button"
                onClick={() => { onAdd(); }}
                className="snap-start flex-shrink-0 w-[100px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/10 transition-all text-gray-400 hover:text-primary"
            >
                <CirclePlus className="w-8 h-8" aria-hidden="true" />
                <span className="text-xs font-bold">{t('experienceForm.addNew', 'Add New')}</span>
            </button>
        </div>

        {activeExperience ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                {/* Main Form Area */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
                         <div className="flex justify-between items-center border-b border-border pb-4">
                            <h3 className="text-lg font-bold text-dark flex items-center gap-2">
                                <NotebookPen className="w-5 h-5 text-primary" aria-hidden="true" />
                                {t('experienceForm.editDetails', 'Edit Details')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => onRemove(activeExperience.id)}
                                className="text-sm font-medium text-danger hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                                {t('btn.delete', 'Delete')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputGroup label={t('experience.jobTitle', 'Job Title')} icon="badge" id={`jobTitle-${activeExperience.id}`} currentValue={activeExperience.jobTitle} fullWidth>
                                <input
                                    type="text"
                                    id={`jobTitle-${activeExperience.id}`}
                                    name="jobTitle"
                                    value={activeExperience.jobTitle}
                                    onChange={handleFieldChange}
                                    placeholder={t('experienceForm.jobTitlePlaceholder', 'e.g. Senior Product Manager')}
                                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </InputGroup>

                            <InputGroup label={t('itemCard.company', 'Company')} icon="business" id={`company-${activeExperience.id}`} currentValue={activeExperience.company}>
                                <input
                                    type="text"
                                    id={`company-${activeExperience.id}`}
                                    name="company"
                                    value={activeExperience.company}
                                    onChange={handleFieldChange}
                                    placeholder={t('experienceForm.companyPlaceholder', 'e.g. Google')}
                                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </InputGroup>

                            <InputGroup label={t('itemCard.locationLabel', 'Location')} icon="location_on" id={`location-${activeExperience.id}`} currentValue={activeExperience.location}>
                                <input
                                    type="text"
                                    id={`location-${activeExperience.id}`}
                                    name="location"
                                    value={activeExperience.location}
                                    onChange={handleFieldChange}
                                    placeholder={t('itemCard.locationPlaceholder', 'e.g., New York, NY')}
                                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </InputGroup>

                            <InputGroup label={t('experience.startDate', 'Start Date')} icon="calendar_today" id={`startDate-${activeExperience.id}`} currentValue={activeExperience.startDate}>
                                <input
                                    type="text"
                                    id={`startDate-${activeExperience.id}`}
                                    name="startDate"
                                    value={activeExperience.startDate}
                                    onChange={handleFieldChange}
                                    placeholder={t('experienceForm.startDatePlaceholder', 'e.g. January 2020')}
                                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                                />
                            </InputGroup>

                            <div className="relative">
                                <InputGroup label={t('experience.endDate', 'End Date')} icon="event" id={`endDate-${activeExperience.id}`} currentValue={isCurrent ? t('itemCard.endDatePlaceholder', 'e.g. Present').replace('e.g. ', '') : activeExperience.endDate}>
                                    <input
                                        type="text"
                                        id={`endDate-${activeExperience.id}`}
                                        name="endDate"
                                        value={isCurrent ? '' : activeExperience.endDate}
                                        onChange={handleFieldChange}
                                        disabled={isCurrent}
                                        placeholder={t('itemCard.endDatePlaceholder', 'e.g. Present')}
                                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </InputGroup>
                                <div className="absolute top-0 right-0 pt-1 pr-1">
                                     <label className="inline-flex items-center cursor-pointer bg-gray-100 px-3 py-1 rounded-full border border-border hover:bg-gray-200 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                            checked={!!isCurrent}
                                            onChange={handleCurrentWorkChange}
                                        />
                                        <span className="ml-2 text-xs font-semibold text-gray-600 select-none">{t('experienceForm.currentRole', 'Current Role')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                             <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2 ml-1">
                                <div className="flex items-center">
                                    <span>{t('experienceForm.achievements', 'Achievements & Responsibilities')}</span>
                                    <AITipHelper section="experience" fieldName="Achievements & Responsibilities" currentValue={activeExperience.description} />
                                </div>
                                <span className="text-xs font-normal text-gray-500">{t('experienceForm.useBulletPoints', 'Use bullet points for clarity')}</span>
                             </label>
                             <BulletEditor html={activeExperience.description} onUpdate={handleDescriptionChange} placeholder={t('experienceForm.bulletPlaceholder', '• Achieved X by doing Y...')} />
                        </div>
                    </div>
                </div>

                {/* AI Suggestions Sidebar */}
                <div className="lg:col-span-5 h-full">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-1 rounded-2xl border border-secondary/20 h-full flex flex-col shadow-sm">
                        <div className="p-4 flex items-center gap-2 border-b border-secondary/10 bg-white/50 rounded-t-xl">
                            <SparklesIcon />
                            <h4 className="font-bold text-secondary text-sm">{t('experienceForm.aiSuggestions', 'AI Suggestions')}</h4>
                        </div>

                        <div className="p-4 flex-1 flex flex-col min-h-[400px]">
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={t('experienceForm.searchKeywords', 'Search keywords...')}
                                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-secondary/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-secondary/30"
                                />
                                <Search className="w-[18px] h-[18px] absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary/50" aria-hidden="true" />
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-secondary/60">
                                        <RefreshCw className="w-8 h-8 animate-spin mb-2" aria-hidden="true" />
                                        <p className="text-sm">{t('experienceForm.generatingIdeas', 'Generating ideas...')}</p>
                                    </div>
                                ) : availableSuggestions.length > 0 ? (
                                    availableSuggestions.map((s, i) => (
                                        <div key={i} className="group bg-white p-3.5 rounded-xl border border-white shadow-sm hover:shadow-md hover:border-secondary/30 transition-all duration-200 cursor-pointer" onClick={() => addSuggestion(s)}>
                                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{s}</p>
                                            <div className="flex justify-end">
                                                 <button
                                                    type="button"
                                                    className="text-xs font-bold text-secondary bg-secondary/5 hover:bg-secondary/10 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                                                >
                                                    <Plus className="w-[14px] h-[14px]" aria-hidden="true" />
                                                    {t('experienceForm.addToResume', 'Add to Resume')}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-6 bg-white/50 rounded-xl border border-dashed border-secondary/20">
                                        <p className="text-sm text-gray-600 font-medium">{t('experienceForm.noSuggestionsYet', 'No suggestions yet.')}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('experienceForm.noSuggestionsDesc', 'Enter a Job Title to unlock AI-powered bullet points tailored to your role.')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group" onClick={onAdd}>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300">
                     <Briefcase className="w-10 h-10 text-primary/50 group-hover:text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">{t('experienceForm.noExperienceListed', 'No Experience Listed')}</h3>
                <p className="text-gray-500 mb-6 text-center max-w-md">{t('experienceForm.noExperienceDesc', 'Adding your work history is crucial. Start by adding your most recent position to showcase your professional journey.')}</p>
                <button
                    type="button"
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all"
                >
                    {t('experienceForm.addFirstRole', '+ Add Your First Role')}
                </button>
            </div>
        )}
        <FormActions onClear={onClear} onNext={onNext} />
    </>
  );
};

export default ExperienceForm;
