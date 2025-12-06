/**
 * Electron Database Handler
 * Initializes and manages the local SQLite database from the main process
 * Includes IPC handlers for CRUD operations from renderer process
 */

const path = require('path');
const fs = require('fs');
const { app, ipcMain } = require('electron');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  APP_NAME: 'Medical Distribution Dashboard',
  DB_FILENAME: 'local.db',
  BACKUP_DIR: 'backups',
};

// Prisma client instance (lazy loaded)
let prisma = null;

/**
 * Get the app data directory based on platform
 */
function getAppDataPath() {
  const platform = process.platform;
  
  switch (platform) {
    case 'darwin':
      return path.join(app.getPath('home'), 'Library', 'Application Support', CONFIG.APP_NAME);
    case 'win32':
      return path.join(app.getPath('appData'), CONFIG.APP_NAME);
    default:
      return path.join(app.getPath('home'), '.config', CONFIG.APP_NAME.toLowerCase().replace(/ /g, '-'));
  }
}

/**
 * Get the full path to the local database
 */
function getLocalDatabasePath() {
  return path.join(getAppDataPath(), CONFIG.DB_FILENAME);
}

/**
 * Ensure app data directory exists
 */
function ensureAppDataDir() {
  const appDataPath = getAppDataPath();
  
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
    console.log(`[Database] Created app data directory: ${appDataPath}`);
  }
  
  const backupPath = path.join(appDataPath, CONFIG.BACKUP_DIR);
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  
  return appDataPath;
}

/**
 * Get or create Prisma client instance
 */
