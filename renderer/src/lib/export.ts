/**
 * Data Export System
 * Export data to CSV, Excel, and JSON formats
 */

import { logger } from './logger'

// Simple CSV export function
export async function exportToCSV(data: any[]): Promise<Buffer> {
  if (data.length === 0) {
    return Buffer.from('', 'utf-8')
  }

  // Get columns from first object
  const columns = Object.keys(data[0])
  
  // Create header row
  const header = columns.map(col => escapeCSV(col)).join(',')
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col]
      return escapeCSV(formatValue(value))
    }).join(',')
  })

  const csv = [header, ...rows].join('\n')
  return Buffer.from(csv, 'utf-8')
}

// Simple Excel export (CSV-based for now)
export async function exportToExcel(data: any[], sheetName: string): Promise<Buffer> {
  // For now, use CSV format
  // In production, use libraries like 'exceljs' or 'xlsx'
  return exportToCSV(data)
}

// JSON export
export function exportToJSON(data: any[]): Buffer {
  return Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
}

// Helper functions
function escapeCSV(value: string): string {
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

function formatValue(value: any): string {
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

// Helper function to create download response
export function createDownloadResponse(
  content: string | Buffer,
  filename: string,
  mimeType: string
): Response {
  const headers = new Headers()
  headers.set('Content-Type', mimeType)
  headers.set('Content-Disposition', `attachment; filename="${filename}"`)
  
  return new Response(content as any, {
    status: 200,
    headers,
  })
}
