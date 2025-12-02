/**
 * Cron Job: Email Reminders
 * Sends automated email reminders for tender deadlines and invoice due dates
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { email, EmailTemplate } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let emailsSent = 0

    // 1. Tender deadline reminders
    const upcomingTenders = await prisma.tender.findMany({
      where: {
        isDeleted: false,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
        submissionDeadline: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { email: true, fullName: true } },
      },
    })

    for (const tender of upcomingTenders) {
      if (tender.createdBy?.email) {
        const daysUntilDeadline = Math.ceil(
          (tender.submissionDeadline!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )

        await email.sendTemplate(EmailTemplate.TENDER_DEADLINE_REMINDER, tender.createdBy.email, {
          tenderNumber: tender.tenderNumber,
          tenderTitle: tender.title,
          customerName: tender.customer?.name || 'Unknown',
          deadline: tender.submissionDeadline,
          daysRemaining: daysUntilDeadline,
          tenderUrl: `${process.env.NEXTAUTH_URL}/tenders/${tender.id}`,
        })

        emailsSent++
      }
    }

    // 2. Invoice due date reminders
    const upcomingInvoices = await prisma.invoice.findMany({
      where: {
        isDeleted: false,
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        customer: { select: { name: true, email: true } },
      },
    })

    for (const invoice of upcomingInvoices) {
      if (invoice.customer?.email) {
        const daysUntilDue = Math.ceil(
          (invoice.dueDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )

        await email.sendTemplate(EmailTemplate.INVOICE_DUE_REMINDER, invoice.customer.email, {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          amount: invoice.totalAmount,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          daysRemaining: daysUntilDue,
          invoiceUrl: `${process.env.NEXTAUTH_URL}/invoices/${invoice.id}`,
        })

        emailsSent++
      }
    }

    // 3. Overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        isDeleted: false,
        status: 'OVERDUE',
        dueDate: {
          lt: now,
        },
      },
      include: {
        customer: { select: { name: true, email: true } },
      },
    })

    for (const invoice of overdueInvoices) {
      if (invoice.customer?.email) {
        const daysOverdue = Math.ceil(
          (now.getTime() - invoice.dueDate!.getTime()) / (24 * 60 * 60 * 1000)
        )

        await email.sendTemplate(EmailTemplate.INVOICE_DUE_REMINDER, invoice.customer.email, {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          amount: invoice.totalAmount,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          daysOverdue,
          invoiceUrl: `${process.env.NEXTAUTH_URL}/invoices/${invoice.id}`,
        })

        emailsSent++
      }
    }

    console.log(`[Cron] Sent ${emailsSent} reminder emails`)

    return NextResponse.json({
      success: true,
      emailsSent,
      tenders: upcomingTenders.length,
      invoices: upcomingInvoices.length + overdueInvoices.length,
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
