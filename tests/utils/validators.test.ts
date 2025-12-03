/**
 * Validator Utility Tests
 * Tests for input validation functions
 */

import { describe, it, expect } from '@jest/globals';

// Email validator
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validator (international format)
function isValidPhone(phone: string): boolean {
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Check if it's a valid phone number (8-15 digits, optionally starting with +)
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  return phoneRegex.test(cleaned);
}

// URL validator
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Tender number validator (e.g., TND-2024-001)
function isValidTenderNumber(number: string): boolean {
  const tenderRegex = /^TND-\d{4}-\d{3,4}$/;
  return tenderRegex.test(number);
}

// Budget code validator (e.g., BDG-IT-2024-001)
function isValidBudgetCode(code: string): boolean {
  const budgetRegex = /^BDG-[A-Z]{2,10}-\d{4}-\d{3}$/;
  return budgetRegex.test(code);
}

// Currency amount validator
function isValidAmount(amount: number): { valid: boolean; error?: string } {
  if (isNaN(amount)) {
    return { valid: false, error: 'Amount must be a number' };
  }
  if (amount < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }
  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Amount must be finite' };
  }
  // Check for too many decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 3) {
    return { valid: false, error: 'Amount cannot have more than 3 decimal places' };
  }
  return { valid: true };
}

// Date range validator
function isValidDateRange(
  startDate: Date | string,
  endDate: Date | string
): { valid: boolean; error?: string } {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }
  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' };
  }
  if (end < start) {
    return { valid: false, error: 'End date must be after start date' };
  }
  return { valid: true };
}

describe('Email Validation', () => {
  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });
});

describe('Phone Validation', () => {
  describe('isValidPhone', () => {
    it('should accept valid phone numbers', () => {
      expect(isValidPhone('+96512345678')).toBe(true);
      expect(isValidPhone('12345678')).toBe(true);
      expect(isValidPhone('+1-555-123-4567')).toBe(true);
      expect(isValidPhone('(555) 123-4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('123')).toBe(false); // Too short
      expect(isValidPhone('abcdefghij')).toBe(false);
      expect(isValidPhone('12345678901234567890')).toBe(false); // Too long
    });
  });
});

describe('URL Validation', () => {
  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false); // Missing protocol
    });
  });
});

describe('Tender Number Validation', () => {
  describe('isValidTenderNumber', () => {
    it('should accept valid tender numbers', () => {
      expect(isValidTenderNumber('TND-2024-001')).toBe(true);
      expect(isValidTenderNumber('TND-2024-0123')).toBe(true);
    });

    it('should reject invalid tender numbers', () => {
      expect(isValidTenderNumber('')).toBe(false);
      expect(isValidTenderNumber('TND-24-001')).toBe(false); // Year too short
      expect(isValidTenderNumber('TND-2024-01')).toBe(false); // Number too short
      expect(isValidTenderNumber('XYZ-2024-001')).toBe(false); // Wrong prefix
      expect(isValidTenderNumber('TND2024001')).toBe(false); // Missing dashes
    });
  });
});

describe('Budget Code Validation', () => {
  describe('isValidBudgetCode', () => {
    it('should accept valid budget codes', () => {
      expect(isValidBudgetCode('BDG-IT-2024-001')).toBe(true);
      expect(isValidBudgetCode('BDG-FINANCE-2024-123')).toBe(true);
    });

    it('should reject invalid budget codes', () => {
      expect(isValidBudgetCode('')).toBe(false);
      expect(isValidBudgetCode('BDG-I-2024-001')).toBe(false); // Dept too short
      expect(isValidBudgetCode('BDG-IT-24-001')).toBe(false); // Year too short
      expect(isValidBudgetCode('BDG-IT-2024-01')).toBe(false); // Number too short
    });
  });
});

describe('Amount Validation', () => {
  describe('isValidAmount', () => {
    it('should accept valid amounts', () => {
      expect(isValidAmount(0).valid).toBe(true);
      expect(isValidAmount(100).valid).toBe(true);
      expect(isValidAmount(100.50).valid).toBe(true);
      expect(isValidAmount(1000000).valid).toBe(true);
    });

    it('should reject negative amounts', () => {
      const result = isValidAmount(-100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount cannot be negative');
    });

    it('should reject NaN', () => {
      const result = isValidAmount(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be a number');
    });

    it('should reject Infinity', () => {
      const result = isValidAmount(Infinity);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be finite');
    });

    it('should reject too many decimal places', () => {
      const result = isValidAmount(100.12345);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount cannot have more than 3 decimal places');
    });
  });
});

describe('Date Range Validation', () => {
  describe('isValidDateRange', () => {
    it('should accept valid date ranges', () => {
      const result = isValidDateRange('2024-01-01', '2024-12-31');
      expect(result.valid).toBe(true);
    });

    it('should accept same start and end date', () => {
      const result = isValidDateRange('2024-06-15', '2024-06-15');
      expect(result.valid).toBe(true);
    });

    it('should reject end date before start date', () => {
      const result = isValidDateRange('2024-12-31', '2024-01-01');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });

    it('should reject invalid start date', () => {
      const result = isValidDateRange('invalid', '2024-12-31');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid start date');
    });

    it('should reject invalid end date', () => {
      const result = isValidDateRange('2024-01-01', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid end date');
    });

    it('should accept Date objects', () => {
      const result = isValidDateRange(new Date('2024-01-01'), new Date('2024-12-31'));
      expect(result.valid).toBe(true);
    });
  });
});

describe('Business Rule Validators', () => {
  describe('Tender Deadline Validation', () => {
    function isValidDeadline(deadline: Date | string): { valid: boolean; error?: string } {
      const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
      const now = new Date();

      if (isNaN(d.getTime())) {
        return { valid: false, error: 'Invalid date' };
      }
      if (d < now) {
        return { valid: false, error: 'Deadline cannot be in the past' };
      }
      // Deadline should be at least 24 hours in the future
      const minDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (d < minDeadline) {
        return { valid: false, error: 'Deadline must be at least 24 hours from now' };
      }
      return { valid: true };
    }

    it('should accept valid future deadline', () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const result = isValidDeadline(futureDate);
      expect(result.valid).toBe(true);
    });

    it('should reject past deadline', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = isValidDeadline(pastDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Deadline cannot be in the past');
    });

    it('should reject deadline less than 24 hours away', () => {
      const soonDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const result = isValidDeadline(soonDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Deadline must be at least 24 hours from now');
    });
  });

  describe('Quantity Validation', () => {
    function isValidQuantity(quantity: number): { valid: boolean; error?: string } {
      if (!Number.isInteger(quantity)) {
        return { valid: false, error: 'Quantity must be a whole number' };
      }
      if (quantity < 1) {
        return { valid: false, error: 'Quantity must be at least 1' };
      }
      if (quantity > 1000000) {
        return { valid: false, error: 'Quantity cannot exceed 1,000,000' };
      }
      return { valid: true };
    }

    it('should accept valid quantities', () => {
      expect(isValidQuantity(1).valid).toBe(true);
      expect(isValidQuantity(100).valid).toBe(true);
      expect(isValidQuantity(1000000).valid).toBe(true);
    });

    it('should reject zero quantity', () => {
      const result = isValidQuantity(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Quantity must be at least 1');
    });

    it('should reject decimal quantity', () => {
      const result = isValidQuantity(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Quantity must be a whole number');
    });

    it('should reject excessive quantity', () => {
      const result = isValidQuantity(2000000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Quantity cannot exceed 1,000,000');
    });
  });
});
