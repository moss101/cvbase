
import React, { useRef, useEffect } from 'react';
import { Undo2, Redo2, List } from 'lucide-react';
import { useTranslation } from '../../services/translationService';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    // FIX: Added an optional 'id' prop to allow linking with a label's 'htmlFor' attribute for accessibility.
    id?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, id }) => {
    const { t } = useTranslation();
    const editorRef = useRef<HTMLDivElement>(null);

    // Synchronize the editor's content with the `value` prop.
    // This approach prevents React from destroying and recreating the DOM node on every change,
    // which preserves the user's cursor position and selection.
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);


    const handleCommand = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    return (
        <div className="border border-border rounded-lg bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <div className="toolbar p-2 border-b border-border flex gap-2 items-center flex-wrap">
                <button type="button" onClick={() => handleCommand('bold')} aria-label={t('richText.bold', 'Bold')} className="p-2 rounded hover:bg-gray-100 font-bold w-9 h-9 flex items-center justify-center">B</button>
                <button type="button" onClick={() => handleCommand('italic')} aria-label={t('richText.italic', 'Italic')} className="p-2 rounded hover:bg-gray-100 italic w-9 h-9 flex items-center justify-center">I</button>
                <button type="button" onClick={() => handleCommand('underline')} aria-label={t('richText.underline', 'Underline')} className="p-2 rounded hover:bg-gray-100 underline w-9 h-9 flex items-center justify-center">U</button>
                <div className="w-px h-5 bg-border mx-1"></div>
                <button type="button" onClick={() => handleCommand('undo')} aria-label={t('richText.undo', 'Undo')} className="p-2 rounded hover:bg-gray-100 flex items-center justify-center w-9 h-9"><Undo2 className="w-5 h-5" aria-hidden="true" /></button>
                <button type="button" onClick={() => handleCommand('redo')} aria-label={t('richText.redo', 'Redo')} className="p-2 rounded hover:bg-gray-100 flex items-center justify-center w-9 h-9"><Redo2 className="w-5 h-5" aria-hidden="true" /></button>
                <div className="w-px h-5 bg-border mx-1"></div>
                <button type="button" onClick={() => handleCommand('insertUnorderedList')} aria-label={t('richText.bulletedList', 'Bulleted list')} className="p-2 rounded hover:bg-gray-100 flex items-center justify-center w-9 h-9"><List className="w-5 h-5" aria-hidden="true" /></button>
            </div>
            <div
                id={id}
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                className="w-full p-4 text-base bg-white focus:outline-none min-h-[200px] resize-y overflow-auto"
            />
        </div>
    );
};

export default RichTextEditor;
