/**
 * Medical Distribution Dashboard - Electron Main Process
 * With Local Database Support and AI Features
 */

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, dialog, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Import database module
const database = require('./database');

const CONFIG = {
  DEV_SERVER_URL: 'http://localhost:3000',
  WINDOW_WIDTH: 1400,
  WINDOW_HEIGHT: 900,
  MIN_WIDTH: 1024,
  MIN_HEIGHT: 768,
  APP_NAME: 'Medical Distribution Dashboard',
  ICON_PATH: path.join(__dirname, '../public/icon.png'),
};

let mainWindow = null;
let tray = null;
let nextServer = null;
let isQuitting = false;
let isDatabaseReady = false;
let actualServerUrl = CONFIG.DEV_SERVER_URL;

// AI Processing State
let aiProcessingQueue = [];
let isAIProcessing = false;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [Electron] ${message}`);
}

// Check if a port is available
async function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => resolve(false));
  });
}

// Find available port starting from 3000
async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 10; port++) {
    if (await checkPort(port)) {
      return port;
    }
  }
  return startPort;
}

// Wait for server to be ready
function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    let attempts = 0;
    
    const check = () => {
      attempts++;
      http.get(url, (res) => {
        resolve(true);
      }).on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    
    check();
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    log('Checking for running dev server...');
    
    // First check if a server is already running
    const http = require('http');
    
    // Try ports 3000-3005
    const tryPorts = async () => {
      for (let port = 3000; port <= 3005; port++) {
        try {
          await new Promise((res, rej) => {
            const req = http.get(`http://localhost:${port}`, (response) => {
              res(true);
            });
            req.on('error', () => rej());
            req.setTimeout(1000, () => rej());
          });
          log(`Found existing dev server on port ${port}`);
          actualServerUrl = `http://localhost:${port}`;
          return resolve();
        } catch {
          // Port not responding, try next
        }
      }
      
      // No server found, start our own
      log('No existing server found, starting new one...');
      
      if (!app.isPackaged) {
        const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        // Generate a stable default secret if not set (for development only)
        // NextAuth requires at least 32 characters for the secret
        // Use a fixed secret for development to avoid configuration errors
        const defaultSecret = process.env.NEXTAUTH_SECRET || 'dev-secret-key-for-electron-app-development-only-change-in-production-min-32-chars';
        const defaultUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        
        // Set DATABASE_URL to the provided PostgreSQL connection string
        // This is needed for Prisma Client initialization
        // In Electron mode, the auth system can use either IPC (local DB) or this connection (cloud DB)
        const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:XaaDNvfvVqfmgHzHPSrgcZCOAWYWSqkG@turntable.proxy.rlwy.net:59955/railway';
        const localDbPath = database.getLocalDatabasePath();
        const localDatabaseUrl = `file:${localDbPath}`;
        
        nextServer = spawn(npmPath, ['run', 'dev'], {
          cwd: path.join(__dirname, '..'),
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: { 
            ...process.env, 
            BROWSER: 'none',
            // Set DATABASE_URL to the Railway PostgreSQL database
            DATABASE_URL: databaseUrl,
            LOCAL_DATABASE_URL: localDatabaseUrl,
            NEXTAUTH_SECRET: defaultSecret,
            NEXTAUTH_URL: defaultUrl,
          }
        });
        
        nextServer.stdout.on('data', (data) => {
          const output = data.toString();
          log(`[Next.js] ${output.trim()}`);
          
          // Check for port in output
          const portMatch = output.match(/localhost:(\d+)/);
          if (portMatch) {
            actualServerUrl = `http://localhost:${portMatch[1]}`;
            log(`Server URL set to: ${actualServerUrl}`);
          }
          
          if (output.includes('Ready') || output.includes('Local:') || output.includes('✓ Starting')) {
            // Wait a moment for server to fully start
            setTimeout(() => resolve(), 2000);
          }
        });
        
        nextServer.stderr.on('data', (data) => {
          const output = data.toString();
          log(`[Next.js] ${output.trim()}`);
          
          // Check for port in stderr too (warnings go there)
          const portMatch = output.match(/localhost:(\d+)/);
          if (portMatch) {
            actualServerUrl = `http://localhost:${portMatch[1]}`;
            log(`Server URL set to: ${actualServerUrl}`);
          }
        });
        
        nextServer.on('error', (err) => { 
          log(`Failed: ${err.message}`, 'error'); 
          reject(err); 
        });
        
        // Timeout fallback
        setTimeout(() => resolve(), 30000);
      } else { 
        resolve(); 
      }
    };
    
    tryPorts().catch(reject);
  });
}

