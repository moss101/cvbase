import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    LoaderCircle,
    Lock,
    Mail,
    ShieldCheck,
    User,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useFormValidation } from '../lib/useFormValidation';
import {
    compose,
    describedBy,
    email as emailRule,
    password as passwordRule,
    required,
} from '../lib/validation';
import FieldError from './common/FieldError';

/**
 * Sign in / sign up for the packaged apps.
 *
 * Reached from a call to action on the marketing screen, never as the launch
 * screen — someone who has just installed the app needs to know what it does
 * before being asked for an account. After authenticating they continue to
 * whatever they originally tapped (see `requireAuth` in App.tsx). The web app
 * has no gate at all.
 *
 * Layout is a single column on the slate base with hairline borders — no cards
 * stacked on cards, and no drop shadows. The one emerald element on screen is
 * the submit button, so the primary action is never ambiguous.
 */

type Mode = 'signin' | 'signup';

const Field: React.FC<{
    id: string;
    label: string;
    icon: React.ReactNode;
    error: string | null;
    children: React.ReactNode;
}> = ({ id, label, icon, error, children }) => (
    <div>
        <label
            htmlFor={id}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
            {label}
        </label>
        <div className="relative">
            <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
            >
                {icon}
            </span>
            {children}
        </div>
        <FieldError id={id} message={error} />
    </div>
);

const inputClass = (hasError: boolean) =>
    [
        'w-full rounded-xl border bg-white py-3 pl-11 pr-3 text-[16px] text-slate-900',
        'transition-colors duration-200 outline-none',
        // 16px keeps iOS from zooming the viewport on focus.
        hasError
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/25'
            : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/25',
    ].join(' ');

