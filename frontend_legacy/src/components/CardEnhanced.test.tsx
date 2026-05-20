import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from './CardEnhanced';

describe('CardEnhanced', () => {
  test('renders card with children', () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Body>Body content</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    render(<Card>Test Card</Card>);
    const card = screen.getByText('Test Card');
    expect(card).toHaveClass('card');
  });

  test('does not apply hoverable class when hoverable is false', () => {
    render(<Card hoverable={false}>Non-hoverable Card</Card>);
    const card = screen.getByText('Non-hoverable Card');
    expect(card).not.toHaveClass('hover:shadow-lg');
  });
});