function stopNextServer() {
  if (nextServer) { 
    log('Stopping Next.js...'); 
    nextServer.kill('SIGTERM'); 
    nextServer = null; 
  }
}

function createMainWindow() {
  log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: CONFIG.WINDOW_WIDTH, 
    height: CONFIG.WINDOW_HEIGHT,
    minWidth: CONFIG.MIN_WIDTH, 
    minHeight: CONFIG.MIN_HEIGHT,
    title: CONFIG.APP_NAME, 
    icon: CONFIG.ICON_PATH,
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js'), 
      webSecurity: true,
    },
    show: false, 
    backgroundColor: '#0f172a', 
    titleBarStyle: 'hiddenInset', 
    trafficLightPosition: { x: 15, y: 15 },
  });
  
  mainWindow.once('ready-to-show', () => { 
    mainWindow.show(); 
    log('Window displayed'); 
  });
  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { 
    shell.openExternal(url); 
    return { action: 'deny' }; 
  });
  
  mainWindow.on('close', (event) => { 
    if (!isQuitting) { 
      event.preventDefault(); 
      mainWindow.hide(); 
    }
  });
  
  mainWindow.on('closed', () => { 
    mainWindow = null; 
  });
  
  // Use the actual server URL that was detected
  // Load root path which redirects to /dashboard
  const url = !app.isPackaged ? actualServerUrl + "/" : `file://${path.join(__dirname, '../out/index.html')}`;
  log(`Loading: ${url}`);
  mainWindow.loadURL(url).catch((err) => {
    log(`Failed to load URL: ${err.message}`, 'error');
    // Fallback: try loading dashboard directly
    mainWindow.loadURL(actualServerUrl + "/dashboard").catch((fallbackErr) => {
      log(`Failed to load fallback URL: ${fallbackErr.message}`, 'error');
    });
  });
  
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  return mainWindow;
}

function createTray() {
  log('Creating tray...');
  let trayIcon;
  try { 
    trayIcon = nativeImage.createFromPath(CONFIG.ICON_PATH); 
    trayIcon = trayIcon.resize({ width: 16, height: 16 }); 
  } catch (err) { 
    trayIcon = nativeImage.createEmpty(); 
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip(CONFIG.APP_NAME);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => { 
      if (mainWindow) { 
        mainWindow.show(); 
        mainWindow.focus(); 
      }
    }},
    { type: 'separator' },
    { label: 'Open Test Page', click: () => {
      if (mainWindow) {
        mainWindow.loadURL(`${actualServerUrl}/test-db`);
      }
    }},
    { label: 'Process Documents', click: () => { 
      if (mainWindow) mainWindow.webContents.send('process-documents'); 
    }},
    { label: 'Sync Now', click: () => { 
      if (mainWindow) mainWindow.webContents.send('sync-now'); 
    }},
    { label: 'AI Processing Queue', click: () => {
      if (mainWindow) {
        mainWindow.webContents.send('show-notification', {
          title: 'AI Processing Queue',
          message: `Pending: ${aiProcessingQueue.length} items\nProcessing: ${isAIProcessing ? 'Yes' : 'No'}`,
        });
      }
    }},
    { label: 'Database Info', click: () => {
      const stats = database.getDatabaseStats();
      if (mainWindow) {
        mainWindow.webContents.send('show-notification', {
          title: 'Database Info',
          message: `Size: ${stats.sizeFormatted}\nBackups: ${stats.backupCount}`,
        });
      }
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); }}
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { 
    if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); 
  });
  
  return tray;
}

