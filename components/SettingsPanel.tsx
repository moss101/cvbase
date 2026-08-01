import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTheme, TEXT_SCALE_LABELS, type ThemeMode, type TextScale } from './ThemeProvider';
import { useTranslation, LANGUAGE_OPTIONS, type LanguageCode } from '../services/translationService';
import { useAuth } from './AuthProvider';
import type { LegalTab } from './LegalPage';

/**
 * Settings and personalization.
 *
 * Groups everything that changes how the app looks and behaves — appearance,
 * language, account and data — into one surface reachable from the dashboard on
 * every device. Appearance preferences are owned by ThemeProvider and persist
 * across launches; the language selection is owned by TranslationProvider.
 */

interface SettingsPanelProps {
    onViewLegal?: (tab: LegalTab) => void;
    onManageBilling?: () => void;
    /** Opens the existing JSON import/export modal. */
    onOpenBackup?: () => void;
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string; hint: string }[] = [
    { value: 'light', label: 'Light', icon: 'light_mode', hint: 'Always the light theme' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode', hint: 'Always the dark theme' },
    { value: 'system', label: 'System', icon: 'contrast', hint: 'Follow your device setting' },
];

const TEXT_SCALES: TextScale[] = ['small', 'default', 'large', 'xlarge'];

const Section: React.FC<{
    title: string;
    description: string;
    icon: string;
    children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
    <section className="dashboard-card p-6 md:p-7">
        <header className="mb-5 flex items-start gap-3">
            <span
                className="material-symbols-outlined mt-0.5 text-[20px] text-ember-deep"
                aria-hidden="true"
            >
                {icon}
            </span>
            <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>
                <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
            </div>
        </header>
        {children}
    </section>
);

/** Accessible segmented control — a radiogroup, not a row of buttons. */
const SegmentedControl = <T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: string; icon?: string; hint?: string }[];
    onChange: (value: T) => void;
}) => (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
        {options.map((option) => {
            const active = option.value === value;
            return (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(option.value)}
                    title={option.hint}
                    className={`tap-target flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${
                        active
                            ? 'border-ember bg-ember-tint text-ember-deep'
                            : 'border-ink/[0.12] text-ink-soft hover:border-ink/25 hover:bg-ink/[0.04]'
                    }`}
                >
                    {option.icon && (
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                            {option.icon}
                        </span>
                    )}
                    {option.label}
                </button>
            );
        })}
    </div>
);

