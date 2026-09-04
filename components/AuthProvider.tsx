import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabase';
import { rowToProfile, profileToRow, type UserProfile } from '../services/profileMapping';
import {
  listenForAuthDeepLinks,
  sendEmailAuth,
  signInWithGoogle as startGoogleSignIn,
  verifyEmailCode as verifyCode,
} from '../services/authFlow';
import { isProfileComplete, MISSING_PROFILE_FIELDS } from '../services/profileCompleteness';
import { useTranslation } from '../services/translationService';

export type { UserProfile };

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  /** Sends the sign-in email (one message carries both a code and a link). */
  sendEmailCode: (email: string) => Promise<void>;
  /** Exchanges the 6-digit code for a session. */
  verifyEmailCode: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  /**
   * False until a signed-in user has filled the fields the CV needs. Drives the
   * first-run gate that routes new accounts to the profile page.
   */
  profileComplete: boolean;
  /** Which required fields are still blank — used to label the gate. */
  missingProfileFields: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = getSupabase();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const loadProfile = async (uid: string): Promise<UserProfile | null> => {
    const { data, error: e } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (e) { setError(e.message); return null; }
    return data ? rowToProfile(data as Record<string, unknown>) : null;
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) setUserProfile(await loadProfile(sessionUser.id));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setUserProfile(sessionUser ? await loadProfile(sessionUser.id) : null);
      setLoading(false);
    });
    // Google and magic-link returns arrive as a deep link on device; on the
    // web the SDK's detectSessionInUrl already handles them.
    const stopDeepLinks = listenForAuthDeepLinks(setError);
    return () => { active = false; sub.subscription.unsubscribe(); stopDeepLinks(); };
  }, []);

  const sendEmailCode = async (email: string) => {
    setError(null);
    try {
      await sendEmailAuth(email);
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.error.sendFailed', 'Could not send the sign-in email.');
      setError(message);
      throw e;
    }
  };

  const verifyEmailCode = async (email: string, token: string) => {
    setLoading(true); setError(null);
    try {
      await verifyCode(email, token);
      // onAuthStateChange populates user + profile.
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.error.codeFailed', 'That code did not work.');
      setError(message);
      throw e;
    } finally { setLoading(false); }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await startGoogleSignIn();
      // Web redirects away; native returns through the deep-link listener.
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.error.googleFailed', 'Google sign-in failed.');
      setError(message);
      throw e;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signOut();
      if (e) setError(e.message);
      setUser(null); setUserProfile(null);
    } finally { setLoading(false); }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user');
    setLoading(true); setError(null);
    try {
      const row = { ...profileToRow(updates, user.id), updated_at: new Date().toISOString() };
      const { data, error: e } = await supabase
        .from('profiles').upsert(row).select('*').single();
      if (e) { setError(e.message); throw e; }
      setUserProfile(rowToProfile(data as Record<string, unknown>));
    } finally { setLoading(false); }
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, error, clearError,
      sendEmailCode, verifyEmailCode, signInWithGoogle, logout, updateUserProfile,
      profileComplete: isProfileComplete(userProfile),
      missingProfileFields: MISSING_PROFILE_FIELDS(userProfile),
    }}>
      {children}
    </AuthContext.Provider>
  );
};
