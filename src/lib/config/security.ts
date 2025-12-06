/**
 * Security Configuration
 * Centralized security-related constants and settings
 */

/**
 * Authentication Security Settings
 */
export const AUTH_SECURITY = {
  // Account lockout settings
  MAX_FAILED_ATTEMPTS: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10),
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10),

  // Password hashing
  BCRYPT_COST_FACTOR: parseInt(process.env.BCRYPT_COST_FACTOR || '12', 10),

  // Session settings
  SESSION_TIMEOUT_HOURS: parseInt(process.env.SESSION_TIMEOUT_HOURS || '8', 10),
  JWT_MAX_AGE_HOURS: parseInt(process.env.JWT_MAX_AGE_HOURS || '2', 10),

  // CSRF settings
  CSRF_TOKEN_LENGTH: 32,
  CSRF_TOKEN_ROTATION_INTERVAL_MS: 60 * 60 * 1000, // 1 hour

  // IP validation
  TRUSTED_PROXY_DEPTH: parseInt(process.env.TRUSTED_PROXY_DEPTH || '1', 10),
  TRUSTED_PROXY_HEADERS: ['x-forwarded-for', 'x-real-ip'] as const,
}

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Use Redis in production
  USE_REDIS: process.env.REDIS_URL ? true : false,
  REDIS_URL: process.env.REDIS_URL,

  // Cleanup interval for in-memory store
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute

  // Presets
  PRESETS: {
    STRICT: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
    },
    STANDARD: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
    GENEROUS: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    LOGIN: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // Very strict for login attempts
    },
  },
}

/**
 * User Roles - Single source of truth
 * Matches Prisma schema enum
 */
export const USER_ROLES = [
  'ADMIN',
  'CEO',
  'CFO',
  'FINANCE_MANAGER',
  'MANAGER',
  'SALES',
  'WAREHOUSE',
  'FINANCE',
] as const

export type UserRoleType = (typeof USER_ROLES)[number]

/**
 * Validate if a string is a valid user role
 */
export function isValidUserRole(role: string): role is UserRoleType {
  return USER_ROLES.includes(role as UserRoleType)
}

/**
 * Encryption settings
 */
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm' as const,
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  SALT_LENGTH: 32,
  AUTH_TAG_LENGTH: 16,
}

/**
 * Password Requirements
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false, // Set to true for stricter requirements
}

/**
 * Validate a password against security requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(
      `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`
    )
  }

  if (password.length > PASSWORD_REQUIREMENTS.MAX_LENGTH) {
    errors.push(
      `Password must not exceed ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`
    )
  }

  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (
    PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
