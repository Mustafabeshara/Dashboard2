/**
 * Medical Distribution Dashboard - Electron Main Process
 * With Local Database Support
 */

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

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
        nextServer = spawn(npmPath, ['run', 'dev'], {
          cwd: path.join(__dirname, '..'),
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: { 
            ...process.env, 
            BROWSER: 'none',
            LOCAL_DATABASE_URL: `file:${database.getLocalDatabasePath()}`,
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
  const url = !app.isPackaged ? actualServerUrl + "/login" : `file://${path.join(__dirname, '../out/index.html')}`;
  log(`Loading: ${url}`);
  mainWindow.loadURL(url);
  
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
    { label: 'Sync Now', click: () => { 
      if (mainWindow) mainWindow.webContents.send('sync-now'); 
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
        { label: 'Test Database', click: () => mainWindow?.loadURL(`${actualServerUrl}/test-db`) },
        { type: 'separator' },
        { label: 'Back', accelerator: 'Cmd+[', click: () => mainWindow?.webContents.goBack() },
        { label: 'Forward', accelerator: 'Cmd+]', click: () => mainWindow?.webContents.goForward() },
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
