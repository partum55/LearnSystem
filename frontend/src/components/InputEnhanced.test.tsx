import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from './InputEnhanced';

describe('InputEnhanced', () => {
  test('renders input with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  test('displays error message when error prop is provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('error-text');
  });

  test('displays helper text when provided', () => {
    render(<Input helperText="Please enter your email" />);
    expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    expect(screen.getByText('Please enter your email')).toHaveClass('help-text');
  });

  test('applies success styling when success prop is true', () => {
    render(<Input success />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('input-success');
  });

  test('combines custom className with default classes', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('input');
    expect(input).toHaveClass('custom-class');
  });
});