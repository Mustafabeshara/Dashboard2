/**
 * Unified Error Handler
 * Provides consistent error handling across the application
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from '../logger'

/**
 * Application Error base class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Specific error types
 */
export interface ValidationDetail {
  field: string;
  message: string;
  code?: string;
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: ValidationDetail[]) {
    super(400, message, true, 'VALIDATION_ERROR')
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, true, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, true, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, true, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true, 'CONFLICT')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, true, 'RATE_LIMIT_EXCEEDED')
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, message, false, 'DATABASE_ERROR')
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(503, `${service} service error: ${message}`, false, 'EXTERNAL_SERVICE_ERROR')
  }
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): NextResponse {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))

  return NextResponse.json(
    {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    },
    { status: 400 }
  )
}

/**
 * Handle Prisma errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case 'P2002':
      return NextResponse.json(
        {
          error: 'Resource already exists',
          code: 'CONFLICT',
          details: `Duplicate value for field: ${error.meta?.target}`,
        },
        { status: 409 }
      )

    case 'P2025':
      return NextResponse.json(
        {
          error: 'Resource not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      )

    case 'P2003':
      return NextResponse.json(
        {
          error: 'Foreign key constraint failed',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )

    default:
      logger.error('Unhandled Prisma error', error)
      return NextResponse.json(
        {
          error: 'Database error occurred',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      )
  }
}

/**
 * Main error handler
 */
export function handleError(error: unknown, context?: Record<string, unknown>): NextResponse {
  // Log error with context
  if (error instanceof Error) {
    logger.error(`Error: ${error.message}`, error, context)
  } else {
    logger.error('Unknown error occurred', new Error(String(error)), context)
  }

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error)
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error)
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: 'Invalid data provided',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred'

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  // Fallback for unknown errors
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

/**
 * Async error wrapper for API routes
 */
export function asyncHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Type guard for operational errors
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}
