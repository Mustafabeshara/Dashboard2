/**
 * Test Utilities and Helpers
 */

import { NextRequest } from 'next/server'

export function createMockRequest(url: string, options?: any): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000')
  return new NextRequest(fullUrl, options)
}

export const mockTender = {
  id: 'tender-1',
  tenderNumber: 'TND-2024-001',
  title: 'Test Tender',
  status: 'DRAFT',
  createdAt: new Date(),
}

export const mockCustomer = {
  id: 'customer-1',
  name: 'Test Customer',
  type: 'GOVERNMENT',
  createdAt: new Date(),
}
