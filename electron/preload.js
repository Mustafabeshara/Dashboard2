/**
 * Medical Distribution Dashboard - Electron Preload Script
 * Securely exposes main process APIs to the renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Define all allowed IPC channels
const ALLOWED_CHANNELS = {
  invoke: [
    // App info
    'get-app-info',
    'get-sync-status',
    'is-online',
    
    // Database utilities
    'db:test',
    'db:get-path',
    'db:get-stats',
    'db:initialize',
    'db:get-app-data-path',
    
    // Company CRUD
    'db:company:findMany',
    'db:company:findUnique',
    'db:company:create',
    'db:company:update',
    'db:company:delete',
    'db:company:count',
    
    // Product CRUD
    'db:product:findMany',
    'db:product:findUnique',
    'db:product:create',
    'db:product:update',
    'db:product:delete',
    'db:product:count',
    
    // Tender CRUD
    'db:tender:findMany',
    'db:tender:findUnique',
    'db:tender:create',
    'db:tender:update',
    'db:tender:delete',
    'db:tender:count',
    
    // Customer CRUD
    'db:customer:findMany',
    'db:customer:findUnique',
    'db:customer:create',
    'db:customer:update',
    'db:customer:delete',
    'db:customer:count',
    
    // User CRUD
    'db:user:findMany',
    'db:user:findUnique',
    'db:user:findByEmail',
    'db:user:create',
    'db:user:update',
    'db:user:delete',
    
    // Inventory CRUD
    'db:inventory:findMany',
    'db:inventory:create',
    'db:inventory:update',
    'db:inventory:delete',
    
    // Invoice CRUD
    'db:invoice:findMany',
    'db:invoice:create',
    'db:invoice:update',
    'db:invoice:delete',
    
    // Expense CRUD
    'db:expense:findMany',
    'db:expense:create',
    'db:expense:update',
    'db:expense:delete',
    
    // Offline Queue
    'db:queue:add',
    'db:queue:pending',
    'db:queue:stats',
    'db:queue:process',
    'db:queue:complete',
    'db:queue:fail',
    'db:queue:clearCompleted',
    'db:queue:clearAll',
    
    // Sync Metadata
    'db:sync:getMeta',
    'db:sync:updateMeta',
    
    // App Settings
    'db:settings:get',
    'db:settings:set',
    'db:settings:delete',
    
    // AI Processing
    'ai:add-to-queue',
    'ai:get-queue',
    'ai:clear-queue',
    
    // File System
    'fs:select-files',
    'fs:read-file',
    
    // Generic query
    'db:query',
  ],
  send: [
    'app-ready',
    'request-sync',
    'process-documents',
    'process-all-documents',
    'show-ai-queue',
    'import-documents'
  ],
  receive: [
    'sync-now',
    'sync-complete',
    'sync-error',
    'open-settings',
    'database-update',
    'ai-queue-update',
    'show-notification',
    'process-documents',
    'process-all-documents',
    'show-ai-queue',
    'import-documents'
  ]
};

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Invoke a handler and get a response
  invoke: (channel, ...args) => {
    if (ALLOWED_CHANNELS.invoke.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`[Preload] Blocked invoke to unauthorized channel: ${channel}`);
    return Promise.reject(new Error(`Unauthorized channel: ${channel}`));
  },
  
  // Send one-way message to main process
  send: (channel, data) => {
    if (ALLOWED_CHANNELS.send.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`[Preload] Blocked send to unauthorized channel: ${channel}`);
    }
  },
  
  // Listen for messages from main process
  on: (channel, callback) => {
    if (ALLOWED_CHANNELS.receive.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      // Return unsubscribe function
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    console.warn(`[Preload] Blocked listener on unauthorized channel: ${channel}`);
    return () => {};
  },
  
  // Listen once for a message
  once: (channel, callback) => {
    if (ALLOWED_CHANNELS.receive.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`[Preload] Blocked once listener on unauthorized channel: ${channel}`);
    }
  },
  
  // Platform info
  platform: process.platform,
  
  // Is running in Electron
  isElectron: true,
});

// Log when preload is complete
console.log('[Preload] Electron API exposed to renderer');