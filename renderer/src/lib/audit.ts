/**
 * Audit Trail System
 * Tracks all data changes for compliance and debugging
 */

import { prisma } from './prisma'
import { logger } from './logger'

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export interface AuditLogEntry {
  userId?: string
  action: AuditAction
  entityType: string
  entityId?: string
  changes?: any
  metadata?: any
  ipAddress?: string
  userAgent?: string
}

class AuditManager {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
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

      logger.info('Audit log created', {
        context: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          userId: entry.userId,
        },
      })
    } catch (error) {
      logger.error('Failed to create audit log', error as Error, { entry })
    }
  }

  async logCreate(
    entityType: string,
    entityId: string,
    data: any,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.CREATE,
      entityType,
      entityId,
      changes: { after: data },
      metadata,
    })
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    before: any,
    after: any,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    // Calculate diff
    const changes = this.calculateDiff(before, after)
    
    await this.log({
      userId,
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      changes: { before, after, diff: changes },
      metadata,
    })
  }

  async logDelete(
    entityType: string,
    entityId: string,
    data: any,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.DELETE,
      entityType,
      entityId,
      changes: { before: data },
      metadata,
    })
  }

  async logView(
    entityType: string,
    entityId: string,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.VIEW,
      entityType,
      entityId,
      metadata,
    })
  }

  async logExport(
    entityType: string,
    count: number,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.EXPORT,
      entityType,
      metadata: { ...metadata, recordCount: count },
    })
  }

  async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await prisma.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      })
    } catch (error) {
      logger.error('Failed to get audit trail', error as Error, {
        entityType,
        entityId,
      })
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
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })
    } catch (error) {
      logger.error('Failed to get user activity', error as Error, { userId })
      return []
    }
  }

  private calculateDiff(before: any, after: any): any {
    const diff: any = {}
    
    // Compare all keys
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
    
    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        diff[key] = {
          from: before[key],
          to: after[key],
        }
      }
    }
    
    return diff
  }
}

// Create singleton instance
export const audit = new AuditManager()

// Middleware helper for automatic audit logging
export function withAudit(
  action: AuditAction,
  entityType: string,
  getEntityId?: (result: any) => string
) {
  return async <T>(
    fn: () => Promise<T>,
    userId?: string,
    metadata?: any
  ): Promise<T> => {
    const result = await fn()
    
    const entityId = getEntityId ? getEntityId(result) : undefined
    
    await audit.log({
      userId,
      action,
      entityType,
      entityId,
      metadata,
    })
    
    return result
  }
}
