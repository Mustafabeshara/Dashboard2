/**
 * useElectron Hook - React integration for Electron APIs
 */

import { useState, useEffect, useCallback } from 'react';

interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
}

interface SyncStatus {
  lastSync: string | null;
  status: 'connected' | 'disconnected' | 'syncing';
}

interface ElectronAPI {
  getAppInfo: () => Promise<AppInfo>;
  getSyncStatus: () => Promise<SyncStatus>;
  isOnline: () => Promise<boolean>;
  onSyncNow: (callback: () => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ lastSync: null, status: 'disconnected' });
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    const electronAvailable = typeof window !== 'undefined' && !!window.electronAPI;
    setIsElectron(electronAvailable);

    if (electronAvailable && window.electronAPI) {
      setPlatform(window.electronAPI.platform);
      
      // Get initial app info
      window.electronAPI.getAppInfo().then(setAppInfo).catch(console.error);
      
      // Get initial sync status
      window.electronAPI.getSyncStatus().then(setSyncStatus).catch(console.error);
      
      // Check online status
      window.electronAPI.isOnline().then(setIsOnline).catch(() => setIsOnline(navigator.onLine));
      
      // Listen for sync requests
      const unsubSync = window.electronAPI.onSyncNow(() => {
        console.log('[useElectron] Sync requested from main process');
        setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
      });
      
      return () => { unsubSync(); };
    } else {
      // Web fallback
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (isElectron && window.electronAPI) {
      setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
      // Sync logic will be added in Phase 3
      setTimeout(() => {
        setSyncStatus({ lastSync: new Date().toISOString(), status: 'connected' });
      }, 1000);
    }
  }, [isElectron]);

  return { isElectron, isOnline, appInfo, syncStatus, platform, triggerSync };
}

export default useElectron;
