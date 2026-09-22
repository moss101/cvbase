import React, { useCallback, useId, useRef } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { Button } from '../primitives';

/**
 * The message composer: Enter sends, Shift+Enter inserts a newline, and a
 * visible Send button covers touch and assistive technology. The draft is
 * owned by the parent so a failed send never loses it. On mobile the bar
 * sits above the keyboard/safe area (`pb-safe`).
 */
export interface ComposerProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    sending: boolean;
    disabled?: boolean;
    /** Why sending is disabled (offline, archived …), shown beneath the field. */
    disabledReason?: string;
    maxLength?: number;
}

export const Composer: React.FC<ComposerProps> = ({ value, onChange, onSend, sending, disabled = false, disabledReason, maxLength = 4000 }) => {
    const { t } = useTranslation();
    const id = useId();
    const ref = useRef<HTMLTextAreaElement>(null);
    const canSend = !disabled && !sending && value.trim().length > 0;

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSend();
        }
    }, [canSend, onSend]);

    return (
        <form
            className="shrink-0 border-t border-border-default bg-surface-canvas pb-safe pt-2"
            onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}
            aria-label={t('careeros.coach.composer.label', 'Message the coach')}
        >
            <label htmlFor={id} className="sr-only">{t('careeros.coach.composer.label', 'Message the coach')}</label>
            <div className="flex items-end gap-2">
                <textarea
                    id={id}
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
                    onKeyDown={onKeyDown}
                    rows={2}
                    maxLength={maxLength}
                    disabled={disabled}
                    placeholder={t('careeros.coach.composer.placeholder', 'Ask about your goal, an opportunity or what to do next…')}
                    aria-describedby={`${id}-hint`}
                    className="min-h-[44px] max-h-40 flex-1 resize-y rounded-xl border border-border-strong bg-surface-panel px-3 py-2 text-[15px] text-content-primary placeholder:text-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
                />
                <Button type="submit" variant="primary" loading={sending} disabled={!canSend} icon={<SendHorizontal size={16} strokeWidth={2} />} aria-label={t('careeros.coach.composer.send', 'Send')}>
                    {t('careeros.coach.composer.send', 'Send')}
                </Button>
            </div>
            <p id={`${id}-hint`} className="mt-1 text-[11px] text-content-muted">
                {disabledReason ?? t('careeros.coach.composer.hint', 'Enter to send · Shift+Enter for a new line')}
            </p>
        </form>
    );
};

export default Composer;
