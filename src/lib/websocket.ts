/**
 * WebSocket Real-time Updates
 * Provides real-time notifications and dashboard updates
 */

import { logger } from './logger'

export enum WebSocketEvent {
  TENDER_CREATED = 'TENDER_CREATED',
  TENDER_UPDATED = 'TENDER_UPDATED',
  TENDER_STATUS_CHANGED = 'TENDER_STATUS_CHANGED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_PAID = 'INVOICE_PAID',
  EXPENSE_SUBMITTED = 'EXPENSE_SUBMITTED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
  BUDGET_THRESHOLD_REACHED = 'BUDGET_THRESHOLD_REACHED',
  DASHBOARD_REFRESH = 'DASHBOARD_REFRESH',
}

interface WebSocketMessage {
  event: WebSocketEvent
  data: any
  timestamp: Date
  userId?: string
}

class WebSocketManager {
  private clients: Map<string, WebSocket> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()

  constructor() {
    logger.info('WebSocket manager initialized')
  }

  // Register a new client connection
  registerClient(clientId: string, userId: string, ws: WebSocket): void {
    this.clients.set(clientId, ws)
    
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId)!.add(clientId)

    logger.info('WebSocket client registered', {
      context: { clientId, userId, totalClients: this.clients.size },
    })

    // Handle client disconnect
    ws.addEventListener('close', () => {
      this.unregisterClient(clientId, userId)
    })
  }

  // Unregister a client connection
  unregisterClient(clientId: string, userId: string): void {
    this.clients.delete(clientId)
    
    const userClients = this.userConnections.get(userId)
    if (userClients) {
      userClients.delete(clientId)
      if (userClients.size === 0) {
        this.userConnections.delete(userId)
      }
    }

    logger.info('WebSocket client unregistered', {
      context: { clientId, userId, totalClients: this.clients.size },
    })
  }

  // Broadcast message to all connected clients
  broadcast(event: WebSocketEvent, data: any): void {
    const message: WebSocketMessage = {
      event,
      data,
      timestamp: new Date(),
    }

    const messageStr = JSON.stringify(message)
    let sentCount = 0

    this.clients.forEach((ws, clientId) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr)
          sentCount++
        }
      } catch (error) {
        logger.error('Failed to send WebSocket message', error as Error, { clientId })
      }
    })

    logger.debug('WebSocket broadcast sent', {
      context: { event, sentCount, totalClients: this.clients.size },
    })
  }

  // Send message to specific user
  sendToUser(userId: string, event: WebSocketEvent, data: any): void {
    const userClients = this.userConnections.get(userId)
    if (!userClients || userClients.size === 0) {
      logger.debug('No active connections for user', { userId })
      return
    }

    const message: WebSocketMessage = {
      event,
      data,
      timestamp: new Date(),
      userId,
    }

    const messageStr = JSON.stringify(message)
    let sentCount = 0

    userClients.forEach((clientId) => {
      const ws = this.clients.get(clientId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr)
          sentCount++
        } catch (error) {
          logger.error('Failed to send WebSocket message to user', error as Error, {
            clientId,
            userId,
          })
        }
      }
    })

    logger.debug('WebSocket message sent to user', {
      context: { event, userId, sentCount },
    })
  }

  // Send message to multiple users
  sendToUsers(userIds: string[], event: WebSocketEvent, data: any): void {
    userIds.forEach((userId) => {
      this.sendToUser(userId, event, data)
    })
  }

  // Get connection statistics
  getStats(): { totalClients: number; totalUsers: number } {
    return {
      totalClients: this.clients.size,
      totalUsers: this.userConnections.size,
    }
  }
}

// Create singleton instance
export const websocket = new WebSocketManager()

// Helper functions for common events
export const WebSocketHelpers = {
  notifyTenderCreated(tender: any, userId?: string) {
    if (userId) {
      websocket.sendToUser(userId, WebSocketEvent.TENDER_CREATED, tender)
    } else {
      websocket.broadcast(WebSocketEvent.TENDER_CREATED, tender)
    }
  },

  notifyTenderUpdated(tender: any, userId?: string) {
    if (userId) {
      websocket.sendToUser(userId, WebSocketEvent.TENDER_UPDATED, tender)
    } else {
      websocket.broadcast(WebSocketEvent.TENDER_UPDATED, tender)
    }
  },

  notifyInvoicePaid(invoice: any, userId?: string) {
    if (userId) {
      websocket.sendToUser(userId, WebSocketEvent.INVOICE_PAID, invoice)
    } else {
      websocket.broadcast(WebSocketEvent.INVOICE_PAID, invoice)
    }
  },

  notifyExpenseApproved(expense: any, userId: string) {
    websocket.sendToUser(userId, WebSocketEvent.EXPENSE_APPROVED, expense)
  },

  notifyExpenseRejected(expense: any, userId: string) {
    websocket.sendToUser(userId, WebSocketEvent.EXPENSE_REJECTED, expense)
  },

  notifyDocumentProcessed(document: any, userId: string) {
    websocket.sendToUser(userId, WebSocketEvent.DOCUMENT_PROCESSED, document)
  },

  notifyBudgetThreshold(budget: any, userIds: string[]) {
    websocket.sendToUsers(userIds, WebSocketEvent.BUDGET_THRESHOLD_REACHED, budget)
  },

  refreshDashboard() {
    websocket.broadcast(WebSocketEvent.DASHBOARD_REFRESH, {
      message: 'Dashboard data updated',
    })
  },
}
