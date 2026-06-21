import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabase';
import { rowToProfile, profileToRow, type UserProfile } from '../services/profileMapping';

export type { UserProfile };

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signUpWithEmail: (
    email: string, password: string, firstName: string, lastName: string,
  ) => Promise<{ needsEmailVerification: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = getSupabase();
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
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signUpWithEmail = async (
    email: string, password: string, firstName: string, lastName: string,
  ): Promise<{ needsEmailVerification: boolean }> => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (e) { setError(e.message); throw e; }
      // With email confirmations on, no session is returned until verified.
      return { needsEmailVerification: !data.session };
    } finally { setLoading(false); }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError(e.message); throw e; }
      // onAuthStateChange populates user + profile.
    } finally { setLoading(false); }
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (e) { setError(e.message); throw e; }
    // Browser redirects to Google; session is detected on return (detectSessionInUrl).
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

  const resetPassword = async (email: string) => {
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (e) { setError(e.message); throw e; }
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, error, clearError,
      signUpWithEmail, signInWithEmail, signInWithGoogle, logout, updateUserProfile, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
