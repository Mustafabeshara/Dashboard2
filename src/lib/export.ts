/**
 * Data Export System
 * Export data to CSV and Excel formats
 */

import { logger } from './logger'
import { audit, AuditAction } from './audit'

export enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  JSON = 'JSON',
}

interface ExportOptions {
  format: ExportFormat
  filename?: string
  columns?: string[]
  userId?: string
}

class ExportManager {
  async exportData(
    data: any[],
    entityType: string,
    options: ExportOptions
  ): Promise<{ content: string | Buffer; filename: string; mimeType: string }> {
    try {
      const filename = options.filename || `${entityType}-export-${Date.now()}`
      
      let content: string | Buffer
      let mimeType: string

      switch (options.format) {
        case ExportFormat.CSV:
          content = this.toCSV(data, options.columns)
          mimeType = 'text/csv'
          break
        
        case ExportFormat.EXCEL:
          content = await this.toExcel(data, options.columns)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        
        case ExportFormat.JSON:
          content = JSON.stringify(data, null, 2)
          mimeType = 'application/json'
          break
        
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      // Log export action
      await audit.logExport(entityType, data.length, options.userId, {
        format: options.format,
        filename,
      })

      logger.info('Data exported', {
        context: {
          entityType,
          format: options.format,
          recordCount: data.length,
          userId: options.userId,
        },
      })

      return {
        content,
        filename: `${filename}.${options.format.toLowerCase()}`,
        mimeType,
      }
    } catch (error) {
      logger.error('Export failed', error as Error, { entityType, options })
      throw error
    }
  }

  private toCSV(data: any[], columns?: string[]): string {
    if (data.length === 0) {
      return ''
    }

    // Determine columns
    const cols = columns || Object.keys(data[0])
    
    // Create header row
    const header = cols.map(col => this.escapeCSV(col)).join(',')
    
    // Create data rows
    const rows = data.map(row => {
      return cols.map(col => {
        const value = row[col]
        return this.escapeCSV(this.formatValue(value))
      }).join(',')
    })

    return [header, ...rows].join('\n')
  }

  private escapeCSV(value: string): string {
    if (value === null || value === undefined) {
      return ''
    }
    
    const str = String(value)
    
    // Escape if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    
    return str
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return ''
    }
    
    if (value instanceof Date) {
      return value.toISOString()
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    
    return String(value)
  }

  private async toExcel(data: any[], columns?: string[]): Promise<Buffer> {
    // For Excel export, we'll use a simple CSV-based approach
    // In production, consider using libraries like 'exceljs' or 'xlsx'
    const csv = this.toCSV(data, columns)
    return Buffer.from(csv, 'utf-8')
  }

  // Export specific entity types
  async exportTenders(tenders: any[], format: ExportFormat, userId?: string) {
    return this.exportData(tenders, 'Tender', {
      format,
      filename: 'tenders-export',
      columns: [
        'tenderNumber',
        'title',
        'status',
        'estimatedValue',
        'currency',
        'submissionDeadline',
        'customer.name',
        'createdAt',
      ],
      userId,
    })
  }

  async exportCustomers(customers: any[], format: ExportFormat, userId?: string) {
    return this.exportData(customers, 'Customer', {
      format,
      filename: 'customers-export',
      columns: [
        'name',
        'type',
        'email',
        'phone',
        'city',
        'country',
        'currentBalance',
        'isActive',
      ],
      userId,
    })
  }

  async exportInvoices(invoices: any[], format: ExportFormat, userId?: string) {
    return this.exportData(invoices, 'Invoice', {
      format,
      filename: 'invoices-export',
      columns: [
        'invoiceNumber',
        'customer.name',
        'totalAmount',
        'paidAmount',
        'status',
        'invoiceDate',
        'dueDate',
      ],
      userId,
    })
  }

  async exportExpenses(expenses: any[], format: ExportFormat, userId?: string) {
    return this.exportData(expenses, 'Expense', {
      format,
      filename: 'expenses-export',
      columns: [
        'expenseNumber',
        'category',
        'description',
        'amount',
        'status',
        'expenseDate',
        'createdBy.fullName',
      ],
      userId,
    })
  }
}

// Create singleton instance
export const exporter = new ExportManager()

// Helper function to create download response
export function createDownloadResponse(
  content: string | Buffer,
  filename: string,
  mimeType: string
): Response {
  const headers = new Headers()
  headers.set('Content-Type', mimeType)
  headers.set('Content-Disposition', `attachment; filename="${filename}"`)
  
  return new Response(content, {
    status: 200,
    headers,
  })
}
