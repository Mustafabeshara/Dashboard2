/**
 * Badge Component Tests
 * Tests for status badges and labels
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import React from 'react';

// Mock Badge component
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const Badge = ({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) => (
  <span data-testid="badge" data-variant={variant} className={className}>
    {children}
  </span>
);

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByTestId('badge')).toHaveTextContent('Active');
    });

    it('should render default variant', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'default');
    });
  });

  describe('Variants', () => {
    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
    });

    it('should render destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
    });

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'outline');
    });

    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success');
    });

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      expect(screen.getByTestId('badge')).toHaveClass('custom-badge');
    });
  });
});

describe('Status Badge Patterns', () => {
  // Helper to get badge variant for status
  function getStatusVariant(status: string): BadgeVariant {
    const statusMap: Record<string, BadgeVariant> = {
      DRAFT: 'secondary',
      PENDING: 'warning',
      PENDING_APPROVAL: 'warning',
      ACTIVE: 'success',
      APPROVED: 'success',
      REJECTED: 'destructive',
      CANCELLED: 'destructive',
      CLOSED: 'outline',
      WON: 'success',
      LOST: 'destructive',
    };
    return statusMap[status] || 'default';
  }

  describe('Budget Status Badges', () => {
    it('should use secondary for DRAFT', () => {
      expect(getStatusVariant('DRAFT')).toBe('secondary');
    });

    it('should use warning for PENDING_APPROVAL', () => {
      expect(getStatusVariant('PENDING_APPROVAL')).toBe('warning');
    });

    it('should use success for APPROVED', () => {
      expect(getStatusVariant('APPROVED')).toBe('success');
    });

    it('should use destructive for REJECTED', () => {
      expect(getStatusVariant('REJECTED')).toBe('destructive');
    });
  });

  describe('Tender Status Badges', () => {
    it('should use success for WON', () => {
      expect(getStatusVariant('WON')).toBe('success');
    });

    it('should use destructive for LOST', () => {
      expect(getStatusVariant('LOST')).toBe('destructive');
    });

    it('should use outline for CLOSED', () => {
      expect(getStatusVariant('CLOSED')).toBe('outline');
    });
  });

  describe('Role Badges', () => {
    const RoleBadge = ({ role }: { role: string }) => {
      const roleColors: Record<string, BadgeVariant> = {
        ADMIN: 'destructive',
        CEO: 'default',
        CFO: 'default',
        MANAGER: 'secondary',
        SALES: 'outline',
        WAREHOUSE: 'outline',
        FINANCE: 'secondary',
      };
      return <Badge variant={roleColors[role] || 'default'}>{role}</Badge>;
    };

    it('should render ADMIN with destructive variant', () => {
      render(<RoleBadge role="ADMIN" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
      expect(screen.getByTestId('badge')).toHaveTextContent('ADMIN');
    });

    it('should render MANAGER with secondary variant', () => {
      render(<RoleBadge role="MANAGER" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
    });

    it('should render SALES with outline variant', () => {
      render(<RoleBadge role="SALES" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'outline');
    });
  });
});

describe('Priority Badge', () => {
  const PriorityBadge = ({ priority }: { priority: 'low' | 'medium' | 'high' | 'urgent' }) => {
    const priorityColors: Record<string, BadgeVariant> = {
      low: 'outline',
      medium: 'secondary',
      high: 'warning',
      urgent: 'destructive',
    };
    return <Badge variant={priorityColors[priority]}>{priority.toUpperCase()}</Badge>;
  };

  it('should render low priority with outline', () => {
    render(<PriorityBadge priority="low" />);
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByTestId('badge')).toHaveTextContent('LOW');
  });

  it('should render high priority with warning', () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning');
    expect(screen.getByTestId('badge')).toHaveTextContent('HIGH');
  });

  it('should render urgent priority with destructive', () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
    expect(screen.getByTestId('badge')).toHaveTextContent('URGENT');
  });
});
