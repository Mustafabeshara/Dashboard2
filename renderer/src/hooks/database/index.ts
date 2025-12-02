/**
 * Database Hooks Index
 * Export all database-related React hooks
 */

export {
  LocalDatabaseProvider,
  useLocalDatabase,
  useCompanies,
  useProducts,
  useTenders,
  useCustomers,
  useSyncStatus,
  type Company,
  type Product,
  type Tender,
  type Customer,
  type QueueItem,
  type QueueStats,
  type SyncStatus,
} from './useLocalDatabase';
