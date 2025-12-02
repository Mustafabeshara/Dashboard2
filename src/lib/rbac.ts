/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 */

import { Session } from 'next-auth'
import type { UserRole } from '@/types'

export class InsufficientPermissionsError extends Error {
  constructor(requiredRoles: UserRole[], userRole: UserRole) {
    super(`Insufficient permissions. Required: ${requiredRoles.join(' or ')}, User has: ${userRole}`)
    this.name = 'InsufficientPermissionsError'
  }
}

/**
 * Check if user has required role
 */
export function hasRole(session: Session | null, allowedRoles: UserRole[]): boolean {
  if (!session?.user?.role) return false
  return allowedRoles.includes(session.user.role)
}

/**
 * Require user to have one of the specified roles
 * Throws error if user doesn't have permission
 */
export function requireRole(session: Session | null, allowedRoles: UserRole[]): void {
  if (!session?.user) {
    throw new Error('Unauthorized - No active session')
  }

  if (!hasRole(session, allowedRoles)) {
    throw new InsufficientPermissionsError(allowedRoles, session.user.role)
  }
}

/**
 * Check if user can approve budget transactions based on amount
 */
export function canApproveBudget(role: UserRole, amount: number): boolean {
  const thresholds: Record<UserRole, number> = {
    ADMIN: Infinity,
    CEO: Infinity,
    CFO: 100000,
    FINANCE_MANAGER: 50000,
    MANAGER: 10000,
    FINANCE: 0,
    SALES: 0,
    WAREHOUSE: 0,
  }

  return amount <= (thresholds[role] || 0)
}

/**
 * Get required approval level for budget amount
 */
export function getRequiredApprovalLevel(amount: number): UserRole[] {
  if (amount < 1000) return ['MANAGER', 'FINANCE_MANAGER', 'CFO', 'CEO', 'ADMIN']
  if (amount < 10000) return ['MANAGER', 'FINANCE_MANAGER', 'CFO', 'CEO', 'ADMIN']
  if (amount < 50000) return ['FINANCE_MANAGER', 'CFO', 'CEO', 'ADMIN']
  if (amount < 100000) return ['CFO', 'CEO', 'ADMIN']
  return ['CEO', 'ADMIN']
}

/**
 * Role hierarchy for permission inheritance
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 8,
  CEO: 7,
  CFO: 6,
  FINANCE_MANAGER: 5,
  MANAGER: 4,
  FINANCE: 3,
  SALES: 2,
  WAREHOUSE: 1,
}

/**
 * Check if user's role is higher than or equal to required role
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Permission definitions for different resources
 */
export const PERMISSIONS = {
  budgets: {
    view: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER', 'FINANCE'],
    create: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER'],
    update: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER'],
    delete: ['ADMIN', 'CEO', 'CFO'],
    approve: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'],
  },
  tenders: {
    view: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER', 'SALES'],
    create: ['ADMIN', 'CEO', 'MANAGER', 'SALES'],
    update: ['ADMIN', 'CEO', 'MANAGER', 'SALES'],
    delete: ['ADMIN', 'CEO'],
  },
  users: {
    view: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'],
    create: ['ADMIN'],
    update: ['ADMIN', 'CEO'],
    delete: ['ADMIN'],
  },
  inventory: {
    view: ['ADMIN', 'CEO', 'MANAGER', 'WAREHOUSE', 'SALES'],
    create: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
    update: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
    delete: ['ADMIN', 'MANAGER'],
  },
  reports: {
    view: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'],
    export: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER'],
  },
} as const

export type Resource = keyof typeof PERMISSIONS
export type Action = 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export'

/**
 * Check if user has permission for specific resource and action
 */
export function hasPermission(
  session: Session | null,
  resource: Resource,
  action: Action
): boolean {
  if (!session?.user?.role) return false

  const permissions = PERMISSIONS[resource]
  if (!permissions) return false

  const allowedRoles = permissions[action as keyof typeof permissions]
  if (!allowedRoles) return false

  return (allowedRoles as readonly UserRole[]).includes(session.user.role)
}

/**
 * Require specific permission for resource and action
 */
export function requirePermission(
  session: Session | null,
  resource: Resource,
  action: Action
): void {
  if (!session?.user) {
    throw new Error('Unauthorized - No active session')
  }

  if (!hasPermission(session, resource, action)) {
    const allowedRoles = PERMISSIONS[resource][action as keyof typeof PERMISSIONS[typeof resource]]
    throw new InsufficientPermissionsError(
      [...allowedRoles] as UserRole[],
      session.user.role
    )
  }
}
