#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Checks which API keys are configured and from which source
 */

console.log('═══════════════════════════════════════════════════════');
console.log('  Environment Variables Check');
console.log('═══════════════════════════════════════════════════════\n');

const API_KEYS = [
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const placeholderPatterns = ['your-', 'placeholder', 'changeme', 'example', 'test-'];

function isPlaceholder(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return placeholderPatterns.some(pattern => lower.includes(pattern));
}

function maskValue(value, key) {
  if (!value) return '(not set)';
  if (key === 'AWS_REGION' || key === 'NEXTAUTH_URL') return value;
  if (value.length < 12) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
}

console.log('Required Variables:\n');

let configuredCount = 0;
let missingCount = 0;

API_KEYS.forEach(key => {
  const value = process.env[key];
  const isSet = value && value.length > 0;
  const isValid = isSet && !isPlaceholder(value);

  let status = '❌ NOT SET';
  let display = '(missing)';

  if (isValid) {
    status = '✅ CONFIGURED';
    display = maskValue(value, key);
    configuredCount++;
  } else if (isSet) {
    status = '⚠️  PLACEHOLDER';
    display = '(placeholder value)';
    missingCount++;
  } else {
    missingCount++;
  }

  console.log(`${status}  ${key.padEnd(25)} ${display}`);
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`Summary: ${configuredCount} configured, ${missingCount} missing`);
console.log('═══════════════════════════════════════════════════════\n');

if (missingCount > 0) {
  console.log('⚠️  Missing Variables:\n');

  if (!process.env.DATABASE_URL || isPlaceholder(process.env.DATABASE_URL)) {
    console.log('❌ DATABASE_URL - CRITICAL');
    console.log('   Get from: Railway Dashboard → Postgres → Connect → DATABASE_URL');
    console.log('   Or reference: ${{Postgres.DATABASE_URL}}\n');
  }

  if (!process.env.NEXTAUTH_SECRET || isPlaceholder(process.env.NEXTAUTH_SECRET)) {
    console.log('❌ NEXTAUTH_SECRET - CRITICAL');
    console.log('   Generate: openssl rand -base64 32');
    console.log('   Then add to Railway Variables tab\n');
  }

  if (!process.env.NEXTAUTH_URL || isPlaceholder(process.env.NEXTAUTH_URL)) {
    console.log('⚠️  NEXTAUTH_URL - RECOMMENDED');
    console.log('   Set to: https://your-app-name.up.railway.app');
    console.log('   Or for local: http://localhost:3000\n');
  }

  if (!process.env.GEMINI_API_KEY || isPlaceholder(process.env.GEMINI_API_KEY)) {
    console.log('⚠️  GEMINI_API_KEY - For AI features');
    console.log('   Get from: https://aistudio.google.com/app/apikey');
    console.log('   Click "Create API Key"\n');
  }

  if (!process.env.GROQ_API_KEY || isPlaceholder(process.env.GROQ_API_KEY)) {
    console.log('⚠️  GROQ_API_KEY - For AI features (fallback)');
    console.log('   Get from: https://console.groq.com/keys');
    console.log('   Click "Create API Key"\n');
  }
}

console.log('\nNext Steps:\n');
console.log('1. Go to Railway Dashboard: https://railway.app/dashboard');
console.log('2. Select your project → App Service');
console.log('3. Click "Variables" tab');
console.log('4. Click "+ New Variable" and add missing keys');
console.log('5. Redeploy after adding variables\n');

console.log('For local development:');
console.log('  cp .env.example .env');
console.log('  nano .env  # Edit with your values');
console.log('  npm run dev\n');
