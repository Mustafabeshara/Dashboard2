/**
 * Validation Schemas Index
 * Re-export all validation schemas
 */

export * from './common'
export * from './tenders'
export * from './budgets'

// Validation helper for API routes
import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'
import { BadRequest } from '@/lib/api'

/**
 * Validate request body against a Zod schema
 * Returns parsed data or throws validation error
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  return schema.parse(body)
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  return schema.parse(params)
}

/**
 * Safe validation that returns result or error response
 */
export async function safeValidateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return {
        success: false,
        response: BadRequest('Validation failed', errors),
      }
    }
    return {
      success: false,
      response: BadRequest('Invalid request body'),
    }
  }
}

/**
 * Safe validation for query params
 */
export function safeValidateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return {
        success: false,
        response: BadRequest('Invalid query parameters', errors),
      }
    }
    return {
      success: false,
      response: BadRequest('Invalid query parameters'),
    }
  }
}
