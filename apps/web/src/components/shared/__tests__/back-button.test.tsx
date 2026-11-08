import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { BackButton } from '../BackButton';

const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: vi.fn(),
  }),
}));

describe('BackButton component', () => {
  it('renders a link when href is provided', () => {
    render(<BackButton href="/admin/orders" label="Sales & Orders" />);
    const link = screen.getByRole('link', { name: /sales & orders/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/admin/orders');
  });

  it('renders a button and triggers router.back() when href is omitted', () => {
    mockBack.mockClear();
    render(<BackButton label="Go Back" />);
    const button = screen.getByRole('button', { name: /go back/i });
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('calls custom onClick handler when provided', () => {
    const handleClick = vi.fn();
    render(<BackButton href="/admin" label="Overview" onClick={handleClick} />);
    const link = screen.getByRole('link', { name: /overview/i });
    fireEvent.click(link);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports subtle and badge variants', () => {
    const { rerender } = render(<BackButton href="/admin" variant="subtle" label="Subtle Back" />);
    expect(screen.getByText('Subtle Back')).toBeDefined();

    rerender(<BackButton href="/admin" variant="badge" label="Badge Back" />);
    expect(screen.getByText('Badge Back')).toBeDefined();
  });
});
