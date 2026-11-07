import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { StaffLoginForm } from '../StaffLoginForm';
import { CustomerEmailLoginForm } from '../CustomerEmailLoginForm';

// Mock Auth Context
const mockLoginCustomer = vi.fn();
const mockLoginStaff = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    loginCustomer: mockLoginCustomer,
    loginStaff: mockLoginStaff,
    user: null,
    loading: false,
  }),
}));

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => '/pharmacist/login',
}));

describe('Frontend Auth Forms', () => {
  describe('StaffLoginForm', () => {
    it('should validate email format and toggle password visibility', () => {
      const { container } = render(
        <StaffLoginForm
          portalTitle="Pharmacist Workspace"
          expectedRoles={['PHARMACIST']}
          redirectPath="/pharmacist"
        />,
      );

      const emailInput = container.querySelector('#staff-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#staff-password') as HTMLInputElement;
      const toggleButton = screen.getByLabelText(/show password/i);

      expect(passwordInput.getAttribute('type')).toBe('password');
      fireEvent.click(toggleButton);
      expect(passwordInput.getAttribute('type')).toBe('text');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      expect(screen.getByText(/valid email address/i)).toBeDefined();
    });
  });

  describe('CustomerEmailLoginForm', () => {
    it('should validate email format and toggle password visibility', () => {
      const { container } = render(<CustomerEmailLoginForm />);

      const emailInput = container.querySelector('#customer-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#customer-password') as HTMLInputElement;
      const toggleButton = screen.getByLabelText(/show password/i);

      expect(passwordInput.getAttribute('type')).toBe('password');
      fireEvent.click(toggleButton);
      expect(passwordInput.getAttribute('type')).toBe('text');

      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      expect(screen.getByText(/valid email address/i)).toBeDefined();
    });

    it('should submit credentials and authenticate successfully', async () => {
      const onSuccess = vi.fn();
      mockLoginCustomer.mockResolvedValueOnce({
        id: 'cust-1',
        role: 'CUSTOMER',
      });

      const { container } = render(<CustomerEmailLoginForm onSuccess={onSuccess} />);

      const emailInput = container.querySelector('#customer-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#customer-password') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecretPassword123!' } });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLoginCustomer).toHaveBeenCalledWith('user@example.com', 'SecretPassword123!');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should display error message on login failure', async () => {
      mockLoginCustomer.mockRejectedValueOnce(new Error('Invalid email or password.'));

      const { container } = render(<CustomerEmailLoginForm />);

      const emailInput = container.querySelector('#customer-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#customer-password') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'WrongPassword!' } });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeDefined();
      });
    });
  });
});
