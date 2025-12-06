/**
 * API Keys Management Endpoint
 * Stores encrypted API keys in the database
 */

import { clearApiKeyCache } from '@/lib/ai/api-keys';
import prisma from '@/lib/prisma';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest, RoleGroups } from '@/lib/middleware/with-auth';
import { ApiResponse, BadRequest, InternalError } from '@/lib/api';
import { logger } from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { z } from 'zod';

// Encryption helpers using AES-256-GCM with random salt per encryption
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): string {
  const key = process.env.NEXTAUTH_SECRET;
  if (!key) {
    throw new Error('NEXTAUTH_SECRET environment variable is required for encryption');
  }
  if (key.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters long');
  }
  return key;
}

function getKey(salt: Buffer): Buffer {
  return scryptSync(getEncryptionKey(), salt, 32);
}

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const salt = randomBytes(32);
  const key = getKey(salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      logger.error('Decryption failed: Invalid encrypted data format', undefined, {
        expectedParts: 4,
        actualParts: parts.length,
      });
      return '';
    }

    const [saltHex, ivHex, authTagHex, encrypted] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey(salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', error instanceof Error ? error : new Error('Unknown error'));
    return '';
  }
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}

interface ApiKeySetting {
  key: string;
  label: string;
  description: string;
  category: string;
  isSecret?: boolean;
}

const API_KEY_SETTINGS: ApiKeySetting[] = [
  // AI Providers
  { key: 'GROQ_API_KEY', label: 'Groq API Key', description: 'Primary AI provider for fast extraction', category: 'ai' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', description: 'Google Gemini for vision/PDF processing', category: 'ai' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', description: 'OpenAI fallback provider', category: 'ai' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', description: 'Claude AI fallback provider', category: 'ai' },
  // OCR Providers
  { key: 'GOOGLE_VISION_API_KEY', label: 'Google Vision API Key', description: 'Google Cloud Vision for OCR', category: 'ocr' },
  { key: 'AWS_ACCESS_KEY_ID', label: 'AWS Access Key ID', description: 'AWS Textract for OCR', category: 'ocr' },
  { key: 'AWS_SECRET_ACCESS_KEY', label: 'AWS Secret Key', description: 'AWS secret access key', category: 'ocr' },
  { key: 'AWS_REGION', label: 'AWS Region', description: 'AWS region (e.g., us-east-1)', isSecret: false, category: 'ocr' },
  // Email Configuration
  { key: 'EMAIL_HOST', label: 'SMTP Host', description: 'Email server hostname', isSecret: false, category: 'email' },
  { key: 'EMAIL_PORT', label: 'SMTP Port', description: 'Email server port', isSecret: false, category: 'email' },
  { key: 'EMAIL_USER', label: 'Email Username', description: 'Your email address', isSecret: false, category: 'email' },
  { key: 'EMAIL_PASSWORD', label: 'Email App Password', description: 'App-specific password', category: 'email' },
  { key: 'EMAIL_FROM', label: 'From Address', description: 'Sender email address', isSecret: false, category: 'email' },
];

const apiKeySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const rateLimiter = rateLimit(RateLimitPresets.strict);

async function handleGet(request: AuthenticatedRequest) {
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const settings = await prisma.appSettings.findMany({
      where: { key: { in: API_KEY_SETTINGS.map(s => s.key) } },
    });

    const response = API_KEY_SETTINGS.map(setting => {
      const dbSetting = settings.find(s => s.key === setting.key);
      const envValue = process.env[setting.key];

      let value = '';
      let source: 'database' | 'environment' | 'not_set' = 'not_set';
      let masked = '';
      const isSecretField = setting.isSecret !== false;

      if (envValue && envValue.length > 0) {
        const lowerEnv = envValue.toLowerCase();
        const isPlaceholder = ['your-', 'placeholder', 'changeme', 'example', 'test-'].some(p =>
          lowerEnv.includes(p)
        );

        if (!isPlaceholder) {
          value = envValue;
          source = 'environment';
          masked = isSecretField ? maskKey(envValue) : envValue;
        }
      }

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

    logger.info('API keys fetched', { context: { userId: request.user.id } });
    return ApiResponse({ settings: response });
  } catch (error) {
    logger.error('Error fetching API keys', error as Error, { userId: request.user.id });
    return InternalError('Failed to fetch API keys');
  }
}

async function handlePost(request: AuthenticatedRequest) {
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const parseResult = apiKeySchema.safeParse(body);

    if (!parseResult.success) {
      return BadRequest('Invalid request body');
    }

    const { key, value } = parseResult.data;

    const settingConfig = API_KEY_SETTINGS.find(s => s.key === key);
    if (!settingConfig) {
      return BadRequest('Invalid setting key');
    }

    if (!value || value.trim() === '') {
      await prisma.appSettings.deleteMany({ where: { key } });
      clearApiKeyCache();
      logger.info('API key removed', { context: { userId: request.user.id, key } });
      return ApiResponse({ success: true, message: 'API key removed' });
    }

    const isSecret = settingConfig.isSecret !== false;
    const storedValue = isSecret ? encrypt(value) : value;

    await prisma.appSettings.upsert({
      where: { key },
      create: { key, value: storedValue, isEncrypted: isSecret, description: settingConfig.description },
      update: { value: storedValue, isEncrypted: isSecret },
    });

    clearApiKeyCache();

    logger.info('API key saved', { context: { userId: request.user.id, key } });
    return ApiResponse({ success: true, message: 'API key saved', maskedValue: isSecret ? maskKey(value) : value });
  } catch (error) {
    logger.error('Error saving API key', error as Error, { userId: request.user.id });
    return InternalError('Failed to save API key');
  }
}

async function handleDelete(request: AuthenticatedRequest) {
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key || !API_KEY_SETTINGS.find(s => s.key === key)) {
      return BadRequest('Invalid key');
    }

    await prisma.appSettings.deleteMany({ where: { key } });
    clearApiKeyCache();

    logger.info('API key deleted', { context: { userId: request.user.id, key } });
    return ApiResponse({ success: true, message: 'API key removed' });
  } catch (error) {
    logger.error('Error deleting API key', error as Error, { userId: request.user.id });
    return InternalError('Failed to delete API key');
  }
}

export const GET = withAuth(handleGet, { roleGroup: 'MANAGEMENT' });
export const POST = withAuth(handlePost, { roleGroup: 'MANAGEMENT' });
export const DELETE = withAuth(handleDelete, { roleGroup: 'MANAGEMENT' });
