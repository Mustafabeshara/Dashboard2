/**
 * Email Notification System
 * Send automated email notifications for various events
 */

import nodemailer from 'nodemailer'
import { logger } from './logger'

export enum EmailTemplate {
  TENDER_DEADLINE_REMINDER = 'TENDER_DEADLINE_REMINDER',
  INVOICE_DUE_REMINDER = 'INVOICE_DUE_REMINDER',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  BUDGET_THRESHOLD_WARNING = 'BUDGET_THRESHOLD_WARNING',
  DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
  USER_WELCOME = 'USER_WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: any[]
}

// SMTP presets for common providers
const SMTP_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  hotmail: { host: 'smtp.live.com', port: 587, secure: false },
}

class EmailManager {
  private transporter: any
  private fromAddress: string = ''

  constructor() {
    this.initializeTransporter()
  }

  async reinitialize() {
    // Clear existing transporter and reinitialize with fresh config
    this.transporter = null
    await this.initializeTransporterFromDatabase()
  }

  private async initializeTransporterFromDatabase() {
    try {
      // Try to get email settings from database first
      const { getApiKey } = await import('./ai/api-keys')

      const host = await getApiKey('EMAIL_HOST')
      const port = await getApiKey('EMAIL_PORT')
      const user = await getApiKey('EMAIL_USER')
      const password = await getApiKey('EMAIL_PASSWORD')
      const from = await getApiKey('EMAIL_FROM')

      if (host && user && password) {
        this.transporter = nodemailer.createTransport({
          host: host,
          port: parseInt(port || '587', 10),
          secure: port === '465', // true for 465, false for other ports
          auth: {
            user: user,
            pass: password,
          },
        })
        this.fromAddress = from || user
        logger.info('Email transporter initialized from database settings', { host })
        return true
      }
    } catch (error) {
      logger.debug('Could not load email settings from database', { error })
    }
    return false
  }