function getPrismaClient() {
  if (!prisma) {
    try {
      const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'local-client');
      const { PrismaClient } = require(prismaClientPath);
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${getLocalDatabasePath()}`
          }
        },
        log: ['error', 'warn']
      });
    } catch (error) {
      console.error('[Database] Failed to load Prisma client:', error);
      throw new Error(`Prisma client not found. Please run: npm run db:local:generate`);
    }
  }
  return prisma;
}

/**
 * Initialize the local database
 * Runs Prisma migrations if needed
 */
async function initializeDatabase() {
  console.log('[Database] Initializing local database...');
  
  try {
    // Ensure directory exists
    const appDataPath = ensureAppDataDir();
    const dbPath = getLocalDatabasePath();
    
    // Set environment variable
    process.env.LOCAL_DATABASE_URL = `file:${dbPath}`;
    
    console.log(`[Database] App data path: ${appDataPath}`);
    console.log(`[Database] Database path: ${dbPath}`);
    
    // Check if database exists
    const dbExists = fs.existsSync(dbPath);
    console.log(`[Database] Database exists: ${dbExists}`);
    
    // Run migrations if needed
    if (!dbExists) {
      console.log('[Database] Creating new database with migrations...');
      await runPrismaMigrate();
    } else {
      // Verify database integrity
      const isValid = await verifyDatabase(dbPath);
      if (!isValid) {
        console.log('[Database] Database corrupted, recreating...');
        await backupAndRecreate(dbPath);
      }
    }
    
    // Test connection
    const client = getPrismaClient();
    await client.$connect();
    console.log('[Database] Connection test successful');
    
    console.log('[Database] Initialization complete');
    return { success: true, path: dbPath };
    
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run Prisma migrate for local schema
 */
function runPrismaMigrate() {
  return new Promise((resolve, reject) => {
    const cwd = app.isPackaged 
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..');
    
    console.log(`[Database] Running migration in: ${cwd}`);
    
    // For SQLite, we use db push instead of migrate
    // Use the local prisma version from node_modules
    const prismaPath = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');
    const npmCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npmCmd, [
      '--package=prisma@6.8.2',
      'prisma', 'db', 'push',
      '--schema=prisma/schema.local.prisma',
      '--skip-generate',
      '--accept-data-loss'
    ], {
      cwd,
      env: {
        ...process.env,
        LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[Prisma] ${data.toString()}`);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[Prisma Error] ${data.toString()}`);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Database] Migration completed successfully');
        resolve(output);
      } else {
        console.error(`[Database] Migration failed with code ${code}`);
        reject(new Error(errorOutput || 'Migration failed'));
      }
    });
    
    child.on('error', (err) => {
      console.error('[Database] Failed to run migration:', err);
      reject(err);
    });
  });
}

/**
 * Verify database integrity
 */
async function verifyDatabase(dbPath) {
  try {
    const stats = fs.statSync(dbPath);
    return stats.size > 0;
  } catch {
    return false;
  }
}

/**
 * Backup and recreate corrupted database
 */
async function backupAndRecreate(dbPath) {
  const backupDir = path.join(getAppDataPath(), CONFIG.BACKUP_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `corrupted-${timestamp}.db`);
  
  try {
    if (fs.existsSync(dbPath)) {
      fs.renameSync(dbPath, backupPath);
      console.log(`[Database] Backed up corrupted database to: ${backupPath}`);
    }
    await runPrismaMigrate();
  } catch (error) {
    console.error('[Database] Failed to backup and recreate:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
function getDatabaseStats() {
  const dbPath = getLocalDatabasePath();
  const backupDir = path.join(getAppDataPath(), CONFIG.BACKUP_DIR);
  
  let size = 0;
  let exists = false;
  let backupCount = 0;
  
  if (fs.existsSync(dbPath)) {
    exists = true;
    size = fs.statSync(dbPath).size;
  }
  
  if (fs.existsSync(backupDir)) {
    backupCount = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).length;
  }
  
  return {
    path: dbPath,
    size,
    sizeFormatted: formatBytes(size),
    exists,
    backupCount,
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Setup IPC handlers for database operations
 */
function setupDatabaseIPC() {
  try {
    const db = getPrismaClient();
  
  // ==================== UTILITY HANDLERS ====================
  
  ipcMain.handle('db:test', async () => {
    try {
      await db.$connect();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:get-path', () => getLocalDatabasePath());
  ipcMain.handle('db:get-stats', () => getDatabaseStats());
  ipcMain.handle('db:initialize', async () => await initializeDatabase());
  ipcMain.handle('db:get-app-data-path', () => getAppDataPath());

  // ==================== COMPANY CRUD ====================
  
  ipcMain.handle('db:company:findMany', async (event, args = {}) => await db.company.findMany(args));
  ipcMain.handle('db:company:findUnique', async (event, args) => await db.company.findUnique({ where: { id: args.id } }));
  ipcMain.handle('db:company:create', async (event, data) => await db.company.create({ data }));
  ipcMain.handle('db:company:update', async (event, args) => await db.company.update(args));
  ipcMain.handle('db:company:delete', async (event, args) => await db.company.delete(args));
  ipcMain.handle('db:company:count', async (event, args = {}) => await db.company.count(args));

  // ==================== PRODUCT CRUD ====================
  
  ipcMain.handle('db:product:findMany', async (event, args = {}) => await db.product.findMany(args));
  ipcMain.handle('db:product:findUnique', async (event, args) => await db.product.findUnique({ where: { id: args.id } }));
  ipcMain.handle('db:product:create', async (event, data) => await db.product.create({ data }));
  ipcMain.handle('db:product:update', async (event, args) => await db.product.update(args));
  ipcMain.handle('db:product:delete', async (event, args) => await db.product.delete(args));
  ipcMain.handle('db:product:count', async (event, args = {}) => await db.product.count(args));

  // ==================== TENDER CRUD ====================
  
  ipcMain.handle('db:tender:findMany', async (event, args = {}) => await db.tender.findMany(args));
  ipcMain.handle('db:tender:findUnique', async (event, args) => await db.tender.findUnique({ where: { id: args.id } }));
  ipcMain.handle('db:tender:create', async (event, data) => await db.tender.create({ data }));
  ipcMain.handle('db:tender:update', async (event, args) => await db.tender.update(args));
  ipcMain.handle('db:tender:delete', async (event, args) => await db.tender.delete(args));
  ipcMain.handle('db:tender:count', async (event, args = {}) => await db.tender.count(args));

  // ==================== CUSTOMER CRUD ====================
  
  ipcMain.handle('db:customer:findMany', async (event, args = {}) => await db.customer.findMany(args));
  ipcMain.handle('db:customer:findUnique', async (event, args) => await db.customer.findUnique({ where: { id: args.id } }));
  ipcMain.handle('db:customer:create', async (event, data) => await db.customer.create({ data }));
  ipcMain.handle('db:customer:update', async (event, args) => await db.customer.update(args));
  ipcMain.handle('db:customer:delete', async (event, args) => await db.customer.delete(args));
  ipcMain.handle('db:customer:count', async (event, args = {}) => await db.customer.count(args));

  // ==================== USER CRUD ====================
  
  ipcMain.handle('db:user:findMany', async (event, args = {}) => await db.user.findMany(args));
  ipcMain.handle('db:user:findUnique', async (event, args) => await db.user.findUnique({ where: { id: args.id } }));
  ipcMain.handle('db:user:findByEmail', async (event, email) => await db.user.findUnique({ where: { email } }));
  ipcMain.handle('db:user:create', async (event, data) => await db.user.create({ data }));
  ipcMain.handle('db:user:update', async (event, args) => await db.user.update(args));
  ipcMain.handle('db:user:delete', async (event, args) => await db.user.delete(args));

  // ==================== INVENTORY CRUD ====================
  
  ipcMain.handle('db:inventory:findMany', async (event, args = {}) => await db.inventory.findMany(args));
  ipcMain.handle('db:inventory:create', async (event, data) => await db.inventory.create({ data }));
  ipcMain.handle('db:inventory:update', async (event, args) => await db.inventory.update(args));
  ipcMain.handle('db:inventory:delete', async (event, args) => await db.inventory.delete(args));

  // ==================== INVOICE CRUD ====================
  
  ipcMain.handle('db:invoice:findMany', async (event, args = {}) => await db.invoice.findMany(args));
  ipcMain.handle('db:invoice:create', async (event, data) => await db.invoice.create({ data }));
  ipcMain.handle('db:invoice:update', async (event, args) => await db.invoice.update(args));
  ipcMain.handle('db:invoice:delete', async (event, args) => await db.invoice.delete(args));

  // ==================== EXPENSE CRUD ====================
  
  ipcMain.handle('db:expense:findMany', async (event, args = {}) => await db.expense.findMany(args));
  ipcMain.handle('db:expense:create', async (event, data) => await db.expense.create({ data }));
  ipcMain.handle('db:expense:update', async (event, args) => await db.expense.update(args));
  ipcMain.handle('db:expense:delete', async (event, args) => await db.expense.delete(args));

  // ==================== OFFLINE QUEUE ====================
  
  ipcMain.handle('db:queue:add', async (event, data) => {
    const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return await db.offlineQueue.create({
      data: { id, ...data, status: 'pending', retryCount: 0, maxRetries: 3, createdAt: new Date() }
    });
  });
  
  ipcMain.handle('db:queue:pending', async (event, limit = 50) => {
    return await db.offlineQueue.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit
    });
  });
  
  ipcMain.handle('db:queue:stats', async () => {
    const pending = await db.offlineQueue.count({ where: { status: 'pending' } });
    const processing = await db.offlineQueue.count({ where: { status: 'processing' } });
    const completed = await db.offlineQueue.count({ where: { status: 'completed' } });
    const failed = await db.offlineQueue.count({ where: { status: 'failed' } });
    return { pending, processing, completed, failed, total: pending + processing + completed + failed };
  });
  
  ipcMain.handle('db:queue:process', async (event, id) => {
    return await db.offlineQueue.update({ where: { id }, data: { status: 'processing' } });
  });
  
  ipcMain.handle('db:queue:complete', async (event, id) => {
    return await db.offlineQueue.update({ where: { id }, data: { status: 'completed', processedAt: new Date() } });
  });
  
  ipcMain.handle('db:queue:fail', async (event, { id, errorMessage }) => {
    const item = await db.offlineQueue.findUnique({ where: { id } });
    const newRetryCount = (item?.retryCount || 0) + 1;
    return await db.offlineQueue.update({
      where: { id },
      data: {
        status: newRetryCount >= (item?.maxRetries || 3) ? 'failed' : 'pending',
        retryCount: newRetryCount,
        errorMessage
      }
    });
  });
  
  ipcMain.handle('db:queue:clearCompleted', async () => await db.offlineQueue.deleteMany({ where: { status: 'completed' } }));
  ipcMain.handle('db:queue:clearAll', async () => await db.offlineQueue.deleteMany());

  // ==================== SYNC METADATA ====================
  
  ipcMain.handle('db:sync:getMeta', async (event, entityType) => {
    return await db.syncMetadata.findUnique({ where: { entityType } });
  });
  
  ipcMain.handle('db:sync:updateMeta', async (event, { entityType, data }) => {
    return await db.syncMetadata.upsert({
      where: { entityType },
      create: { id: `sync-${entityType}`, entityType, ...data },
      update: data
    });
  });

  // ==================== APP SETTINGS ====================
  
  ipcMain.handle('db:settings:get', async (event, key) => {
    const setting = await db.appSettings.findUnique({ where: { key } });
    return setting?.value ? JSON.parse(setting.value) : null;
  });
  
  ipcMain.handle('db:settings:set', async (event, { key, value }) => {
    return await db.appSettings.upsert({
      where: { key },
      create: { id: `setting-${key}`, key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) }
    });
  });
  
  ipcMain.handle('db:settings:delete', async (event, key) => {
    return await db.appSettings.delete({ where: { key } });
  });

  // ==================== GENERIC QUERY ====================
  
  ipcMain.handle('db:query', async (event, { model, method, args }) => {
    if (!db[model]) throw new Error(`Unknown model: ${model}`);
    if (!db[model][method]) throw new Error(`Unknown method: ${method} on model ${model}`);
    return await db[model][method](args);
  });

  console.log('[Database] IPC handlers registered');
  } catch (error) {
    console.error('[Database] Failed to setup IPC handlers:', error);
    // Register error handlers for all IPC calls
    const errorHandler = async (event, ...args) => {
      return { success: false, error: `Database not initialized: ${error.message}` };
    };
    // Register fallback handlers for critical operations
    ipcMain.handle('db:test', errorHandler);
    ipcMain.handle('db:get-path', () => getLocalDatabasePath());
    ipcMain.handle('db:get-stats', () => getDatabaseStats());
  }
}

module.exports = {
  initializeDatabase,
  getLocalDatabasePath,
  getAppDataPath,
  getDatabaseStats,
  setupDatabaseIPC,
  ensureAppDataDir,
  getPrismaClient,
};
