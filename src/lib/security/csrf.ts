/**
 * CSRF Protection Utilities
 * Additional CSRF protection for sensitive API endpoints
 * NextAuth already provides CSRF protection for auth routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// Token storage (in production, use Redis or database)
const tokenStore = new Map<string, { expires: number }>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expires < now) {
      tokenStore.delete(token);
    }
  }
}, 60000); // Every minute

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const random = randomBytes(32).toString('hex');
  const token = createHash('sha256')
    .update(`${sessionId}:${random}:${process.env.NEXTAUTH_SECRET || 'dev'}`)
    .digest('hex');

  // Store token with 1-hour expiration
  tokenStore.set(token, { expires: Date.now() + 60 * 60 * 1000 });

  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  const data = tokenStore.get(token);
  if (!data) return false;

  if (data.expires < Date.now()) {
    tokenStore.delete(token);
    return false;
  }

  return true;
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
  if (customToken && validateCSRFToken(customToken)) {
    return { valid: true };
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
 * CSRF protection middleware wrapper
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

    return handler(request);
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
    const token = generateCSRFToken(sessionId);

    return NextResponse.json({ csrfToken: token });
  };
}
