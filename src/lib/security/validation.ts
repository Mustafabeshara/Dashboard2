/**
 * Request Validation Middleware with Zod
 * Centralized validation for API requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'

// Common validation schemas
export const schemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid ID format'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }).refine(
    data => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: 'Start date must be before end date' }
  ),

  // Email
  email: z.string().email('Invalid email address').toLowerCase(),

  // Password (strong)
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // Currency amount
  amount: z.coerce.number().positive('Amount must be positive'),

  // Currency code
  currency: z.string().length(3).toUpperCase().default('KWD'),

  // Phone number (flexible)
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),

  // Search query
  search: z.string().max(200).optional(),

  // File upload metadata
  fileUpload: z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.string(),
    size: z.number().positive().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  }),
}

// Common entity schemas
export const entitySchemas = {
  // User creation
  createUser: z.object({
    email: schemas.email,
    password: schemas.password,
    fullName: z.string().min(2).max(100),
    role: z.enum(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'STAFF', 'VIEWER', 'CEO', 'CFO', 'FINANCE_MANAGER']),
    department: z.string().optional(),
    phone: schemas.phone,
  }),

  // User update
  updateUser: z.object({
    fullName: z.string().min(2).max(100).optional(),
    department: z.string().optional(),
    phone: schemas.phone,
    isActive: z.boolean().optional(),
  }),

  // Budget creation
  createBudget: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    type: z.enum(['OPERATIONAL', 'CAPITAL', 'PROJECT', 'DEPARTMENT']),
    amount: schemas.amount,
    currency: schemas.currency,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    departmentId: z.string().uuid().optional(),
  }),

  // Expense creation
  createExpense: z.object({
    description: z.string().min(1).max(500),
    amount: schemas.amount,
    currency: schemas.currency,
    categoryId: z.string().uuid().optional(),
    budgetId: z.string().uuid().optional(),
    vendorName: z.string().max(200).optional(),
    receiptUrl: z.string().url().optional(),
    expenseDate: z.coerce.date().optional(),
  }),

  // Tender creation
  createTender: z.object({
    title: z.string().min(1).max(300),
    tenderNumber: z.string().min(1).max(100),
    description: z.string().max(5000).optional(),
    customerId: z.string().uuid().optional(),
    department: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    estimatedValue: schemas.amount.optional(),
    currency: schemas.currency,
    submissionDeadline: z.coerce.date().optional(),
    openingDate: z.coerce.date().optional(),
    bondRequired: z.boolean().default(false),
    bondAmount: schemas.amount.optional(),
  }),

  // Customer creation
  createCustomer: z.object({
    name: z.string().min(1).max(200),
    email: schemas.email.optional(),
    phone: schemas.phone,
    type: z.enum(['HOSPITAL', 'CLINIC', 'PHARMACY', 'DISTRIBUTOR', 'GOVERNMENT', 'OTHER']),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).default('Kuwait'),
    taxNumber: z.string().max(50).optional(),
  }),

  // Document upload
  uploadDocument: z.object({
    moduleType: z.enum(['TENDER', 'EXPENSE', 'INVOICE', 'BUDGET', 'CUSTOMER', 'SUPPLIER', 'GENERAL']),
    moduleId: z.string().uuid().optional(),
    type: z.string(),
    description: z.string().max(500).optional(),
    tags: z.string().optional(),
  }),

  // API key setting
  apiKeySetting: z.object({
    key: z.string().min(1).max(100),
    value: z.string().max(1000),
  }),
}

// Validation result type
interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Array<{ field: string; message: string }>
}

// Format Zod errors into a user-friendly format
function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map(err => ({
    field: err.path.join('.') || 'body',
    message: err.message,
  }))
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: formatZodErrors(error) }
    }
    if (error instanceof SyntaxError) {
      return { success: false, errors: [{ field: 'body', message: 'Invalid JSON' }] }
    }
    return { success: false, errors: [{ field: 'body', message: 'Validation failed' }] }
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const data = schema.parse(searchParams)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: formatZodErrors(error) }
    }
    return { success: false, errors: [{ field: 'query', message: 'Validation failed' }] }
  }
}

/**
 * Validate path parameters
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: formatZodErrors(error) }
    }
    return { success: false, errors: [{ field: 'params', message: 'Validation failed' }] }
  }
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  )
}

/**
 * Higher-order function to wrap an API handler with validation
 */
export function withValidation<TBody, TQuery = unknown>(
  config: {
    body?: ZodSchema<TBody>
    query?: ZodSchema<TQuery>
  },
  handler: (
    request: NextRequest,
    context: {
      body?: TBody
      query?: TQuery
      params?: Record<string, string>
    }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    routeContext?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const context: { body?: TBody; query?: TQuery; params?: Record<string, string> } = {}

    // Validate body if schema provided and method has body
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyResult = await validateBody(request, config.body)
      if (!bodyResult.success) {
        return validationErrorResponse(bodyResult.errors!)
      }
      context.body = bodyResult.data
    }

    // Validate query if schema provided
    if (config.query) {
      const queryResult = validateQuery(request, config.query)
      if (!queryResult.success) {
        return validationErrorResponse(queryResult.errors!)
      }
      context.query = queryResult.data
    }

    // Get params if available
    if (routeContext?.params) {
      context.params = await routeContext.params
    }

    return handler(request, context)
  }
}

// Export schema for convenience
export { z } from 'zod'
