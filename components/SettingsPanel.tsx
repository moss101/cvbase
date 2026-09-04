import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTheme, TEXT_SCALE_LABELS, type ThemeMode, type TextScale } from './ThemeProvider';
import { useTranslation, LANGUAGE_OPTIONS, type LanguageCode, type Translate } from '../services/translationService';
import { useAuth } from './AuthProvider';
import { useToast } from './common/Toast';
import { deleteAccount, exportAccount } from '../services/repos/accountRepo';
import type { LegalTab } from './LegalPage';
import { Icon } from './common/icons';
import { ChevronRight, LogOut, Save, Download } from 'lucide-react';

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

const buildThemeOptions = (t: Translate): { value: ThemeMode; label: string; icon: string; hint: string }[] => [
    { value: 'light', label: t('settings.theme.light', 'Light'), icon: 'light_mode', hint: t('settings.theme.lightHint', 'Always the light theme') },
    { value: 'dark', label: t('settings.theme.dark', 'Dark'), icon: 'dark_mode', hint: t('settings.theme.darkHint', 'Always the dark theme') },
    { value: 'system', label: t('settings.theme.system', 'System'), icon: 'contrast', hint: t('settings.theme.systemHint', 'Follow your device setting') },
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
            <Icon
                name={icon}
                className="w-5 h-5 mt-0.5 text-ember-deep"
                aria-hidden="true"
            />
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
                        <Icon name={option.icon} className="w-5 h-5" aria-hidden="true" />
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
    const { language, setLanguage, t } = useTranslation();
    const THEME_OPTIONS = buildThemeOptions(t);
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const [signingOut, setSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const accountEmail = user?.email ?? '';
    const confirmMatches =
        accountEmail.length > 0 && confirmEmail.trim().toLowerCase() === accountEmail.toLowerCase();

    const handleExport = async () => {
        setExporting(true);
        try {
            const filename = await exportAccount();
            toast({
                title: t('settings.exportReady', 'Export ready'),
                description: t('settings.exportReadyDesc', 'Saved as {filename}. Photo links inside it expire after one hour.').replace('{filename}', filename),
                variant: 'success',
            });
        } catch (error) {
            toast({
                title: t('settings.exportFailed', 'Export failed'),
                description:
                    error instanceof Error && error.message !== 'internal_error'
                        ? error.message
                        : t('settings.tryAgainMoment', 'Please try again in a moment.'),
                variant: 'error',
            });
        } finally {
            setExporting(false);
        }
    };

    const closeDelete = () => {
        setDeleteOpen(false);
        setConfirmEmail('');
        setDeleteError(null);
    };

    const handleDelete = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!confirmMatches || deleting) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteAccount(confirmEmail);
            toast({ title: t('settings.accountDeleted', 'Account deleted'), description: t('settings.dataRemoved', 'Your data has been removed.') });
            // The session's user no longer exists; sign-out only clears local
            // state now, and a server-side refusal is expected and harmless.
            try {
                await logout();
            } catch {
                /* already gone */
            }
        } catch (error) {
            const code = (error as { code?: string }).code;
            setDeleteError(
                code === 'confirm_mismatch'
                    ? t('settings.emailMismatch', 'That email does not match this account.')
                    : code === 'stripe_cancel_failed'
                      ? t('settings.stripeCancelFailed', 'We could not cancel your subscription, so nothing was deleted. Please try again or contact support.')
                      : t('settings.deleteAccountFailed', 'Could not delete your account. Nothing was changed — please try again.'),
            );
            setDeleting(false);
        }
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        setSignOutError(null);
        try {
            await logout();
        } catch (error) {
            setSignOutError(
                error instanceof Error ? error.message : t('settings.signOutFailed', 'Could not sign out. Please try again.'),
            );
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <div className="dashboard-module">
            <header>
                <p className="dashboard-eyebrow">{t('settings.eyebrow', 'Preferences')}</p>
                <h1 className="dashboard-display">{t('settings.heading', 'Settings.')}</h1>
                <p className="mt-4 max-w-2xl text-ink-soft">
                    {t('settings.headerDesc', 'Appearance, language, account and data — everything that changes how CVBase looks and behaves on this device.')}
                </p>
            </header>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Section
                    icon="palette"
                    title={t('settings.appearance', 'Appearance')}
                    description={t('settings.currentlyShowingTheme', 'Currently showing the {theme} theme.').replace('{theme}', resolvedTheme)}
                >
                    <div className="space-y-6">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                                {t('settings.theme', 'Theme')}
                            </p>
                            <SegmentedControl
                                label={t('settings.theme', 'Theme')}
                                value={mode}
                                options={THEME_OPTIONS}
                                onChange={setMode}
                            />
                        </div>

                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                                {t('settings.textSize', 'Text size')}
                            </p>
                            <div role="radiogroup" aria-label={t('settings.textSize', 'Text size')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                                {t('settings.textSizeDesc', 'Scales the whole interface. Your CV keeps its exact print dimensions.')}
                            </p>
                        </div>

                        <Toggle
                            id="setting-reduce-motion"
                            label={t('settings.reduceMotion', 'Reduce motion')}
                            description={t('settings.reduceMotionDesc', 'Turns off page transitions and decorative animation.')}
                            checked={reduceMotion}
                            onChange={setReduceMotion}
                        />
                    </div>
                </Section>

                <Section
                    icon="language"
                    title={t('label.selectLanguage', 'Language')}
                    description={t('settings.languageDesc', "Used for the builder's section labels and guidance.")}
                >
                    <div role="radiogroup" aria-label={t('label.selectLanguage', 'Language')} className="grid grid-cols-2 gap-2">
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
                    title={t('settings.account', 'Account')}
                    description={user?.email ?? t('settings.notSignedIn', 'You are not signed in on this device.')}
                >
                    <div className="space-y-3">
                        {onManageBilling && (
                            <button
                                type="button"
                                onClick={onManageBilling}
                                className="dashboard-secondary-button w-full justify-between"
                            >
                                {t('settings.planAndBilling', 'Plan & billing')}
                                <ChevronRight className="w-[18px] h-[18px]" aria-hidden="true" />
                            </button>
                        )}
                        {user && (
                            <button
                                type="button"
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="dashboard-secondary-button w-full justify-between disabled:opacity-60"
                            >
                                {signingOut ? t('settings.signingOut', 'Signing out…') : t('dash.signOut', 'Sign out')}
                                <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
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
                    title={t('settings.yourData', 'Your data')}
                    description={t('settings.yourDataDesc', 'Everything in your account is yours to take with you or remove.')}
                >
                    <div className="space-y-3">
                        {onOpenBackup && (
                            <button
                                type="button"
                                onClick={onOpenBackup}
                                className="dashboard-secondary-button w-full justify-between"
                            >
                                {t('settings.exportImportBackup', 'Export or import a backup')}
                                <Save className="w-[18px] h-[18px]" aria-hidden="true" />
                            </button>
                        )}
                        {user && (
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={exporting}
                                className="dashboard-secondary-button w-full justify-between disabled:opacity-60"
                            >
                                {exporting ? t('settings.preparingExport', 'Preparing your export…') : t('settings.exportMyData', 'Export my data')}
                                <Download className="w-[18px] h-[18px]" aria-hidden="true" />
                            </button>
                        )}
                        {onViewLegal && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onViewLegal('privacy')}
                                    className="dashboard-secondary-button justify-center"
                                >
                                    {t('settings.privacyPolicy', 'Privacy policy')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onViewLegal('terms')}
                                    className="dashboard-secondary-button justify-center"
                                >
                                    {t('settings.terms', 'Terms')}
                                </button>
                            </div>
                        )}
                        {user && (
                            <div className="mt-2 border-t border-ink/[0.12] pt-4">
                                {!deleteOpen ? (
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ink">{t('settings.deleteAccount', 'Delete account')}</p>
                                            <p className="mt-0.5 text-sm text-ink-soft">
                                                {t('settings.deleteAccountDesc', 'Removes your résumés, versions, tracked jobs, ATS reports and photos, and cancels any subscription. This cannot be undone.')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className="tap-target flex-none text-sm font-semibold text-danger underline-offset-4 hover:underline"
                                        >
                                            {t('settings.deleteEllipsis', 'Delete…')}
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleDelete} className="space-y-3" aria-busy={deleting}>
                                        <div>
                                            <label
                                                htmlFor="setting-delete-confirm"
                                                className="block text-sm font-semibold text-ink"
                                            >
                                                {t('settings.typeEmailToConfirm', 'Type your email to confirm')}
                                            </label>
                                            <p
                                                id="setting-delete-confirm-description"
                                                className="mt-0.5 text-sm text-ink-soft"
                                            >
                                                {t('settings.deletingPrefix', 'Deleting')}{' '}
                                                <span className="font-medium text-ink">{accountEmail}</span>{' '}
                                                {t('settings.deletingSuffix', 'removes everything in this account. This cannot be undone.')}
                                            </p>
                                        </div>
                                        <input
                                            id="setting-delete-confirm"
                                            type="email"
                                            autoComplete="off"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            value={confirmEmail}
                                            onChange={(event) => setConfirmEmail(event.target.value)}
                                            placeholder={accountEmail}
                                            aria-describedby="setting-delete-confirm-description"
                                            aria-invalid={deleteError ? true : undefined}
                                            disabled={deleting}
                                            className="w-full rounded-xl border border-ink/[0.12] bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/30 disabled:opacity-60"
                                        />
                                        {deleteError && (
                                            <p role="alert" className="text-sm font-medium text-danger">
                                                {deleteError}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="submit"
                                                disabled={!confirmMatches || deleting}
                                                className="tap-target rounded-xl border border-danger px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-true-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-danger"
                                            >
                                                {deleting ? t('settings.deletingEllipsis', 'Deleting…') : t('settings.deleteMyAccount', 'Delete my account')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={closeDelete}
                                                disabled={deleting}
                                                className="tap-target rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
                                            >
                                                {t('settings.keepMyAccount', 'Keep my account')}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                        <p className="pt-1 text-xs text-ink-faint">
                            {isNative ? t('settings.cvbaseForPlatform', 'CVBase for {platform}').replace('{platform}', Capacitor.getPlatform()) : t('settings.cvbaseForWeb', 'CVBase for web')}
                        </p>
                    </div>
                </Section>
            </div>
        </div>
    );
};

export default SettingsPanel;