  private initializeTransporter() {
    const emailHost = process.env.EMAIL_HOST
    const emailPort = process.env.EMAIL_PORT
    const emailUser = process.env.EMAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD
    const emailFrom = process.env.EMAIL_FROM

    if (!emailUser || !emailPassword) {
      logger.warn('Email credentials not configured, emails will not be sent')
      // Try to load from database later
      this.initializeTransporterFromDatabase()
      return
    }

    // Determine SMTP settings
    let host = emailHost
    let port = parseInt(emailPort || '587', 10)
    let secure = port === 465

    // Auto-detect provider from email address if no host specified
    if (!host && emailUser) {
      const domain = emailUser.split('@')[1]?.toLowerCase()
      if (domain?.includes('gmail')) {
        const preset = SMTP_PRESETS.gmail
        host = preset.host
        port = preset.port
        secure = preset.secure
      } else if (domain?.includes('yahoo')) {
        const preset = SMTP_PRESETS.yahoo
        host = preset.host
        port = preset.port
        secure = preset.secure
      } else if (domain?.includes('outlook') || domain?.includes('hotmail') || domain?.includes('live')) {
        const preset = SMTP_PRESETS.outlook
        host = preset.host
        port = preset.port
        secure = preset.secure
      }
    }

    if (!host) {
      logger.warn('Email host not configured and could not be auto-detected')
      return
    }

    this.transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    })

    this.fromAddress = emailFrom || emailUser
    logger.info('Email transporter initialized', { host, port })
  }

  async send(options: EmailOptions): Promise<boolean> {
    // Try to reinitialize if transporter is not set
    if (!this.transporter) {
      await this.initializeTransporterFromDatabase()
    }

    if (!this.transporter) {
      logger.warn('Email transporter not initialized, skipping email')
      return false
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to

      const info = await this.transporter.sendMail({
        from: this.fromAddress ? `"Medical Dashboard" <${this.fromAddress}>` : `"Medical Dashboard" <${process.env.EMAIL_USER}>`,
        to: recipients,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      })

      logger.info('Email sent successfully', {
        context: {
          to: recipients,
          subject: options.subject,
          messageId: info.messageId,
        },
      })

      return true
    } catch (error) {
      logger.error('Failed to send email', error as Error, {
        to: options.to,
        subject: options.subject,
      })
      return false
    }
  }

  async sendTemplate(
    template: EmailTemplate,
    to: string | string[],
    data: any
  ): Promise<boolean> {
    const { subject, html, text } = this.renderTemplate(template, data)
    
    return await this.send({
      to,
      subject,
      html,
      text,
    })
  }

  private renderTemplate(template: EmailTemplate, data: any): { subject: string; html: string; text: string } {
    switch (template) {
      case EmailTemplate.TENDER_DEADLINE_REMINDER:
        return {
          subject: `Reminder: Tender Deadline Approaching - ${data.tenderNumber}`,
          html: `
            <h2>Tender Deadline Reminder</h2>
            <p>This is a reminder that the submission deadline for the following tender is approaching:</p>
            <ul>
              <li><strong>Tender Number:</strong> ${data.tenderNumber}</li>
              <li><strong>Title:</strong> ${data.title}</li>
              <li><strong>Deadline:</strong> ${new Date(data.submissionDeadline).toLocaleString()}</li>
              <li><strong>Days Remaining:</strong> ${data.daysRemaining}</li>
            </ul>
            <p>Please ensure all required documents are submitted before the deadline.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/tenders/${data.id}">View Tender Details</a></p>
          `,
          text: `Tender Deadline Reminder\n\nTender: ${data.tenderNumber} - ${data.title}\nDeadline: ${new Date(data.submissionDeadline).toLocaleString()}\nDays Remaining: ${data.daysRemaining}`,
        }

      case EmailTemplate.INVOICE_DUE_REMINDER:
        return {
          subject: `Invoice Due Reminder - ${data.invoiceNumber}`,
          html: `
            <h2>Invoice Due Reminder</h2>
            <p>This is a reminder that the following invoice is due soon:</p>
            <ul>
              <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
              <li><strong>Customer:</strong> ${data.customerName}</li>
              <li><strong>Amount:</strong> ${data.totalAmount} ${data.currency}</li>
              <li><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</li>
              <li><strong>Days Until Due:</strong> ${data.daysUntilDue}</li>
            </ul>
            <p><a href="${process.env.NEXTAUTH_URL}/invoices/${data.id}">View Invoice Details</a></p>
          `,
          text: `Invoice Due Reminder\n\nInvoice: ${data.invoiceNumber}\nCustomer: ${data.customerName}\nAmount: ${data.totalAmount} ${data.currency}\nDue Date: ${new Date(data.dueDate).toLocaleDateString()}`,
        }

      case EmailTemplate.EXPENSE_APPROVED:
        return {
          subject: `Expense Approved - ${data.expenseNumber}`,
          html: `
            <h2>Expense Approved</h2>
            <p>Your expense has been approved:</p>
            <ul>
              <li><strong>Expense Number:</strong> ${data.expenseNumber}</li>
              <li><strong>Category:</strong> ${data.category}</li>
              <li><strong>Amount:</strong> ${data.amount} ${data.currency}</li>
              <li><strong>Approved By:</strong> ${data.approverName}</li>
              <li><strong>Approved Date:</strong> ${new Date(data.approvedDate).toLocaleDateString()}</li>
            </ul>
            <p><a href="${process.env.NEXTAUTH_URL}/expenses/${data.id}">View Expense Details</a></p>
          `,
          text: `Expense Approved\n\nExpense: ${data.expenseNumber}\nCategory: ${data.category}\nAmount: ${data.amount} ${data.currency}\nApproved By: ${data.approverName}`,
        }

      case EmailTemplate.EXPENSE_REJECTED:
        return {
          subject: `Expense Rejected - ${data.expenseNumber}`,
          html: `
            <h2>Expense Rejected</h2>
            <p>Your expense has been rejected:</p>
            <ul>
              <li><strong>Expense Number:</strong> ${data.expenseNumber}</li>
              <li><strong>Category:</strong> ${data.category}</li>
              <li><strong>Amount:</strong> ${data.amount} ${data.currency}</li>
              <li><strong>Rejected By:</strong> ${data.approverName}</li>
              <li><strong>Reason:</strong> ${data.rejectionReason || 'Not specified'}</li>
            </ul>
            <p>Please contact your manager for more information.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/expenses/${data.id}">View Expense Details</a></p>
          `,
          text: `Expense Rejected\n\nExpense: ${data.expenseNumber}\nCategory: ${data.category}\nAmount: ${data.amount} ${data.currency}\nRejected By: ${data.approverName}\nReason: ${data.rejectionReason || 'Not specified'}`,
        }

      case EmailTemplate.BUDGET_THRESHOLD_WARNING:
        return {
          subject: `Budget Alert: ${data.budgetName} - ${data.threshold}% Threshold Reached`,
          html: `
            <h2>Budget Threshold Warning</h2>
            <p>The following budget has reached ${data.threshold}% of its allocated amount:</p>
            <ul>
              <li><strong>Budget:</strong> ${data.budgetName}</li>
              <li><strong>Category:</strong> ${data.categoryName || 'N/A'}</li>
              <li><strong>Allocated:</strong> ${data.allocatedAmount} ${data.currency}</li>
              <li><strong>Spent:</strong> ${data.spentAmount} ${data.currency}</li>
              <li><strong>Remaining:</strong> ${data.remainingAmount} ${data.currency}</li>
              <li><strong>Utilization:</strong> ${data.utilizationPercentage}%</li>
            </ul>
            <p>Please review spending and adjust as necessary.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/budgets/${data.id}">View Budget Details</a></p>
          `,
          text: `Budget Threshold Warning\n\nBudget: ${data.budgetName}\nAllocated: ${data.allocatedAmount} ${data.currency}\nSpent: ${data.spentAmount} ${data.currency}\nUtilization: ${data.utilizationPercentage}%`,
        }

      case EmailTemplate.DOCUMENT_PROCESSED:
        return {
          subject: `Document Processed - ${data.documentName}`,
          html: `
            <h2>Document Processing Complete</h2>
            <p>Your document has been successfully processed:</p>
            <ul>
              <li><strong>Document:</strong> ${data.documentName}</li>
              <li><strong>Type:</strong> ${data.documentType}</li>
              <li><strong>Status:</strong> ${data.status}</li>
              <li><strong>Processed Date:</strong> ${new Date(data.processedDate).toLocaleString()}</li>
            </ul>
            ${data.extractedData ? `<p>Data has been extracted and is ready for review.</p>` : ''}
            <p><a href="${process.env.NEXTAUTH_URL}/documents/${data.id}">View Document Details</a></p>
          `,
          text: `Document Processing Complete\n\nDocument: ${data.documentName}\nType: ${data.documentType}\nStatus: ${data.status}`,
        }

      case EmailTemplate.USER_WELCOME:
        return {
          subject: 'Welcome to Dashboard2',
          html: `
            <h2>Welcome to Dashboard2!</h2>
            <p>Hello ${data.fullName},</p>
            <p>Your account has been created successfully. Here are your account details:</p>
            <ul>
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Role:</strong> ${data.role}</li>
            </ul>
            <p>You can now log in to the system using your email and password.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/login">Login to Dashboard2</a></p>
          `,
          text: `Welcome to Dashboard2!\n\nHello ${data.fullName},\n\nYour account has been created.\nEmail: ${data.email}\nRole: ${data.role}`,
        }

      case EmailTemplate.PASSWORD_RESET:
        return {
          subject: 'Password Reset Request',
          html: `
            <h2>Password Reset Request</h2>
            <p>You have requested to reset your password.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${process.env.NEXTAUTH_URL}/reset-password?token=${data.resetToken}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
          `,
          text: `Password Reset Request\n\nClick the link to reset your password:\n${process.env.NEXTAUTH_URL}/reset-password?token=${data.resetToken}\n\nThis link will expire in 1 hour.`,
        }

      default:
        throw new Error(`Unknown email template: ${template}`)
    }
  }

  // Scheduled email notifications
  async sendTenderDeadlineReminders(): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      // Find tenders with deadlines in the next 3 days
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const tenders = await prisma.tender.findMany({
        where: {
          status: 'IN_PROGRESS',
          submissionDeadline: {
            lte: threeDaysFromNow,
            gte: new Date(),
          },
        },
        include: {
          createdBy: true,
        },
      })

      for (const tender of tenders) {
        const daysRemaining = Math.ceil(
          (new Date(tender.submissionDeadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        if (tender.createdBy?.email) {
          await this.sendTemplate(
            EmailTemplate.TENDER_DEADLINE_REMINDER,
            tender.createdBy.email,
          {
            id: tender.id,
            tenderNumber: tender.tenderNumber,
            title: tender.title,
            submissionDeadline: tender.submissionDeadline,
            daysRemaining,
          }
          )
        }
      }

      logger.info(`Sent ${tenders.length} tender deadline reminders`)
    } catch (error) {
      logger.error('Failed to send tender deadline reminders', error as Error)
    }
  }

  async sendInvoiceDueReminders(): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      // Find invoices due in the next 7 days
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const invoices = await prisma.invoice.findMany({
        where: {
          status: 'SENT',
          dueDate: {
            lte: sevenDaysFromNow,
            gte: new Date(),
          },
        },
        include: {
          customer: true,
          createdBy: true,
        },
      })

      for (const invoice of invoices) {
        const daysUntilDue = Math.ceil(
          (new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        if (invoice.createdBy?.email) {
          await this.sendTemplate(
            EmailTemplate.INVOICE_DUE_REMINDER,
            invoice.createdBy.email,
          {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customer.name,
            totalAmount: invoice.totalAmount,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            daysUntilDue,
          }
          )
        }
      }

      logger.info(`Sent ${invoices.length} invoice due reminders`)
    } catch (error) {
      logger.error('Failed to send invoice due reminders', error as Error)
    }
  }
}

// Create singleton instance
export const email = new EmailManager()
