/**
 * Reports API Routes
 * Generate various business reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/reports - Get available report templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reportTemplates = [
      {
        id: 'tender-summary',
        name: 'Tender Summary Report',
        description: 'Overview of all tenders with status and values',
        category: 'Tenders',
        parameters: ['dateRange', 'status', 'customer'],
      },
      {
        id: 'tender-win-rate',
        name: 'Tender Win Rate Analysis',
        description: 'Analysis of tender success rates by customer and category',
        category: 'Tenders',
        parameters: ['dateRange', 'customer'],
      },
      {
        id: 'budget-analysis',
        name: 'Budget vs Actual Report',
        description: 'Compare budgeted amounts with actual spending',
        category: 'Budgets',
        parameters: ['dateRange', 'category'],
      },
      {
        id: 'expense-summary',
        name: 'Expense Summary',
        description: 'Summary of expenses by category and status',
        category: 'Expenses',
        parameters: ['dateRange', 'category', 'status'],
      },
      {
        id: 'customer-performance',
        name: 'Customer Performance Report',
        description: 'Analysis of customer activity and revenue',
        category: 'Customers',
        parameters: ['dateRange', 'customerType'],
      },
      {
        id: 'invoice-aging',
        name: 'Invoice Aging Report',
        description: 'Outstanding invoices grouped by age',
        category: 'Invoices',
        parameters: ['asOfDate'],
      },
      {
        id: 'supplier-performance',
        name: 'Supplier Performance Report',
        description: 'Evaluation of supplier reliability and quality',
        category: 'Suppliers',
        parameters: ['dateRange', 'category'],
      },
      {
        id: 'inventory-status',
        name: 'Inventory Status Report',
        description: 'Current inventory levels and stock alerts',
        category: 'Inventory',
        parameters: ['category', 'lowStockOnly'],
      },
    ]

    return NextResponse.json({
      success: true,
      templates: reportTemplates,
    })
  } catch (error) {
    console.error('Error fetching report templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report templates' },
      { status: 500 }
    )
  }
}

// POST /api/reports - Generate a report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reportId, parameters } = body

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    let reportData: any = {}

    // Generate report based on reportId
    switch (reportId) {
      case 'tender-summary':
        reportData = await generateTenderSummary(parameters)
        break
      
      case 'tender-win-rate':
        reportData = await generateTenderWinRate(parameters)
        break
      
      case 'budget-analysis':
        reportData = await generateBudgetAnalysis(parameters)
        break
      
      case 'expense-summary':
        reportData = await generateExpenseSummary(parameters)
        break
      
      case 'customer-performance':
        reportData = await generateCustomerPerformance(parameters)
        break
      
      case 'invoice-aging':
        reportData = await generateInvoiceAging(parameters)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid report ID' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      report: {
        id: reportId,
        generatedAt: new Date().toISOString(),
        parameters,
        data: reportData,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// Report generation functions

async function generateTenderSummary(params: any) {
  const where: any = { isDeleted: false }
  
  if (params?.status) {
    where.status = params.status
  }
  
  if (params?.customerId) {
    where.customerId = params.customerId
  }

  const tenders = await prisma.tender.findMany({
    where,
    include: {
      customer: true,
    },
    orderBy: { submissionDeadline: 'desc' },
  })

  const summary = {
    total: tenders.length,
    byStatus: tenders.reduce((acc: any, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {}),
    totalValue: tenders.reduce((sum, t) => sum + Number(t.estimatedValue || 0), 0),
    tenders: tenders.map(t => ({
      id: t.id,
      title: t.title,
      customer: t.customer?.name || 'Unknown',
      status: t.status,
      value: t.estimatedValue,
      deadline: t.submissionDeadline,
    })),
  }

  return summary
}

async function generateTenderWinRate(params: any) {
  const tenders = await prisma.tender.findMany({
    where: {
      isDeleted: false,
      status: { in: ['WON', 'LOST'] },
    },
    include: {
      customer: true,
    },
  })

  const total = tenders.length
  const won = tenders.filter(t => t.status === 'WON').length
  const lost = tenders.filter(t => t.status === 'LOST').length
  const winRate = total > 0 ? (won / total) * 100 : 0

  const byCustomer = tenders.reduce((acc: any, t) => {
    const customerId = t.customerId || 'unknown'
    if (!acc[customerId]) {
      acc[customerId] = {
        customerName: t.customer?.name || 'Unknown',
        total: 0,
        won: 0,
        lost: 0,
      }
    }
    acc[customerId].total++
    if (t.status === 'WON') acc[customerId].won++
    if (t.status === 'LOST') acc[customerId].lost++
    return acc
  }, {})

  return {
    overall: {
      total,
      won,
      lost,
      winRate: winRate.toFixed(2),
    },
    byCustomer: Object.values(byCustomer).map((c: any) => ({
      ...c,
      winRate: ((c.won / c.total) * 100).toFixed(2),
    })),
  }
}

async function generateBudgetAnalysis(params: any) {
  const budgets = await prisma.budget.findMany({
    where: { isDeleted: false },
    include: {
      categories: {
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      },
    },
  })

  const analysis = budgets.map(b => {
    const totalAllocated = b.categories.reduce((sum, c) => sum + Number(c.allocatedAmount), 0)
    const totalSpent = b.categories.reduce((sum, c) => sum + Number(c.spentAmount), 0)
    const totalTransactions = b.categories.reduce((sum, c) => sum + c._count.transactions, 0)
    
    return {
      id: b.id,
      name: b.name,
      type: b.type,
      allocated: totalAllocated,
      spent: totalSpent,
      remaining: totalAllocated - totalSpent,
      utilization: totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(2) : '0.00',
      transactionCount: totalTransactions,
      categoryCount: b.categories.length,
    }
  })

  return {
    budgets: analysis,
    totals: {
      allocated: analysis.reduce((sum, b) => sum + b.allocated, 0),
      spent: analysis.reduce((sum, b) => sum + b.spent, 0),
    },
  }
}

async function generateExpenseSummary(params: any) {
  const where: any = { isDeleted: false }
  
  if (params?.status) {
    where.status = params.status
  }
  
  if (params?.category) {
    where.category = params.category
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
  })

  const byCategory = expenses.reduce((acc: any, e) => {
    const cat = e.category || 'Uncategorized'
    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 }
    }
    acc[cat].count++
    acc[cat].total += Number(e.amount)
    return acc
  }, {})

  const byStatus = expenses.reduce((acc: any, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    byCategory,
    byStatus,
    expenses: expenses.slice(0, 50).map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      status: e.status,
      date: e.expenseDate,
    })),
  }
}

async function generateCustomerPerformance(params: any) {
  const customers = await prisma.customer.findMany({
    where: { isDeleted: false },
    include: {
      _count: {
        select: {
          tenders: true,
          invoices: true,
        },
      },
    },
  })

  const performance = customers.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    tenderCount: c._count.tenders,
    invoiceCount: c._count.invoices,
    balance: c.currentBalance,
  }))

  return {
    customers: performance,
    totals: {
      total: customers.length,
      government: customers.filter(c => c.type === 'GOVERNMENT').length,
      private: customers.filter(c => c.type === 'PRIVATE').length,
    },
  }
}

async function generateInvoiceAging(params: any) {
  const invoices = await prisma.invoice.findMany({
    where: {
      isDeleted: false,
      status: { in: ['SENT', 'OVERDUE'] },
    },
    include: {
      customer: true,
    },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()
  const aging = {
    current: [] as any[],
    days30: [] as any[],
    days60: [] as any[],
    days90: [] as any[],
    over90: [] as any[],
  }

  invoices.forEach(inv => {
    if (!inv.dueDate) {
      aging.current.push(inv)
      return
    }

    const dueDate = new Date(inv.dueDate)
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysPastDue < 0) {
      aging.current.push(inv)
    } else if (daysPastDue <= 30) {
      aging.days30.push(inv)
    } else if (daysPastDue <= 60) {
      aging.days60.push(inv)
    } else if (daysPastDue <= 90) {
      aging.days90.push(inv)
    } else {
      aging.over90.push(inv)
    }
  })

  return {
    summary: {
      current: { count: aging.current.length, amount: aging.current.reduce((sum, i) => sum + Number(i.totalAmount), 0) },
      days30: { count: aging.days30.length, amount: aging.days30.reduce((sum, i) => sum + Number(i.totalAmount), 0) },
      days60: { count: aging.days60.length, amount: aging.days60.reduce((sum, i) => sum + Number(i.totalAmount), 0) },
      days90: { count: aging.days90.length, amount: aging.days90.reduce((sum, i) => sum + Number(i.totalAmount), 0) },
      over90: { count: aging.over90.length, amount: aging.over90.reduce((sum, i) => sum + Number(i.totalAmount), 0) },
    },
    invoices: aging,
  }
}
