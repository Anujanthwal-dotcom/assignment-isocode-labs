'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { useAuth } from '@/lib/auth/auth-context';
import { isValidIndianMobile, normalizePhone } from '@pharmacy/validation';

interface PhoneLoginFormProps {
  onSuccess: (phone: string, developmentOtp?: string) => void;
}

export const PhoneLoginForm: React.FC<PhoneLoginFormProps> = ({ onSuccess }) => {
  const { requestCustomerOtp } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = normalizePhone(phone);
    if (!clean) {
      setError('Please enter your mobile number.');
      return;
    }

    if (!isValidIndianMobile(clean)) {
      setError('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
      return;
    }

    setLoading(true);
    try {
      const res = await requestCustomerOtp(clean);
      onSuccess(clean, res.developmentOtp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && <SemanticAlert type="error" title={error} />}

      <div className="space-y-2">
        <label htmlFor="phone-input" className="text-sm font-semibold text-slate-700 block">
          Mobile Number
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center px-3 h-11 rounded-lg border border-slate-300 bg-slate-50 text-slate-600 font-medium text-sm select-none">
            +91
          </div>
          <Input
            id="phone-input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
              if (error) setError(null);
            }}
            disabled={loading}
            className="flex-1 h-11 text-base tracking-wide"
            autoFocus
          />
        </div>
        <p className="text-xs text-slate-500">
          We will send a 6-digit one-time password to verify your account.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || phone.length !== 10}
        className="w-full h-11 text-sm font-semibold"
      >
        {loading ? 'Sending OTP...' : 'Continue'}
      </Button>
    </form>
  );
};