const Toggle: React.FC<{
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}> = ({ id, label, description, checked, onChange }) => (
    <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
            <label htmlFor={id} className="block text-sm font-semibold text-ink">
                {label}
            </label>
            <p id={`${id}-description`} className="mt-0.5 text-sm text-ink-soft">
                {description}
            </p>
        </div>
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-describedby={`${id}-description`}
            onClick={() => onChange(!checked)}
            className={`relative mt-0.5 h-7 w-12 flex-none rounded-full border transition-colors ${
                checked ? 'border-ember bg-ember' : 'border-ink/20 bg-ink/[0.08]'
            }`}
        >
            <span
                className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-true-white shadow-sm transition-transform ${
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
            />
        </button>
    </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    onViewLegal,
    onManageBilling,
    onOpenBackup,
}) => {
    const {
        mode,
        setMode,
        resolvedTheme,
        reduceMotion,
        setReduceMotion,
        textScale,
        setTextScale,
        isNative,
    } = useTheme();
    const { language, setLanguage } = useTranslation();
    const { user, logout } = useAuth();
    const [signingOut, setSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);

    const handleSignOut = async () => {
        setSigningOut(true);
        setSignOutError(null);
        try {
            await logout();
        } catch (error) {
            setSignOutError(
                error instanceof Error ? error.message : 'Could not sign out. Please try again.',
            );
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <div className="dashboard-module">
            <header>
                <p className="dashboard-eyebrow">Preferences</p>
                <h1 className="dashboard-display">Settings.</h1>
                <p className="mt-4 max-w-2xl text-ink-soft">
                    Appearance, language, account and data — everything that changes how CVBase
                    looks and behaves on this device.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Section
                    icon="palette"
                    title="Appearance"
                    description={`Currently showing the ${resolvedTheme} theme.`}
                >
                    <div className="space-y-6">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                                Theme
                            </p>
                            <SegmentedControl
                                label="Theme"
                                value={mode}
                                options={THEME_OPTIONS}
                                onChange={setMode}
                            />
                        </div>

                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                                Text size
                            </p>
                            <div role="radiogroup" aria-label="Text size" className="grid grid-cols-4 gap-2">
                                {TEXT_SCALES.map((scale) => {
                                    const active = scale === textScale;
                                    return (
                                        <button
                                            key={scale}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => setTextScale(scale)}
                                            className={`tap-target rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${
                                                active
                                                    ? 'border-ember bg-ember-tint text-ember-deep'
                                                    : 'border-ink/[0.12] text-ink-soft hover:border-ink/25 hover:bg-ink/[0.04]'
                                            }`}
                                        >
                                            {TEXT_SCALE_LABELS[scale]}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-xs text-ink-faint">
                                Scales the whole interface. Your CV keeps its exact print
                                dimensions.
                            </p>
                        </div>

                        <Toggle
                            id="setting-reduce-motion"
                            label="Reduce motion"
                            description="Turns off page transitions and decorative animation."
                            checked={reduceMotion}
                            onChange={setReduceMotion}
                        />
                    </div>
                </Section>

                <Section
                    icon="language"
                    title="Language"
                    description="Used for the builder's section labels and guidance."
                >
                    <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 gap-2">
                        {LANGUAGE_OPTIONS.map((option) => {
                            const active = option.code === language;
                            return (
                                <button
                                    key={option.code}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setLanguage(option.code as LanguageCode)}
                                    className={`tap-target flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                                        active
                                            ? 'border-ember bg-ember-tint text-ember-deep'
                                            : 'border-ink/[0.12] text-ink-soft hover:border-ink/25 hover:bg-ink/[0.04]'
                                    }`}
                                >
                                    <span aria-hidden="true">{option.flag}</span>
                                    {option.name}
                                </button>
                            );
                        })}
                    </div>
                </Section>

                <Section
                    icon="account_circle"
                    title="Account"
                    description={user?.email ?? 'You are not signed in on this device.'}
                >
                    <div className="space-y-3">
                        {onManageBilling && (
                            <button
                                type="button"
                                onClick={onManageBilling}
                                className="dashboard-secondary-button w-full justify-between"
                            >
                                Plan &amp; billing
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                    chevron_right
                                </span>
                            </button>
                        )}
                        {user && (
                            <button
                                type="button"
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="dashboard-secondary-button w-full justify-between disabled:opacity-60"
                            >
                                {signingOut ? 'Signing out…' : 'Sign out'}
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                    logout
                                </span>
                            </button>
                        )}
                        {signOutError && (
                            <p role="alert" className="text-sm font-medium text-danger">
                                {signOutError}
                            </p>
                        )}
                    </div>
                </Section>

                <Section
                    icon="database"
                    title="Data &amp; privacy"
                    description="Your CV data is stored on this device and in your account."
                >
                    <div className="space-y-3">
                        {onOpenBackup && (
                            <button
                                type="button"
                                onClick={onOpenBackup}
                                className="dashboard-secondary-button w-full justify-between"
                            >
                                Export or import a backup
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                    save
                                </span>
                            </button>
                        )}
                        {onViewLegal && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onViewLegal('privacy')}
                                    className="dashboard-secondary-button justify-center"
                                >
                                    Privacy policy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onViewLegal('terms')}
                                    className="dashboard-secondary-button justify-center"
                                >
                                    Terms
                                </button>
                            </div>
                        )}
                        <p className="pt-1 text-xs text-ink-faint">
                            CVBase {isNative ? `for ${Capacitor.getPlatform()}` : 'for web'}
                        </p>
                    </div>
                </Section>
            </div>
        </div>
    );
};

export default SettingsPanel;
