/**
 * TypeScript declarations for Electron API
 * Provides type safety for window.electronAPI
 */

export interface ElectronAPI {
  // Invoke methods (request-response)
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>

  // Send methods (one-way)
  send: (channel: string, data?: unknown) => void

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  once: (channel: string, callback: (...args: unknown[]) => void) => void

  // Platform info
  platform: string
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
