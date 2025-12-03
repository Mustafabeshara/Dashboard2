/**
 * Authentication Library Tests
 * Comprehensive tests for auth utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  validatePassword,
  PASSWORD_REQUIREMENTS,
  hasPermission,
  getRequiredApprovalLevel,
  canApprove,
  ROLE_PERMISSIONS,
} from '@/lib/auth';
import type { UserRole } from '@/types';

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than minimum length', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`
      );
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

    it('should accept valid passwords', () => {
      const result = validatePassword('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return multiple errors for weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Password Requirements Constants', () => {
    it('should have minimum length of at least 8', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBeGreaterThanOrEqual(8);
    });

    it('should require uppercase letters', () => {
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
    });

    it('should require lowercase letters', () => {
      expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
    });

    it('should require numbers', () => {
      expect(PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
    });
  });
});

describe('Role-Based Permissions', () => {
  describe('hasPermission', () => {
    it('should grant ADMIN all permissions', () => {
      expect(hasPermission('ADMIN', 'budgets:create')).toBe(true);
      expect(hasPermission('ADMIN', 'tenders:delete')).toBe(true);
      expect(hasPermission('ADMIN', 'users:manage')).toBe(true);
      expect(hasPermission('ADMIN', 'any:permission')).toBe(true);
    });

    it('should grant CEO budget permissions', () => {
      expect(hasPermission('CEO', 'budgets:view')).toBe(true);
      expect(hasPermission('CEO', 'budgets:create')).toBe(true);
      expect(hasPermission('CEO', 'budgets:approve')).toBe(true);
    });

    it('should grant CFO financial permissions', () => {
      expect(hasPermission('CFO', 'budgets:view')).toBe(true);
      expect(hasPermission('CFO', 'expenses:create')).toBe(true);
      expect(hasPermission('CFO', 'invoices:approve')).toBe(true);
    });

    it('should grant SALES tender permissions', () => {
      expect(hasPermission('SALES', 'tenders:view')).toBe(true);
      expect(hasPermission('SALES', 'tenders:create')).toBe(true);
      expect(hasPermission('SALES', 'customers:view')).toBe(true);
    });

    it('should grant WAREHOUSE inventory permissions', () => {
      expect(hasPermission('WAREHOUSE', 'inventory:view')).toBe(true);
      expect(hasPermission('WAREHOUSE', 'inventory:update')).toBe(true);
    });

    it('should deny unauthorized permissions', () => {
      expect(hasPermission('SALES', 'users:manage')).toBe(false);
      expect(hasPermission('WAREHOUSE', 'budgets:approve')).toBe(false);
      expect(hasPermission('FINANCE', 'users:delete')).toBe(false);
    });

    it('should handle wildcard permissions correctly', () => {
      expect(hasPermission('CEO', 'tenders:any_action')).toBe(true);
      expect(hasPermission('CFO', 'expenses:any_action')).toBe(true);
    });
  });

  describe('ROLE_PERMISSIONS structure', () => {
    const allRoles: UserRole[] = [
      'ADMIN',
      'CEO',
      'CFO',
      'FINANCE_MANAGER',
      'MANAGER',
      'SALES',
      'WAREHOUSE',
      'FINANCE',
    ];

    it('should define permissions for all roles', () => {
      allRoles.forEach((role) => {
        expect(ROLE_PERMISSIONS).toHaveProperty(role);
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      });
    });

    it('should give ADMIN wildcard permission', () => {
      expect(ROLE_PERMISSIONS['ADMIN']).toContain('*');
    });

    it('should not give non-admin roles wildcard permission', () => {
      allRoles
        .filter((role) => role !== 'ADMIN')
        .forEach((role) => {
          expect(ROLE_PERMISSIONS[role]).not.toContain('*');
        });
    });
  });
});

describe('Approval Level System', () => {
  describe('getRequiredApprovalLevel', () => {
    it('should auto-approve amounts under 1000', () => {
      const result = getRequiredApprovalLevel(500);
      expect(result.level).toBe(0);
      expect(result.role).toBe('MANAGER');
    });

    it('should require MANAGER approval for 1000-10000', () => {
      const result = getRequiredApprovalLevel(5000);
      expect(result.level).toBe(1);
      expect(result.role).toBe('MANAGER');
    });

    it('should require FINANCE_MANAGER approval for 10000-50000', () => {
      const result = getRequiredApprovalLevel(25000);
      expect(result.level).toBe(2);
      expect(result.role).toBe('FINANCE_MANAGER');
    });

    it('should require CFO approval for 50000-100000', () => {
      const result = getRequiredApprovalLevel(75000);
      expect(result.level).toBe(3);
      expect(result.role).toBe('CFO');
    });

    it('should require CEO approval for 100000+', () => {
      const result = getRequiredApprovalLevel(150000);
      expect(result.level).toBe(4);
      expect(result.role).toBe('CEO');
    });

    it('should handle boundary values correctly', () => {
      expect(getRequiredApprovalLevel(999).level).toBe(0);
      expect(getRequiredApprovalLevel(1000).level).toBe(1);
      expect(getRequiredApprovalLevel(9999).level).toBe(1);
      expect(getRequiredApprovalLevel(10000).level).toBe(2);
      expect(getRequiredApprovalLevel(49999).level).toBe(2);
      expect(getRequiredApprovalLevel(50000).level).toBe(3);
      expect(getRequiredApprovalLevel(99999).level).toBe(3);
      expect(getRequiredApprovalLevel(100000).level).toBe(4);
    });
  });

  describe('canApprove', () => {
    it('should allow ADMIN to approve any level', () => {
      expect(canApprove('ADMIN', 0)).toBe(true);
      expect(canApprove('ADMIN', 1)).toBe(true);
      expect(canApprove('ADMIN', 2)).toBe(true);
      expect(canApprove('ADMIN', 3)).toBe(true);
      expect(canApprove('ADMIN', 4)).toBe(true);
    });

    it('should allow CEO to approve up to level 4', () => {
      expect(canApprove('CEO', 0)).toBe(true);
      expect(canApprove('CEO', 4)).toBe(true);
      expect(canApprove('CEO', 5)).toBe(false);
    });

    it('should allow CFO to approve up to level 3', () => {
      expect(canApprove('CFO', 0)).toBe(true);
      expect(canApprove('CFO', 3)).toBe(true);
      expect(canApprove('CFO', 4)).toBe(false);
    });

    it('should allow FINANCE_MANAGER to approve up to level 2', () => {
      expect(canApprove('FINANCE_MANAGER', 0)).toBe(true);
      expect(canApprove('FINANCE_MANAGER', 2)).toBe(true);
      expect(canApprove('FINANCE_MANAGER', 3)).toBe(false);
    });

    it('should allow MANAGER to approve up to level 1', () => {
      expect(canApprove('MANAGER', 0)).toBe(true);
      expect(canApprove('MANAGER', 1)).toBe(true);
      expect(canApprove('MANAGER', 2)).toBe(false);
    });

    it('should not allow SALES/WAREHOUSE/FINANCE to approve higher levels', () => {
      expect(canApprove('SALES', 1)).toBe(false);
      expect(canApprove('WAREHOUSE', 1)).toBe(false);
      expect(canApprove('FINANCE', 1)).toBe(false);
    });
  });
});
