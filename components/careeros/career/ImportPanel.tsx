import React, { useEffect, useId, useRef, useState } from 'react';
import { ClipboardPaste, FileText, Upload } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { extractTextFromFile, parseResumeText, SUPPORTED_EXTENSIONS } from '../../../services/resumeParser';
import { arrayBufferToBase64, parsePdfFileWithAi } from '../../../services/smartStudioService';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import type { StoredResume } from '../../../services/repos/mappers';
import type { CareerFact } from '../../../services/careerOs/types';
import type { ResumeData } from '../../../types';
import { captureException } from '../../../lib/monitoring';
import { Button, Skeleton, StatePanel } from '../primitives';
import { useOnline } from './useOnline';
import { importResumeData, MIN_IMPORT_TEXT, parsedResumeToResumeData, previewOf, type ImportPreview, type ImportResult, type ImportSource } from './importResume';

/**
 * One import surface for onboarding and the Evidence view: upload a CV file,
 * paste its text, or pick a CV already in the account. The person sees what
 * was read before anything is saved, and the result is always a set of
 * unconfirmed candidates — the review step decides what becomes career memory.
 * Image-only PDFs fall back to the server extractor; when that is unavailable
 * the paste path still works and says so.
 */
export interface ImportPanelProps {
    userId: string;
    /** Every fact of the account (any status) — used to skip duplicates and detect contradictions. */
    existingFacts: CareerFact[];
    onImported: (result: ImportResult) => void;
    /** Renders the panel without its own heading (onboarding step owns the heading). */
    embedded?: boolean;
}

type Mode = 'upload' | 'paste' | 'existing';

interface Staged {
    source: ImportSource;
    preview: ImportPreview;
    label: string;
}

const textLength = (text: string): number => text.replace(/\s/g, '').length;

