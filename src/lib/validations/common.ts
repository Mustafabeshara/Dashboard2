/**
 * Common Zod Validation Schemas
 * Reusable validation schemas for API routes
 */

import { z } from 'zod'

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID format')

// Email validation
export const emailSchema = z.string().email('Invalid email format').max(255)

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]{10,20}$/, 'Invalid phone number format')
  .optional()

// Date validation
export const dateSchema = z.coerce.date()
export const optionalDateSchema = z.coerce.date().optional()

// Money/currency validation (in cents/smallest unit)
export const moneySchema = z.number().int().min(0, 'Amount must be positive')
export const decimalMoneySchema = z
  .number()
  .min(0, 'Amount must be positive')
  .transform((val) => Math.round(val * 100) / 100) // Round to 2 decimal places

// Percentage validation (0-100)
export const percentageSchema = z.number().min(0).max(100, 'Percentage must be between 0-100')

// Positive integer validation
export const positiveIntSchema = z.number().int().positive()
export const nonNegativeIntSchema = z.number().int().min(0)

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const sortSchema = z.object({
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const searchSchema = z.object({
  search: z.string().optional(),
})

// Combined query params schema
export const queryParamsSchema = paginationSchema.merge(sortSchema).merge(searchSchema)

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100).default('Yemen'),
})

// Contact info schema
export const contactSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema,
  fax: phoneSchema,
})

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.string(),
  size: z.number().max(50 * 1024 * 1024, 'File too large (max 50MB)'),
})

// User roles
export const userRoleSchema = z.enum([
  'ADMIN',
  'CEO',
  'CFO',
  'FINANCE_MANAGER',
  'MANAGER',
  'ACCOUNTANT',
  'SALES_REP',
  'WAREHOUSE_STAFF',
  'USER',
])

// Status schemas
export const tenderStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'WON',
  'LOST',
  'CANCELLED',
])

export const invoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'CANCELLED',
])

export const expenseStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAID',
])

export const documentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
])

// Utility function to validate and parse request body
export async function validateBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json()
  return schema.parse(body)
}

// Utility function to validate query params
export function validateQueryParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}
