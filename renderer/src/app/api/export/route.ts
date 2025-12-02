/**
 * Data Export API
 * Export data from all modules to CSV, Excel, or JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exportToCSV, exportToExcel, exportToJSON } from '@/lib/export'
import { audit, AuditAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { module, format = 'csv', filters = {}, userId } = body

    // Validate module
    const validModules = ['tenders', 'customers', 'invoices', 'expenses', 'suppliers', 'inventory', 'budgets']
    if (!validModules.includes(module)) {
      return NextResponse.json(
        { error: `Invalid module. Must be one of: ${validModules.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate format
    const validFormats = ['csv', 'excel', 'json']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch data based on module
    let data: any[] = []
    let fileName = `${module}_export_${new Date().toISOString().split('T')[0]}`

    switch (module) {
      case 'tenders':
        data = await prisma.tender.findMany({
          where: { isDeleted: false, ...filters },
          include: {
            customer: { select: { name: true } },
            createdBy: { select: { fullName: true } },
          },
        })
        break

      case 'customers':
        data = await prisma.customer.findMany({
          where: { isDeleted: false, ...filters },
        })
        break

      case 'invoices':
        data = await prisma.invoice.findMany({
          where: { isDeleted: false, ...filters },
          include: {
            customer: { select: { name: true } },
            items: true,
          },
        })
        break

      case 'expenses':
        data = await prisma.expense.findMany({
          where: { isDeleted: false, ...filters },
        })
        break

      case 'suppliers':
        data = await prisma.supplier.findMany({
          where: { isDeleted: false, ...filters },
        })
        break

      case 'inventory':
        data = await prisma.inventory.findMany({
          where: { isDeleted: false, ...filters },
        })
        break

      case 'budgets':
        data = await prisma.budget.findMany({
          where: { isDeleted: false, ...filters },
          include: {
            categories: true,
          },
        })
        break
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No data found to export' },
        { status: 404 }
      )
    }

    // Export data based on format
    let fileBuffer: Buffer
    let mimeType: string
    let fileExtension: string

    switch (format) {
      case 'csv':
        fileBuffer = await exportToCSV(data)
        mimeType = 'text/csv'
        fileExtension = 'csv'
        break

      case 'excel':
        fileBuffer = await exportToExcel(data, module)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        fileExtension = 'xlsx'
        break

      case 'json':
        fileBuffer = exportToJSON(data)
        mimeType = 'application/json'
        fileExtension = 'json'
        break

      default:
        throw new Error('Invalid format')
    }

    // Audit trail
    await audit.logCreate('Export', `${module}-export`, {
      module,
      format,
      recordCount: data.length,
      filters,
    }, userId)

    // Return file
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}.${fileExtension}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
