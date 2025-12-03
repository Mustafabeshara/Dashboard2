/**
 * Button Component Tests
 * Tests for UI button components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import React from 'react';

// Mock Button component for testing
const Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-variant={variant}
    data-size={size}
    className={className}
  >
    {children}
  </button>
);

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click Me');
    });

    it('should render button with children', () => {
      render(
        <Button>
          <span>Icon</span> Label
        </Button>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} disabled>
          Click Me
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should apply default variant', () => {
      render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default');
    });

    it('should apply destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'destructive');
    });

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline');
    });

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost');
    });
  });

  describe('Sizes', () => {
    it('should apply default size', () => {
      render(<Button size="default">Default Size</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'default');
    });

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
    });

    it('should apply icon size', () => {
      render(<Button size="icon">🔍</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not be disabled by default', () => {
      render(<Button>Enabled</Button>);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });
});
