/**
 * Health Check Endpoint
 * Used for monitoring and load balancer health checks
 */

import { NextResponse } from 'next/server'

// Force dynamic rendering - required for health checks
export const dynamic = 'force-dynamic'

export async function GET() {
  // Simple health check that doesn't require database
  // This ensures the server can respond even during DB connection issues
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
