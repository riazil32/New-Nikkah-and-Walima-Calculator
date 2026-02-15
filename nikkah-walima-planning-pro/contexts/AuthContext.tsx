import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../config/firebase';

// ── Types ────────────────────────────────────────────────────────────
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPro: boolean;
  proSince?: string; // ISO date string
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  upgradeToPro: () => void; // Called after successful Stripe payment
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helper: Map Firebase User to AuthUser ────────────────────────────
const mapUser = (firebaseUser: User): AuthUser => {
  // Check localStorage for pro status (will be synced from Stripe webhook via cloud)
  const proData = localStorage.getItem(`pro-status-${firebaseUser.uid}`);
  const proInfo = proData ? JSON.parse(proData) : null;

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    isPro: proInfo?.isPro || false,
    proSince: proInfo?.proSince,
  };
};

// ── Provider ─────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapUser(firebaseUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Sign in with Google ──────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setError('Firebase is not configured. Please add your Firebase config to environment variables.');
      return;
    }
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(mapUser(result.user));
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return; // User cancelled
      setError(err.message || 'Failed to sign in with Google');
    }
  }, []);

  // ── Sign in with email/password ──────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) {
      setError('Firebase is not configured.');
      return;
    }
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(mapUser(result.user));
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    }
  }, []);

  // ── Sign up with email/password ──────────────────────────────────
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) {
      setError('Firebase is not configured.');
      return;
    }
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setUser(mapUser(result.user));
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    }
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    }
  }, []);

  // ── Upgrade to Pro (called after successful Stripe payment) ──────
  const upgradeToPro = useCallback(() => {
    if (!user) return;
    const proData = { isPro: true, proSince: new Date().toISOString() };
    localStorage.setItem(`pro-status-${user.uid}`, JSON.stringify(proData));
    setUser(prev => prev ? { ...prev, isPro: true, proSince: proData.proSince } : null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        upgradeToPro,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
