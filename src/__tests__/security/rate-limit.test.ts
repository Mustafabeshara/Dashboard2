/**
 * Security Tests for Rate Limiting
 * Tests rate limiting functionality for API protection
 */

import { NextRequest } from 'next/server';
import { rateLimiter, RateLimitPresets } from '@/lib/rate-limit';

// Helper to create mock NextRequest
function createMockRequest(ip: string = '127.0.0.1', path: string = '/api/test'): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  return {
    headers: new Headers({
      'x-forwarded-for': ip,
    }),
    nextUrl: url,
    method: 'POST',
  } as unknown as NextRequest;
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset the rate limiter for each test
    // Note: In production, we'd need a proper reset mechanism
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const request = createMockRequest('192.168.1.1', '/api/basic-test');
      const config = { windowMs: 60000, maxRequests: 5 };

      const result = rateLimiter.check(request, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track remaining requests', () => {
      const request = createMockRequest('192.168.1.2', '/api/track-test');
      const config = { windowMs: 60000, maxRequests: 3 };

      let result = rateLimiter.check(request, config);
      expect(result.remaining).toBe(2);

      result = rateLimiter.check(request, config);
      expect(result.remaining).toBe(1);

      result = rateLimiter.check(request, config);
      expect(result.remaining).toBe(0);
    });

    it('should block requests exceeding limit', () => {
      const request = createMockRequest('192.168.1.3', '/api/block-test');
      const config = { windowMs: 60000, maxRequests: 2 };

      rateLimiter.check(request, config); // 1
      rateLimiter.check(request, config); // 2
      const result = rateLimiter.check(request, config); // Should be blocked

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should provide reset time', () => {
      const request = createMockRequest('192.168.1.4', '/api/reset-test');
      const config = { windowMs: 60000, maxRequests: 5 };

      const result = rateLimiter.check(request, config);
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should separate rate limits by identifier', () => {
      const request = createMockRequest('192.168.1.5', '/api/user-test');
      const config = { windowMs: 60000, maxRequests: 2 };

      // User 1 uses their quota
      rateLimiter.check(request, config, 'user:1');
      rateLimiter.check(request, config, 'user:1');
      const user1Result = rateLimiter.check(request, config, 'user:1');

      // User 2 should have their own quota
      const user2Result = rateLimiter.check(request, config, 'user:2');

      expect(user1Result.allowed).toBe(false);
      expect(user2Result.allowed).toBe(true);
    });
  });

  describe('Preset Configurations', () => {
    it('should have STRICT preset with low limits', () => {
      expect(RateLimitPresets.STRICT.maxRequests).toBe(5);
      expect(RateLimitPresets.STRICT.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have AUTH preset for login protection', () => {
      expect(RateLimitPresets.AUTH.maxRequests).toBe(5);
      expect(RateLimitPresets.AUTH.message).toContain('authentication');
    });

    it('should have AI preset for API cost protection', () => {
      expect(RateLimitPresets.AI.maxRequests).toBe(30);
      expect(RateLimitPresets.AI.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(RateLimitPresets.AI.message).toContain('AI');
    });

    it('should have UPLOAD preset for file upload limits', () => {
      expect(RateLimitPresets.UPLOAD.maxRequests).toBe(20);
      expect(RateLimitPresets.UPLOAD.windowMs).toBe(60 * 60 * 1000);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit for a specific identifier', () => {
      const request = createMockRequest('192.168.1.6', '/api/reset-specific');
      const config = { windowMs: 60000, maxRequests: 2 };
      const identifier = 'user:reset-test';

      // Use up the quota
      rateLimiter.check(request, config, identifier);
      rateLimiter.check(request, config, identifier);
      let result = rateLimiter.check(request, config, identifier);
      expect(result.allowed).toBe(false);

      // Reset
      rateLimiter.reset(request, identifier);

      // Should be allowed again
      result = rateLimiter.check(request, config, identifier);
      expect(result.allowed).toBe(true);
    });
  });
});
