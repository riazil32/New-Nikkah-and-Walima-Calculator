import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

// ── Pro Feature IDs ──────────────────────────────────────────────────
// These define which features are gated behind Pro
export type ProFeature =
  | 'pdf-export'            // PDF exports (budget, guests, timeline, certificate)
  | 'premium-templates'     // Gold/Minimal certificate templates
  | 'cloud-sync'            // Cloud backup and multi-device sync
  | 'csv-import-export'     // CSV import/export for guests and budget
  | 'unlimited-guests'      // More than 50 guests
  | 'receipt-upload'        // Receipt photo upload
  | 'sharing';              // Sharing features

// ── Free tier limits ─────────────────────────────────────────────────
export const FREE_TIER_LIMITS = {
  maxGuests: 50,
  // All calculators and planners are free
  // All duas are free
  // Basic features work without sign-in
};

// ── Context ──────────────────────────────────────────────────────────
interface ProContextType {
  isPro: boolean;
  isSignedIn: boolean;
  canUseFeature: (feature: ProFeature) => boolean;
  requirePro: (feature: ProFeature) => boolean; // Returns true if feature is blocked
  guestLimitReached: (currentCount: number) => boolean;
  openUpgradePrompt: (feature?: ProFeature) => void;
}

const ProContext = createContext<ProContextType | undefined>(undefined);

// ── Feature descriptions for upgrade prompts ─────────────────────────
export const PRO_FEATURE_LABELS: Record<ProFeature, { title: string; description: string }> = {
  'pdf-export': {
    title: 'PDF Exports',
    description: 'Download professional PDF reports for your budget, guest list, timeline, and Nikkah certificate.',
  },
  'premium-templates': {
    title: 'Premium Templates',
    description: 'Access Gold Ornate and Minimal Modern certificate designs.',
  },
  'cloud-sync': {
    title: 'Cloud Sync',
    description: 'Back up your data to the cloud and access it from any device.',
  },
  'csv-import-export': {
    title: 'CSV Import/Export',
    description: 'Import and export your guest list and budget data as CSV spreadsheets.',
  },
  'unlimited-guests': {
    title: 'Unlimited Guests',
    description: `Free tier supports up to ${FREE_TIER_LIMITS.maxGuests} guests. Upgrade for unlimited.`,
  },
  'receipt-upload': {
    title: 'Receipt Upload',
    description: 'Attach receipt photos to your budget categories for easy tracking.',
  },
  'sharing': {
    title: 'Sharing',
    description: 'Share your plans with family members and wedding coordinators.',
  },
};

// ── Provider ─────────────────────────────────────────────────────────
export const ProProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const isPro = useMemo(() => user?.isPro || false, [user]);
  const isSignedIn = useMemo(() => !!user, [user]);

  // For now, all features are unlocked (free during beta/development)
  // When ready to gate features, change this to check isPro
  const canUseFeature = useCallback((_feature: ProFeature): boolean => {
    // DEVELOPMENT MODE: All features unlocked
    // When ready to enforce Pro gating, uncomment the line below:
    // return isPro;
    return true;
  }, []);

  const requirePro = useCallback((feature: ProFeature): boolean => {
    return !canUseFeature(feature);
  }, [canUseFeature]);

  const guestLimitReached = useCallback((currentCount: number): boolean => {
    if (isPro) return false;
    // DEVELOPMENT MODE: No limit enforced
    // When ready to enforce: return currentCount >= FREE_TIER_LIMITS.maxGuests;
    return false;
  }, [isPro]);

  const openUpgradePrompt = useCallback((_feature?: ProFeature) => {
    // This will be connected to the upgrade modal
    // For now, it's a no-op since all features are unlocked
    console.log('Upgrade prompt would show for feature:', _feature);
  }, []);

  return (
    <ProContext.Provider
      value={{
        isPro,
        isSignedIn,
        canUseFeature,
        requirePro,
        guestLimitReached,
        openUpgradePrompt,
      }}
    >
      {children}
    </ProContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────
export const usePro = (): ProContextType => {
  const context = useContext(ProContext);
  if (!context) {
    throw new Error('usePro must be used within a ProProvider');
  }
  return context;
};
