/**
 * API Keys Management Endpoint
 * Stores encrypted API keys in the database
 */

import { clearApiKeyCache } from '@/lib/ai/api-keys';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Encryption helpers using AES-256-GCM with random salt per encryption
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'fallback-key-for-development-only';
const ALGORITHM = 'aes-256-gcm';

function getKey(salt: Buffer): Buffer {
  return scryptSync(ENCRYPTION_KEY, salt, 32);
}

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const salt = randomBytes(32); // Generate random salt for each encryption
  const key = getKey(salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return salt:iv:authTag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  try {
    const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey(salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return '';
  }
}

// Mask API key for display (show first 4 and last 4 chars)
function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}

// API key setting interface
interface ApiKeySetting {
  key: string;
  label: string;
  description: string;
  category: string;
  isSecret?: boolean;
}

// Valid API key settings
const API_KEY_SETTINGS: ApiKeySetting[] = [
  // AI Providers
  {
    key: 'GROQ_API_KEY',
    label: 'Groq API Key',
    description: 'Primary AI provider for fast extraction',
    category: 'ai',
  },
  {
    key: 'GEMINI_API_KEY',
    label: 'Gemini API Key',
    description: 'Google Gemini for vision/PDF processing',
    category: 'ai',
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    description: 'OpenAI fallback provider',
    category: 'ai',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API Key',
    description: 'Claude AI fallback provider',
    category: 'ai',
  },
  // OCR Providers
  {
    key: 'GOOGLE_VISION_API_KEY',
    label: 'Google Vision API Key',
    description: 'Google Cloud Vision for OCR (scanned documents)',
    category: 'ocr',
  },
  {
    key: 'AWS_ACCESS_KEY_ID',
    label: 'AWS Access Key ID',
    description: 'AWS Textract for OCR',
    category: 'ocr',
  },
  {
    key: 'AWS_SECRET_ACCESS_KEY',
    label: 'AWS Secret Key',
    description: 'AWS secret access key',
    category: 'ocr',
  },
  {
    key: 'AWS_REGION',
    label: 'AWS Region',
    description: 'AWS region (e.g., us-east-1)',
    isSecret: false,
    category: 'ocr',
  },
  // Email Configuration
  {
    key: 'EMAIL_HOST',
    label: 'SMTP Host',
    description: 'Email server hostname (e.g., smtp.mail.yahoo.com)',
    isSecret: false,
    category: 'email',
  },
  {
    key: 'EMAIL_PORT',
    label: 'SMTP Port',
    description: 'Email server port (587 for TLS, 465 for SSL)',
    isSecret: false,
    category: 'email',
  },
  {
    key: 'EMAIL_USER',
    label: 'Email Username',
    description: 'Your email address for authentication',
    isSecret: false,
    category: 'email',
  },
  {
    key: 'EMAIL_PASSWORD',
    label: 'Email App Password',
    description: 'App-specific password (not your regular password)',
    category: 'email',
  },
  {
    key: 'EMAIL_FROM',
    label: 'From Address',
    description: 'Sender email address for notifications',
    isSecret: false,
    category: 'email',
  },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow management roles to view API keys
    const allowedRoles = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - requires management role' }, { status: 403 });
    }

    // Get all API key settings from database
    const settings = await prisma.appSettings.findMany({
      where: {
        key: { in: API_KEY_SETTINGS.map(s => s.key) },
      },
    });

    // Build response with masked keys
    // PRIORITY: Check environment first (Railway), then database
    const response = API_KEY_SETTINGS.map(setting => {
      const dbSetting = settings.find(s => s.key === setting.key);
      const envValue = process.env[setting.key];

      let value = '';
      let source: 'database' | 'environment' | 'not_set' = 'not_set';
      let masked = '';

      // Check if this field should be treated as secret (default true)
      const isSecretField = setting.isSecret !== false;

      // PRIORITY 1: Check environment variable first (Railway/production)
      if (envValue && envValue.length > 0) {
        // Don't show placeholder values
        const lowerEnv = envValue.toLowerCase();
        const isPlaceholder = ['your-', 'placeholder', 'changeme', 'example', 'test-'].some(p =>
          lowerEnv.includes(p)
        );

        if (!isPlaceholder && envValue.length > 0) {
          value = envValue;
          source = 'environment';
          masked = isSecretField ? maskKey(envValue) : envValue;
        }
      }

      // PRIORITY 2: Fall back to database if no valid environment variable
      if (!value && dbSetting) {
        const decrypted = dbSetting.isEncrypted ? decrypt(dbSetting.value) : dbSetting.value;
        if (decrypted && decrypted.length > 0) {
          value = decrypted;
          source = 'database';
          masked = isSecretField ? maskKey(decrypted) : decrypted;
        }
      }

      return {
        key: setting.key,
        label: setting.label,
        description: setting.description,
        isSet: !!value,
        source,
        maskedValue: masked,
        isSecret: isSecretField,
        category: setting.category || 'other',
      };
    });

    return NextResponse.json({ settings: response });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow management roles to update API keys
    const allowedRoles = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - requires management role' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    // Validate the key is allowed
    const settingConfig = API_KEY_SETTINGS.find(s => s.key === key);
    if (!settingConfig) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 });
    }

    // Delete if value is empty
    if (!value || value.trim() === '') {
      await prisma.appSettings.deleteMany({ where: { key } });
      return NextResponse.json({ success: true, message: 'API key removed' });
    }

    // Encrypt sensitive values (check if field has isSecret: false explicitly)
    const isSecret = settingConfig.isSecret !== false;
    const storedValue = isSecret ? encrypt(value) : value;

    // Upsert the setting
    await prisma.appSettings.upsert({
      where: { key },
      create: {
        key,
        value: storedValue,
        isEncrypted: isSecret,
        description: settingConfig.description,
      },
      update: {
        value: storedValue,
        isEncrypted: isSecret,
      },
    });

    // Clear the API key cache so new key is used immediately
    clearApiKeyCache();

    return NextResponse.json({
      success: true,
      message: 'API key saved',
      maskedValue: isSecret ? maskKey(value) : value,
    });
  } catch (error) {
    console.error('Error saving API key:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - requires management role' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key || !API_KEY_SETTINGS.find(s => s.key === key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    await prisma.appSettings.deleteMany({ where: { key } });

    // Clear the API key cache
    clearApiKeyCache();

    return NextResponse.json({ success: true, message: 'API key removed' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
