/**
 * Electron API Type Definitions
 * Provides TypeScript support for Electron APIs in renderer process
 */

export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, data?: any) => void
  on: (channel: string, callback: (...args: any[]) => void) => () => void
  once: (channel: string, callback: (...args: any[]) => void) => void
  platform: string
  isElectron: boolean
}

// Extend Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
