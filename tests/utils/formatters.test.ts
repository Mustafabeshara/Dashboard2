/**
 * Formatter Utility Tests
 * Tests for currency, date, and number formatting
 */

import { describe, it, expect } from '@jest/globals';

// Currency formatter
function formatCurrency(amount: number, currency: string = 'KWD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Number formatter
function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Percentage formatter
function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Date formatter
function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };

  return d.toLocaleDateString('en-US', options);
}

// File size formatter
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

describe('Currency Formatting', () => {
  describe('formatCurrency', () => {
    it('should format KWD correctly', () => {
      const result = formatCurrency(1234.56, 'KWD');
      expect(result).toContain('1,234.56');
    });

    it('should format USD correctly', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('should handle large numbers', () => {
      const result = formatCurrency(1234567890.12, 'USD');
      expect(result).toContain('1,234,567,890.12');
    });

    it('should handle negative numbers', () => {
      const result = formatCurrency(-1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toMatch(/-|\(/); // Different locales use - or ()
    });

    it('should round to 2 decimal places', () => {
      const result = formatCurrency(1234.567, 'USD');
      expect(result).toContain('1,234.57');
    });
  });
});

describe('Number Formatting', () => {
  describe('formatNumber', () => {
    it('should format integers without decimals', () => {
      expect(formatNumber(1234)).toBe('1,234');
    });

    it('should format with specified decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
    });

    it('should add thousands separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(75.5)).toBe('75.5%');
    });

    it('should format percentage with specified decimals', () => {
      expect(formatPercentage(75.555, 2)).toBe('75.56%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle 100%', () => {
      expect(formatPercentage(100, 0)).toBe('100%');
    });

    it('should handle values over 100%', () => {
      expect(formatPercentage(125.5)).toBe('125.5%');
    });
  });
});

describe('Date Formatting', () => {
  describe('formatDate', () => {
    const testDate = new Date('2024-06-15T12:00:00Z');

    it('should format date in short format', () => {
      const result = formatDate(testDate, 'short');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('should format date in long format', () => {
      const result = formatDate(testDate, 'long');
      expect(result).toContain('2024');
      expect(result).toContain('June');
      expect(result).toContain('15');
    });

    it('should format date in ISO format', () => {
      const result = formatDate(testDate, 'iso');
      expect(result).toBe('2024-06-15');
    });

    it('should accept string dates', () => {
      const result = formatDate('2024-06-15', 'iso');
      expect(result).toBe('2024-06-15');
    });

    it('should use short format by default', () => {
      const result = formatDate(testDate);
      expect(result).toContain('2024');
    });
  });
});

describe('File Size Formatting', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format with 2 decimal places', () => {
      expect(formatFileSize(1500000)).toBe('1.43 MB');
    });
  });
});

describe('Business Logic Calculations', () => {
  describe('Budget Calculations', () => {
    function calculateBudgetStatus(spent: number, total: number) {
      const percentage = total > 0 ? (spent / total) * 100 : 0;
      let status: 'under' | 'normal' | 'warning' | 'over';

      if (percentage >= 100) status = 'over';
      else if (percentage >= 90) status = 'warning';
      else if (percentage >= 50) status = 'normal';
      else status = 'under';

      return { percentage, status, remaining: total - spent };
    }

    it('should calculate under budget status', () => {
      const result = calculateBudgetStatus(2000, 10000);
      expect(result.percentage).toBe(20);
      expect(result.status).toBe('under');
      expect(result.remaining).toBe(8000);
    });

    it('should calculate normal budget status', () => {
      const result = calculateBudgetStatus(6000, 10000);
      expect(result.percentage).toBe(60);
      expect(result.status).toBe('normal');
    });

    it('should calculate warning budget status', () => {
      const result = calculateBudgetStatus(9200, 10000);
      expect(result.percentage).toBe(92);
      expect(result.status).toBe('warning');
    });

    it('should calculate over budget status', () => {
      const result = calculateBudgetStatus(12000, 10000);
      expect(result.percentage).toBe(120);
      expect(result.status).toBe('over');
      expect(result.remaining).toBe(-2000);
    });

    it('should handle zero total', () => {
      const result = calculateBudgetStatus(0, 0);
      expect(result.percentage).toBe(0);
      expect(result.status).toBe('under');
    });
  });

  describe('Tender Value Calculations', () => {
    function calculateTenderMargin(
      estimatedValue: number,
      ourBid: number,
      competitorBid?: number
    ) {
      const margin = estimatedValue - ourBid;
      const marginPercentage = (margin / estimatedValue) * 100;
      const isCompetitive = competitorBid ? ourBid <= competitorBid : true;

      return {
        margin,
        marginPercentage,
        isCompetitive,
        bidDifference: competitorBid ? competitorBid - ourBid : 0,
      };
    }

    it('should calculate positive margin', () => {
      const result = calculateTenderMargin(100000, 85000);
      expect(result.margin).toBe(15000);
      expect(result.marginPercentage).toBe(15);
    });

    it('should identify competitive bid', () => {
      const result = calculateTenderMargin(100000, 85000, 90000);
      expect(result.isCompetitive).toBe(true);
      expect(result.bidDifference).toBe(5000);
    });

    it('should identify non-competitive bid', () => {
      const result = calculateTenderMargin(100000, 95000, 85000);
      expect(result.isCompetitive).toBe(false);
      expect(result.bidDifference).toBe(-10000);
    });
  });
});
