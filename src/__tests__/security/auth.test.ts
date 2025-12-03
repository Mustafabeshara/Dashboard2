/**
 * Security Tests for Authentication Module
 * Tests password validation, hashing, and permission system
 */

import { validatePassword, PASSWORD_REQUIREMENTS, hashPassword, verifyPassword, hasPermission, getRequiredApprovalLevel } from '@/lib/auth';

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than minimum length', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should accept valid passwords meeting all requirements', () => {
      const result = validatePassword('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept passwords with special characters', () => {
      const result = validatePassword('Valid@Pass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple errors for weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const hash = await hashPassword('TestPassword123');
      expect(hash).toMatch(/^\$2[ab]\$\d+\$/);
    });

    it('should produce different hashes for same password', async () => {
      const hash1 = await hashPassword('TestPassword123');
      const hash2 = await hashPassword('TestPassword123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('TestPassword123');
      const result = await verifyPassword('WrongPassword123', hash);
      expect(result).toBe(false);
    });
  });
});

describe('Role Permissions', () => {
  describe('hasPermission', () => {
    it('should grant all permissions to ADMIN', () => {
      expect(hasPermission('ADMIN', 'budgets:create')).toBe(true);
      expect(hasPermission('ADMIN', 'users:delete')).toBe(true);
      expect(hasPermission('ADMIN', 'anything:any')).toBe(true);
    });

    it('should check exact permissions for CEO', () => {
      expect(hasPermission('CEO', 'budgets:create')).toBe(true);
      expect(hasPermission('CEO', 'users:view')).toBe(true);
      expect(hasPermission('CEO', 'users:delete')).toBe(false);
    });

    it('should check wildcard permissions', () => {
      expect(hasPermission('CFO', 'budgets:view')).toBe(true);
      expect(hasPermission('CFO', 'budgets:create')).toBe(true);
      expect(hasPermission('CFO', 'budgets:delete')).toBe(true);
    });

    it('should deny permissions for SALES outside their scope', () => {
      expect(hasPermission('SALES', 'tenders:create')).toBe(true);
      expect(hasPermission('SALES', 'budgets:create')).toBe(false);
    });

    it('should handle unknown roles gracefully', () => {
      expect(hasPermission('UNKNOWN_ROLE' as any, 'budgets:view')).toBe(false);
    });
  });
});

describe('Approval Levels', () => {
  describe('getRequiredApprovalLevel', () => {
    it('should return MANAGER for amounts under 1000', () => {
      const result = getRequiredApprovalLevel(500);
      expect(result.level).toBe(0);
      expect(result.role).toBe('MANAGER');
    });

    it('should return MANAGER for amounts 1000-10000', () => {
      const result = getRequiredApprovalLevel(5000);
      expect(result.level).toBe(1);
      expect(result.role).toBe('MANAGER');
    });

    it('should return FINANCE_MANAGER for amounts 10000-50000', () => {
      const result = getRequiredApprovalLevel(25000);
      expect(result.level).toBe(2);
      expect(result.role).toBe('FINANCE_MANAGER');
    });

    it('should return CFO for amounts 50000-100000', () => {
      const result = getRequiredApprovalLevel(75000);
      expect(result.level).toBe(3);
      expect(result.role).toBe('CFO');
    });

    it('should return CEO for amounts over 100000', () => {
      const result = getRequiredApprovalLevel(150000);
      expect(result.level).toBe(4);
      expect(result.role).toBe('CEO');
    });
  });
});
