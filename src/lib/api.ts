/**
 * API Utility Functions
 * Helper functions for API responses
 */

import { NextResponse } from 'next/server'

export function ApiResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

export function ApiError(message: string, status: number = 500, errors?: any) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errors,
    },
    { status }
  )
}
