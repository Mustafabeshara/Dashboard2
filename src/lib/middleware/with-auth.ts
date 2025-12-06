/**
 * Authentication & Authorization Middleware
 * Reduces code duplication across API routes
 */

import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Unauthorized, Forbidden } from '@/lib/api'

// Role hierarchy for permission checks
export const RoleHierarchy: Record<string, number> = {
  ADMIN: 100,
  CEO: 90,
  CFO: 85,
  FINANCE_MANAGER: 70,
  MANAGER: 60,
  ACCOUNTANT: 50,
  SALES_REP: 40,
  WAREHOUSE_STAFF: 30,
  USER: 10,
}

// Predefined role groups
export const RoleGroups: Record<string, string[]> = {
  MANAGEMENT: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'],
  FINANCE: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'ACCOUNTANT'],
  SALES: ['ADMIN', 'CEO', 'MANAGER', 'SALES_REP'],
  WAREHOUSE: ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF'],
  ALL: Object.keys(RoleHierarchy),
}

export type RoleGroup = keyof typeof RoleGroups

// Extended session with user info
export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  fullName?: string | null
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser
}

// Options for withAuth middleware
export interface WithAuthOptions {
  // Require specific roles (user must have one of these)
  roles?: string[]
  // Use a predefined role group
  roleGroup?: RoleGroup
  // Minimum role level in hierarchy
  minRoleLevel?: number
  // Custom permission check function
  customCheck?: (user: AuthenticatedUser, request: NextRequest) => Promise<boolean>
}

/**
 * Authentication middleware wrapper
 * Wraps API handlers with authentication and authorization checks
 */
export function withAuth<T extends unknown[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
  options: WithAuthOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Get session
      const session = await getServerSession(authOptions)

      // Check authentication
      if (!session?.user) {
        logger.warn('Unauthorized access attempt', {
          context: {
            path: request.nextUrl.pathname,
            method: request.method,
          },
        })
        return Unauthorized()
      }

      const user: AuthenticatedUser = {
        id: session.user.id,
        email: session.user.email ?? '',
        role: session.user.role,
        fullName: session.user.fullName,
      }

      // Check role-based authorization
      const { roles, roleGroup, minRoleLevel, customCheck } = options

      // Get allowed roles from roleGroup if specified
      const allowedRoles = roleGroup ? RoleGroups[roleGroup] : roles

      // Check roles
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          logger.warn('Forbidden access attempt - insufficient role', {
            context: {
              path: request.nextUrl.pathname,
              method: request.method,
              userId: user.id,
              userRole: user.role,
              requiredRoles: allowedRoles,
            },
          })
          return Forbidden('Insufficient role permissions')
        }
      }

      // Check minimum role level
      if (minRoleLevel !== undefined) {
        const userLevel = RoleHierarchy[user.role] || 0
        if (userLevel < minRoleLevel) {
          logger.warn('Forbidden access attempt - insufficient role level', {
            context: {
              path: request.nextUrl.pathname,
              method: request.method,
              userId: user.id,
              userLevel,
              requiredLevel: minRoleLevel,
            },
          })
          return Forbidden('Insufficient role level')
        }
      }

      // Run custom permission check
      if (customCheck) {
        const allowed = await customCheck(user, request)
        if (!allowed) {
          logger.warn('Forbidden access attempt - custom check failed', {
            context: {
              path: request.nextUrl.pathname,
              method: request.method,
              userId: user.id,
            },
          })
          return Forbidden()
        }
      }

      // Attach user to request and call handler
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = user

      return await handler(authenticatedRequest, ...args)
    } catch (error) {
      logger.error('Auth middleware error', error as Error, {
        path: request.nextUrl.pathname,
      })
      throw error
    }
  }
}

/**
 * Shorthand for management-only routes
 */
export function withManagementAuth<T extends unknown[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, { roleGroup: 'MANAGEMENT' })
}

/**
 * Shorthand for finance-only routes
 */
export function withFinanceAuth<T extends unknown[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, { roleGroup: 'FINANCE' })
}

/**
 * Shorthand for admin-only routes
 */
export function withAdminAuth<T extends unknown[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, { roles: ['ADMIN'] })
}

/**
 * Check if user can access a specific resource
 * Useful for resource-level authorization
 */
export async function canAccessResource(
  userId: string,
  resourceOwnerId: string | null,
  userRole: string
): Promise<boolean> {
  // Admins and managers can access all resources
  if (RoleGroups.MANAGEMENT.includes(userRole)) {
    return true
  }

  // Users can only access their own resources
  return userId === resourceOwnerId
}
