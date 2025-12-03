/**
 * API Keys Loader
 * Loads encrypted API keys from database and caches them
 * Falls back to environment variables if database keys not available
 */

import prisma from '@/lib/prisma';
import { createDecipheriv, scryptSync, createHash } from 'crypto';

// Cache for API keys to avoid repeated database calls
let apiKeyCache: Map<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Encryption config (must match api-keys route.ts)
const ALGORITHM = 'aes-256-gcm';

/**
 * Get encryption key - derives a secure key from the secret
 * Uses a deterministic salt derived from the secret itself for consistency
 */
function getEncryptionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('NEXTAUTH_SECRET is required for API key encryption in production');
  }

  return secret || 'development-fallback-key-not-for-production';
}

/**
 * Derive encryption key with proper salt
 * The salt is derived from the secret to ensure consistency across restarts
 */
function getKey(): Buffer {
  const secret = getEncryptionSecret();
  // Create a deterministic salt from the secret hash (first 16 bytes)
  // This is more secure than a static 'salt' string
  const saltSource = createHash('sha256').update(secret + '-api-key-salt').digest();
  const salt = saltSource.slice(0, 16);
  return scryptSync(secret, salt, 32);
}

function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return '';

    const [ivHex, authTagHex, encrypted] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey();

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return '';
  }
}

/**
 * Load all API keys from database and cache them
 */
async function loadApiKeysFromDatabase(): Promise<Map<string, string>> {
  const keys = new Map<string, string>();

  try {
    const settings = await prisma.appSettings.findMany({
      where: {
        key: {
          in: [
            'GROQ_API_KEY',
            'GEMINI_API_KEY',
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY',
            'FORGE_API_KEY',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_REGION',
          ],
        },
      },
    });

    for (const setting of settings) {
      const value = setting.isEncrypted ? decrypt(setting.value) : setting.value;
      if (value) {
        keys.set(setting.key, value);
      }
    }
  } catch (error) {
    console.error('Failed to load API keys from database:', error);
  }

  return keys;
}

/**
 * Get API key by name - checks environment variables first (Railway), then database
 * Priority: Environment Variables > Database > null
 */
export async function getApiKey(keyName: string): Promise<string | null> {
  // Don't return placeholder values - check for common placeholder patterns
  const placeholderPatterns = [
    'your-',
    '-key',
    'placeholder',
    'changeme',
    'replace-me',
    'example',
    'xxx',
    'test-',
    'dummy',
    'sample',
    'temp-',
  ];

  // PRIORITY 1: Check environment variable first (Railway/production)
  const envValue = process.env[keyName];
  if (envValue) {
    const lowerValue = envValue.toLowerCase();
    const isPlaceholder = placeholderPatterns.some(pattern =>
      lowerValue.includes(pattern.toLowerCase())
    );
    if (!isPlaceholder && envValue.length > 10) {
      return envValue;
    }
  }

  // PRIORITY 2: Fall back to database (for local/desktop mode)
  // Check if cache is still valid
  const now = Date.now();
  if (!apiKeyCache || now - cacheTimestamp > CACHE_TTL) {
    apiKeyCache = await loadApiKeysFromDatabase();
    cacheTimestamp = now;
  }

  const dbValue = apiKeyCache.get(keyName);
  if (dbValue && dbValue.length > 0) {
    // Double-check database value is not a placeholder
    const lowerDbValue = dbValue.toLowerCase();
    const isDbPlaceholder = placeholderPatterns.some(pattern =>
      lowerDbValue.includes(pattern.toLowerCase())
    );
    if (!isDbPlaceholder) {
      return dbValue;
    }
  }

  return null;
}

/**
 * Get Groq API key
 */
export async function getGroqApiKey(): Promise<string | null> {
  return getApiKey('GROQ_API_KEY');
}

/**
 * Get Gemini API key
 */
export async function getGeminiApiKey(): Promise<string | null> {
  return getApiKey('GEMINI_API_KEY');
}

/**
 * Get Forge API key (for Gemini via Forge)
 */
export async function getForgeApiKey(): Promise<string | null> {
  const forgeKey = await getApiKey('FORGE_API_KEY');
  if (forgeKey) return forgeKey;

  return getApiKey('OPENAI_API_KEY');
}

/**
 * Get OpenAI API key
 */
export async function getOpenAIApiKey(): Promise<string | null> {
  return getApiKey('OPENAI_API_KEY');
}

/**
 * Check if any AI provider is configured
 */
export async function isAnyProviderConfigured(): Promise<boolean> {
  const [groq, gemini, openai, forge] = await Promise.all([
    getGroqApiKey(),
    getGeminiApiKey(),
    getOpenAIApiKey(),
    getForgeApiKey(),
  ]);

  return !!(groq || gemini || openai || forge);
}

/**
 * Get all configured providers
 */
export async function getConfiguredProviders(): Promise<string[]> {
  const providers: string[] = [];

  if (await getGroqApiKey()) providers.push('groq');
  if (await getGeminiApiKey()) providers.push('gemini');
  if (await getOpenAIApiKey()) providers.push('openai');
  if (await getForgeApiKey()) providers.push('forge');

  return providers;
}

/**
 * Clear the API key cache (useful after updating keys)
 */
export function clearApiKeyCache(): void {
  apiKeyCache = null;
  cacheTimestamp = 0;
}

/**
 * Get API key source (environment or database)
 * Returns which source the API key is coming from
 */
export async function getApiKeySource(
  keyName: string
): Promise<'environment' | 'database' | 'not_set'> {
  const placeholderPatterns = [
    'your-',
    '-key',
    'placeholder',
    'changeme',
    'replace-me',
    'example',
    'xxx',
    'test-',
    'dummy',
    'sample',
    'temp-',
  ];

  // Check environment variable first
  const envValue = process.env[keyName];
  if (envValue) {
    const lowerValue = envValue.toLowerCase();
    const isPlaceholder = placeholderPatterns.some(pattern =>
      lowerValue.includes(pattern.toLowerCase())
    );
    if (!isPlaceholder && envValue.length > 10) {
      return 'environment';
    }
  }

  // Check database
  const now = Date.now();
  if (!apiKeyCache || now - cacheTimestamp > CACHE_TTL) {
    apiKeyCache = await loadApiKeysFromDatabase();
    cacheTimestamp = now;
  }

  const dbValue = apiKeyCache.get(keyName);
  if (dbValue && dbValue.length > 0) {
    const lowerDbValue = dbValue.toLowerCase();
    const isDbPlaceholder = placeholderPatterns.some(pattern =>
      lowerDbValue.includes(pattern.toLowerCase())
    );
    if (!isDbPlaceholder) {
      return 'database';
    }
  }

  return 'not_set';
}

/**
 * Get AWS credentials
 */
export async function getAWSCredentials(): Promise<{
  accessKeyId: string | null;
  secretAccessKey: string | null;
  region: string | null;
}> {
  return {
    accessKeyId: await getApiKey('AWS_ACCESS_KEY_ID'),
    secretAccessKey: await getApiKey('AWS_SECRET_ACCESS_KEY'),
    region: await getApiKey('AWS_REGION'),
  };
}
