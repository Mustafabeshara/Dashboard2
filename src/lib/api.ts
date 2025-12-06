/**
 * API Utility Functions
 * Helper functions for API responses
 */

import { NextResponse } from 'next/server'

// Standard API response types
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  errors?: ValidationError[]
}

// Flexible ValidationError type compatible with Zod errors
export interface ValidationError {
  field?: string
  path?: (string | number)[]
  message: string
  code?: string
}

// Type for raw Zod issues (for compatibility)
export type ZodValidationError = {
  path: (string | number)[]
  message: string
  code?: string
  [key: string]: unknown
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export function ApiResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
    },
    { status }
  )
}

export function ApiError(
  message: string,
  status: number = 500,
  errors?: ValidationError[] | ZodValidationError[],
  code?: string
): NextResponse<ApiErrorResponse> {
  // Normalize errors to consistent format
  const normalizedErrors: ValidationError[] | undefined = errors?.map(e => ({
    field: 'field' in e && typeof e.field === 'string' ? e.field : e.path?.join('.'),
    message: e.message,
    code: typeof e.code === 'string' ? e.code : undefined,
  }))

  return NextResponse.json(
    {
      success: false as const,
      error: message,
      ...(code && { code }),
      ...(normalizedErrors && { errors: normalizedErrors }),
    },
    { status }
  )
}

export function ApiPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit)
  return NextResponse.json(
    {
      success: true as const,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    },
    { status: 200 }
  )
}

// HTTP error helpers
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export function BadRequest(message: string, errors?: ValidationError[]) {
  return ApiError(message, HttpStatus.BAD_REQUEST, errors, 'BAD_REQUEST')
}

export function Unauthorized(message: string = 'Authentication required') {
  return ApiError(message, HttpStatus.UNAUTHORIZED, undefined, 'UNAUTHORIZED')
}

export function Forbidden(message: string = 'Insufficient permissions') {
  return ApiError(message, HttpStatus.FORBIDDEN, undefined, 'FORBIDDEN')
}

export function NotFound(resource: string = 'Resource') {
  return ApiError(`${resource} not found`, HttpStatus.NOT_FOUND, undefined, 'NOT_FOUND')
}

export function Conflict(message: string) {
  return ApiError(message, HttpStatus.CONFLICT, undefined, 'CONFLICT')
}

export function InternalError(message: string = 'An unexpected error occurred') {
  return ApiError(message, HttpStatus.INTERNAL_SERVER_ERROR, undefined, 'INTERNAL_ERROR')
}
