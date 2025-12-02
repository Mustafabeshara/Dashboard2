#!/usr/bin/env node
/**
 * Production server for Railway deployment
 * Uses the standalone Next.js build
 */

const path = require('path');
const fs = require('fs');

// Validate environment variables
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these in your Railway dashboard.');
  process.exit(1);
}

// Set hostname to bind to all interfaces
process.env.HOSTNAME = '0.0.0.0';
process.env.HOST = '0.0.0.0';

// Set port from Railway's PORT env var
const port = process.env.PORT || 3000;
process.env.PORT = port.toString();

// Check if standalone build exists
const standalonePath = path.join(__dirname, '.next/standalone/server.js');
if (!fs.existsSync(standalonePath)) {
  console.error('❌ Standalone build not found at:', standalonePath);
  console.error('Make sure next.config.ts has output: "standalone"');
  process.exit(1);
}

console.log('✅ Environment variables validated');
console.log(`🚀 Starting server on 0.0.0.0:${port}...`);

// Load and run the standalone server
require('./.next/standalone/server.js');
