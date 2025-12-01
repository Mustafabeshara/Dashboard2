#!/usr/bin/env node

/**
 * Desktop Application Development Script
 * Automates the development environment for the desktop application
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const LOG_FILE = 'dev.log';

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

// Check if required tools are installed
function checkPrerequisites() {
  log('Checking prerequisites...');
  
  try {
    execSync('node --version', { stdio: 'pipe' });
    execSync('npm --version', { stdio: 'pipe' });
    
    log('Prerequisites check passed');
    return true;
  } catch (error) {
    logError('Prerequisites check failed');
    logError('Please ensure Node.js and npm are installed');
    return false;
  }
}

// Install dependencies if needed
function installDependencies() {
  log('Checking dependencies...');
  
  try {
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      log('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      log('Dependencies installed successfully');
    } else {
      log('Dependencies already installed');
    }
  } catch (error) {
    logError('Failed to install dependencies');
    throw error;
  }
}

// Generate Prisma client for local database
async function generatePrismaClient() {
  log('Generating Prisma client for local database...');
  
  try {
    execSync('npm run db:local:generate', { stdio: 'inherit' });
    log('Prisma client generated successfully');
  } catch (error) {
    logError('Failed to generate Prisma client');
    throw error;
  }
}

// Start Next.js development server
function startNextDevServer() {
  log('Starting Next.js development server...');
  
  return new Promise((resolve, reject) => {
    const nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit'
    });
    
    nextProcess.on('error', (error) => {
      logError(`Failed to start Next.js development server: ${error.message}`);
      reject(error);
    });
    
    // Give the server some time to start
    setTimeout(() => {
      log('Next.js development server started');
      resolve(nextProcess);
    }, 5000);
  });
}

// Start Electron application
function startElectronApp() {
  log('Starting Electron application...');
  
  return new Promise((resolve, reject) => {
    const electronProcess = spawn('npx', ['wait-on', 'http://localhost:3000', '&&', 'electron', '.'], {
      stdio: 'inherit',
      shell: true
    });
    
    electronProcess.on('error', (error) => {
      logError(`Failed to start Electron application: ${error.message}`);
      reject(error);
    });
    
    electronProcess.on('close', (code) => {
      if (code !== 0) {
        logError(`Electron application exited with code ${code}`);
      } else {
        log('Electron application closed successfully');
      }
      resolve(code);
    });
    
    log('Electron application started');
    resolve(electronProcess);
  });
}

// Start development environment
async function startDevelopmentEnvironment() {
  log('Starting desktop application development environment...');
  
  try {
    // Check prerequisites
    if (!checkPrerequisites()) {
      process.exit(1);
    }
    
    // Install dependencies
    installDependencies();
    
    // Generate Prisma client
    await generatePrismaClient();
    
    // Start Next.js development server
    const nextProcess = await startNextDevServer();
    
    // Start Electron application
    const electronProcess = await startElectronApp();
    
    log('Development environment started successfully!');
    log('The desktop application should now be running.');
    log('Changes to the code will automatically reload the application.');
    
    // Handle process termination
    process.on('SIGINT', () => {
      log('Shutting down development environment...');
      if (nextProcess) {
        nextProcess.kill();
      }
      if (electronProcess) {
        electronProcess.kill();
      }
      process.exit(0);
    });
    
  } catch (error) {
    logError('Failed to start development environment');
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  console.log(`
Medical Distribution Dashboard - Desktop Application Development Tool

Usage: node scripts/dev-desktop.js

This script starts the development environment for the desktop application,
which includes both the Next.js web application and the Electron desktop wrapper.

Features:
  - Hot reloading for frontend changes
  - Automatic restart on backend changes
  - Integrated development workflow
  - Logging to dev.log file

Options:
  --help, -h   - Show this help message
  --version, -v - Show version information
  `);
}

// Show version
function showVersion() {
  console.log('Medical Distribution Dashboard Development Tool v1.0.0');
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
}

// Run the development environment
async function main() {
  parseArguments();
  await startDevelopmentEnvironment();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    logError(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { startDevelopmentEnvironment };