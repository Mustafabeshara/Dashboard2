/**
 * Tests for AI Service Manager
 * Tests provider health checks and service selection
 */

import { complete, getRateLimitStatus } from '@/lib/ai/ai-service-manager';
import { runHealthChecks, isAIAvailable } from '@/lib/ai/health-check';

// Mock environment variables
const originalEnv = process.env;

describe('AI Service Manager', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status for providers', () => {
      const status = getRateLimitStatus();
      
      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
    });

    it('should include availability status', () => {
      const status = getRateLimitStatus();
      
      // Check that each provider has the required fields
      Object.values(status).forEach(providerStatus => {
        expect(providerStatus).toHaveProperty('available');
        expect(providerStatus).toHaveProperty('minuteRemaining');
        expect(providerStatus).toHaveProperty('dayRemaining');
      });
    });
  });

  describe('complete', () => {
    it('should handle request when no providers configured', async () => {
      const response = await complete({
        prompt: 'Test prompt',
      });
      
      // When no providers are configured, it should return an error
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should accept valid request structure', async () => {
      const response = await complete({
        prompt: 'Test prompt',
        systemPrompt: 'You are a test assistant',
        maxTokens: 100,
        temperature: 0.7,
      });
      
      // Response should have required fields
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('provider');
      expect(response).toHaveProperty('model');
    });
  });
});
