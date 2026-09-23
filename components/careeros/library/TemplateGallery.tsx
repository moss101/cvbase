import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { AVAILABLE_TEMPLATES } from '../../../constants';
import type { TemplateId } from '../../../types';
import { LazyTemplatePreview } from '../../templates/TemplatePreviewRegistry';
import { Button } from '../primitives';

/**
 * The template gallery inside the Library (IA ledger: the legacy
 * Templates tab moves here unchanged in behaviour). Choosing a template
 * stores it exactly as the legacy dashboard does (`cvbase-selected-template`
 * in localStorage) and opens a fresh CV, so the editor's own template
 * handling keeps working.
 */
export const TEMPLATE_STORAGE_KEY = 'cvbase-selected-template';

export const rememberTemplate = (templateId: TemplateId): void => {
    try { window.localStorage.setItem(TEMPLATE_STORAGE_KEY, templateId); } catch { /* storage unavailable — builder falls back to default */ }
};

export const TemplateGallery: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [category, setCategory] = useState<string>('All');
    const categories = useMemo(() => ['All', ...Array.from(new Set(AVAILABLE_TEMPLATES.map((tpl) => tpl.category)))], []);
    const templates = category === 'All' ? AVAILABLE_TEMPLATES : AVAILABLE_TEMPLATES.filter((tpl) => tpl.category === category);

    const use = (templateId: TemplateId) => {
        rememberTemplate(templateId);
        navigate(careerPath.toNewCv());
    };

    return (
        <div>
            <p className="mb-4 max-w-2xl text-[15px] text-content-secondary">{t('dash.chooseRecruiterReady', 'Choose a recruiter-ready layout that fits the role, seniority, and tone of your application.')}</p>
            <div role="group" aria-label={t('careeros.library.templateCategories', 'Template categories')} className="mb-5 flex flex-wrap gap-2">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        aria-pressed={category === cat}
                        onClick={() => setCategory(cat)}
                        className={`tap-target rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${category === cat ? 'border-action-primary bg-action-primary text-white' : 'border-border-default bg-surface-panel text-content-secondary hover:bg-surface-canvas'}`}
                    >
                        {cat === 'All' ? t('dash.allCategory', 'All') : cat}
                    </button>
                ))}
            </div>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('dash.tab.templateGallery', 'Template gallery')}>
                {templates.map((template) => (
                    <li key={template.id} className="overflow-hidden rounded-2xl border border-border-default bg-surface-panel">
                        <div className="relative flex h-[300px] items-center justify-center overflow-hidden bg-surface-canvas" aria-hidden="true">
                            <LazyTemplatePreview templateId={template.id} />
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-border-default p-4">
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-semibold text-content-primary">{template.name}</h3>
                                <p className="text-[12px] font-medium text-content-muted">{template.category}</p>
                            </div>
                            <Button variant="primary" size="sm" onClick={() => use(template.id)} aria-label={t('careeros.library.useTemplateNamed', 'Use the {name} template').replace('{name}', template.name)}>
                                {t('dash.useTemplate', 'Use Template')}
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TemplateGallery;
