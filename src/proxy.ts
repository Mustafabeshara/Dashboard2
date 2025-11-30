/**
 * Middleware for authentication and route protection
 */
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

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

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/budgets/:path*',
    '/tenders/:path*',
    '/inventory/:path*',
    '/customers/:path*',
    '/expenses/:path*',
    '/invoices/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/users/:path*',
  ],
}
