import React, { useState } from 'react';
import { useAuth } from './AuthProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading, error, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    // Validations
    if (!email || !password) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (isSignUp) {
      if (!firstName || !lastName) {
        setFormError('Please enter your first and last name.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters.');
        return;
      }
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, firstName, lastName);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      // Handled by context, but we can capture specific errors if needed
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    clearError();
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      // Handled by context
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all animate-fade-in" id="auth-modal-overlay">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative"
        id="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors"
          id="close-auth-modal"
          title="Close Modal"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="p-8 md:p-10 flex-1">
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl items-center justify-center shadow-lg shadow-primary/20 mb-4">
              <span className="material-symbols-outlined text-white text-2xl">lock</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {isSignUp ? 'Create your Account' : 'Welcome to CVBase'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isSignUp ? 'Join now to save your documents and profile' : 'Sign in to access your saved resume profiles'}
            </p>
          </div>

          {(error || formError) && (
            <div className="p-4 mb-6 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-800 text-xs font-medium leading-relaxed" id="auth-error-banner">
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-rose-500 text-sm shrink-0">error</span>
                <span>{formError || error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50"
                required
              />
              {!isSignUp && (
                <div className="flex justify-end mt-1">
                  <button 
                    type="button" 
                    onClick={() => alert("Password reset is managed in your Firebase console. Simply enable the provider and trigger reset from your login sequence.")}
                    className="text-[11px] text-slate-400 hover:text-primary font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50"
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-2"
              id="submit-auth-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-100 z-0"></span>
            <span className="bg-white px-3 text-slate-400 font-bold text-xs uppercase tracking-wider relative z-10">or continue with</span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-semibold shadow-sm transition-all flex items-center justify-center gap-3"
            id="google-signin-btn"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22-.19-.6z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"/>
            </svg>
            <span>Google Workspace / Gmail</span>
          </button>

          <p className="text-center text-xs text-slate-500 mt-6 font-medium">
            {isSignUp ? 'Already have an account?' : 'Need a CV documents vault?'}
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setFormError(null); }}
              className="text-primary hover:underline font-bold ml-1"
              id="toggle-auth-mode-btn"
            >
              {isSignUp ? 'Sign In instead' : 'Sign Up for Free'}
            </button>
          </p>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-slate-400 text-sm mt-0.5 shrink-0">info</span>
          <p className="text-[10px] text-slate-500 leading-normal font-medium">
            <strong>Note:</strong> If authenticating via Email/Password for the first time, navigate to your Firebase Console under Authentication &gt; Sign-In Method to activate the Email/Password Auth Provider.
          </p>
        </div>
      </div>
    </div>
  );
};
