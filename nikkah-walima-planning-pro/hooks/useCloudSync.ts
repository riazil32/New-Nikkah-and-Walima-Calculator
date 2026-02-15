import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, isConfigured } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ────────────────────────────────────────────────────────────
interface SyncStatus {
  lastSynced: string | null; // ISO date
  isSyncing: boolean;
  error: string | null;
}

// Keys to sync from localStorage
const SYNC_KEYS = [
  // Budget
  'budget-totalBudget',
  'budget-guestCount',
  'budget-currency',
  'budget-categoryData-v3',
  'budget-customCategories',
  'budget-hasSeenPayerTip',
  'mahr-silverPriceGBP',
  'mahr-selectedPreset',
  'mahr-selectedCurrency',
  'mahr-paymentType',
  // Guest Manager
  'guestManagerData',
  // Timeline
  'timeline-data-multi',
  // Contract
  'contract-data',
  'contract-template',
  // Mahr
  'mahr-customAmount',
  // Duas
  'duas-favorites',
];

// ── Hook ─────────────────────────────────────────────────────────────
export const useCloudSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    isSyncing: false,
    error: null,
  });
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Gather all syncable data from localStorage ───────────────────
  const gatherLocalData = useCallback((): Record<string, string | null> => {
    const data: Record<string, string | null> = {};
    for (const key of SYNC_KEYS) {
      data[key] = localStorage.getItem(key);
    }
    return data;
  }, []);

  // ── Push local data to Firestore ─────────────────────────────────
  const pushToCloud = useCallback(async () => {
    if (!user || !db || !isConfigured) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    try {
      const localData = gatherLocalData();
      await setDoc(doc(db, 'users', user.uid), {
        data: localData,
        lastModified: serverTimestamp(),
        email: user.email,
      }, { merge: true });

      const now = new Date().toISOString();
      setSyncStatus({ lastSynced: now, isSyncing: false, error: null });
      localStorage.setItem('cloud-lastSynced', now);
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to sync to cloud',
      }));
    }
  }, [user, gatherLocalData]);

  // ── Pull cloud data to localStorage ──────────────────────────────
  const pullFromCloud = useCallback(async () => {
    if (!user || !db || !isConfigured) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      if (snapshot.exists()) {
        const cloudData = snapshot.data().data as Record<string, string | null>;
        for (const [key, value] of Object.entries(cloudData)) {
          if (value !== null) {
            localStorage.setItem(key, value);
          }
        }
        const now = new Date().toISOString();
        setSyncStatus({ lastSynced: now, isSyncing: false, error: null });
        localStorage.setItem('cloud-lastSynced', now);
        // Reload to reflect new data
        window.location.reload();
      } else {
        // No cloud data - push local data up
        await pushToCloud();
      }
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to restore from cloud',
      }));
    }
  }, [user, pushToCloud]);

  // ── Export all data as JSON backup ───────────────────────────────
  const exportBackup = useCallback(() => {
    const data = gatherLocalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [gatherLocalData]);

  // ── Import from JSON backup ──────────────────────────────────────
  const importBackup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            localStorage.setItem(key, value);
          }
        }
        window.location.reload();
      } catch {
        setSyncStatus(prev => ({ ...prev, error: 'Invalid backup file' }));
      }
    };
    reader.readAsText(file);
  }, []);

  // ── Auto-sync on changes (debounced) ─────────────────────────────
  const scheduleSync = useCallback(() => {
    if (!user || !isConfigured) return;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      pushToCloud();
    }, 30000); // Sync 30 seconds after last change
  }, [user, pushToCloud]);

  // ── Initial sync on sign-in ──────────────────────────────────────
  useEffect(() => {
    if (user && isConfigured && db) {
      const lastSynced = localStorage.getItem('cloud-lastSynced');
      setSyncStatus(prev => ({ ...prev, lastSynced }));
      // Auto-push on sign-in (non-blocking)
      pushToCloud();
    }
  }, [user?.uid]);

  // ── Cleanup timeout ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncStatus,
    pushToCloud,
    pullFromCloud,
    exportBackup,
    importBackup,
    scheduleSync,
    isAvailable: isConfigured && !!user,
  };
};
