#!/usr/bin/env node

/**
 * Application Health Check Script
 * Comprehensive testing of all system components
 */

require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function printHeader(text) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function printWarning(text) {
  console.log(`${colors.yellow}⚠ ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.cyan}ℹ ${text}${colors.reset}`);
}

const checks = [];

// Environment Variables Check
async function checkEnvironmentVariables() {
  printInfo('Checking environment variables...');
  
  const required = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
  ];
  
  const recommended = [
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_VISION_API_KEY',
  ];
  
  let allRequired = true;
  let hasRecommended = false;
  
  for (const varName of required) {
    if (!process.env[varName]) {
      printError(`Missing required: ${varName}`);
      allRequired = false;
    }
  }
  
  for (const varName of recommended) {
    if (process.env[varName] && !process.env[varName].startsWith('your-')) {
      hasRecommended = true;
    }
  }
  
  if (allRequired) {
    printSuccess('All required environment variables set');
  }
  
  if (!hasRecommended) {
    printWarning('No AI providers configured');
  }
  
  return { 
    name: 'Environment Variables', 
    status: allRequired ? 'success' : 'error',
    details: allRequired ? 'All required vars set' : 'Missing required vars'
  };
}

// Database Connection Check
async function checkDatabase() {
  printInfo('Checking database connection...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    printSuccess('Database connection successful');
    return { name: 'Database', status: 'success', details: 'Connected' };
  } catch (error) {
    printError(`Database connection failed: ${error.message}`);
    return { name: 'Database', status: 'error', details: error.message };
  }
}

// AI Providers Check
async function checkAIProviders() {
  printInfo('Checking AI providers...');
  
  const providers = [
    { name: 'Groq', envVar: 'GROQ_API_KEY' },
    { name: 'Gemini', envVar: 'GEMINI_API_KEY' },
    { name: 'Google AI', envVar: 'GOOGLE_AI_API_KEY' },
    { name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
  ];
  
  let configured = 0;
  
  for (const provider of providers) {
    const key = process.env[provider.envVar];
    if (key && !key.startsWith('your-')) {
      configured++;
    }
  }
  
  if (configured === 0) {
    printError('No AI providers configured');
    return { name: 'AI Providers', status: 'error', details: 'None configured' };
  } else if (configured === 1) {
    printWarning(`Only ${configured} provider configured`);
    return { name: 'AI Providers', status: 'warning', details: `${configured} configured` };
  } else {
    printSuccess(`${configured} providers configured`);
    return { name: 'AI Providers', status: 'success', details: `${configured} configured` };
  }
}

// Next.js Build Check
async function checkNextBuild() {
  printInfo('Checking Next.js build...');
  
  const fs = require('fs');
  const path = require('path');
  
  const buildDir = path.join(process.cwd(), '.next');
  
  if (fs.existsSync(buildDir)) {
    printSuccess('Next.js build found');
    return { name: 'Next.js Build', status: 'success', details: 'Build exists' };
  } else {
    printWarning('Next.js not built yet');
    return { name: 'Next.js Build', status: 'warning', details: 'Run: npm run build' };
  }
}

// Dependencies Check
async function checkDependencies() {
  printInfo('Checking dependencies...');
  
  const fs = require('fs');
  const path = require('path');
  
  const nodeModules = path.join(process.cwd(), 'node_modules');
  
  if (fs.existsSync(nodeModules)) {
    printSuccess('Dependencies installed');
    return { name: 'Dependencies', status: 'success', details: 'Installed' };
  } else {
    printError('Dependencies not installed');
    return { name: 'Dependencies', status: 'error', details: 'Run: npm install' };
  }
}

// Prisma Client Check
async function checkPrismaClient() {
  printInfo('Checking Prisma Client...');
  
  try {
    require('@prisma/client');
    printSuccess('Prisma Client generated');
    return { name: 'Prisma Client', status: 'success', details: 'Generated' };
  } catch (error) {
    printError('Prisma Client not generated');
    return { name: 'Prisma Client', status: 'error', details: 'Run: npx prisma generate' };
  }
}

// Port Availability Check
async function checkPort() {
  printInfo('Checking port availability...');
  
  const net = require('net');
  const port = process.env.PORT || 3000;
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        printWarning(`Port ${port} is in use`);
        resolve({ name: 'Port', status: 'warning', details: `Port ${port} in use` });
      } else {
        printError(`Port check failed: ${err.message}`);
        resolve({ name: 'Port', status: 'error', details: err.message });
      }
    });
    
    server.once('listening', () => {
      server.close();
      printSuccess(`Port ${port} is available`);
      resolve({ name: 'Port', status: 'success', details: `Port ${port} available` });
    });
    
    server.listen(port);
  });
}

// File Permissions Check
async function checkFilePermissions() {
  printInfo('Checking file permissions...');
  
  const fs = require('fs');
  const path = require('path');
  
  const criticalPaths = [
    '.env',
    'package.json',
    'prisma/schema.prisma',
  ];
  
  let allReadable = true;
  
  for (const filePath of criticalPaths) {
    const fullPath = path.join(process.cwd(), filePath);
    try {
      fs.accessSync(fullPath, fs.constants.R_OK);
    } catch (error) {
      if (filePath !== '.env') { // .env might not exist in production
        printWarning(`Cannot read: ${filePath}`);
        allReadable = false;
      }
    }
  }
  
  if (allReadable) {
    printSuccess('All critical files readable');
    return { name: 'File Permissions', status: 'success', details: 'All readable' };
  } else {
    printWarning('Some files not readable');
    return { name: 'File Permissions', status: 'warning', details: 'Check permissions' };
  }
}

// Main execution
async function main() {
  printHeader('Application Health Check');
  
  console.log('Running comprehensive system checks...\n');
  
  const results = [];
  
  // Run all checks
  results.push(await checkEnvironmentVariables());
  results.push(await checkDependencies());
  results.push(await checkPrismaClient());
  results.push(await checkDatabase());
  results.push(await checkAIProviders());
  results.push(await checkNextBuild());
  results.push(await checkPort());
  results.push(await checkFilePermissions());
  
  // Summary
  printHeader('Health Check Summary');
  
  const successful = results.filter((r) => r.status === 'success').length;
  const warnings = results.filter((r) => r.status === 'warning').length;
  const errors = results.filter((r) => r.status === 'error').length;
  
  console.log(`Total Checks: ${results.length}`);
  printSuccess(`Passed: ${successful}`);
  if (warnings > 0) printWarning(`Warnings: ${warnings}`);
  if (errors > 0) printError(`Failed: ${errors}`);
  
  console.log('\nDetailed Results:');
  results.forEach((result) => {
    const icon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
    const color = result.status === 'success' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red;
    console.log(`  ${color}${icon} ${result.name}${colors.reset} - ${result.details}`);
  });
  
  console.log('');
  
  if (errors > 0) {
    printError('System is not ready for deployment');
    printInfo('Fix the errors above before deploying');
    process.exit(1);
  } else if (warnings > 0) {
    printWarning('System has warnings but can proceed');
    printInfo('Consider addressing warnings for optimal performance');
  } else {
    printSuccess('All checks passed! System is ready for deployment');
  }
  
  console.log('');
}

main().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
