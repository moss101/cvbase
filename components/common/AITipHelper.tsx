import React, { useState, useEffect, useRef } from 'react';
import { generateFieldTip } from '../../services/geminiService';

// Module-level cache to prevent redundant API calls for identical section fields
const tipsCache: Record<string, string> = {};

interface AITipHelperProps {
    section: string;
    fieldName: string;
    currentValue?: string;
}

export const AITipHelper: React.FC<AITipHelperProps> = ({ section, fieldName, currentValue = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tip, setTip] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const cacheKey = `${section}-${fieldName}`;

    const fetchTip = async (forceRefresh = false) => {
        if (!forceRefresh && tipsCache[cacheKey]) {
            setTip(tipsCache[cacheKey]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Trim standard rich text HTML tags if any to send clean context
            const cleanVal = currentValue
                ? currentValue.replace(/<[^>]*>/g, '').substring(0, 150)
                : '';

            const generated = await generateFieldTip(section, fieldName, cleanVal);
            tipsCache[cacheKey] = generated;
            setTip(generated);
        } catch (err) {
            console.error('Failed to generate tip', err);
            setError('Could not reach AI counselor.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-fetch when popover opens
    useEffect(() => {
        if (isOpen) {
            fetchTip();
        }
    }, [isOpen]);

    // Handle clicks outside to close the tip
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(true);
        }, 200); // Small delay to prevent accidental hovers
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300); // Grace period to let cursor move into the tooltip
    };

    const toggleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleRegenerate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        fetchTip(true);
    };

    return (
        <div 
            ref={containerRef}
            className="inline-block relative text-left select-none ml-1.5"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trigger Button */}
            <button
                type="button"
                onClick={toggleOpen}
                aria-label={`Show tip for ${fieldName}`}
                className={`flex items-center justify-center p-0.5 rounded-full transition-all duration-200 outline-none ${
                    isOpen 
                        ? 'bg-secondary-light text-secondary shadow-glow scale-110' 
                        : 'text-gray-400 hover:text-secondary-dark hover:bg-gray-100 hover:scale-105'
                }`}
            >
                <span className="material-symbols-outlined text-[16px] md:text-[18px] select-none block font-semibold leading-none">
                    auto_awesome
                </span>
            </button>

            {/* Tooltip Overlay */}
            {isOpen && (
                <div 
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 md:w-80 bg-white border border-border shadow-2xl rounded-2xl p-4 cursor-default animate-fade-in text-slate-800 font-sans"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-secondary font-bold text-base select-none">
                                spark
                            </span>
                            <span className="text-xs font-extrabold text-secondary tracking-wider uppercase">
                                AI Section Counselor
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Refresh Tip Button */}
                            <button
                                type="button"
                                onClick={handleRegenerate}
                                disabled={isLoading}
                                className="p-1 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors disabled:opacity-40"
                                title="Get a different writing tip"
                            >
                                <span className={`material-symbols-outlined text-sm select-none block ${isLoading ? 'animate-spin' : ''}`}>
                                    sync
                                </span>
                            </button>
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-md text-gray-400 hover:text-slate-800 hover:bg-gray-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm select-none block">
                                    close
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="min-h-[60px] flex flex-col justify-center">
                        {isLoading ? (
                            <div className="py-2.5 flex flex-col gap-2">
                                <div className="h-3 bg-gray-100 rounded-full w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-gray-100 rounded-full w-5/6 animate-pulse"></div>
                                <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse"></div>
                            </div>
                        ) : error ? (
                            <p className="text-xs text-danger flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                {error}
                            </p>
                        ) : (
                            <p className="text-xs md:text-[13px] leading-relaxed text-gray-600 font-medium">
                                {tip}
                            </p>
                        )}
                    </div>

                    {/* Popover Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-border rotate-45 -mt-1.5"></div>
                </div>
            )}
        </div>
    );
};

export default AITipHelper;
