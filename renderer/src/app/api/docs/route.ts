/**
 * API Documentation Endpoint
 * Serves Swagger/OpenAPI documentation
 */

import { NextResponse } from 'next/server'
import { swaggerDefinition } from '@/lib/swagger'

export async function GET() {
  return NextResponse.json(swaggerDefinition)
}
