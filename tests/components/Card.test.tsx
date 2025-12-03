/**
 * Card Component Tests
 * Tests for UI card components
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import React from 'react';

// Mock Card components
const Card = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="card" className={className}>
    {children}
  </div>
);

const CardHeader = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="card-header" className={className}>
    {children}
  </div>
);

const CardTitle = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3 data-testid="card-title" className={className}>
    {children}
  </h3>
);

const CardDescription = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p data-testid="card-description" className={className}>
    {children}
  </p>
);

const CardContent = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="card-content" className={className}>
    {children}
  </div>
);

const CardFooter = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="card-footer" className={className}>
    {children}
  </div>
);

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card container', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<Card>Test Content</Card>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Card className="custom-card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('should render header section', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('should render title as heading', () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByRole('heading')).toHaveTextContent('Card Title');
    });
  });

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByTestId('card-description')).toHaveTextContent('Description text');
    });
  });

  describe('CardContent', () => {
    it('should render content section', () => {
      render(<CardContent>Main content</CardContent>);
      expect(screen.getByTestId('card-content')).toHaveTextContent('Main content');
    });
  });

  describe('CardFooter', () => {
    it('should render footer section', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByTestId('card-footer')).toHaveTextContent('Footer content');
    });
  });

  describe('Full Card Composition', () => {
    it('should render complete card with all sections', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Budget Summary</CardTitle>
            <CardDescription>Overview of current budget</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Total: $50,000</p>
            <p>Spent: $25,000</p>
          </CardContent>
          <CardFooter>
            <button>View Details</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toHaveTextContent('Budget Summary');
      expect(screen.getByTestId('card-description')).toHaveTextContent('Overview of current budget');
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByTestId('card-footer')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveTextContent('View Details');
    });
  });
});

describe('Dashboard Card Patterns', () => {
  describe('Statistics Card', () => {
    const StatsCard = ({
      title,
      value,
      change,
      changeType,
    }: {
      title: string;
      value: string;
      change: string;
      changeType: 'increase' | 'decrease' | 'neutral';
    }) => (
      <Card>
        <CardContent>
          <p data-testid="stats-title">{title}</p>
          <p data-testid="stats-value">{value}</p>
          <p data-testid="stats-change" data-change-type={changeType}>
            {change}
          </p>
        </CardContent>
      </Card>
    );

    it('should render statistics with positive change', () => {
      render(
        <StatsCard title="Revenue" value="$125,000" change="+12%" changeType="increase" />
      );
      expect(screen.getByTestId('stats-value')).toHaveTextContent('$125,000');
      expect(screen.getByTestId('stats-change')).toHaveAttribute('data-change-type', 'increase');
    });

    it('should render statistics with negative change', () => {
      render(
        <StatsCard title="Expenses" value="$45,000" change="-5%" changeType="decrease" />
      );
      expect(screen.getByTestId('stats-change')).toHaveAttribute('data-change-type', 'decrease');
    });
  });
});