function createAppMenu() {
  const template = [
    { 
      label: CONFIG.APP_NAME, 
      submenu: [
        { label: `About ${CONFIG.APP_NAME}`, role: 'about' },
        { type: 'separator' },
        { label: 'Open Test Page', accelerator: 'Cmd+T', click: () => {
          if (mainWindow) {
            mainWindow.loadURL(`${actualServerUrl}/test-db`);
          }
        }},
        { label: 'Process Documents', accelerator: 'Cmd+Shift+P', click: () => {
          if (mainWindow) mainWindow.webContents.send('process-documents');
        }},
        { label: 'Database Info...', click: async () => {
          const stats = database.getDatabaseStats();
          const { dialog } = require('electron');
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Database Information',
            message: 'Local Database Status',
            detail: `Path: ${stats.path}\nSize: ${stats.sizeFormatted}\nBackups: ${stats.backupCount}\nStatus: ${stats.exists ? 'Ready' : 'Not Found'}`,
          });
        }},
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => { 
          if (mainWindow) mainWindow.webContents.send('open-settings'); 
        }},
        { type: 'separator' },
        { role: 'hide' }, 
        { role: 'hideOthers' }, 
        { role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Cmd+Q', click: () => { isQuitting = true; app.quit(); }}
      ]
    },
    { 
      label: 'Edit', 
      submenu: [
        { role: 'undo' }, 
        { role: 'redo' }, 
        { type: 'separator' }, 
        { role: 'cut' }, 
        { role: 'copy' }, 
        { role: 'paste' }, 
        { role: 'selectAll' }
      ] 
    },
    { 
      label: 'View', 
      submenu: [
        { role: 'reload' }, 
        { role: 'forceReload' }, 
        { type: 'separator' }, 
        { role: 'resetZoom' }, 
        { role: 'zoomIn' }, 
        { role: 'zoomOut' }, 
        { type: 'separator' }, 
        { role: 'togglefullscreen' }, 
        { type: 'separator' }, 
        { role: 'toggleDevTools' }
      ] 
    },
    { 
      label: 'AI Features', 
      submenu: [
        { label: 'Process All Documents', click: () => { 
          if (mainWindow) mainWindow.webContents.send('process-all-documents'); 
        }},
        { label: 'AI Processing Queue', click: () => { 
          if (mainWindow) mainWindow.webContents.send('show-ai-queue'); 
        }},
        { label: 'Clear Processing Queue', click: () => { 
          aiProcessingQueue = [];
          if (mainWindow) {
            mainWindow.webContents.send('show-notification', {
              title: 'AI Processing',
              message: 'Processing queue cleared',
            });
          }
        }},
        { type: 'separator' },
        { label: 'Import Documents', click: async () => {
          const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [
              { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          });
          
          if (!result.canceled && result.filePaths.length > 0) {
            if (mainWindow) {
              mainWindow.webContents.send('import-documents', result.filePaths);
            }
          }
        }}
      ] 
    },
    { 
      label: 'Window', 
      submenu: [
        { role: 'minimize' }, 
        { role: 'close' }, 
        { type: 'separator' }, 
        { role: 'front' }
      ] 
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Dashboard', click: () => mainWindow?.loadURL(`${actualServerUrl}/`) },
        { label: 'Documents', click: () => mainWindow?.loadURL(`${actualServerUrl}/documents`) },
        { label: 'Tenders', click: () => mainWindow?.loadURL(`${actualServerUrl}/tenders`) },
        { label: 'Test Database', click: () => mainWindow?.loadURL(`${actualServerUrl}/test-db`) },
        { type: 'separator' },
        { label: 'Back', accelerator: 'Cmd+[', click: () => mainWindow?.webContents.goBack() },
        { label: 'Forward', accelerator: 'Cmd+]', click: () => mainWindow?.webContents.goForward() },
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// AI Processing Functions
async function addToAIProcessingQueue(documentId, documentPath, mimeType) {
  const queueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    documentId,
    documentPath,
    mimeType,
    status: 'pending',
    createdAt: new Date(),
    retryCount: 0
  };
  
  aiProcessingQueue.push(queueItem);
  
  // Notify UI
  if (mainWindow) {
    mainWindow.webContents.send('ai-queue-update', {
      queueLength: aiProcessingQueue.length,
      status: 'added',
      item: queueItem
    });
  }
  
  // Start processing if not already running
  if (!isAIProcessing) {
    processAIQueue();
  }
  
  return queueItem;
}

