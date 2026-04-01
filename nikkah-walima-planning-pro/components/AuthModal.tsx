import React, { useState } from 'react';
import { X, AlertTriangle } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useScrollLock } from '../hooks/useScrollLock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'sign-in' | 'sign-up';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'sign-in' }) => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, error, clearError, isConfigured } = useAuth();

  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    clearError();
    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      // Close modal on success (user state change will handle UI)
      onClose();
    } catch {
      // Error is handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    clearError();
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      // Error is handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="relative p-5 pb-4 border-b border-slate-100 dark:border-zinc-700">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30">
              <span className="text-2xl">🕌</span>
            </div>
            <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-white">
              {mode === 'sign-in' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'sign-in'
                ? 'Sign in to sync your data and unlock Pro features'
                : 'Create an account to save your wedding plans'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Not Configured Warning */}
          {!isConfigured && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-bold">Firebase Not Configured</p>
                  <p className="mt-0.5">Add your Firebase config to <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> to enable authentication.</p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || !isConfigured}
            className="w-full flex items-center justify-center gap-2.5 h-11 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-700" />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-700" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-10 px-3 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 rounded-xl text-sm text-slate-700 dark:text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'sign-up' ? 'At least 6 characters' : '••••••••'}
                className="w-full h-10 px-3 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 rounded-xl text-sm text-slate-700 dark:text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !isConfigured}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
            >
              {isSubmitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'sign-in' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => { setMode('sign-up'); clearError(); }} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('sign-in'); clearError(); }} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
