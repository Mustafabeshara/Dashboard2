#!/usr/bin/env node
/**
 * Production server for Railway deployment
 * Uses the standalone Next.js build
 */

// Set hostname to bind to all interfaces
process.env.HOSTNAME = '0.0.0.0';
process.env.HOST = '0.0.0.0';

// Set port from Railway's PORT env var
const port = process.env.PORT || 3000;
process.env.PORT = port.toString();

console.log(`Starting server on 0.0.0.0:${port}...`);

// Load and run the standalone server
require('./.next/standalone/server.js');
