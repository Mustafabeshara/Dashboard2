/**
 * Utility functions for the Medical Distribution Management System
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with Tailwind CSS merge support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number | string,
  currency: string = 'KWD',
  locale: string = 'en-KW'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(numAmount)
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-KW', options).format(dateObj)
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-KW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100 * 100) / 100
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Generate a unique reference number
 */
export function generateReferenceNumber(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get initials from a full name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get status color based on budget consumption
 */
export function getBudgetStatusColor(percentage: number): {
  color: string
  bgColor: string
  status: 'healthy' | 'warning' | 'danger' | 'critical'
} {
  if (percentage < 70) {
    return { color: 'text-green-600', bgColor: 'bg-green-100', status: 'healthy' }
  } else if (percentage < 80) {
    return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', status: 'warning' }
  } else if (percentage < 100) {
    return { color: 'text-orange-600', bgColor: 'bg-orange-100', status: 'danger' }
  } else {
    return { color: 'text-red-600', bgColor: 'bg-red-100', status: 'critical' }
  }
}

/**
 * Get approval level based on amount
 */
export function getApprovalLevel(amount: number): {
  level: number
  role: string
  description: string
} {
  if (amount < 1000) {
    return { level: 0, role: 'AUTO', description: 'Auto-approved' }
  } else if (amount < 10000) {
    return { level: 1, role: 'MANAGER', description: 'Manager Approval' }
  } else if (amount < 50000) {
    return { level: 2, role: 'FINANCE_MANAGER', description: 'Finance Manager Approval' }
  } else if (amount < 100000) {
    return { level: 3, role: 'CFO', description: 'CFO Approval' }
  } else {
    return { level: 4, role: 'CEO', description: 'CEO Approval' }
  }
}

/**
 * Parse error message from API response
 */
export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unexpected error occurred'
}

/**
 * Convert Decimal to number (for Prisma Decimal fields)
 */
export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value)
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber()
  }
  return 0
}