export const ImportPanel: React.FC<ImportPanelProps> = ({ userId, existingFacts, onImported, embedded = false }) => {
    const { t } = useTranslation();
    const online = useOnline();
    const [mode, setMode] = useState<Mode>('upload');
    const [pasted, setPasted] = useState('');
    const [staged, setStaged] = useState<Staged | null>(null);
    const [reading, setReading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiUnavailable, setAiUnavailable] = useState(false);
    const [resumes, setResumes] = useState<StoredResume[] | null>(null);
    const [resumesError, setResumesError] = useState<unknown>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const textareaId = useId();
    const fileId = useId();
    const statusId = useId();

    useEffect(() => {
        if (mode !== 'existing' || resumes !== null) return;
        let cancelled = false;
        resumeRepo.list(userId)
            .then((list) => { if (!cancelled) { setResumes(list); setResumesError(null); } })
            .catch((err) => { if (!cancelled) setResumesError(err); });
        return () => { cancelled = true; };
    }, [mode, resumes, userId]);

    const stageData = (data: ResumeData, label: string, extra: Partial<ImportSource> = {}) => {
        setStaged({ source: { data, title: label, ...extra }, preview: previewOf(data), label });
        setError(null);
    };

    const readText = (text: string, label: string) => {
        if (textLength(text) < MIN_IMPORT_TEXT) {
            setError(t('careeros.import.tooShort', 'That contains almost no text. Paste the full CV or choose another file.'));
            return;
        }
        const parsed = parseResumeText(text, 'pasted', label);
        stageData(parsedResumeToResumeData(parsed), label);
    };

    const readFile = async (file: File) => {
        setError(null);
        setAiUnavailable(false);
        setReading(true);
        try {
            const { text, imageOnly } = await extractTextFromFile(file);
            let finalText = text;
            if (imageOnly) {
                if (!online) {
                    setError(t('careeros.import.imageOnlyOffline', 'This PDF contains only images and needs a connection to be read. Paste the text instead.'));
                    return;
                }
                try {
                    finalText = await parsePdfFileWithAi(arrayBufferToBase64(await file.arrayBuffer()));
                } catch (err) {
                    captureException(err, { context: 'career-import-pdf-ai' });
                    setAiUnavailable(true);
                    return;
                }
            }
            if (textLength(finalText) < MIN_IMPORT_TEXT) {
                setError(t('careeros.import.noText', 'No readable text was found in "{name}". Try a text PDF or paste the text instead.').replace('{name}', file.name));
                return;
            }
            const parsed = parseResumeText(finalText, 'file', file.name, imageOnly);
            stageData(parsedResumeToResumeData(parsed), file.name.replace(/\.[^.]+$/, ''));
        } catch (err) {
            const message = err instanceof Error && err.message.startsWith('Unsupported file type') ? err.message : null;
            setError(message ?? t('careeros.import.readFailed', 'The file could not be read. Nothing was saved.'));
            if (!message) captureException(err, { context: 'career-import-file' });
        } finally {
            setReading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const useExisting = (resume: StoredResume) => {
        if (!resume.id) return;
        stageData(resume.data, resume.title, { resumeId: resume.id, resumeRevision: resume.revision });
    };

    const runImport = async () => {
        if (!staged) return;
        setImporting(true);
        setError(null);
        try {
            const result = await importResumeData(userId, staged.source, existingFacts);
            setStaged(null);
            setPasted('');
            onImported(result);
        } catch (err) {
            captureException(err, { context: 'career-import-save' });
            setError(t('careeros.import.saveFailed', 'The import could not be saved. Your file and text are unchanged; try again.'));
        } finally {
            setImporting(false);
        }
    };

    const modes: Array<{ key: Mode; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }> }> = [
        { key: 'upload', label: t('careeros.import.mode.upload', 'Upload a file'), Icon: Upload },
        { key: 'paste', label: t('careeros.import.mode.paste', 'Paste text'), Icon: ClipboardPaste },
        { key: 'existing', label: t('careeros.import.mode.existing', 'Use a saved CV'), Icon: FileText },
    ];

    const fieldClass = 'w-full rounded-xl border border-border-default bg-surface-panel px-3 py-2.5 text-sm text-content-primary focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-focus-ring';

    return (
        <section aria-labelledby={embedded ? undefined : `${statusId}-title`} className={embedded ? '' : 'rounded-2xl border border-border-default bg-surface-panel p-5'}>
            {!embedded && (
                <>
                    <h2 id={`${statusId}-title`} className="text-base font-semibold text-content-primary">{t('careeros.import.title', 'Import more evidence')}</h2>
                    <p className="mt-1 text-sm text-content-secondary">{t('careeros.import.description', 'Imported claims arrive as candidates. Nothing is confirmed until you review it, and your CV is not changed.')}</p>
                </>
            )}

            <div role="tablist" aria-label={t('careeros.import.sourceLabel', 'Import source')} className={`flex flex-wrap gap-2 ${embedded ? '' : 'mt-4'}`}>
                {modes.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={mode === key}
                        onClick={() => { setMode(key); setError(null); }}
                        className={`tap-target inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                            mode === key ? 'border-action-primary bg-action-primary/10 text-action-primary' : 'border-border-default bg-surface-panel text-content-secondary hover:bg-surface-canvas'
                        }`}
                    >
                        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                        {label}
                    </button>
                ))}
            </div>

            <div className="mt-4" role="tabpanel">
                {mode === 'upload' && (
                    <div>
                        <label htmlFor={fileId} className="block text-sm font-semibold text-content-primary">
                            {t('careeros.import.fileLabel', 'CV file ({types})').replace('{types}', SUPPORTED_EXTENSIONS.join(', '))}
                        </label>
                        <input
                            ref={fileRef}
                            id={fileId}
                            type="file"
                            accept={SUPPORTED_EXTENSIONS.join(',')}
                            disabled={reading || importing}
                            onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }}
                            className="tap-target mt-1.5 block w-full text-sm text-content-secondary file:mr-3 file:rounded-lg file:border file:border-border-strong file:bg-surface-panel file:px-3 file:py-2 file:text-sm file:font-semibold file:text-content-primary"
                        />
                        <p className="mt-1 text-xs text-content-muted">{t('careeros.import.fileHint', 'Read on this device. Image-only PDFs are sent to the server extractor.')}</p>
                    </div>
                )}
                {mode === 'paste' && (
                    <div>
                        <label htmlFor={textareaId} className="block text-sm font-semibold text-content-primary">{t('careeros.import.pasteLabel', 'CV text')}</label>
                        <textarea
                            id={textareaId}
                            value={pasted}
                            onChange={(event) => setPasted(event.target.value)}
                            rows={8}
                            disabled={importing}
                            className={`${fieldClass} mt-1.5 min-h-[10rem]`}
                            placeholder={t('careeros.import.pastePlaceholder', 'Paste the text of your CV here')}
                        />
                        <div className="mt-2">
                            <Button variant="secondary" size="sm" onClick={() => readText(pasted, t('careeros.import.pastedTitle', 'Pasted CV'))} disabled={textLength(pasted) < MIN_IMPORT_TEXT}>
                                {t('careeros.import.readText', 'Read this text')}
                            </Button>
                        </div>
                    </div>
                )}
                {mode === 'existing' && (
                    <div>
                        {resumesError !== null ? (
                            <StatePanel kind="error" compact title={t('careeros.import.resumesError', 'Your saved CVs could not be listed')} onRetry={() => { setResumes(null); setResumesError(null); }} />
                        ) : resumes === null ? (
                            <div className="space-y-2" aria-busy="true"><Skeleton variant="title" width="60%" /><Skeleton variant="title" width="45%" /></div>
                        ) : resumes.length === 0 ? (
                            <StatePanel kind="empty" compact title={t('careeros.import.noResumes', 'No saved CVs in this account yet')} description={t('careeros.import.noResumesDescription', 'Upload a file or paste text instead.')} />
                        ) : (
                            <ul className="divide-y divide-border-default rounded-xl border border-border-default">
                                {resumes.map((resume) => (
                                    <li key={resume.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-content-primary">{resume.title}</p>
                                            <p className="text-xs text-content-muted">
                                                {resume.isPrimary ? t('careeros.import.primary', 'Primary CV') : t('careeros.import.resumeCount', '{count} roles').replace('{count}', String(resume.data?.experience?.length ?? 0))}
                                            </p>
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={() => useExisting(resume)} disabled={importing}>{t('careeros.import.useThis', 'Use this CV')}</Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            <div id={statusId} aria-live="polite" className="mt-3 space-y-3">
                {reading && <StatePanel kind="loading" compact title={t('careeros.import.reading', 'Reading the file')} description={t('careeros.import.readingDescription', 'Nothing is saved until you confirm the preview.')} />}
                {aiUnavailable && (
                    <StatePanel
                        kind="ai-unavailable"
                        compact
                        title={t('careeros.import.aiUnavailable', 'The server extractor is unavailable')}
                        description={t('careeros.import.aiUnavailableDescription', 'This PDF contains only images. Paste the text instead — it works without any AI call.')}
                        action={{ label: t('careeros.import.mode.paste', 'Paste text'), onClick: () => { setMode('paste'); setAiUnavailable(false); } }}
                    />
                )}
                {error && <StatePanel kind="error" compact title={error} description="" />}
                {staged && (
                    <div className="rounded-xl border border-border-default bg-surface-canvas p-4">
                        <p className="text-sm font-semibold text-content-primary">{t('careeros.import.previewTitle', 'What was read from {label}').replace('{label}', staged.label)}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                            <div><dt className="text-xs text-content-muted">{t('careeros.import.previewName', 'Name')}</dt><dd className="text-content-primary">{staged.preview.name || t('careeros.import.notFound', 'Not found')}</dd></div>
                            <div><dt className="text-xs text-content-muted">{t('careeros.import.previewTitleField', 'Title')}</dt><dd className="text-content-primary">{staged.preview.jobTitle || t('careeros.import.notFound', 'Not found')}</dd></div>
                            <div><dt className="text-xs text-content-muted">{t('careeros.import.previewExperience', 'Roles')}</dt><dd className="tabular-nums text-content-primary">{staged.preview.experience}</dd></div>
                            <div><dt className="text-xs text-content-muted">{t('careeros.import.previewEducation', 'Education')}</dt><dd className="tabular-nums text-content-primary">{staged.preview.education}</dd></div>
                            <div><dt className="text-xs text-content-muted">{t('careeros.import.previewSkills', 'Skills')}</dt><dd className="tabular-nums text-content-primary">{staged.preview.skills}</dd></div>
                            <div><dt className="text-xs text-content-muted">{t('careeros.import.previewOther', 'Other entries')}</dt><dd className="tabular-nums text-content-primary">{staged.preview.other}</dd></div>
                        </dl>
                        <p className="mt-2 text-xs text-content-secondary">
                            {staged.source.resumeId
                                ? t('careeros.import.previewExistingNote', 'Candidates are read from this saved CV; the CV itself is not changed.')
                                : t('careeros.import.previewNewNote', 'A new CV is saved to your Library and its entries become candidate facts for review.')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="primary" onClick={() => void runImport()} loading={importing} disabled={!online}>
                                {t('careeros.import.confirm', 'Import as candidates')}
                            </Button>
                            <Button variant="quiet" onClick={() => setStaged(null)} disabled={importing}>{t('btn.cancel', 'Cancel')}</Button>
                        </div>
                        {!online && <p className="mt-2 text-xs text-status-warning">{t('careeros.import.offline', 'You are offline; the import can be saved once you reconnect.')}</p>}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ImportPanel;
