#!/usr/bin/env node

/**
 * Desktop Application Build Script
 * Automates the building of the desktop application for all platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BUILD_DIR = 'dist-electron';
const LOG_FILE = 'build.log';

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // Also write to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (err) {
    // Ignore log file errors
  }
}

// Error logging function
function logError(message) {
  log(message, 'ERROR');
}

// Execute command function
function execCommand(command, options = {}) {
  log(`Executing: ${command}`);
  
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      ...options
    });
    return result;
  } catch (error) {
    logError(`Command failed: ${command}`);
    logError(`Error: ${error.message}`);
    throw error;
  }
}

// Check if required tools are installed
function checkPrerequisites() {
  log('Checking prerequisites...');
  
  try {
    execCommand('node --version', { stdio: 'pipe' });
    execCommand('npm --version', { stdio: 'pipe' });
    
    // Check if electron-builder is installed
    try {
      execCommand('npx electron-builder --version', { stdio: 'pipe' });
    } catch (err) {
      log('Installing electron-builder...');
      execCommand('npm install --save-dev electron-builder');
    }
    
    log('Prerequisites check passed');
    return true;
  } catch (error) {
    logError('Prerequisites check failed');
    logError('Please ensure Node.js and npm are installed');
    return false;
  }
}

// Clean previous builds
function cleanBuildDirectory() {
  log('Cleaning build directory...');
  
  try {
    if (fs.existsSync(BUILD_DIR)) {
      log(`Removing ${BUILD_DIR} directory...`);
      fs.rmSync(BUILD_DIR, { recursive: true });
    }
    
    log('Build directory cleaned');
  } catch (error) {
    logError(`Failed to clean build directory: ${error.message}`);
    throw error;
  }
}

// Build Next.js application
async function buildNextApp() {
  log('Building Next.js application...');
  
  try {
    execCommand('npm run build');
    log('Next.js application built successfully');
  } catch (error) {
    logError('Failed to build Next.js application');
    throw error;
  }
}

// Generate Prisma client for local database
async function generatePrismaClient() {
  log('Generating Prisma client for local database...');
  
  try {
    execCommand('npm run db:local:generate');
    log('Prisma client generated successfully');
  } catch (error) {
    logError('Failed to generate Prisma client');
    throw error;
  }
}

// Build Electron application
async function buildElectronApp(platform) {
  log(`Building Electron application for ${platform}...`);
  
  try {
    let command = 'npm run electron:builder';
    
    switch (platform.toLowerCase()) {
      case 'mac':
      case 'macos':
        command = 'npm run electron:builder:mac';
        break;
      case 'win':
      case 'windows':
        command = 'npm run electron:builder:win';
        break;
      case 'linux':
        command = 'npm run electron:builder:linux';
        break;
      case 'all':
        command = 'npm run electron:builder';
        break;
      default:
        log(`Unknown platform: ${platform}, building for current platform`);
    }
    
    execCommand(command);
    log(`Electron application built successfully for ${platform}`);
  } catch (error) {
    logError(`Failed to build Electron application for ${platform}`);
    throw error;
  }
}

// Main build function
async function buildDesktopApp(platform = 'current') {
  log('Starting desktop application build process...');
  log(`Platform: ${platform}`);
  
  try {
    // Check prerequisites
    if (!checkPrerequisites()) {
      process.exit(1);
    }
    
    // Clean build directory
    cleanBuildDirectory();
    
    // Build Next.js application
    await buildNextApp();
    
    // Generate Prisma client
    await generatePrismaClient();
    
    // Build Electron application
    await buildElectronApp(platform);
    
    log('Desktop application build completed successfully!');
    log(`Distribution packages are located in the ${BUILD_DIR} directory`);
    
    // Show build output
    if (fs.existsSync(BUILD_DIR)) {
      log('Build output:');
      const files = fs.readdirSync(BUILD_DIR);
      files.forEach(file => {
        log(`  - ${file}`);
      });
    }
    
  } catch (error) {
    logError('Build process failed');
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  console.log(`
Medical Distribution Dashboard - Desktop Application Build Tool

Usage: node scripts/build-desktop.js [platform]

Platforms:
  mac/macos    - Build for macOS (Intel and Apple Silicon)
  win/windows  - Build for Windows
  linux        - Build for Linux
  all          - Build for all platforms (default)
  current      - Build for current platform

Examples:
  node scripts/build-desktop.js mac
  node scripts/build-desktop.js all
  node scripts/build-desktop.js

Options:
  --help, -h   - Show this help message
  --version, -v - Show version information
  `);
}

// Show version
function showVersion() {
  console.log('Medical Distribution Dashboard Build Tool v1.0.0');
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }
  
  // Get platform argument
  const platform = args[0] || 'all';
  return platform;
}

// Run the build process
async function main() {
  const platform = parseArguments();
  await buildDesktopApp(platform);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    logError(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { buildDesktopApp };