import React, { useState, useRef } from 'react';
import type { ResumeData } from '../../types';
import { useDialog } from '../../lib/useDialog';
import { DatabaseBackup, CircleCheck, CircleAlert, Download, FileUp, Eye, TriangleAlert } from 'lucide-react';
import { useTranslation } from '../../services/translationService';
import { saveFile } from '../../lib/export/saveFile';

interface JSONBackupModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentData: ResumeData;
    onImportData: (data: ResumeData) => void;
}

export const JSONBackupModal: React.FC<JSONBackupModalProps> = ({
    isOpen,
    onClose,
    currentData,
    onImportData,
}) => {
    const { t } = useTranslation();
    const [dragActive, setDragActive] = useState(false);
    const [importedData, setImportedData] = useState<ResumeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dialog = useDialog({ open: isOpen, onClose });

    if (!isOpen) return null;

    // JSON file export — routed through saveFile so it also works inside the
    // native Capacitor WebView (a plain anchor/data-URI download is a no-op
    // there; saveFile falls back to Filesystem + the system Share sheet).
    const handleExport = async () => {
        try {
            const dataStr = JSON.stringify(currentData, null, 4);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const exportFileDefaultName = `cvbase_backup_${new Date().toISOString().slice(0, 10)}.json`;

            await saveFile({ blob, filename: exportFileDefaultName, mimeType: 'application/json' });

            setSuccessMessage(t('jsonBackup.exportSuccess', 'Resume data successfully exported to JSON!'));
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(t('jsonBackup.exportFailed', 'Could not generate JSON export file.'));
        }
    };

    // Helper to validate schema structure
    const validateAndSetData = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);
            
            // Structural validation check
            if (!parsed || typeof parsed !== 'object') {
                throw new Error(t('jsonBackup.errInvalidObject', 'File must contain a valid JSON object.'));
            }

            // Quick duck-typing validation of ResumeData structure
            const hasContact = parsed.contact && typeof parsed.contact === 'object';
            const hasSummary = parsed.summary && typeof parsed.summary === 'object';
            
            if (!hasContact) {
                throw new Error(t('jsonBackup.errMissingContact', 'Missing "contact" details object.'));
            }
            if (!hasSummary) {
                throw new Error(t('jsonBackup.errMissingSummary', 'Missing "summary" details object.'));
            }
            if (parsed.skills && !Array.isArray(parsed.skills)) {
                throw new Error(t('jsonBackup.errSkillsList', '"skills" must be a list of tags.'));
            }
            if (parsed.experience && !Array.isArray(parsed.experience)) {
                throw new Error(t('jsonBackup.errExperienceList', '"experience" must be a list.'));
            }
            if (parsed.education && !Array.isArray(parsed.education)) {
                throw new Error(t('jsonBackup.errEducationList', '"education" must be a list.'));
            }

            // Standardize/Ensure clean fallbacks for fields
            const cleanData: ResumeData = {
                contact: {
                    firstName: parsed.contact.firstName || '',
                    lastName: parsed.contact.lastName || '',
                    jobTitle: parsed.contact.jobTitle || '',
                    phone: parsed.contact.phone || '',
                    phoneCountryCode: parsed.contact.phoneCountryCode || '+1',
                    email: parsed.contact.email || '',
                    address: parsed.contact.address || '',
                    country: parsed.contact.country || '',
                    city: parsed.contact.city || '',
                    customCity: parsed.contact.customCity || '',
                    linkedin: parsed.contact.linkedin || '',
                    website: parsed.contact.website || '',
                    photo: parsed.contact.photo || '',
                },
                summary: {
                    professionalSummary: parsed.summary.professionalSummary || '',
                },
                experience: Array.isArray(parsed.experience) ? parsed.experience : [],
                projects: Array.isArray(parsed.projects) ? parsed.projects : [],
                education: Array.isArray(parsed.education) ? parsed.education : [],
                skills: Array.isArray(parsed.skills) ? parsed.skills : [],
                certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
                languages: Array.isArray(parsed.languages) ? parsed.languages : [],
                awards: Array.isArray(parsed.awards) ? parsed.awards : [],
                trainings: Array.isArray(parsed.trainings) ? parsed.trainings : [],
                publications: Array.isArray(parsed.publications) ? parsed.publications : [],
                volunteer: Array.isArray(parsed.volunteer) ? parsed.volunteer : [],
                custom: Array.isArray(parsed.custom) ? parsed.custom : [],
                sectionOrder: Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder : undefined,
            };

            setImportedData(cleanData);
            setError(null);
        } catch (err: any) {
            setError(err?.message || t('jsonBackup.errInvalidFormat', 'Invalid resume JSON file format. Make sure it was exported from this app.'));
            setImportedData(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            processFile(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        if (file.type !== "application/json" && !file.name.endsWith('.json')) {
            setError(t('jsonBackup.errInvalidFileType', 'Invalid file type. Please upload a .json file.'));
            setImportedData(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                validateAndSetData(text);
            }
        };
        reader.onerror = () => {
            setError(t('jsonBackup.errReadFile', 'Could not read uploaded file.'));
            setImportedData(null);
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        if (importedData) {
            onImportData(importedData);
            setSuccessMessage(t('jsonBackup.importSuccess', 'Resume populated successfully from JSON draft!'));
            setImportedData(null);
            setTimeout(() => {
                setSuccessMessage(null);
                onClose();
            }, 1500);
        }
    };

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
            {...dialog.overlayProps}
        >
            <div 
                {...dialog.panelProps}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 outline-none"
            >
                {/* Modal Header */}
                <header className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-3">
                        <DatabaseBackup className="w-7 h-7 text-primary" aria-hidden="true" />
                        <div className="text-left">
                            <h2 id={dialog.titleId} className="text-xl font-black text-slate-800 tracking-tight leading-none">{t('jsonBackup.title', 'JSON Draft Backup')}</h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">{t('jsonBackup.subtitle', 'Export your work or resume editing on any device')}</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        aria-label={t('btn.close', 'Close')}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center text-xl font-bold cursor-pointer"
                    >
                        &times;
                    </button>
                </header>

                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    {/* Status notifications */}
                    {successMessage && (
                        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-pulse">
                            <CircleCheck className="w-[1em] h-[1em] text-emerald-500" aria-hidden="true" />
                            <span>{successMessage}</span>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                            <CircleAlert className="w-[1em] h-[1em] text-rose-500" aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Left: Quick Export Option Card */}
                    <div className="p-5 border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white rounded-2xl hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="text-left">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('jsonBackup.saveExportHeading', 'Save state / Export JSON')}</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-md font-medium leading-relaxed">
                                    {t('jsonBackup.saveExportDesc', 'Download your current resume data. You can back up your file and import it at any time to recover your state perfectly.')}
                                </p>
                            </div>
                            <button
                                onClick={handleExport}
                                className="px-4 py-2.5 bg-slate-900 hover:bg-primary text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer font-bold"
                            >
                                <Download className="w-4 h-4" aria-hidden="true" />
                                {t('jsonBackup.exportBtn', 'Export')}
                            </button>
                        </div>
                    </div>

                    {/* Drag-and-drop & Manual File Upload Area */}
                    <div className="space-y-2.5">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider text-left">{t('jsonBackup.uploadHeading', 'Upload / Load JSON Draft')}</h3>
                        
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all ${
                                dragActive 
                                    ? "border-primary bg-primary/5 shadow-inner" 
                                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            
                            <FileUp className={`w-[42px] h-[42px] mb-3 transition-colors ${dragActive ? "text-primary" : "text-slate-400"}`} aria-hidden="true" />
                            
                            <p className="text-xs font-bold text-slate-700">
                                {t('jsonBackup.dragDropText', 'Drag and drop your JSON backup file here')}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                                {t('jsonBackup.orClickBelow', 'or click below to search computer directories')}
                            </p>
                            
                            <button
                                type="button"
                                onClick={onButtonClick}
                                className="mt-4 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-150 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                                {t('jsonBackup.openFileExplorer', 'Open File Explorer')}
                            </button>
                        </div>
                    </div>

                    {/* Pre-validation detail / Confirmation review section */}
                    {importedData && (
                        <div className="p-5 border border-primary/15 bg-primary/4 rounded-2xl text-left space-y-3.5 animate-slide-down">
                            <div className="flex items-center justify-between border-b border-primary/10 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-[1em] h-[1em] text-primary text-lg" aria-hidden="true" />
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('jsonBackup.loadedOverview', 'Loaded Draft Overview')}</span>
                                </div>
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/20">
                                    {t('jsonBackup.readyToLoad', 'Ready to load')}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">{t('jsonBackup.primaryName', 'Primary Name')}</p>
                                    <p className="text-slate-800 font-bold mt-0.5">
                                        {importedData.contact.firstName} {importedData.contact.lastName || t('jsonBackup.noSurname', '(No Surname)')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">{t('jsonBackup.professionalTitle', 'Professional Title')}</p>
                                    <p className="text-slate-800 font-bold mt-0.5 truncate">
                                        {importedData.contact.jobTitle || t('jsonBackup.noTitleListed', 'No Title Listed')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">{t('jsonBackup.coreSkills', 'Core Skills')}</p>
                                    <p className="text-slate-800 font-bold mt-0.5">
                                        {importedData.skills.length} {t('jsonBackup.competencies', 'Competencies')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-bold">{t('jsonBackup.listings', 'Listings')}</p>
                                    <p className="text-slate-800 font-bold mt-0.5">
                                        {t('jsonBackup.jobsCount', '{n} Jobs').replace('{n}', String(importedData.experience.length))} &bull; {t('jsonBackup.degreesCount', '{n} Degrees').replace('{n}', String(importedData.education.length))}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 text-amber-800 border border-amber-100 p-3 rounded-2xl text-[11px] leading-normal font-medium flex items-start gap-2">
                                <TriangleAlert className="w-4 h-4 text-amber-500 inline-block" aria-hidden="true" />
                                <span>{t('jsonBackup.overwriteWarning', 'Note: Applying this import draft will overwrite your active designer window. Make sure to back up your current work if needed before confirming.')}</span>
                            </div>

                            <div className="flex justify-end gap-3.5 pt-2">
                                <button
                                    onClick={() => setImportedData(null)}
                                    className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wide rounded-xl transition-all cursor-pointer"
                                >
                                    {t('btn.cancel', 'Cancel')}
                                </button>
                                <button
                                    onClick={handleConfirmImport}
                                    className="px-4.5 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                                >
                                    {t('jsonBackup.confirmImport', 'Confirm Import')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer instructions */}
                <footer className="p-5 border-t border-slate-100 bg-slate-50/70 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">
                        {t('jsonBackup.footerNote', 'All files parsed securely in sandbox memory. Your data never leaves your client browser.')}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default JSONBackupModal;
