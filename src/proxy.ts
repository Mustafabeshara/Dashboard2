/**
 * Unified Middleware for Authentication, CORS, and Security
 * Combines auth protection with CORS and security headers
 */
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins: string[] = []

  if (process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL)
      origins.push(url.origin)
    } catch {}
  }

  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean)
    origins.push(...customOrigins)
  }

  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    )
  }

  return [...new Set(origins)]
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true
  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.length === 0 || allowedOrigins.includes(origin)
}

// Add CORS headers to response
function addCorsHeaders(response: NextResponse, request: NextRequest): void {
  const origin = request.headers.get('origin')

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With')
    response.headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
}

// Content Security Policy
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://*.railway.app wss://*.railway.app;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

// Add security headers
function addSecurityHeaders(response: NextResponse, isApiRoute: boolean = false): void {
  response.headers.set('X-Request-ID', crypto.randomUUID())
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  // DNS prefetch control
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  // Prevent content from being loaded in Adobe products
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  // Add CSP header for non-API routes
  if (!isApiRoute) {
    response.headers.set('Content-Security-Policy', cspHeader)
  }

  // Add HSTS header for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
}

// Handle OPTIONS preflight requests for API routes
function handlePreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 })
    addCorsHeaders(response, request)
    return response
  }
  return null
}

export default withAuth(
  function middleware(req) {
    // Handle CORS preflight first
    const preflightResponse = handlePreflight(req)
    if (preflightResponse) {
      return preflightResponse
    }

    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Create base response
    const response = NextResponse.next()

    // Add security headers to all responses
    const isApiRoute = path.startsWith('/api/')
    addSecurityHeaders(response, isApiRoute)

    // Add CORS headers for API routes
    if (isApiRoute) {
      addCorsHeaders(response, req)
    }

    // Skip role checks for API routes (handled in the API itself)
    if (path.startsWith('/api/')) {
      return response
    }

    // Admin-only routes
    const adminRoutes = ['/admin', '/users']
    if (adminRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Finance routes
    const financeRoutes = ['/expenses', '/invoices']
    const financeRoles = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'FINANCE']
    if (financeRoutes.some((route) => path.startsWith(route))) {
      if (!financeRoles.includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Budget approval routes
    if (path.startsWith('/budgets/approvals')) {
      const approvalRoles = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER']
      if (!approvalRoles.includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow API routes without auth check here (auth handled in route)
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Protected dashboard routes
    '/dashboard/:path*',
    '/budgets/:path*',
    '/tenders/:path*',
    '/inventory/:path*',
    '/customers/:path*',
    '/suppliers/:path*',
    '/expenses/:path*',
    '/invoices/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/users/:path*',
    '/documents/:path*',
    '/forecasts/:path*',
    // API routes for CORS
    '/api/:path*',
  ],
}
