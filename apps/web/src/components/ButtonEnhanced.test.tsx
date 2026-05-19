import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from './ButtonEnhanced';

describe('ButtonEnhanced', () => {
  test('renders button with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('applies correct CSS classes for primary variant', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('btn');
    expect(button).toHaveClass('btn-primary');
  });

  test('applies correct CSS classes for different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByText('Small');
    expect(button).toHaveClass('btn-sm');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByText('Large');
    expect(button).toHaveClass('btn-lg');
  });

  test('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('applies full width class when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByText('Full Width');
    expect(button).toHaveClass('btn-full');
  });
});