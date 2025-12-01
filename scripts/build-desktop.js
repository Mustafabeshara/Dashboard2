/**
 * Desktop Application Build Script
 * Packages the desktop application for distribution
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[Build] ${message}`);
}

function runCommand(command, options = {}) {
  log(`Running: ${command}`);
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      ...options
    });
    return result;
  } catch (error) {
    console.error(`[Error] Command failed: ${command}`);
    throw error;
  }
}

async function buildDesktopApp() {
  log('Starting desktop application build process...');
  
  try {
    // 1. Clean previous builds
    log('Cleaning previous builds...');
    if (fs.existsSync(path.join(process.cwd(), 'dist-electron'))) {
      fs.rmSync(path.join(process.cwd(), 'dist-electron'), { recursive: true });
    }
    
    // 2. Build Next.js application
    log('Building Next.js application...');
    runCommand('npm run build');
    
    // 3. Generate Prisma client for local database
    log('Generating Prisma client for local database...');
    runCommand('npm run db:local:generate');
    
    // 4. Build Electron application
    log('Building Electron application...');
    runCommand('npm run electron:builder');
    
    // 5. Create distributable packages
    log('Creating distributable packages...');
    runCommand('npm run electron:builder:mac');
    
    log('Desktop application build completed successfully!');
    log('Distribution packages are located in the dist-electron directory');
    
  } catch (error) {
    console.error('[Error] Build process failed:', error.message);
    process.exit(1);
  }
}

// Run the build process
if (require.main === module) {
  buildDesktopApp();
}

module.exports = { buildDesktopApp };