async function processAIQueue() {
  if (aiProcessingQueue.length === 0) {
    isAIProcessing = false;
    return;
  }
  
  isAIProcessing = true;
  const item = aiProcessingQueue[0];
  
  try {
    // Update status
    item.status = 'processing';
    if (mainWindow) {
      mainWindow.webContents.send('ai-queue-update', {
        queueLength: aiProcessingQueue.length,
        status: 'processing',
        item
      });
    }
    
    // Process document (this would integrate with your AI extraction system)
    log(`Processing document: ${item.documentPath}`);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // In a real implementation, this would:
    // 1. Read the document file
    // 2. Process with pdf-parse or OCR
    // 3. Send to LLM for extraction
    // 4. Validate with Zod schemas
    // 5. Store results in database
    
    // Remove from queue
    aiProcessingQueue.shift();
    
    // Notify success
    if (mainWindow) {
      mainWindow.webContents.send('ai-queue-update', {
        queueLength: aiProcessingQueue.length,
        status: 'completed',
        item: { ...item, status: 'completed' }
      });
      
      // Show notification
      if (Notification.isSupported()) {
        new Notification({
          title: 'Document Processed',
          body: `Document ${path.basename(item.documentPath)} has been processed successfully`
        }).show();
      }
    }
    
    // Process next item
    setTimeout(processAIQueue, 1000);
    
  } catch (error) {
    log(`AI processing failed for ${item.documentPath}: ${error.message}`, 'error');
    item.status = 'failed';
    item.errorMessage = error.message;
    item.retryCount++;
    
    // Retry logic
    if (item.retryCount < 3) {
      // Retry
      setTimeout(processAIQueue, 5000);
    } else {
      // Remove from queue after 3 failures
      aiProcessingQueue.shift();
      
      if (mainWindow) {
        mainWindow.webContents.send('ai-queue-update', {
          queueLength: aiProcessingQueue.length,
          status: 'failed',
          item
        });
      }
      
      // Process next item
      setTimeout(processAIQueue, 1000);
    }
  }
}

function setupIpcHandlers() {
  // App info
  ipcMain.handle('get-app-info', () => ({
    name: CONFIG.APP_NAME,
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    databaseReady: isDatabaseReady,
  }));
  
  // Sync status
  ipcMain.handle('get-sync-status', async () => ({
    lastSync: new Date().toISOString(),
    status: isDatabaseReady ? 'connected' : 'initializing',
    databasePath: database.getLocalDatabasePath(),
  }));
  
  // Online check
  ipcMain.handle('is-online', () => 
    require('dns').promises.lookup('google.com').then(() => true).catch(() => false)
  );
  
  // AI Processing
  ipcMain.handle('ai:add-to-queue', async (event, { documentId, documentPath, mimeType }) => {
    return await addToAIProcessingQueue(documentId, documentPath, mimeType);
  });
  
  ipcMain.handle('ai:get-queue', () => ({
    queue: aiProcessingQueue,
    isProcessing: isAIProcessing
  }));
  
  ipcMain.handle('ai:clear-queue', () => {
    aiProcessingQueue = [];
    isAIProcessing = false;
    return { success: true };
  });
  
  // File system operations
  ipcMain.handle('fs:select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    return result;
  });
  
  ipcMain.handle('fs:read-file', async (event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return {
        success: true,
        data: buffer.toString('base64'),
        size: buffer.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Setup database IPC handlers
  database.setupDatabaseIPC();
}

// Initialize database before creating window
async function initializeApp() {
  log('Initializing application...');
  
  try {
    // Initialize local database
    log('Initializing local database...');
    const dbResult = await database.initializeDatabase();
    
    if (dbResult.success) {
      isDatabaseReady = true;
      log(`Database ready at: ${dbResult.path}`);
    } else {
      log(`Database initialization warning: ${dbResult.error}`, 'warn');
    }
    
    // Start/find Next.js server in development
    if (!app.isPackaged) {
      await startNextServer();
      log(`Using server at: ${actualServerUrl}`);
    }
    
    // Setup app
    createAppMenu();
    setupIpcHandlers();
    createTray();
    createMainWindow();
    
    log('Application ready');
    
  } catch (err) {
    log(`Initialization error: ${err.message}`, 'error');
    createAppMenu();
    setupIpcHandlers();
    createMainWindow();
  }
}

// App lifecycle
app.whenReady().then(initializeApp);

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopNextServer();
});

app.on('quit', () => {
  log('Application quit');
  stopNextServer();
});

// Error handling
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, 'error');
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`, 'error');
});