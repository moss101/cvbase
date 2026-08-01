import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Mail, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useFormValidation } from '../lib/useFormValidation';
import { compose, describedBy, email as emailRule, required } from '../lib/validation';
import FieldError from './common/FieldError';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Passwordless sign-in.
 *
 * Two steps: enter an email, then enter the 6-digit code from it. The same
 * email also contains a magic link, so a user who opens their mail on another
 * device can tap that instead and never come back to this screen — which is why
 * the code step says so rather than looking like the only way through.
 *
 * There is no password field, no sign-up/sign-in toggle and no "forgot
 * password": the email either matches an account or creates one, so the
 * distinction has nothing to hang off.
 */

const inputClass =
  'w-full px-4 py-3 rounded-xl border text-[15px] transition-all bg-slate-50 outline-none';

const GoogleMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { sendEmailCode, verifyEmailCode, signInWithGoogle, loading, error, clearError } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const values = useMemo(() => ({ email, code }), [email, code]);
  const validators = useMemo(
    () => ({
      email: compose(required('Email address'), emailRule),
      code: step === 'code'
        ? (value: string) =>
            /^\d{6}$/.test(value.trim()) ? null : 'Enter the 6-digit code from your email.'
        : undefined,
    }),
    [step],
  );
  const validation = useFormValidation(values, validators);

  // Moving to the code step should put the caret where the user must type.
  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  if (!isOpen) return null;

  const reset = () => {
    setStep('email');
    setCode('');
    setResentAt(null);
    validation.reset();
    clearError();
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validation.submit()) return;
    setBusy(true);
    clearError();
    try {
      await sendEmailCode(email);
      setStep('code');
      validation.reset();
    } catch {
      /* surfaced via context error */
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
      onClose();
      reset();
    } catch {
      /* surfaced via context error */
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    clearError();
    try {
      await sendEmailCode(email);
      setResentAt(Date.now());
    } catch {
      /* surfaced via context error */
    } finally {
      setBusy(false);
    }
  };

  const working = busy || loading;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl pt-[calc(1.75rem+env(safe-area-inset-top,0px))]"
      >
        <button
          type="button"
          onClick={() => { onClose(); reset(); }}
          aria-label="Close"
          className="tap-target absolute right-3 top-3 grid place-items-center rounded-full text-slate-400 transition-colors hover:text-dark"
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        {step === 'email' ? (
          <>
            <h2 id="auth-title" className="font-display text-3xl font-medium tracking-tight text-dark">
              Sign in
            </h2>
            <p className="mt-2 text-[15px] text-slate-500">
              We’ll email you a code — no password to remember.
            </p>

            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={working}
              className="tap-target mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white py-3 text-[15px] font-semibold text-dark transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submitEmail} noValidate>
              <label htmlFor="auth-email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Email address
              </label>
              <input
                id="auth-email"
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
                {...describedBy('auth-email', !!validation.errorFor('email'))}
                className={`${inputClass} ${
                  validation.errorFor('email')
                    ? 'border-danger focus:ring-2 focus:ring-danger/20'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              <FieldError id="auth-email" message={validation.errorFor('email')} />

              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={working}
                className="tap-target mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white transition-colors disabled:opacity-60"
              >
                {working ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}
                Email me a code
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); clearError(); }}
              className="tap-target -ml-1 mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-dark"
            >
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Use a different email
            </button>

            <h2 id="auth-title" className="font-display text-3xl font-medium tracking-tight text-dark">
              Check your email
            </h2>
            <p className="mt-2 text-[15px] text-slate-500">
              We sent a 6-digit code to <span className="font-semibold text-dark">{email}</span>.
              That email also has a sign-in link, if you’d rather just tap it.
            </p>

            <form onSubmit={submitCode} noValidate className="mt-6">
              <label htmlFor="auth-code" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                6-digit code
              </label>
              <input
                ref={codeRef}
                id="auth-code"
                type="text"
                // Numeric keypad on mobile; one-time-code enables OS autofill
                // so the code can be tapped straight from the notification.
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onBlur={() => validation.onBlur('code')}
                placeholder="123456"
                {...describedBy('auth-code', !!validation.errorFor('code'))}
                className={`${inputClass} text-center font-label text-2xl tracking-[0.4em] ${
                  validation.errorFor('code')
                    ? 'border-danger focus:ring-2 focus:ring-danger/20'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              <FieldError id="auth-code" message={validation.errorFor('code')} />

              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={working}
                className="tap-target mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white transition-colors disabled:opacity-60"
              >
                {working && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
                Sign in
              </button>

              <button
                type="button"
                onClick={() => void resend()}
                disabled={working}
                className="tap-target mt-3 w-full text-sm font-semibold text-slate-500 transition-colors hover:text-primary disabled:opacity-60"
              >
                {resentAt ? 'Code sent again' : 'Resend the code'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
