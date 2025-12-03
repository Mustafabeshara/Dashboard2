/**
 * Enhanced Audit Trail System
 * Comprehensive security event tracking for compliance
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: `any` types are intentionally used for flexible audit data structures
// that can contain various shapes of before/after values and metadata

import { prisma } from '../prisma'
import { logger } from '../logger'
import { NextRequest } from 'next/server'

// Extended audit actions for security events
export enum AuditAction {
  // Data Operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',

  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_VERIFIED = 'TWO_FACTOR_VERIFIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization Events
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGE = 'ROLE_CHANGE',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',

  // Financial Operations
  BUDGET_APPROVE = 'BUDGET_APPROVE',
  BUDGET_REJECT = 'BUDGET_REJECT',
  EXPENSE_APPROVE = 'EXPENSE_APPROVE',
  EXPENSE_REJECT = 'EXPENSE_REJECT',
  TRANSACTION_APPROVE = 'TRANSACTION_APPROVE',
  TRANSACTION_REJECT = 'TRANSACTION_REJECT',
  PAYMENT_PROCESS = 'PAYMENT_PROCESS',

  // Tender Operations
  TENDER_SUBMIT = 'TENDER_SUBMIT',
  TENDER_AWARD = 'TENDER_AWARD',
  BID_SUBMIT = 'BID_SUBMIT',
  BID_EVALUATE = 'BID_EVALUATE',

  // Security Events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED = 'IP_BLOCKED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // System Changes
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_DELETE = 'API_KEY_DELETE',
  API_KEY_ROTATE = 'API_KEY_ROTATE',
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
}

// Severity levels for audit events
export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Map actions to severity
const ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  // Data Operations - Low to Medium
  [AuditAction.CREATE]: AuditSeverity.LOW,
  [AuditAction.UPDATE]: AuditSeverity.LOW,
  [AuditAction.DELETE]: AuditSeverity.MEDIUM,
  [AuditAction.VIEW]: AuditSeverity.LOW,
  [AuditAction.EXPORT]: AuditSeverity.MEDIUM,
  [AuditAction.IMPORT]: AuditSeverity.MEDIUM,

  // Authentication - Medium to Critical
  [AuditAction.LOGIN_SUCCESS]: AuditSeverity.LOW,
  [AuditAction.LOGIN_FAILURE]: AuditSeverity.MEDIUM,
  [AuditAction.LOGOUT]: AuditSeverity.LOW,
  [AuditAction.PASSWORD_CHANGE]: AuditSeverity.HIGH,
  [AuditAction.PASSWORD_RESET_REQUEST]: AuditSeverity.MEDIUM,
  [AuditAction.PASSWORD_RESET_COMPLETE]: AuditSeverity.HIGH,
  [AuditAction.TWO_FACTOR_ENABLED]: AuditSeverity.HIGH,
  [AuditAction.TWO_FACTOR_DISABLED]: AuditSeverity.HIGH,
  [AuditAction.TWO_FACTOR_VERIFIED]: AuditSeverity.LOW,
  [AuditAction.SESSION_EXPIRED]: AuditSeverity.LOW,

  // Authorization - High
  [AuditAction.PERMISSION_DENIED]: AuditSeverity.MEDIUM,
  [AuditAction.ROLE_CHANGE]: AuditSeverity.HIGH,
  [AuditAction.PERMISSION_GRANT]: AuditSeverity.HIGH,
  [AuditAction.PERMISSION_REVOKE]: AuditSeverity.HIGH,

  // Financial - High to Critical
  [AuditAction.BUDGET_APPROVE]: AuditSeverity.HIGH,
  [AuditAction.BUDGET_REJECT]: AuditSeverity.MEDIUM,
  [AuditAction.EXPENSE_APPROVE]: AuditSeverity.HIGH,
  [AuditAction.EXPENSE_REJECT]: AuditSeverity.MEDIUM,
  [AuditAction.TRANSACTION_APPROVE]: AuditSeverity.HIGH,
  [AuditAction.TRANSACTION_REJECT]: AuditSeverity.MEDIUM,
  [AuditAction.PAYMENT_PROCESS]: AuditSeverity.CRITICAL,

  // Tender - Medium to High
  [AuditAction.TENDER_SUBMIT]: AuditSeverity.HIGH,
  [AuditAction.TENDER_AWARD]: AuditSeverity.CRITICAL,
  [AuditAction.BID_SUBMIT]: AuditSeverity.HIGH,
  [AuditAction.BID_EVALUATE]: AuditSeverity.HIGH,

  // Security - High to Critical
  [AuditAction.RATE_LIMIT_EXCEEDED]: AuditSeverity.MEDIUM,
  [AuditAction.CSRF_VIOLATION]: AuditSeverity.CRITICAL,
  [AuditAction.SUSPICIOUS_ACTIVITY]: AuditSeverity.CRITICAL,
  [AuditAction.IP_BLOCKED]: AuditSeverity.HIGH,
  [AuditAction.INVALID_TOKEN]: AuditSeverity.MEDIUM,

  // System - High to Critical
  [AuditAction.SETTINGS_CHANGE]: AuditSeverity.HIGH,
  [AuditAction.API_KEY_CREATE]: AuditSeverity.HIGH,
  [AuditAction.API_KEY_DELETE]: AuditSeverity.HIGH,
  [AuditAction.API_KEY_ROTATE]: AuditSeverity.HIGH,
  [AuditAction.SYSTEM_CONFIG_CHANGE]: AuditSeverity.CRITICAL,
}

export interface AuditLogEntry {
  userId?: string
  action: AuditAction
  entityType: string
  entityId?: string
  changes?: {
    before?: any
    after?: any
    diff?: any
  }
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  severity?: AuditSeverity
}

// Extract request context for audit logging
export function extractRequestContext(request: NextRequest): {
  ipAddress: string
  userAgent: string
  path: string
  method: string
} {
  const forwarded = request.headers.get('x-forwarded-for')
  const ipAddress = forwarded?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    'unknown'

  return {
    ipAddress,
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
  }
}

class EnhancedAuditManager {
  /**
   * Log an audit event with automatic severity assignment
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const severity = entry.severity || ACTION_SEVERITY[entry.action] || AuditSeverity.LOW

      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          oldValues: entry.changes?.before || null,
          newValues: entry.changes?.after || null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      })

      // Log critical events to system logger as well
      if (severity === AuditSeverity.CRITICAL || severity === AuditSeverity.HIGH) {
        logger.warn(`[AUDIT] ${severity}: ${entry.action}`, {
          context: {
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            userId: entry.userId,
            ipAddress: entry.ipAddress,
            metadata: entry.metadata,
          },
        })
      } else {
        logger.info(`[AUDIT] ${entry.action}`, {
          context: {
            entityType: entry.entityType,
            entityId: entry.entityId,
            userId: entry.userId,
          },
        })
      }
    } catch (error) {
      logger.error('Failed to create audit log', error as Error, { entry })
    }
  }

  // Authentication event helpers
  async logLoginSuccess(userId: string, request: NextRequest, metadata?: Record<string, any>): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      userId,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { ...metadata, path: context.path },
    })
  }

  async logLoginFailure(email: string, request: NextRequest, reason: string): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      action: AuditAction.LOGIN_FAILURE,
      entityType: 'User',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { email, reason, path: context.path },
    })
  }

  async logLogout(userId: string, request: NextRequest): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      userId,
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logPasswordChange(userId: string, request: NextRequest): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  // Security event helpers
  async logRateLimitExceeded(request: NextRequest, endpoint: string, userId?: string): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      userId,
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      entityType: 'Security',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { endpoint, path: context.path, method: context.method },
      severity: AuditSeverity.MEDIUM,
    })
  }

  async logSuspiciousActivity(request: NextRequest, reason: string, userId?: string): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      userId,
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      entityType: 'Security',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { reason, path: context.path, method: context.method },
      severity: AuditSeverity.CRITICAL,
    })
  }

  async logPermissionDenied(userId: string, request: NextRequest, resource: string, requiredRole?: string): Promise<void> {
    const context = extractRequestContext(request)
    await this.log({
      userId,
      action: AuditAction.PERMISSION_DENIED,
      entityType: 'Authorization',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { resource, requiredRole, path: context.path },
    })
  }

  // Financial operation helpers
  async logBudgetApproval(
    budgetId: string,
    userId: string,
    approved: boolean,
    amount?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: approved ? AuditAction.BUDGET_APPROVE : AuditAction.BUDGET_REJECT,
      entityType: 'Budget',
      entityId: budgetId,
      metadata: { amount, ...metadata },
    })
  }

  async logExpenseApproval(
    expenseId: string,
    userId: string,
    approved: boolean,
    amount?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: approved ? AuditAction.EXPENSE_APPROVE : AuditAction.EXPENSE_REJECT,
      entityType: 'Expense',
      entityId: expenseId,
      metadata: { amount, ...metadata },
    })
  }

  // System operation helpers
  async logSettingsChange(
    userId: string,
    settingKey: string,
    before: any,
    after: any,
    request?: NextRequest
  ): Promise<void> {
    const context = request ? extractRequestContext(request) : {}
    await this.log({
      userId,
      action: AuditAction.SETTINGS_CHANGE,
      entityType: 'Settings',
      entityId: settingKey,
      changes: { before, after },
      ...context,
    })
  }

  async logApiKeyOperation(
    userId: string,
    operation: 'create' | 'delete' | 'rotate',
    keyName: string,
    request?: NextRequest
  ): Promise<void> {
    const actionMap = {
      create: AuditAction.API_KEY_CREATE,
      delete: AuditAction.API_KEY_DELETE,
      rotate: AuditAction.API_KEY_ROTATE,
    }
    const context = request ? extractRequestContext(request) : {}
    await this.log({
      userId,
      action: actionMap[operation],
      entityType: 'ApiKey',
      entityId: keyName,
      ...context,
      metadata: { keyName },
    })
  }

  // CRUD helpers
  async logCreate(
    entityType: string,
    entityId: string,
    data: any,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    const context = request ? extractRequestContext(request) : {}
    await this.log({
      userId,
      action: AuditAction.CREATE,
      entityType,
      entityId,
      changes: { after: this.sanitizeData(data) },
      ...context,
    })
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    before: any,
    after: any,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    const context = request ? extractRequestContext(request) : {}
    const diff = this.calculateDiff(before, after)
    await this.log({
      userId,
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      changes: {
        before: this.sanitizeData(before),
        after: this.sanitizeData(after),
        diff
      },
      ...context,
    })
  }

  async logDelete(
    entityType: string,
    entityId: string,
    data: any,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    const context = request ? extractRequestContext(request) : {}
    await this.log({
      userId,
      action: AuditAction.DELETE,
      entityType,
      entityId,
      changes: { before: this.sanitizeData(data) },
      ...context,
    })
  }

  async logExport(
    entityType: string,
    count: number,
    userId?: string,
    format?: string,
    request?: NextRequest
  ): Promise<void> {
    const context = request ? extractRequestContext(request) : {}
    await this.log({
      userId,
      action: AuditAction.EXPORT,
      entityType,
      metadata: { recordCount: count, format },
      ...context,
    })
  }

  // Query methods
  async getSecurityEvents(
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    const securityActions = [
      AuditAction.LOGIN_FAILURE,
      AuditAction.RATE_LIMIT_EXCEEDED,
      AuditAction.CSRF_VIOLATION,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.IP_BLOCKED,
      AuditAction.INVALID_TOKEN,
      AuditAction.PERMISSION_DENIED,
    ]

    try {
      return await prisma.auditLog.findMany({
        where: {
          action: { in: securityActions },
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })
    } catch (error) {
      logger.error('Failed to get security events', error as Error)
      return []
    }
  }

  async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })
    } catch (error) {
      logger.error('Failed to get audit trail', error as Error)
      return []
    }
  }

  async getUserActivity(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    try {
      return await prisma.auditLog.findMany({
        where: {
          userId,
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    } catch (error) {
      logger.error('Failed to get user activity', error as Error)
      return []
    }
  }

  // Utility methods
  private sanitizeData(data: any): any {
    if (!data) return data

    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'passwordHash', 'token', 'secret',
      'apiKey', 'accessToken', 'refreshToken', 'twoFactorSecret'
    ]

    const sanitized = { ...data }
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }
    return sanitized
  }

  private calculateDiff(before: any, after: any): Record<string, { from: any; to: any }> {
    const diff: Record<string, { from: any; to: any }> = {}
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])

    for (const key of allKeys) {
      const beforeVal = before?.[key]
      const afterVal = after?.[key]

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        diff[key] = { from: beforeVal, to: afterVal }
      }
    }

    return diff
  }
}

// Export singleton instance
export const auditEnhanced = new EnhancedAuditManager()

// Re-export for backwards compatibility
export { auditEnhanced as audit }
