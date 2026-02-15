import React, { useState } from 'react';
import { usePro, type ProFeature, PRO_FEATURE_LABELS } from '../contexts/ProContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Star } from './Icons';

interface ProGateProps {
  feature: ProFeature;
  children: React.ReactNode;
  /** If true, shows a subtle badge instead of blocking the UI entirely */
  softGate?: boolean;
  /** Custom label for the upgrade prompt */
  customLabel?: string;
}

/**
 * ProGate wraps a feature that may require Pro.
 * - If the user has Pro (or features are unlocked during beta), children render normally.
 * - If gated, shows an upgrade prompt overlay or badge.
 */
export const ProGate: React.FC<ProGateProps> = ({ feature, children, softGate = false, customLabel }) => {
  const { canUseFeature } = usePro();
  const { user, isConfigured } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Feature is available — render children directly
  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const featureInfo = PRO_FEATURE_LABELS[feature];
  const label = customLabel || featureInfo.title;

  // Soft gate: render children with a pro badge overlay
  if (softGate) {
    return (
      <div className="relative">
        {children}
        <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-full">
          <Star className="w-3 h-3 text-amber-600 dark:text-amber-400" style={{ fill: 'currentColor' }} />
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">PRO</span>
        </div>
      </div>
    );
  }

  // Hard gate: block the UI with an upgrade prompt
  return (
    <>
      <div className="relative rounded-xl overflow-hidden">
        {/* Blurred preview */}
        <div className="pointer-events-none opacity-40 blur-[2px] select-none">
          {children}
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px]">
          <div className="text-center p-4 max-w-xs">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" style={{ fill: 'currentColor' }} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">{label}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {featureInfo.description}
            </p>
            {!user ? (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Sign In to Upgrade
              </button>
            ) : (
              <button
                onClick={() => {
                  // Navigate to Stripe checkout
                  window.open('/api/create-checkout?uid=' + user.uid, '_blank');
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Upgrade to Pro — $9.99
              </button>
            )}
          </div>
        </div>
      </div>

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </>
  );
};

/**
 * ProBadge: Small inline badge to indicate a Pro feature
 */
export const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-full ${className}`}>
    <Star className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" style={{ fill: 'currentColor' }} />
    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase">Pro</span>
  </span>
);
