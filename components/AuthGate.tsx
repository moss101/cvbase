import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useFormValidation } from '../lib/useFormValidation';
import { compose, describedBy, email as emailRule, required } from '../lib/validation';
import FieldError from './common/FieldError';
import { useTranslation } from '../services/translationService';

/**
 * Sign in for the packaged apps.
 *
 * Reached from a call to action on the marketing screen, never as the launch
 * screen — someone who has just installed the app needs to know what it does
 * before being asked for an account. After authenticating they continue to
 * whatever they originally tapped (see `requireAuth` in App.tsx). The web app
 * uses the modal instead.
 *
 * Passwordless: an emailed 6-digit code, the magic link in that same email, or
 * Google. There is no sign-in/sign-up distinction to draw — the email either
 * matches an account or creates one.
 *
 * Layout is a single column on the slate base with hairline borders — no cards
 * stacked on cards, and no drop shadows. The one emerald element on screen is
 * the submit button, so the primary action is never ambiguous.
 */

const fieldClass = (hasError: boolean) =>
    [
        'w-full rounded-xl border bg-white px-4 py-3 text-[16px] text-dark',
        'transition-colors duration-200 outline-none',
        // 16px keeps iOS from zooming the viewport on focus.
        hasError
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/25'
            : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/25',
    ].join(' ');

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500';

const GoogleMark: React.FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
);

const AuthGate: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { sendEmailCode, verifyEmailCode, signInWithGoogle, loading, error, clearError } = useAuth();
    const { t } = useTranslation();

    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const codeRef = useRef<HTMLInputElement>(null);

    const values = useMemo(() => ({ email, code }), [email, code]);
    const validators = useMemo(
        () => ({
            email: compose(required(t('auth.emailAddress', 'Email address')), emailRule),
            code:
                step === 'code'
                    ? (value: string) =>
                          /^\d{6}$/.test(value.trim())
                              ? null
                              : t('auth.enterSixDigitCode', 'Enter the 6-digit code from your email.')
                    : undefined,
        }),
        [step, t],
    );
    const validation = useFormValidation(values, validators);

    useEffect(() => {
        if (step === 'code') codeRef.current?.focus();
    }, [step]);

    const working = busy || loading;

    const submitEmail = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!validation.submit()) return;
        setBusy(true);
        setNotice(null);
        clearError();
        try {
            await sendEmailCode(email);
            setStep('code');
            validation.reset();
        } catch {
            /* surfaced via the context error */
        } finally {
            setBusy(false);
        }
    };

    const submitCode = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!validation.submit()) return;
        setBusy(true);
        clearError();
        try {
            await verifyEmailCode(email, code);
            // App.tsx resumes whatever the user originally tapped.
        } catch {
            /* surfaced via the context error */
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setBusy(true);
        clearError();
        try {
            await sendEmailCode(email);
            setNotice(t('auth.sentAnotherCode', 'We sent another code.'));
        } catch {
            /* surfaced via the context error */
        } finally {
            setBusy(false);
        }
    };

    const goBack = () => {
        if (step === 'code') {
            setStep('email');
            setCode('');
            clearError();
            return;
        }
        onBack?.();
    };

    return (
        <div className="min-h-screen bg-light px-5 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
            <div className="mx-auto w-full max-w-md">
                <button
                    type="button"
                    onClick={goBack}
                    className="tap-target -ml-2 flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-dark"
                >
                    <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
                    {step === 'code' ? t('auth.useDifferentEmail', 'Use a different email') : t('btn.back', 'Back')}
                </button>

                {step === 'email' ? (
                    <>
                        <h1 className="mt-6 font-display text-[2.5rem] font-medium leading-[1.05] tracking-tight text-dark">
                            {t('auth.signIn', 'Sign in')}
                        </h1>
                        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                            {t('auth.emailCodeNoPasswordLong', "We'll email you a code. No password to create or remember.")}
                        </p>

                        <button
                            type="button"
                            onClick={() => void signInWithGoogle()}
                            disabled={working}
                            className="tap-target mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white py-3.5 text-[15px] font-semibold text-dark transition-colors disabled:opacity-60"
                        >
                            <GoogleMark />
                            {t('auth.continueWithGoogle', 'Continue with Google')}
                        </button>

                        <div className="my-6 flex items-center gap-3">
                            <span className="h-px flex-1 bg-border" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {t('auth.or', 'or')}
                            </span>
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <form onSubmit={submitEmail} noValidate>
                            <label htmlFor="gate-email" className={labelClass}>
                                {t('auth.emailAddress', 'Email address')}
                            </label>
                            <input
                                id="gate-email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => validation.onBlur('email')}
                                placeholder="jane.doe@example.com"
                                {...describedBy('gate-email', !!validation.errorFor('email'))}
                                className={fieldClass(!!validation.errorFor('email'))}
                            />
                            <FieldError id="gate-email" message={validation.errorFor('email')} />

                            {error && (
                                <p role="alert" className="mt-3 text-sm font-medium text-danger">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={working}
                                className="tap-target mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-colors disabled:opacity-60"
                            >
                                {working ? (
                                    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                                ) : (
                                    <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
                                )}
                                {t('auth.emailMeACode', 'Email me a code')}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <h1 className="mt-6 font-display text-[2.5rem] font-medium leading-[1.05] tracking-tight text-dark">
                            {t('auth.checkYourEmail', 'Check your email')}
                        </h1>
                        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                            {t('auth.sentCodeTo', 'We sent a 6-digit code to')}{' '}
                            <span className="font-semibold text-dark">{email}</span>. {t('auth.magicLinkAlt', "That email also has a sign-in link, if you'd rather just tap it.")}
                        </p>

                        <form onSubmit={submitCode} noValidate className="mt-8">
                            <label htmlFor="gate-code" className={labelClass}>
                                {t('auth.sixDigitCode', '6-digit code')}
                            </label>
                            <input
                                ref={codeRef}
                                id="gate-code"
                                type="text"
                                // Numeric keypad, and one-time-code lets the OS offer
                                // the code straight from the notification.
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                onBlur={() => validation.onBlur('code')}
                                placeholder="123456"
                                {...describedBy('gate-code', !!validation.errorFor('code'))}
                                className={`${fieldClass(!!validation.errorFor('code'))} text-center font-label text-2xl tracking-[0.4em]`}
                            />
                            <FieldError id="gate-code" message={validation.errorFor('code')} />

                            {notice && !error && (
                                <p className="mt-3 text-sm font-medium text-primary">{notice}</p>
                            )}
                            {error && (
                                <p role="alert" className="mt-3 text-sm font-medium text-danger">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={working}
                                className="tap-target mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-colors disabled:opacity-60"
                            >
                                {working && (
                                    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                                )}
                                {t('auth.signIn', 'Sign in')}
                            </button>

                            <button
                                type="button"
                                onClick={() => void resend()}
                                disabled={working}
                                className="tap-target mt-4 w-full text-sm font-semibold text-slate-500 transition-colors hover:text-primary disabled:opacity-60"
                            >
                                {t('auth.resendCode', 'Resend the code')}
                            </button>
                        </form>
                    </>
                )}

                <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
                    <ShieldCheck
                        size={14}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                    />
                    {t('auth.dataStaysOnDevice', 'Your CV data stays on your device until you choose to sync it.')}
                </p>
            </div>
        </div>
    );
};

export default AuthGate;
