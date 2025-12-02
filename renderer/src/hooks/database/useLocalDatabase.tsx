/**
 * Local Database Context Provider
 * Provides access to local SQLite database for offline-first functionality
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// Types for the database operations
export interface Company {
  id: string;
  name: string;
  type: string;
  country?: string;
  website?: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  syncStatus: string;
  cloudId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
  companyId?: string;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  issuingAuthority?: string;
  status: string;
  publishDate?: Date;
  closingDate?: Date;
  estimatedValue?: number;
  category?: string;
  description?: string;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  type?: string;
  email?: string;
  phone?: string;
  address?: string;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  payload: string;
  priority: number;
  status: string;
  retryCount: number;
  createdAt: Date;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncedAt: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
}

// Database context interface
interface LocalDatabaseContextType {
  // Connection status
  isConnected: boolean;
  isElectron: boolean;
  error: string | null;

  // Sync status
  syncStatus: SyncStatus;

  // Company operations
  companies: Company[];
  getCompanies: () => Promise<Company[]>;
  getCompany: (id: string) => Promise<Company | null>;
  createCompany: (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Company>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<Company>;
  deleteCompany: (id: string) => Promise<void>;

  // Product operations
  products: Product[];
  getProducts: () => Promise<Product[]>;
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;

  // Tender operations
  tenders: Tender[];
  getTenders: () => Promise<Tender[]>;
  createTender: (data: Omit<Tender, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Tender>;
  updateTender: (id: string, data: Partial<Tender>) => Promise<Tender>;
  deleteTender: (id: string) => Promise<void>;

  // Customer operations
  customers: Customer[];
  getCustomers: () => Promise<Customer[]>;
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Queue operations
  getQueueStats: () => Promise<QueueStats>;
  getPendingQueue: () => Promise<QueueItem[]>;
  clearCompletedQueue: () => Promise<void>;

  // Refresh data
  refreshAll: () => Promise<void>;
}

const LocalDatabaseContext = createContext<LocalDatabaseContextType | null>(null);

// Check if running in Electron
const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Helper to generate IDs
const generateId = () => `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function LocalDatabaseProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isElectron, setIsElectron] = useState(false); // Hydration-safe
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true, // Hydration-safe default
    lastSyncedAt: null,
    pendingChanges: 0,
    isSyncing: false
  });

  // Set isElectron after mount to avoid hydration mismatch
  useEffect(() => {
    setIsElectron(isElectronEnv);
    setSyncStatus(s => ({ ...s, isOnline: navigator.onLine }));
  }, []);

  // Initialize connection
  useEffect(() => {
    if (isElectronEnv) {
      const electronAPI = (window as any).electronAPI;
      
      // Test database connection
      electronAPI.invoke('db:test')
        .then(() => {
          setIsConnected(true);
          // Load initial data
          refreshAll();
        })
        .catch((err: Error) => {
          setError(`Database connection failed: ${err.message}`);
          setIsConnected(false);
        });

      // Listen for online/offline events
      const handleOnline = () => setSyncStatus(s => ({ ...s, isOnline: true }));
      const handleOffline = () => setSyncStatus(s => ({ ...s, isOnline: false }));
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // Not in Electron - use fallback (API calls to cloud)
      setIsConnected(false);
      setError('Not running in Electron environment - using cloud database');
    }
  }, []);

  // Invoke Electron IPC
  const invokeDB = useCallback(async (channel: string, ...args: any[]) => {
    if (!isElectronEnv) {
      throw new Error('Not in Electron environment');
    }
    return (window as any).electronAPI.invoke(channel, ...args);
  }, []);

  // Add to offline queue
  const addToQueue = useCallback(async (entityType: string, entityId: string, operation: string, payload: any) => {
    await invokeDB('db:queue:add', {
      entityType,
      entityId,
      operation,
      payload: JSON.stringify(payload),
      priority: operation === 'DELETE' ? 3 : operation === 'UPDATE' ? 2 : 1
    });
    // Update pending count
    const stats = await invokeDB('db:queue:stats');
    setSyncStatus(s => ({ ...s, pendingChanges: stats.pending }));
  }, [invokeDB]);

  // Company operations
  const getCompanies = useCallback(async () => {
    const data = await invokeDB('db:company:findMany');
    setCompanies(data);
    return data;
  }, [invokeDB]);

  const getCompany = useCallback(async (id: string) => {
    return await invokeDB('db:company:findUnique', { id });
  }, [invokeDB]);

  const createCompany = useCallback(async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    const newCompany = await invokeDB('db:company:create', {
      ...data,
      id: generateId(),
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await addToQueue('Company', newCompany.id, 'CREATE', newCompany);
    await getCompanies(); // Refresh list
    return newCompany;
  }, [invokeDB, addToQueue, getCompanies]);

  const updateCompany = useCallback(async (id: string, data: Partial<Company>) => {
    const updated = await invokeDB('db:company:update', {
      where: { id },
      data: { ...data, syncStatus: 'pending', updatedAt: new Date() }
    });
    await addToQueue('Company', id, 'UPDATE', updated);
    await getCompanies();
    return updated;
  }, [invokeDB, addToQueue, getCompanies]);

  const deleteCompany = useCallback(async (id: string) => {
    await addToQueue('Company', id, 'DELETE', { id });
    await invokeDB('db:company:delete', { where: { id } });
    await getCompanies();
  }, [invokeDB, addToQueue, getCompanies]);

  // Product operations
  const getProducts = useCallback(async () => {
    const data = await invokeDB('db:product:findMany');
    setProducts(data);
    return data;
  }, [invokeDB]);

  const createProduct = useCallback(async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    const newProduct = await invokeDB('db:product:create', {
      ...data,
      id: generateId(),
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await addToQueue('Product', newProduct.id, 'CREATE', newProduct);
    await getProducts();
    return newProduct;
  }, [invokeDB, addToQueue, getProducts]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>) => {
    const updated = await invokeDB('db:product:update', {
      where: { id },
      data: { ...data, syncStatus: 'pending', updatedAt: new Date() }
    });
    await addToQueue('Product', id, 'UPDATE', updated);
    await getProducts();
    return updated;
  }, [invokeDB, addToQueue, getProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    await addToQueue('Product', id, 'DELETE', { id });
    await invokeDB('db:product:delete', { where: { id } });
    await getProducts();
  }, [invokeDB, addToQueue, getProducts]);

  // Tender operations
  const getTenders = useCallback(async () => {
    const data = await invokeDB('db:tender:findMany');
    setTenders(data);
    return data;
  }, [invokeDB]);

  const createTender = useCallback(async (data: Omit<Tender, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    const newTender = await invokeDB('db:tender:create', {
      ...data,
      id: generateId(),
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await addToQueue('Tender', newTender.id, 'CREATE', newTender);
    await getTenders();
    return newTender;
  }, [invokeDB, addToQueue, getTenders]);

  const updateTender = useCallback(async (id: string, data: Partial<Tender>) => {
    const updated = await invokeDB('db:tender:update', {
      where: { id },
      data: { ...data, syncStatus: 'pending', updatedAt: new Date() }
    });
    await addToQueue('Tender', id, 'UPDATE', updated);
    await getTenders();
    return updated;
  }, [invokeDB, addToQueue, getTenders]);

  const deleteTender = useCallback(async (id: string) => {
    await addToQueue('Tender', id, 'DELETE', { id });
    await invokeDB('db:tender:delete', { where: { id } });
    await getTenders();
  }, [invokeDB, addToQueue, getTenders]);

  // Customer operations
  const getCustomers = useCallback(async () => {
    const data = await invokeDB('db:customer:findMany');
    setCustomers(data);
    return data;
  }, [invokeDB]);

  const createCustomer = useCallback(async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    const newCustomer = await invokeDB('db:customer:create', {
      ...data,
      id: generateId(),
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await addToQueue('Customer', newCustomer.id, 'CREATE', newCustomer);
    await getCustomers();
    return newCustomer;
  }, [invokeDB, addToQueue, getCustomers]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    const updated = await invokeDB('db:customer:update', {
      where: { id },
      data: { ...data, syncStatus: 'pending', updatedAt: new Date() }
    });
    await addToQueue('Customer', id, 'UPDATE', updated);
    await getCustomers();
    return updated;
  }, [invokeDB, addToQueue, getCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    await addToQueue('Customer', id, 'DELETE', { id });
    await invokeDB('db:customer:delete', { where: { id } });
    await getCustomers();
  }, [invokeDB, addToQueue, getCustomers]);

  // Queue operations
  const getQueueStats = useCallback(async () => {
    return await invokeDB('db:queue:stats');
  }, [invokeDB]);

  const getPendingQueue = useCallback(async () => {
    return await invokeDB('db:queue:pending');
  }, [invokeDB]);

  const clearCompletedQueue = useCallback(async () => {
    await invokeDB('db:queue:clearCompleted');
  }, [invokeDB]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!isElectronEnv) return;
    
    try {
      await Promise.all([
        getCompanies(),
        getProducts(),
        getTenders(),
        getCustomers()
      ]);
      
      const stats = await getQueueStats();
      setSyncStatus(s => ({ ...s, pendingChanges: stats.pending }));
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, [getCompanies, getProducts, getTenders, getCustomers, getQueueStats]);

  const value: LocalDatabaseContextType = {
    isConnected,
    isElectron,
    error,
    syncStatus,
    companies,
    getCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    products,
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    tenders,
    getTenders,
    createTender,
    updateTender,
    deleteTender,
    customers,
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getQueueStats,
    getPendingQueue,
    clearCompletedQueue,
    refreshAll
  };

  return (
    <LocalDatabaseContext.Provider value={value}>
      {children}
    </LocalDatabaseContext.Provider>
  );
}

// Hook to use the local database
export function useLocalDatabase() {
  const context = useContext(LocalDatabaseContext);
  if (!context) {
    throw new Error('useLocalDatabase must be used within a LocalDatabaseProvider');
  }
  return context;
}

// Convenience hooks for specific entities
export function useCompanies() {
  const { companies, getCompanies, getCompany, createCompany, updateCompany, deleteCompany, isConnected } = useLocalDatabase();
  return { companies, getCompanies, getCompany, createCompany, updateCompany, deleteCompany, isConnected };
}

export function useProducts() {
  const { products, getProducts, createProduct, updateProduct, deleteProduct, isConnected } = useLocalDatabase();
  return { products, getProducts, createProduct, updateProduct, deleteProduct, isConnected };
}

export function useTenders() {
  const { tenders, getTenders, createTender, updateTender, deleteTender, isConnected } = useLocalDatabase();
  return { tenders, getTenders, createTender, updateTender, deleteTender, isConnected };
}

export function useCustomers() {
  const { customers, getCustomers, createCustomer, updateCustomer, deleteCustomer, isConnected } = useLocalDatabase();
  return { customers, getCustomers, createCustomer, updateCustomer, deleteCustomer, isConnected };
}

export function useSyncStatus() {
  const { syncStatus, getQueueStats, getPendingQueue, clearCompletedQueue } = useLocalDatabase();
  return { syncStatus, getQueueStats, getPendingQueue, clearCompletedQueue };
}
