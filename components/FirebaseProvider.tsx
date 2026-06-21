import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';

interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  industry: string;
  experienceYears: string;
  bio: string;
  careSpecialties: string[];
  certifications: string[];
  availability: string;
  licensedState: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const docRef = doc(db, 'users', uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setError(null);
      if (currentUser) {
        setUser(currentUser);
        // Load user profile from firestore
        try {
          let profile = await fetchUserProfile(currentUser.uid);
          if (!profile) {
            // Self-register default profile for new external provider users
            const nameParts = currentUser.displayName?.split(' ') || [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            const newProfile: UserProfile = {
              userId: currentUser.uid,
              email: currentUser.email || '',
              firstName,
              lastName,
              phone: currentUser.phoneNumber || '',
              jobTitle: '',
              industry: '',
              experienceYears: '',
              bio: '',
              careSpecialties: [],
              certifications: [],
              availability: '',
              licensedState: '',
              linkedin: '',
              github: '',
              portfolio: '',
            };
            
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            profile = newProfile;
          }
          setUserProfile(profile);
        } catch (err: any) {
          console.error("Error setting or fetching profile: ", err);
          setError("Failed to fetch or create user profile in Firestore.");
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      const newProfile: UserProfile = {
        userId: newUser.uid,
        email: email,
        firstName: firstName,
        lastName: lastName,
        phone: '',
        jobTitle: '',
        industry: '',
        experienceYears: '',
        bio: '',
        careSpecialties: [],
        certifications: [],
        availability: '',
        licensedState: '',
        linkedin: '',
        github: '',
        portfolio: '',
      };

      // Create permanent profile in secure Firestore standard
      await setDoc(doc(db, 'users', newUser.uid), newProfile);
      setUser(newUser);
      setUserProfile(newProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with email');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      const profile = await fetchUserProfile(userCredential.user.uid);
      setUserProfile(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      setUser(userCredential.user);
      
      let profile = await fetchUserProfile(userCredential.user.uid);
      if (!profile) {
        const nameParts = userCredential.user.displayName?.split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newProfile: UserProfile = {
          userId: userCredential.user.uid,
          email: userCredential.user.email || '',
          firstName,
          lastName,
          phone: userCredential.user.phoneNumber || '',
          jobTitle: '',
          industry: '',
          experienceYears: '',
          bio: '',
          careSpecialties: [],
          certifications: [],
          availability: '',
          licensedState: '',
          linkedin: '',
          github: '',
          portfolio: '',
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
        profile = newProfile;
      }
      setUserProfile(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user');
    setLoading(true);
    setError(null);
    try {
      const updatedProfile = {
        ...userProfile,
        ...updates,
        userId: user.uid,
        email: user.email || userProfile?.email || '',
        updatedAt: new Date().toISOString(),
      } as UserProfile;

      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setUserProfile(updatedProfile);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      error,
      clearError,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
