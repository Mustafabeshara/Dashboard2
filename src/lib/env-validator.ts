/**
 * Environment Variable Validation
 * Validates required environment variables on startup with fail-fast approach
 */

import { z } from 'zod'

// Define environment schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOCAL_DATABASE_URL: z.string().optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // AI Providers (at least one required)
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // OCR Providers (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  GOOGLE_VISION_API_KEY: z.string().optional(),

  // Email (optional)
  EMAIL_SERVER: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Storage (optional)
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Business Rules
  DEFAULT_CURRENCY: z.string().default('KWD'),
  AUTO_APPROVE_THRESHOLD: z.coerce.number().default(1000),
  MANAGER_APPROVE_THRESHOLD: z.coerce.number().default(10000),
  FINANCE_MANAGER_APPROVE_THRESHOLD: z.coerce.number().default(50000),
  CFO_APPROVE_THRESHOLD: z.coerce.number().default(100000),
  BUDGET_WARNING_THRESHOLD: z.coerce.number().default(80),
  BUDGET_CRITICAL_THRESHOLD: z.coerce.number().default(90),

  // Build-time flags
  SKIP_DB_CONNECTION: z.string().optional(),
  ELECTRON_IS_DEV: z.string().optional(),

  // Security
  ALLOWED_ORIGINS: z.string().optional(),
  SESSION_TIMEOUT: z.coerce.number().default(30),
}).refine(
  (data) => {
    // At least one AI provider must be configured
    return !!(
      data.GROQ_API_KEY ||
      data.GEMINI_API_KEY ||
      data.GOOGLE_AI_API_KEY ||
      data.OPENAI_API_KEY ||
      data.ANTHROPIC_API_KEY
    )
  },
  {
    message: 'At least one AI provider API key must be configured (GROQ_API_KEY, GEMINI_API_KEY, GOOGLE_AI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)',
  }
).refine(
  (data) => {
    // If OCR is configured, ensure all required AWS or Google Vision credentials are present
    if (data.AWS_ACCESS_KEY_ID || data.AWS_SECRET_ACCESS_KEY) {
      return !!(data.AWS_ACCESS_KEY_ID && data.AWS_SECRET_ACCESS_KEY && data.AWS_REGION)
    }
    return true
  },
  {
    message: 'If using AWS Textract, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION must all be configured',
  }
).refine(
  (data) => {
    // If S3 storage is configured, ensure all required credentials are present
    if (data.S3_BUCKET_NAME) {
      return !!(data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY && data.S3_REGION)
    }
    return true
  },
  {
    message: 'If using S3 storage, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_REGION must all be configured',
  }
).refine(
  (data) => {
    // If email is configured, ensure all required credentials are present
    if (data.EMAIL_SERVER) {
      return !!(data.EMAIL_USER && data.EMAIL_PASSWORD && data.EMAIL_FROM)
    }
    return true
  },
  {
    message: 'If using email service, EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM must all be configured',
  }
)

export type Env = z.infer<typeof envSchema>

/**
 * Validate environment variables
 * @throws {Error} If validation fails
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env)
    console.log('✅ Environment variables validated successfully')
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment configuration. Check the errors above.')
    }
    throw error
  }
}

/**
 * Get validated environment variables
 * Memoized to avoid repeated validation
 */
let validatedEnv: Env | null = null

export function getEnv(): Env {
  if (!validatedEnv) {
    validatedEnv = validateEnv()
  }
  return validatedEnv
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  const env = getEnv()
  return {
    nodeEnv: env.NODE_ENV,
    database: env.DATABASE_URL ? 'configured' : 'missing',
    aiProviders: {
      groq: !!env.GROQ_API_KEY,
      gemini: !!env.GEMINI_API_KEY,
      googleAI: !!env.GOOGLE_AI_API_KEY,
      openai: !!env.OPENAI_API_KEY,
      anthropic: !!env.ANTHROPIC_API_KEY,
    },
    ocrProviders: {
      awsTextract: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
      googleVision: !!env.GOOGLE_VISION_API_KEY,
    },
    storage: {
      s3: !!env.S3_BUCKET_NAME,
    },
    cache: {
      redis: !!env.REDIS_URL,
    },
    email: !!env.EMAIL_SERVER,
  }
}

/**
 * Get enabled AI providers
 */
export function getEnabledProviders(): string[] {
  const env = getEnv()
  const providers: string[] = []

  if (env.GROQ_API_KEY) providers.push('groq')
  if (env.GEMINI_API_KEY) providers.push('gemini')
  if (env.GOOGLE_AI_API_KEY) providers.push('google-ai')
  if (env.OPENAI_API_KEY) providers.push('openai')
  if (env.ANTHROPIC_API_KEY) providers.push('anthropic')

  return providers
}

// Validate on module load in non-build environments
if (process.env.SKIP_DB_CONNECTION !== 'true' && typeof window === 'undefined') {
  try {
    validateEnv()
  } catch (error) {
    console.error('Environment validation failed on startup')
    // Don't exit in development to allow hot reload
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}
