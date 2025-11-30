import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { GET, POST } from '@/app/api/tenders/route'
import { createMockRequest } from '../utils/test-helpers'

describe('Tenders API', () => {
  describe('GET /api/tenders', () => {
    it('should return paginated tenders', async () => {
      const request = createMockRequest('/api/tenders?page=1&limit=10')
      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/tenders', () => {
    it('should create a new tender', async () => {
      const request = createMockRequest('/api/tenders', {
        method: 'POST',
        body: {
          title: 'Test Tender',
          status: 'DRAFT',
        },
      })
      const response = await POST(request)
      expect([200, 201]).toContain(response.status)
    })
  })
})
