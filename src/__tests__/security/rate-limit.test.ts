/**
 * Security Tests for Rate Limiting
 * Tests rate limiting functionality for API protection
 */

import { rateLimiter, RateLimitPresets } from '@/lib/rate-limit';

// Mock NextRequest for testing
class MockNextRequest {
  headers: Map<string, string>;
  nextUrl: { pathname: string };
  method: string;

  constructor(ip: string = '127.0.0.1', path: string = '/api/test') {
    this.headers = new Map([['x-forwarded-for', ip]]);
    this.nextUrl = { pathname: path };
    this.method = 'POST';
  }

  // Implement headers.get() method
  getHeaders() {
    return {
      get: (key: string) => this.headers.get(key) || null,
    };
  }
}

// Helper to create mock request that matches NextRequest interface
function createMockRequest(ip: string = '127.0.0.1', path: string = '/api/test'): any {
  return {
    headers: {
      get: (key: string) => {
        if (key === 'x-forwarded-for') return ip;
        if (key === 'x-real-ip') return null;
        return null;
      },
    },
    nextUrl: { pathname: path },
    method: 'POST',
  };
}

describe('Rate Limiter', () => {
  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const request = createMockRequest('192.168.1.100', '/api/basic-test-1');
      const config = { windowMs: 60000, maxRequests: 5 };

      const result = rateLimiter.check(request, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track remaining requests', () => {
      const request = createMockRequest('192.168.1.101', '/api/track-test-1');
      const config = { windowMs: 60000, maxRequests: 3 };

      let result = rateLimiter.check(request, config);
      expect(result.remaining).toBe(2);

      result = rateLimiter.check(request, config);
      expect(result.remaining).toBe(1);

      result = rateLimiter.check(request, config);
      expect(result.remaining).toBe(0);
    });

    it('should block requests exceeding limit', () => {
      const request = createMockRequest('192.168.1.102', '/api/block-test-1');
      const config = { windowMs: 60000, maxRequests: 2 };

      rateLimiter.check(request, config); // 1
      rateLimiter.check(request, config); // 2
      const result = rateLimiter.check(request, config); // Should be blocked

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should provide reset time', () => {
      const request = createMockRequest('192.168.1.103', '/api/reset-test-1');
      const config = { windowMs: 60000, maxRequests: 5 };

      const result = rateLimiter.check(request, config);
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should separate rate limits by identifier', () => {
      const request = createMockRequest('192.168.1.104', '/api/user-test-1');
      const config = { windowMs: 60000, maxRequests: 2 };

      // User 1 uses their quota
      rateLimiter.check(request, config, 'user:test1');
      rateLimiter.check(request, config, 'user:test1');
      const user1Result = rateLimiter.check(request, config, 'user:test1');

      // User 2 should have their own quota
      const user2Result = rateLimiter.check(request, config, 'user:test2');

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

    it('should have STANDARD preset for general API use', () => {
      expect(RateLimitPresets.STANDARD.maxRequests).toBe(100);
      expect(RateLimitPresets.STANDARD.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have RELAXED preset for public endpoints', () => {
      expect(RateLimitPresets.RELAXED.maxRequests).toBe(300);
      expect(RateLimitPresets.RELAXED.windowMs).toBe(15 * 60 * 1000);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit for a specific identifier', () => {
      const request = createMockRequest('192.168.1.105', '/api/reset-specific-1');
      const config = { windowMs: 60000, maxRequests: 2 };
      const identifier = 'user:reset-test-unique';

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

  describe('IP-based Rate Limiting', () => {
    it('should use IP from x-forwarded-for header', () => {
      const request1 = createMockRequest('10.0.0.1', '/api/ip-test');
      const request2 = createMockRequest('10.0.0.2', '/api/ip-test');
      const config = { windowMs: 60000, maxRequests: 1 };

      // First IP uses quota
      rateLimiter.check(request1, config);
      const result1 = rateLimiter.check(request1, config);

      // Second IP should have its own quota
      const result2 = rateLimiter.check(request2, config);

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });
  });
});
