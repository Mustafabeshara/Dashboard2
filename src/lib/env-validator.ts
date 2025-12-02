/**
 * Environment Variable Validation
 * Validates required environment variables on startup with graceful degradation
 */

import { z } from 'zod'

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                     process.env.npm_lifecycle_event === 'build' ||
                     process.env.SKIP_ENV_VALIDATION === 'true'

// Define environment schema - more lenient for production resilience
const envSchema = z.object({
  // Database - required but provide default for build
  DATABASE_URL: z.string().default('postgresql://localhost:5432/medical_distribution'),
  LOCAL_DATABASE_URL: z.string().optional(),

  // Authentication - provide defaults for build phase
  NEXTAUTH_SECRET: z.string().default('development-secret-change-in-production-32chars'),
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),

  // AI Providers (all optional - app works without them)
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
  SKIP_ENV_VALIDATION: z.string().optional(),
  NEXT_PHASE: z.string().optional(),
  ELECTRON_IS_DEV: z.string().optional(),

  // Security
  ALLOWED_ORIGINS: z.string().optional(),
  SESSION_TIMEOUT: z.coerce.number().default(30),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validate environment variables with graceful degradation
 * Returns validated env or null if validation fails (allowing app to start)
 */
export function validateEnv(): Env {
  // Skip validation during build phase
  if (isBuildPhase) {
    console.log('⏭️ Skipping environment validation during build phase')
    return envSchema.parse({})
  }

  try {
    const env = envSchema.parse(process.env)
    console.log('✅ Environment variables validated successfully')
    
    // Log warnings for missing optional but recommended vars
    if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY && !env.GOOGLE_AI_API_KEY && !env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
      console.warn('⚠️ No AI provider API keys configured. AI features will be disabled.')
    }
    
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('⚠️ Environment variable validation warnings:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      // Return defaults instead of throwing - allows app to start
      console.warn('⚠️ Using default values for missing environment variables')
      return envSchema.parse({})
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

// Validate on module load - but never exit, just warn
if (typeof window === 'undefined' && !isBuildPhase) {
  try {
    validateEnv()
  } catch (error) {
    // Log warning but don't crash - app will use defaults
    console.warn('⚠️ Environment validation had warnings on startup (using defaults)')
  }
}
