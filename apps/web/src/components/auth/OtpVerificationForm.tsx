'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';

interface OtpVerificationFormProps {
  phone: string;
  initialDevOtp?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  phone,
  initialDevOtp,
  onBack,
  onSuccess,
}) => {
  const { verifyCustomerOtp, requestCustomerOtp } = useAuth();
  const [otp, setOtp] = React.useState('');
  const [devOtp, setDevOtp] = React.useState<string | undefined>(initialDevOtp);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(30);
  const [resending, setResending] = React.useState(false);

  // Countdown timer for 30s resend cooldown
  React.useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await verifyCustomerOtp(phone, otp);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      const res = await requestCustomerOtp(phone);
      if (res.developmentOtp) {
        setDevOtp(res.developmentOtp);
      }
      setResendTimer(30);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to resend OTP. Please try again later.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Edit Number</span>
        </button>
        <span className="text-xs text-slate-500 font-mono">+91 {phone}</span>
      </div>

      {devOtp && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <KeyRound className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Development Mode OTP:{' '}
            <strong className="font-mono text-sm tracking-wider">{devOtp}</strong>
          </span>
        </div>
      )}

      {error && <SemanticAlert type="error" title={error} />}

      <div className="space-y-2 flex flex-col items-center">
        <label className="text-sm font-semibold text-slate-700 block self-start">
          Enter 6-Digit Code
        </label>
        <OtpInput
          length={6}
          value={otp}
          onChange={(val) => {
            setOtp(val);
            if (error) setError(null);
          }}
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="w-full h-11 text-sm font-semibold"
      >
        {loading ? 'Verifying...' : 'Verify & Sign In'}
      </Button>

      <div className="text-center pt-1">
        {resendTimer > 0 ? (
          <p className="text-xs text-slate-500">
            Resend OTP in <span className="font-semibold text-slate-700">{resendTimer}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Sending...' : 'Resend OTP'}</span>
          </button>
        )}
      </div>
    </form>
  );
};