const AuthGate: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, loading, error, clearError } =
        useAuth();

    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [verificationSent, setVerificationSent] = useState(false);

    const isSignUp = mode === 'signup';

    const values = useMemo(
        () => ({ email, password, confirmPassword, firstName, lastName }),
        [email, password, confirmPassword, firstName, lastName],
    );

    // Strength rules apply to sign-up only; existing accounts may predate them.
    const validators = useMemo(
        () => ({
            email: compose(required('Email address'), emailRule),
            password: isSignUp ? compose(required('Password'), passwordRule) : required('Password'),
            confirmPassword: isSignUp
                ? (value: string) =>
                      value.length === 0
                          ? 'Please confirm your password.'
                          : value !== password
                            ? 'Passwords do not match.'
                            : null
                : undefined,
            firstName: isSignUp ? required('First name') : undefined,
            lastName: isSignUp ? required('Last name') : undefined,
        }),
        [isSignUp, password],
    );

    const validation = useFormValidation(values, validators);

    const switchMode = (next: Mode) => {
        setMode(next);
        setNotice(null);
        clearError();
        validation.reset();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setNotice(null);
        clearError();
        if (!validation.submit()) return;

        try {
            if (isSignUp) {
                const { needsEmailVerification } = await signUpWithEmail(
                    email,
                    password,
                    firstName,
                    lastName,
                );
                if (needsEmailVerification) setVerificationSent(true);
            } else {
                await signInWithEmail(email, password);
            }
        } catch {
            // Surfaced through the auth context's `error`.
        }
    };

    const handleReset = async () => {
        if (!email.trim()) {
            setNotice('Enter your email address above first.');
            return;
        }
        clearError();
        try {
            await resetPassword(email);
            setNotice('Password reset link sent — check your email.');
        } catch {
            /* surfaced via context error */
        }
    };

    if (verificationSent) {
        return (
            <main className="flex min-h-[100dvh] flex-col justify-center bg-light px-6 pt-safe pb-safe">
                <div className="mx-auto w-full max-w-sm text-center">
                    <span className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-white text-primary">
                        <Mail size={24} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h1 className="font-display text-4xl font-medium tracking-[-0.03em] text-dark">
                        Check your email.
                    </h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                        We sent a confirmation link to <span className="text-dark">{email}</span>.
                        Open it to finish setting up your account.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setVerificationSent(false);
                            switchMode('signin');
                        }}
                        className="mt-8 text-sm font-semibold text-primary underline underline-offset-4"
                    >
                        Back to sign in
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[100dvh] overflow-y-auto bg-light">
            <div className="mx-auto grid min-h-[100dvh] w-full max-w-5xl lg:grid-cols-2">
                {/**
                 * Context panel. Appears once there is width to spare, so the form
                 * is never a lone column stranded in an empty field and the
                 * reason to sign up stays visible next to the ask.
                 */}
                <aside className="hidden flex-col justify-between bg-dark p-10 text-white lg:flex">
                    <span className="font-display text-[1.6rem] font-semibold leading-none tracking-tight">
                        CVbase<span className="text-primary">.</span>
                    </span>
                    <div>
                        <p className="font-display text-[2.4rem] font-medium leading-[1.1] tracking-[-0.035em] text-balance">
                            Recruiters spend seven seconds on a CV.
                        </p>
                        <ul className="mt-8 space-y-3.5 text-[15px] text-slate-300">
                            {[
                                '75+ layouts, every one ATS-tested',
                                'An AI editor that sharpens every line',
                                'Pixel-exact PDF and DOCX export',
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2.5">
                                    <ShieldCheck
                                        size={17}
                                        strokeWidth={1.75}
                                        className="mt-0.5 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-[13px] text-slate-400">Free to start. No card required.</p>
                </aside>

                {/* `my-auto` centres the form when there is room, and lets it scroll
                    when a landscape phone or the keyboard takes that room away. */}
                <div className="flex w-full flex-col px-6 py-10 pt-safe pb-safe sm:px-10 lg:px-12">
                  <div className="mx-auto my-auto w-full max-w-sm">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="tap-target -ml-3 mb-2 flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium text-slate-500 transition-colors hover:text-dark"
                    >
                        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
                        Back
                    </button>
                )}
                <header className="mb-8">
                    <span className="font-display text-[1.6rem] font-semibold leading-none tracking-tight text-dark">
                        CVbase<span className="text-primary">.</span>
                    </span>
                    <h1 className="mt-7 font-display text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] text-dark text-balance">
                        {isSignUp ? 'Start your CV.' : 'Welcome back.'}
                    </h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                        {isSignUp
                            ? 'Create an account to build, tailor and export CVs that get read.'
                            : 'Sign in to pick up where you left off.'}
                    </p>
                </header>

                {(error || notice) && (
                    <div
                        role="alert"
                        className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                            error
                                ? 'border-danger/40 bg-danger/10 text-danger'
                                : 'border-primary/40 bg-primary/10 text-primary'
                        }`}
                    >
                        {error || notice}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {isSignUp && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                id="gate-first-name"
                                label="First name"
                                icon={<User size={17} strokeWidth={1.75} />}
                                error={validation.errorFor('firstName')}
                            >
                                <input
                                    id="gate-first-name"
                                    type="text"
                                    autoComplete="given-name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    onBlur={() => validation.onBlur('firstName')}
                                    placeholder="Jane"
                                    {...describedBy('gate-first-name', !!validation.errorFor('firstName'))}
                                    className={inputClass(!!validation.errorFor('firstName'))}
                                />
                            </Field>
                            <Field
                                id="gate-last-name"
                                label="Last name"
                                icon={<User size={17} strokeWidth={1.75} />}
                                error={validation.errorFor('lastName')}
                            >
                                <input
                                    id="gate-last-name"
                                    type="text"
                                    autoComplete="family-name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    onBlur={() => validation.onBlur('lastName')}
                                    placeholder="Doe"
                                    {...describedBy('gate-last-name', !!validation.errorFor('lastName'))}
                                    className={inputClass(!!validation.errorFor('lastName'))}
                                />
                            </Field>
                        </div>
                    )}

                    <Field
                        id="gate-email"
                        label="Email"
                        icon={<Mail size={17} strokeWidth={1.75} />}
                        error={validation.errorFor('email')}
                    >
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
                            placeholder="you@example.com"
                            {...describedBy('gate-email', !!validation.errorFor('email'))}
                            className={inputClass(!!validation.errorFor('email'))}
                        />
                    </Field>

                    <Field
                        id="gate-password"
                        label="Password"
                        icon={<Lock size={17} strokeWidth={1.75} />}
                        error={validation.errorFor('password')}
                    >
                        <input
                            id="gate-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => validation.onBlur('password')}
                            placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
                            {...describedBy('gate-password', !!validation.errorFor('password'))}
                            className={`${inputClass(!!validation.errorFor('password'))} pr-12`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:text-slate-600"
                        >
                            {showPassword ? (
                                <EyeOff size={17} strokeWidth={1.75} />
                            ) : (
                                <Eye size={17} strokeWidth={1.75} />
                            )}
                        </button>
                    </Field>

                    {isSignUp && (
                        <Field
                            id="gate-confirm"
                            label="Confirm password"
                            icon={<Lock size={17} strokeWidth={1.75} />}
                            error={validation.errorFor('confirmPassword')}
                        >
                            <input
                                id="gate-confirm"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onBlur={() => validation.onBlur('confirmPassword')}
                                placeholder="Repeat your password"
                                {...describedBy('gate-confirm', !!validation.errorFor('confirmPassword'))}
                                className={inputClass(!!validation.errorFor('confirmPassword'))}
                            />
                        </Field>
                    )}

                    {!isSignUp && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="text-[13px] font-medium text-slate-500 underline underline-offset-4 transition-colors hover:text-dark"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-200 ease-out active:scale-[0.985] disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                                Please wait…
                            </>
                        ) : (
                            <>
                                {isSignUp ? 'Create account' : 'Sign in'}
                                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                            </>
                        )}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium text-slate-400">or</span>
                    <span className="h-px flex-1 bg-border" />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        clearError();
                        void signInWithGoogle();
                    }}
                    className="tap-target flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-5 py-3.5 text-[15px] font-semibold text-dark transition-colors duration-200 hover:border-slate-300"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z" />
                    </svg>
                    Continue with Google
                </button>

                <p className="mt-8 text-center text-[14px] text-slate-500">
                    {isSignUp ? 'Already have an account?' : 'New to CVbase?'}{' '}
                    <button
                        type="button"
                        onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
                        className="font-semibold text-primary underline underline-offset-4"
                    >
                        {isSignUp ? 'Sign in' : 'Create an account'}
                    </button>
                </p>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-slate-400">
                    <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                    Your CV data stays private to your account.
                </p>
                  </div>
                </div>
            </div>
        </main>
    );
};

export default AuthGate;
