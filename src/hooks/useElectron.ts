/**
 * useElectron Hook - React integration for Electron APIs
 * Uses the invoke/on pattern exposed by the preload script
 */

import { useState, useEffect, useCallback } from 'react';

interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  databaseReady?: boolean;
}

interface SyncStatus {
  lastSync: string | null;
  status: 'connected' | 'disconnected' | 'syncing' | 'initializing';
  databasePath?: string;
}

interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  send: (channel: string, data?: unknown) => void;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  once: (channel: string, callback: (...args: unknown[]) => void) => void;
  platform: string;
  isElectron: boolean;
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
    const electronAvailable = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
    setIsElectron(electronAvailable);

    if (electronAvailable && window.electronAPI) {
      setPlatform(window.electronAPI.platform);

      // Get initial app info using invoke
      window.electronAPI.invoke('get-app-info')
        .then((info) => setAppInfo(info as AppInfo))
        .catch(console.error);

      // Get initial sync status using invoke
      window.electronAPI.invoke('get-sync-status')
        .then((status) => setSyncStatus(status as SyncStatus))
        .catch(console.error);

      // Check online status using invoke
      window.electronAPI.invoke('is-online')
        .then((online) => setIsOnline(online as boolean))
        .catch(() => setIsOnline(navigator.onLine));

      // Listen for sync requests using on
      const unsubSync = window.electronAPI.on('sync-now', () => {
        setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
      });

      // Listen for settings open requests
      const unsubSettings = window.electronAPI.on('open-settings', () => {
        // Handle settings open request
      });

      return () => {
        unsubSync();
        unsubSettings();
      };
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
      window.electronAPI.send('request-sync');
      // Update status after sync attempt
      setTimeout(() => {
        setSyncStatus({ lastSync: new Date().toISOString(), status: 'connected' });
      }, 1000);
    }
  }, [isElectron]);

  return { isElectron, isOnline, appInfo, syncStatus, platform, triggerSync };
}

export default useElectron;
