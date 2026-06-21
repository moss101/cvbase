
import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    // FIX: Added an optional 'id' prop to allow linking with a label's 'htmlFor' attribute for accessibility.
    id?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, id }) => {
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
                <button type="button" onClick={() => handleCommand('bold')} className="p-2 rounded hover:bg-gray-100 font-bold w-9 h-9 flex items-center justify-center">B</button>
                <button type="button" onClick={() => handleCommand('italic')} className="p-2 rounded hover:bg-gray-100 italic w-9 h-9 flex items-center justify-center">I</button>
                <button type="button" onClick={() => handleCommand('underline')} className="p-2 rounded hover:bg-gray-100 underline w-9 h-9 flex items-center justify-center">U</button>
                <div className="w-px h-5 bg-border mx-1"></div>
                <button type="button" onClick={() => handleCommand('undo')} className="p-2 rounded hover:bg-gray-100 material-symbols-outlined text-xl flex items-center justify-center w-9 h-9">undo</button>
                <button type="button" onClick={() => handleCommand('redo')} className="p-2 rounded hover:bg-gray-100 material-symbols-outlined text-xl flex items-center justify-center w-9 h-9">redo</button>
                <div className="w-px h-5 bg-border mx-1"></div>
                <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="p-2 rounded hover:bg-gray-100 material-symbols-outlined text-xl flex items-center justify-center w-9 h-9">format_list_bulleted</button>
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
