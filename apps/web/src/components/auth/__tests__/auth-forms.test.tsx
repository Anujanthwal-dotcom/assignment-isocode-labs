import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { PhoneLoginForm } from '../PhoneLoginForm';
import { OtpVerificationForm } from '../OtpVerificationForm';
import { StaffLoginForm } from '../StaffLoginForm';

// Mock Auth Context
const mockRequestCustomerOtp = vi.fn();
const mockVerifyCustomerOtp = vi.fn();
const mockLoginStaff = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    requestCustomerOtp: mockRequestCustomerOtp,
    verifyCustomerOtp: mockVerifyCustomerOtp,
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
  describe('PhoneLoginForm', () => {
    it('should validate phone input and reject invalid mobile numbers', async () => {
      const onSuccess = vi.fn();
      render(<PhoneLoginForm onSuccess={onSuccess} />);

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /continue/i }) as HTMLButtonElement;

      // Button should be disabled initially
      expect(submitButton.disabled).toBe(true);

      // Enter incomplete number
      fireEvent.change(input, { target: { value: '123' } });
      expect(submitButton.disabled).toBe(true);

      // Enter 10 digits starting with invalid prefix (e.g., 2)
      fireEvent.change(input, { target: { value: '2345678901' } });
      expect(submitButton.disabled).toBe(false);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid 10-digit Indian mobile number/i)).toBeDefined();
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should successfully submit valid 10-digit Indian mobile', async () => {
      const onSuccess = vi.fn();
      mockRequestCustomerOtp.mockResolvedValue({
        success: true,
        message: 'Sent',
        developmentOtp: '123456',
      });

      render(<PhoneLoginForm onSuccess={onSuccess} />);

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRequestCustomerOtp).toHaveBeenCalledWith('9876543210');
        expect(onSuccess).toHaveBeenCalledWith('9876543210', '123456');
      });
    });
  });

  describe('OtpVerificationForm', () => {
    it('should display dev OTP hint and render digit inputs', () => {
      render(
        <OtpVerificationForm
          phone="9876543210"
          initialDevOtp="123456"
          onBack={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText(/123456/)).toBeDefined();
      expect(screen.getByText(/resend otp in/i)).toBeDefined();
    });

    it('should verify OTP on submission', async () => {
      const onSuccess = vi.fn();
      mockVerifyCustomerOtp.mockResolvedValue({ id: 'user-1' });

      render(<OtpVerificationForm phone="9876543210" onBack={vi.fn()} onSuccess={onSuccess} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBe(6);

      // Fill in digits 123456
      inputs.forEach((input, index) => {
        fireEvent.change(input, { target: { value: String(index + 1) } });
      });

      const verifyButton = screen.getByRole('button', { name: /verify & sign in/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockVerifyCustomerOtp).toHaveBeenCalledWith('9876543210', '123456');
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

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
});
