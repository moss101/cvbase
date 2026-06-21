import React, { useState, useRef } from 'react';
import type { ResumeData } from '../../types';

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
    const [dragActive, setDragActive] = useState(false);
    const [importedData, setImportedData] = useState<ResumeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // Direct JSON file download for exports
    const handleExport = () => {
        try {
            const dataStr = JSON.stringify(currentData, null, 4);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `cvbase_backup_${new Date().toISOString().slice(0, 10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            setSuccessMessage('Resume data successfully exported to JSON!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Could not generate JSON export file.');
        }
    };

    // Helper to validate schema structure
    const validateAndSetData = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);
            
            // Structural validation check
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('File must contain a valid JSON object.');
            }

            // Quick duck-typing validation of ResumeData structure
            const hasContact = parsed.contact && typeof parsed.contact === 'object';
            const hasSummary = parsed.summary && typeof parsed.summary === 'object';
            
            if (!hasContact) {
                throw new Error('Missing "contact" details object.');
            }
            if (!hasSummary) {
                throw new Error('Missing "summary" details object.');
            }
            if (parsed.skills && !Array.isArray(parsed.skills)) {
                throw new Error('"skills" must be a list of tags.');
            }
            if (parsed.experience && !Array.isArray(parsed.experience)) {
                throw new Error('"experience" must be a list.');
            }
            if (parsed.education && !Array.isArray(parsed.education)) {
                throw new Error('"education" must be a list.');
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
            setError(err?.message || 'Invalid resume JSON file format. Make sure it was exported from this app.');
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
            setError("Invalid file type. Please upload a .json file.");
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
            setError("Could not read uploaded file.");
            setImportedData(null);
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        if (importedData) {
            onImportData(importedData);
            setSuccessMessage('Resume populated successfully from JSON draft!');
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
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <header className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px]">backup</span>
                        <div className="text-left">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">JSON Draft Backup</h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">Export your work or resume editing on any device</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center text-xl font-bold cursor-pointer"
                    >
                        &times;
                    </button>
                </header>

                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    {/* Status notifications */}
                    {successMessage && (
                        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-pulse">
                            <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>
                            <span>{successMessage}</span>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-rose-500 font-bold">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Left: Quick Export Option Card */}
                    <div className="p-5 border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white rounded-2xl hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="text-left">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Save state / Export JSON</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-md font-medium leading-relaxed">
                                    Download your current resume data. You can back up your file and import it at any time to recover your state perfectly.
                                </p>
                            </div>
                            <button
                                onClick={handleExport}
                                className="px-4 py-2.5 bg-slate-900 hover:bg-primary text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer font-bold"
                            >
                                <span className="material-symbols-outlined text-base">download</span>
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Drag-and-drop & Manual File Upload Area */}
                    <div className="space-y-2.5">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider text-left">Upload / Load JSON Draft</h3>
                        
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
                            
                            <span className={`material-symbols-outlined text-[42px] mb-3 transition-colors ${dragActive ? "text-primary" : "text-slate-400"}`}>
                                upload_file
                            </span>
                            
                            <p className="text-xs font-bold text-slate-700">
                                Drag and drop your JSON backup file here
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                                or click below to search computer directories
                            </p>
                            
                            <button
                                type="button"
                                onClick={onButtonClick}
                                className="mt-4 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-150 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                                Open File Explorer
                            </button>
                        </div>
                    </div>

                    {/* Pre-validation detail / Confirmation review section */}
                    {importedData && (
                        <div className="p-5 border border-primary/15 bg-primary/4 rounded-2xl text-left space-y-3.5 animate-slide-down">
                            <div className="flex items-center justify-between border-b border-primary/10 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">preview</span>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Loaded Draft Overview</span>
                                </div>
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/20">
                                    Ready to load
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Primary Name</p>
                                    <p className="text-slate-800 font-bold mt-0.5">
                                        {importedData.contact.firstName} {importedData.contact.lastName || '(No Surname)'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Professional Title</p>
                                    <p className="text-slate-800 font-bold mt-0.5 truncate">
                                        {importedData.contact.jobTitle || 'No Title Listed'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Core Skills</p>
                                    <p className="text-slate-800 font-bold mt-0.5">
                                        {importedData.skills.length} Competencies
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-bold">Listings</p>
                                    <p className="text-slate-800 font-bold mt-0.5">
                                        {importedData.experience.length} Jobs &bull; {importedData.education.length} Degrees
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 text-amber-800 border border-amber-100 p-3 rounded-2xl text-[11px] leading-normal font-medium flex items-start gap-2">
                                <span className="material-symbols-outlined text-base text-amber-500 inline-block">warning</span>
                                <span>Note: Applying this import draft will overwrite your active designer window. Make sure to back up your current work if needed before confirming.</span>
                            </div>

                            <div className="flex justify-end gap-3.5 pt-2">
                                <button
                                    onClick={() => setImportedData(null)}
                                    className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wide rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmImport}
                                    className="px-4.5 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                                >
                                    Confirm Import
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer instructions */}
                <footer className="p-5 border-t border-slate-100 bg-slate-50/70 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">
                        All files parsed securely in sandbox memory. Your data never leaves your client browser.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default JSONBackupModal;
