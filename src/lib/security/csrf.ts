/**
 * CSRF Protection Utilities
 * Additional CSRF protection for sensitive API endpoints
 * NextAuth already provides CSRF protection for auth routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { AUTH_SECURITY } from '../config/security';

interface TokenData {
  expires: number;
  sessionId: string;
  useCount: number;
  maxUses: number;
}

// Token storage (in production, use Redis or database)
class CSRFTokenStore {
  private store = new Map<string, TokenData>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.isDestroyed) return;

    // Clean up expired tokens every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // Allow process to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, data] of this.store.entries()) {
      if (data.expires < now) {
        this.store.delete(token);
      }
    }
  }

  set(token: string, data: TokenData): void {
    this.store.set(token, data);
  }

  get(token: string): TokenData | undefined {
    return this.store.get(token);
  }

  delete(token: string): void {
    this.store.delete(token);
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

const tokenStore = new CSRFTokenStore();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  const cleanup = () => tokenStore.destroy();
  process.once('exit', cleanup);
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

/**
 * Generate a CSRF token with rotation support
 */
export function generateCSRFToken(
  sessionId: string,
  options: { maxUses?: number; expiresInMs?: number } = {}
): string {
  const {
    maxUses = 1, // Single use by default for rotation
    expiresInMs = AUTH_SECURITY.CSRF_TOKEN_ROTATION_INTERVAL_MS,
  } = options;

  const random = randomBytes(AUTH_SECURITY.CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now().toString();
  const token = createHash('sha256')
    .update(`${sessionId}:${random}:${timestamp}:${process.env.NEXTAUTH_SECRET || 'dev'}`)
    .digest('hex');

  // Store token with expiration and use tracking
  tokenStore.set(token, {
    expires: Date.now() + expiresInMs,
    sessionId,
    useCount: 0,
    maxUses,
  });

  return token;
}

/**
 * Validate and optionally consume a CSRF token
 * Returns the new token if rotation is needed
 */
export function validateCSRFToken(
  token: string,
  sessionId?: string,
  options: { consume?: boolean; rotate?: boolean } = {}
): { valid: boolean; newToken?: string; error?: string } {
  const { consume = true, rotate = true } = options;

  const data = tokenStore.get(token);

  if (!data) {
    return { valid: false, error: 'Token not found' };
  }

  // Check expiration
  if (data.expires < Date.now()) {
    tokenStore.delete(token);
    return { valid: false, error: 'Token expired' };
  }

  // Check session binding if provided
  if (sessionId && data.sessionId !== sessionId && data.sessionId !== 'anonymous') {
    return { valid: false, error: 'Token session mismatch' };
  }

  // Check use count
  if (data.useCount >= data.maxUses) {
    tokenStore.delete(token);
    return { valid: false, error: 'Token already used' };
  }

  // Consume the token
  if (consume) {
    data.useCount++;

    // If max uses reached, delete the token
    if (data.useCount >= data.maxUses) {
      tokenStore.delete(token);
    }
  }

  // Generate new token if rotation is requested
  let newToken: string | undefined;
  if (rotate && consume) {
    newToken = generateCSRFToken(sessionId || data.sessionId);
  }

  return { valid: true, newToken };
}

/**
 * CSRF validation middleware for API routes
 * Validates Origin/Referer headers against allowed origins
 */
export function validateCSRFRequest(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  const method = request.method;

  // Only validate state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Get allowed origins
  const allowedOrigins = getAllowedOrigins();

  // Check Origin header first (more reliable)
  const origin = request.headers.get('origin');
  if (origin) {
    if (allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid origin' };
  }

  // Fall back to Referer header
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (allowedOrigins.some((allowed) => refererOrigin === allowed || refererOrigin.startsWith(allowed))) {
        return { valid: true };
      }
    } catch {
      // Invalid referer URL
    }
    return { valid: false, error: 'Invalid referer' };
  }

  // For API clients without browser headers, check for custom header
  const customToken = request.headers.get('x-csrf-token');
  const sessionId = request.headers.get('x-session-id');
  if (customToken) {
    const result = validateCSRFToken(customToken, sessionId || undefined);
    if (result.valid) {
      return { valid: true };
    }
    return { valid: false, error: result.error };
  }

  // If no Origin or Referer (might be same-origin request from older browser)
  // Allow if content-type indicates JSON API request
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    // JSON requests from browsers always include Origin/Referer
    // If missing, likely from API client - require custom header in strict mode
    if (process.env.CSRF_STRICT_MODE === 'true') {
      return { valid: false, error: 'CSRF token required' };
    }
    // In non-strict mode, allow JSON requests (they can't be made via form submission)
    return { valid: true };
  }

  return { valid: false, error: 'Missing origin validation headers' };
}

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Add configured origins
  if (process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL);
      origins.push(url.origin);
    } catch {
      // Invalid URL
    }
  }

  // Add additional allowed origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()));
  }

  // Always allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * CSRF protection middleware wrapper with token rotation
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const validation = validateCSRFRequest(request);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'CSRF validation failed', details: validation.error },
        { status: 403 }
      );
    }

    const response = await handler(request);

    // If a custom CSRF token was used, include the new rotated token in response
    const customToken = request.headers.get('x-csrf-token');
    if (customToken) {
      const sessionId = request.headers.get('x-session-id');
      const result = validateCSRFToken(customToken, sessionId || undefined, {
        consume: false, // Already consumed in validation
        rotate: true,
      });
      if (result.newToken) {
        response.headers.set('x-csrf-token', result.newToken);
      }
    }

    return response;
  };
}

/**
 * API route to get a new CSRF token
 * Call this from the client before making state-changing requests
 */
export function createCSRFTokenEndpoint() {
  return async (request: NextRequest) => {
    // In production, verify session before issuing token
    const sessionId = request.headers.get('x-session-id') || 'anonymous';

    // Allow multiple uses for non-rotating clients
    const token = generateCSRFToken(sessionId, {
      maxUses: 10, // Allow up to 10 uses before requiring refresh
      expiresInMs: AUTH_SECURITY.CSRF_TOKEN_ROTATION_INTERVAL_MS,
    });

    return NextResponse.json({
      csrfToken: token,
      expiresIn: AUTH_SECURITY.CSRF_TOKEN_ROTATION_INTERVAL_MS,
    });
  };
}
