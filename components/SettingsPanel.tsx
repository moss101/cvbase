import React, { useId, useState } from 'react';
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
    /**
     * Rendered inside the Career OS Settings space, which already carries the
     * page heading: the panel drops its own header and takes the Career OS
     * presentation (DESIGN.md) — one hairline panel divided by rules, tokens
     * instead of the landing palette. The legacy dashboard omits it.
     */
    embedded?: boolean;
}

/** Career OS classes used only when the panel is embedded. */
const EMBEDDED_FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel';
/** A radio tile: the active choice is an emerald tint, never a filled button. */
const embeddedChoice = (active: boolean) =>
    `transition-colors ${EMBEDDED_FOCUS} ${
        active
            ? 'border-action-primary bg-action-primary/10 text-action-primary'
            : 'border-border-strong bg-surface-panel text-content-secondary hover:bg-surface-canvas hover:text-content-primary'
    }`;
/** Buttons follow primitives/Button; callers add `justify-center` or `justify-between`. */
const EMBEDDED_BUTTON_BASE =
    `tap-target inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${EMBEDDED_FOCUS}`;
const EMBEDDED_SECONDARY = `${EMBEDDED_BUTTON_BASE} border border-border-strong bg-surface-panel text-content-primary hover:bg-surface-canvas`;
const EMBEDDED_QUIET = `${EMBEDDED_BUTTON_BASE} text-content-secondary hover:bg-surface-canvas hover:text-content-primary`;
const EMBEDDED_DANGER = `${EMBEDDED_BUTTON_BASE} border border-status-danger/40 bg-surface-panel text-status-danger hover:bg-status-danger/10`;
const EMBEDDED_LABEL = 'mb-2 text-[13px] font-medium text-content-secondary';

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
    embedded?: boolean;
}> = ({ title, description, icon, children, embedded = false }) => {
    const headingId = useId();
    if (embedded) {
        // A region of the one settings panel: heading and note on the left from
        // 1024px, the controls on the right; regions are divided by hairlines.
        return (
            <section aria-labelledby={headingId} className="px-6 py-6 sm:px-7 sm:py-7 lg:grid lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-10">
                <header className="mb-5 min-w-0 lg:mb-0">
                    <h3 id={headingId} className="text-[15px] font-semibold text-content-primary">{title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-content-secondary [overflow-wrap:anywhere]">{description}</p>
                </header>
                <div className="min-w-0">{children}</div>
            </section>
        );
    }
    return (
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
};

/** Accessible segmented control — a radiogroup, not a row of buttons. */
const SegmentedControl = <T extends string>({
    label,
    value,
    options,
    onChange,
    embedded = false,
}: {
    label: string;
    value: T;
    options: { value: T; label: string; icon?: string; hint?: string }[];
    onChange: (value: T) => void;
    embedded?: boolean;
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
                    className={embedded ? `tap-target flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-[13px] font-semibold ${embeddedChoice(active)}` : `tap-target flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${
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
    embedded?: boolean;
}> = ({ id, label, description, checked, onChange, embedded = false }) => embedded ? (
    <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
            <label htmlFor={id} className="block text-sm font-medium text-content-primary">
                {label}
            </label>
            <p id={`${id}-description`} className="mt-0.5 text-[13px] leading-relaxed text-content-secondary">
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
            className={`relative mt-0.5 h-7 w-12 flex-none rounded-full border transition-colors ${EMBEDDED_FOCUS} ${
                checked ? 'border-action-primary bg-action-primary' : 'border-border-strong bg-border-strong/30'
            }`}
        >
            {/* `left-0`: without it the knob takes the button's centred static position. */}
            <span
                className={`absolute left-0 top-0.5 h-[22px] w-[22px] rounded-full bg-true-white shadow-sm transition-transform ${
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
            />
        </button>
    </div>
) : (
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
            {/* `left-0`: without it the knob takes the button's centred static position and looks "on" when off. */}
            <span
                className={`absolute left-0 top-0.5 h-[22px] w-[22px] rounded-full bg-true-white shadow-sm transition-transform ${
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
    embedded = false,
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
    const preferencesHeadingId = useId();
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

    const Root = embedded ? 'section' : 'div';

    return (
        <Root className={embedded ? 'min-w-0' : 'dashboard-module'} aria-labelledby={embedded ? preferencesHeadingId : undefined}>
            {embedded ? (
                // The Settings space already carries the page's h1 and description.
                <h2 id={preferencesHeadingId} className="text-[15px] font-semibold text-content-primary">
                    {t('settings.eyebrow', 'Preferences')}
                </h2>
            ) : (
            <header>
                <p className="dashboard-eyebrow">{t('settings.eyebrow', 'Preferences')}</p>
                <h1 className="dashboard-display">{t('settings.heading', 'Settings.')}</h1>
                <p className="mt-4 max-w-2xl text-ink-soft">
                    {t('settings.headerDesc', 'Appearance, language, account and data — everything that changes how CVBase looks and behaves on this device.')}
                </p>
            </header>
            )}

            <div className={embedded ? 'mt-4 divide-y divide-border-default rounded-2xl border border-border-default bg-surface-panel' : 'grid grid-cols-1 gap-5 xl:grid-cols-2'}>
                <Section
                    embedded={embedded}
                    icon="palette"
                    title={t('settings.appearance', 'Appearance')}
                    description={t('settings.currentlyShowingTheme', 'Currently showing the {theme} theme.').replace('{theme}', resolvedTheme)}
                >
                    <div className="space-y-6">
                        <div>
                            <p className={embedded ? EMBEDDED_LABEL : 'mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint'}>
                                {t('settings.theme', 'Theme')}
                            </p>
                            <SegmentedControl
                                embedded={embedded}
                                label={t('settings.theme', 'Theme')}
                                value={mode}
                                options={THEME_OPTIONS}
                                onChange={setMode}
                            />
                        </div>

                        <div>
                            <p className={embedded ? EMBEDDED_LABEL : 'mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint'}>
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
                                            className={embedded ? `tap-target rounded-xl border px-2 py-3 text-[13px] font-semibold ${embeddedChoice(active)}` : `tap-target rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${
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
                            <p className={embedded ? 'mt-2 text-[12.5px] text-content-muted' : 'mt-2 text-xs text-ink-faint'}>
                                {t('settings.textSizeDesc', 'Scales the whole interface. Your CV keeps its exact print dimensions.')}
                            </p>
                        </div>

                        <Toggle
                            embedded={embedded}
                            id="setting-reduce-motion"
                            label={t('settings.reduceMotion', 'Reduce motion')}
                            description={t('settings.reduceMotionDesc', 'Turns off page transitions and decorative animation.')}
                            checked={reduceMotion}
                            onChange={setReduceMotion}
                        />
                    </div>
                </Section>

                <Section
                    embedded={embedded}
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
                                    className={embedded ? `tap-target flex items-center rounded-xl border px-3 py-3 text-sm font-semibold ${embeddedChoice(active)}` : `tap-target flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                                        active
                                            ? 'border-ember bg-ember-tint text-ember-deep'
                                            : 'border-ink/[0.12] text-ink-soft hover:border-ink/25 hover:bg-ink/[0.04]'
                                    }`}
                                >
                                    {!embedded && <span aria-hidden="true">{option.flag}</span>}
                                    {option.name}
                                </button>
                            );
                        })}
                    </div>
                </Section>

                <Section
                    embedded={embedded}
                    icon="account_circle"
                    title={t('settings.account', 'Account')}
                    description={user?.email ?? t('settings.notSignedIn', 'You are not signed in on this device.')}
                >
                    <div className="space-y-3">
                        {onManageBilling && (
                            <button
                                type="button"
                                onClick={onManageBilling}
                                className={embedded ? `${EMBEDDED_SECONDARY} w-full justify-between` : 'dashboard-secondary-button w-full justify-between'}
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
                                className={embedded ? `${EMBEDDED_SECONDARY} w-full justify-between` : 'dashboard-secondary-button w-full justify-between disabled:opacity-60'}
                            >
                                {signingOut ? t('settings.signingOut', 'Signing out…') : t('dash.signOut', 'Sign out')}
                                <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
                            </button>
                        )}
                        {signOutError && (
                            <p role="alert" className={embedded ? 'text-[13px] font-medium text-status-danger' : 'text-sm font-medium text-danger'}>
                                {signOutError}
                            </p>
                        )}
                    </div>
                </Section>

                <Section
                    embedded={embedded}
                    icon="database"
                    title={t('settings.yourData', 'Your data')}
                    description={t('settings.yourDataDesc', 'Everything in your account is yours to take with you or remove.')}
                >
                    <div className="space-y-3">
                        {onOpenBackup && (
                            <button
                                type="button"
                                onClick={onOpenBackup}
                                className={embedded ? `${EMBEDDED_SECONDARY} w-full justify-between` : 'dashboard-secondary-button w-full justify-between'}
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
                                className={embedded ? `${EMBEDDED_SECONDARY} w-full justify-between` : 'dashboard-secondary-button w-full justify-between disabled:opacity-60'}
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
                                    className={embedded ? `${EMBEDDED_QUIET} justify-center` : 'dashboard-secondary-button justify-center'}
                                >
                                    {t('settings.privacyPolicy', 'Privacy policy')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onViewLegal('terms')}
                                    className={embedded ? `${EMBEDDED_QUIET} justify-center` : 'dashboard-secondary-button justify-center'}
                                >
                                    {t('settings.terms', 'Terms')}
                                </button>
                            </div>
                        )}
                        {user && (
                            <div className={embedded ? 'mt-2 border-t border-border-default pt-5' : 'mt-2 border-t border-ink/[0.12] pt-4'}>
                                {!deleteOpen ? (
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className={embedded ? 'text-sm font-medium text-content-primary' : 'text-sm font-semibold text-ink'}>{t('settings.deleteAccount', 'Delete account')}</p>
                                            <p className={embedded ? 'mt-0.5 text-[13px] leading-relaxed text-content-secondary' : 'mt-0.5 text-sm text-ink-soft'}>
                                                {t('settings.deleteAccountDesc', 'Removes your résumés, versions, tracked jobs, ATS reports and photos, and cancels any subscription. This cannot be undone.')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className={embedded ? `${EMBEDDED_DANGER} flex-none justify-center` : 'tap-target flex-none text-sm font-semibold text-danger underline-offset-4 hover:underline'}
                                        >
                                            {t('settings.deleteEllipsis', 'Delete…')}
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleDelete} className="space-y-3" aria-busy={deleting}>
                                        <div>
                                            <label
                                                htmlFor="setting-delete-confirm"
                                                className={embedded ? 'block text-sm font-medium text-content-primary' : 'block text-sm font-semibold text-ink'}
                                            >
                                                {t('settings.typeEmailToConfirm', 'Type your email to confirm')}
                                            </label>
                                            <p
                                                id="setting-delete-confirm-description"
                                                className={embedded ? 'mt-0.5 text-[13px] leading-relaxed text-content-secondary' : 'mt-0.5 text-sm text-ink-soft'}
                                            >
                                                {t('settings.deletingPrefix', 'Deleting')}{' '}
                                                <span className={embedded ? 'font-medium text-content-primary' : 'font-medium text-ink'}>{accountEmail}</span>{' '}
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
                                            className={embedded
                                                ? `w-full rounded-xl border bg-surface-panel px-3.5 py-2.5 text-[15px] text-content-primary placeholder:text-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60 ${deleteError ? 'border-status-danger' : 'border-border-strong'}`
                                                : 'w-full rounded-xl border border-ink/[0.12] bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/30 disabled:opacity-60'}
                                        />
                                        {deleteError && (
                                            <p role="alert" className={embedded ? 'text-[13px] font-medium text-status-danger' : 'text-sm font-medium text-danger'}>
                                                {deleteError}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="submit"
                                                disabled={!confirmMatches || deleting}
                                                className={embedded ? `${EMBEDDED_DANGER} justify-center` : 'tap-target rounded-xl border border-danger px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-true-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-danger'}
                                            >
                                                {deleting ? t('settings.deletingEllipsis', 'Deleting…') : t('settings.deleteMyAccount', 'Delete my account')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={closeDelete}
                                                disabled={deleting}
                                                className={embedded ? `${EMBEDDED_QUIET} justify-center` : 'tap-target rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-60'}
                                            >
                                                {t('settings.keepMyAccount', 'Keep my account')}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                        <p className={embedded ? 'pt-1 text-[12.5px] text-content-muted' : 'pt-1 text-xs text-ink-faint'}>
                            {isNative ? t('settings.cvbaseForPlatform', 'CVBase for {platform}').replace('{platform}', Capacitor.getPlatform()) : t('settings.cvbaseForWeb', 'CVBase for web')}
                        </p>
                    </div>
                </Section>
            </div>
        </Root>
    );
};

export default SettingsPanel;
