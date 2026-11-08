import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { StaffLoginForm } from '../StaffLoginForm';
import { CustomerEmailLoginForm } from '../CustomerEmailLoginForm';

// Mock Auth Context
const mockLoginCustomer = vi.fn();
const mockInitiateCustomerLogin = vi.fn();
const mockRequestCustomerOtp = vi.fn();
const mockVerifyCustomerOtp = vi.fn();
const mockRegisterCustomer = vi.fn();
const mockLoginStaff = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    loginCustomer: mockLoginCustomer,
    initiateCustomerLogin: mockInitiateCustomerLogin,
    requestCustomerOtp: mockRequestCustomerOtp,
    verifyCustomerOtp: mockVerifyCustomerOtp,
    registerCustomer: mockRegisterCustomer,
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

    it('should flow from email & password to OTP field and authenticate successfully', async () => {
      const onSuccess = vi.fn();
      mockInitiateCustomerLogin.mockResolvedValueOnce({
        success: true,
        message: 'Credentials valid, code sent',
        developmentOtp: '123456',
      });
      mockVerifyCustomerOtp.mockResolvedValueOnce({
        id: 'cust-1',
        role: 'CUSTOMER',
      });

      const { container } = render(<CustomerEmailLoginForm onSuccess={onSuccess} />);

      const emailInput = container.querySelector('#customer-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#customer-password') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecretPassword123!' } });

      // Step 1: Click Sign In to verify credentials and trigger OTP
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInitiateCustomerLogin).toHaveBeenCalledWith('user@example.com', 'SecretPassword123!');
      });

      // Step 2: The OTP entering field is now open
      const otpInput = await screen.findByPlaceholderText('123456');
      expect(otpInput).toBeDefined();

      fireEvent.change(otpInput, { target: { value: '123456' } });

      // Click verify
      const verifyButton = screen.getByRole('button', { name: /verify code & sign in/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockVerifyCustomerOtp).toHaveBeenCalledWith('user@example.com', '123456');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should switch to signup view and create account for new customers', async () => {
      const onSuccess = vi.fn();
      mockRegisterCustomer.mockResolvedValueOnce({
        id: 'new-cust',
        role: 'CUSTOMER',
      });

      const { container } = render(<CustomerEmailLoginForm onSuccess={onSuccess} />);

      // Switch to sign up
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      const nameInput = container.querySelector('#reg-name') as HTMLInputElement;
      const emailInput = container.querySelector('#reg-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#reg-password') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'Arnab Das' } });
      fireEvent.change(emailInput, { target: { value: 'arnab@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });

      const createAccountButton = screen.getByRole('button', { name: /create account & sign in/i });
      fireEvent.click(createAccountButton);

      await waitFor(() => {
        expect(mockRegisterCustomer).toHaveBeenCalledWith('arnab@example.com', 'Arnab Das', 'SecurePass123!');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should display error message on invalid credentials', async () => {
      mockInitiateCustomerLogin.mockRejectedValueOnce(new Error('Invalid email or password.'));

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
