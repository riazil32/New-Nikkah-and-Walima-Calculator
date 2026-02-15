import React, { useState, useRef } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useCloudSync } from '../hooks/useCloudSync';
import { useScrollLock } from '../hooks/useScrollLock';
import { AuthModal } from './AuthModal';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({ isOpen, onClose }) => {
  const { user, signOut, isConfigured, upgradeToPro } = useAuth();
  const { syncStatus, pushToCloud, pullFromCloud, exportBackup, importBackup, isAvailable } = useCloudSync();
  const [showAuth, setShowAuth] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useScrollLock(isOpen);

  if (!isOpen) return null;

  // Handle payment success (check URL params)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success' && user && !user.isPro) {
    upgradeToPro();
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-zinc-700 overflow-hidden max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700 p-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-white">Account & Data</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* ── User Profile ──────────────────────────────────── */}
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-700/50 rounded-xl p-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                {user.isPro && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-full">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">⭐ PRO</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                {isConfigured ? (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Sign in to sync your data across devices
                    </p>
                    <button
                      onClick={() => setShowAuth(true)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                    <div className="flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 dark:text-amber-200">
                        <p className="font-bold">Authentication Not Set Up</p>
                        <p className="mt-0.5">Add Firebase credentials to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> file to enable sign-in and cloud sync.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Upgrade to Pro ──────────────────────────────────── */}
            {user && !user.isPro && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Upgrade to Pro</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Unlock PDF exports, premium templates, cloud sync, and more.
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">$9.99</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">one-time payment</span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid, email: user.email }),
                      });
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        alert(data.error || 'Could not create checkout session');
                      }
                    } catch {
                      alert('Payment service not available. Please try again later.');
                    }
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
            )}

            {/* ── Cloud Sync ──────────────────────────────────────── */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Cloud Sync</h3>
              {isAvailable ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {syncStatus.isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : syncStatus.lastSynced ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Last synced: {new Date(syncStatus.lastSynced).toLocaleString()}</span>
                      </>
                    ) : (
                      <span>Not yet synced</span>
                    )}
                  </div>
                  {syncStatus.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">{syncStatus.error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={pushToCloud}
                      disabled={syncStatus.isSyncing}
                      className="flex-1 py-2 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                    >
                      Push to Cloud
                    </button>
                    <button
                      onClick={() => setShowConfirmRestore(true)}
                      disabled={syncStatus.isSyncing}
                      className="flex-1 py-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                    >
                      Restore from Cloud
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {!user ? 'Sign in to enable cloud sync.' : 'Firebase not configured.'}
                </p>
              )}
            </div>

            {/* ── Local Backup ─────────────────────────────────────── */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Local Backup</h3>
              <div className="flex gap-2">
                <button
                  onClick={exportBackup}
                  className="flex-1 py-2 text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Import from JSON
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importBackup(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* ── Sign Out ─────────────────────────────────────────── */}
            {user && (
              <button
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="w-full py-2.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Restore Modal */}
      {showConfirmRestore && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-xs p-5 text-center border border-slate-200 dark:border-zinc-700">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Restore from Cloud?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              This will replace all local data with cloud data. The page will reload.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmRestore(false)}
                className="flex-1 py-2 text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmRestore(false);
                  pullFromCloud();
                }}
                className="flex-1 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </>
  );
};
