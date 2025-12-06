/**
 * Electron Auto-Updater Module
 * Handles automatic updates for the desktop application
 */

const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Auto-updater configuration
autoUpdater.autoDownload = false; // Ask user before downloading
autoUpdater.autoInstallOnAppQuit = true;

// Track update state
let updateAvailable = false;
let updateDownloaded = false;
let downloadProgress = 0;
let mainWindow = null;

/**
 * Initialize auto-updater with main window reference
 */
function initialize(window) {
  mainWindow = window;
  setupEventHandlers();
  log.info('Auto-updater initialized');
}

/**
 * Setup all auto-updater event handlers
 */
function setupEventHandlers() {
  // Checking for updates
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    sendStatusToWindow('checking');
  });

  // Update available
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    updateAvailable = true;
    sendStatusToWindow('available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });

    // Show dialog to user
    showUpdateDialog(info);
  });

  // No update available
  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available. Current version:', info.version);
    updateAvailable = false;
    sendStatusToWindow('not-available', { version: info.version });
  });

  // Download progress
  autoUpdater.on('download-progress', (progressObj) => {
    downloadProgress = progressObj.percent;
    log.info(`Download progress: ${Math.round(downloadProgress)}%`);
    sendStatusToWindow('downloading', {
      percent: downloadProgress,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    updateDownloaded = true;
    sendStatusToWindow('downloaded', { version: info.version });

    // Show install dialog
    showInstallDialog(info);
  });

  // Error handling
  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    sendStatusToWindow('error', { message: err.message });
  });
}

/**
 * Send status update to renderer process
 */
function sendStatusToWindow(status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...data });
  }
}

/**
 * Show dialog when update is available
 */
async function showUpdateDialog(info) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    detail: `Current version: ${require('../package.json').version}\n\nWould you like to download the update now?`,
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) {
    log.info('User chose to download update');
    autoUpdater.downloadUpdate();
  } else {
    log.info('User chose to update later');
  }
}

/**
 * Show dialog when update is downloaded
 */
async function showInstallDialog(info) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded.`,
    detail: 'The application will restart to install the update.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) {
    log.info('User chose to restart and install');
    autoUpdater.quitAndInstall(false, true);
  } else {
    log.info('User chose to install later');
  }
}

/**
 * Check for updates manually
 */
function checkForUpdates() {
  log.info('Manually checking for updates');
  autoUpdater.checkForUpdates().catch((err) => {
    log.error('Failed to check for updates:', err);
  });
}

/**
 * Download available update
 */
function downloadUpdate() {
  if (updateAvailable) {
    log.info('Starting update download');
    autoUpdater.downloadUpdate();
  } else {
    log.warn('No update available to download');
  }
}

/**
 * Install downloaded update
 */
function installUpdate() {
  if (updateDownloaded) {
    log.info('Installing update...');
    autoUpdater.quitAndInstall(false, true);
  } else {
    log.warn('No update downloaded to install');
  }
}

/**
 * Get current update status
 */
function getUpdateStatus() {
  return {
    updateAvailable,
    updateDownloaded,
    downloadProgress,
  };
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  ipcMain.handle('updater:check', () => {
    checkForUpdates();
    return { checking: true };
  });

  ipcMain.handle('updater:download', () => {
    downloadUpdate();
    return { downloading: true };
  });

  ipcMain.handle('updater:install', () => {
    installUpdate();
    return { installing: true };
  });

  ipcMain.handle('updater:status', () => {
    return getUpdateStatus();
  });

  ipcMain.handle('updater:get-version', () => {
    return {
      current: require('../package.json').version,
      updateAvailable,
      updateDownloaded,
    };
  });
}

/**
 * Set update feed URL for custom update server
 */
function setFeedURL(url) {
  autoUpdater.setFeedURL(url);
  log.info('Update feed URL set to:', url);
}

module.exports = {
  initialize,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateStatus,
  setupIpcHandlers,
  setFeedURL,
};
