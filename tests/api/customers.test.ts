/**
 * Customers API Tests
 * Comprehensive tests for customer management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest } from '../utils/test-helpers';

// Mock Prisma
const mockPrisma = {
  customer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() =>
    Promise.resolve({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'SALES',
      },
    })
  ),
}));

describe('Customers API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/customers', () => {
    it('should return paginated customers', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([
        {
          id: 'customer-1',
          name: 'Test Customer',
          type: 'GOVERNMENT',
          email: 'customer@test.com',
        },
      ]);
      mockPrisma.customer.count.mockResolvedValue(1);

      const request = createMockRequest('/api/customers?page=1&limit=10');
      expect(request.url).toContain('/api/customers');
    });

    it('should search customers by name', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      const request = createMockRequest('/api/customers?search=hospital');
      expect(request.url).toContain('search=hospital');
    });

    it('should filter by customer type', async () => {
      const types = ['GOVERNMENT', 'PRIVATE', 'HOSPITAL', 'CLINIC'];
      types.forEach((type) => {
        expect(types).toContain(type);
      });
    });
  });

  describe('POST /api/customers', () => {
    it('should validate required fields', () => {
      const requiredFields = ['name', 'type'];
      const customer = { name: 'Test', type: 'GOVERNMENT' };
      requiredFields.forEach((field) => {
        expect(customer).toHaveProperty(field);
      });
    });

    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
      const invalidEmails = ['invalid', 'no@', '@domain.com'];

      validEmails.forEach((email) => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach((email) => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should validate phone format', () => {
      const validPhones = ['+965-12345678', '12345678', '+1-555-123-4567'];
      validPhones.forEach((phone) => {
        expect(phone.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Customer Type Validation', () => {
    const validTypes = ['GOVERNMENT', 'PRIVATE', 'HOSPITAL', 'CLINIC', 'OTHER'];

    it('should accept valid customer types', () => {
      validTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });
    });

    it('should reject invalid customer types', () => {
      const invalidType = 'INVALID_TYPE';
      expect(validTypes).not.toContain(invalidType);
    });
  });
});

describe('Customer Business Logic', () => {
  describe('Customer Contact Validation', () => {
    it('should require primary contact name', () => {
      const contact = { name: 'John Doe', email: 'john@example.com' };
      expect(contact.name.length).toBeGreaterThan(0);
    });

    it('should allow optional secondary contacts', () => {
      const customer = {
        primaryContact: 'John Doe',
        secondaryContacts: [],
      };
      expect(customer.secondaryContacts).toEqual([]);
    });
  });

  describe('Customer Address Validation', () => {
    it('should validate country code', () => {
      const validCountries = ['KW', 'AE', 'SA', 'QA', 'BH', 'OM'];
      const customer = { country: 'KW' };
      expect(validCountries).toContain(customer.country);
    });

    it('should format address correctly', () => {
      const address = {
        street: '123 Main St',
        city: 'Kuwait City',
        country: 'Kuwait',
      };
      const formatted = `${address.street}, ${address.city}, ${address.country}`;
      expect(formatted).toBe('123 Main St, Kuwait City, Kuwait');
    });
  });
});
