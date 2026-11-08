'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { useAuth } from '@/lib/auth/auth-context';
import { normalizeEmail, isValidEmail } from '@pharmacy/validation';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, User, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CustomerEmailLoginFormProps {
  onSuccess?: () => void;
}

export const CustomerEmailLoginForm: React.FC<CustomerEmailLoginFormProps> = ({ onSuccess }) => {
  const { initiateCustomerLogin, verifyCustomerOtp, registerCustomer } = useAuth();
  const router = useRouter();

  // Mode: 'login' (Email & Password -> OTP) or 'signup' (New customer registration)
  const [view, setView] = React.useState<'login' | 'signup'>('login');

  // Login credentials
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // OTP step state
  const [otpStepOpen, setOtpStepOpen] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [devOtpHint, setDevOtpHint] = React.useState<string | null>(null);

  // Signup fields
  const [fullName, setFullName] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleFinish = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      router.push('/customer');
    }
  };

  // Step 1: Customer enters Email & Password, then OTP part opens
  const handleInitiateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await initiateCustomerLogin(cleanEmail, password);
      setOtpStepOpen(true);
      if (res.developmentOtp) {
        setDevOtpHint(`Verification code: ${res.developmentOtp}`);
        if (cleanEmail === 'customer@example.com' || cleanEmail === 'customer2@example.com') {
          setOtp(res.developmentOtp);
        }
      } else {
        setDevOtpHint(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Customer enters OTP in the opened OTP field
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setError('Email address is missing.');
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyCustomerOtp(cleanEmail, otp.trim());
      handleFinish();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Signup for New Customers
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!signupPassword || signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await registerCustomer(cleanEmail, fullName.trim(), signupPassword);
      handleFinish();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <SemanticAlert type="error" title={error} />}

      {/* =========================================================================
          VIEW 1: LOGIN (EMAIL + PASSWORD -> THEN OTP PART OPENS)
      ========================================================================== */}
      {view === 'login' && (
        <form
          onSubmit={otpStepOpen ? handleVerifyOtp : handleInitiateLogin}
          noValidate
          className="space-y-3.5"
        >
          {/* Email Address */}
          <div className="space-y-1.5">
            <label htmlFor="customer-email" className="text-xs font-semibold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <Input
                id="customer-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading || otpStepOpen}
                className="h-10 text-sm pl-9"
                autoComplete="email"
                autoFocus={!otpStepOpen}
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              {otpStepOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpStepOpen(false);
                    setOtp('');
                    setDevOtpHint(null);
                  }}
                  className="absolute right-3 top-2.5 text-xs text-[#0D5C5A] hover:underline font-semibold"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* Password (Collapsed / read-only once OTP opens) */}
          <div className="space-y-1.5">
            <label htmlFor="customer-password" className="text-xs font-semibold text-slate-700 block">
              Password
            </label>
            <div className="relative">
              <Input
                id="customer-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading || otpStepOpen}
                className="pr-14 h-10 text-sm pl-9"
                autoComplete="current-password"
              />
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              {!otpStepOpen && (
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
          </div>

          {/* OTP PART: Opens immediately when Email & Password are submitted */}
          {otpStepOpen && (
            <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/40 space-y-2.5 transition-all animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="customer-otp-code"
                  className="text-xs font-bold text-[#0D5C5A] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>Enter 6-Digit Verification Code</span>
                </label>
                <button
                  type="button"
                  onClick={handleInitiateLogin}
                  disabled={loading}
                  className="text-xs text-[#0D5C5A] hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend Code</span>
                </button>
              </div>

              <div className="relative">
                <Input
                  id="customer-otp-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtp(val);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className="h-11 text-center font-mono text-lg font-bold tracking-[8px] bg-white border-teal-300 focus:border-[#0D5C5A] focus:ring-[#0D5C5A]"
                  autoFocus
                />
              </div>

              {devOtpHint ? (
                <p className="text-xs text-teal-900 bg-white border border-teal-200 rounded px-2.5 py-1.5 font-medium">
                  ℹ️ {devOtpHint}
                </p>
              ) : (
                <p className="text-[11px] text-slate-600">
                  A 6-digit code has been dispatched to <strong>{email}</strong>. Valid for 5 minutes.
                </p>
              )}
            </div>
          )}

          {/* Main Action Button */}
          {!otpStepOpen ? (
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-10 text-sm font-semibold bg-[#0D5C5A] hover:bg-[#09403E] text-white mt-1 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Verifying Password...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full h-10 text-sm font-semibold bg-[#0D5C5A] hover:bg-[#09403E] text-white mt-1"
            >
              {loading ? 'Authenticating...' : 'Verify Code & Sign In'}
            </Button>
          )}

          {/* Switch to Sign Up */}
          <div className="pt-2 text-center text-xs text-slate-600">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={() => {
                setView('signup');
                setError(null);
                setOtpStepOpen(false);
              }}
              className="font-bold text-[#0D5C5A] hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          VIEW 2: SIGN UP FOR NEW CUSTOMERS
      ========================================================================== */}
      {view === 'signup' && (
        <form onSubmit={handleSignup} noValidate className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="text-xs font-semibold text-slate-700 block">
              Full Name
            </label>
            <div className="relative">
              <Input
                id="reg-name"
                type="text"
                placeholder="e.g. Siddhartha Roy"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="h-10 text-sm pl-9"
                autoFocus
              />
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-xs font-semibold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <Input
                id="reg-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="h-10 text-sm pl-9"
                autoComplete="email"
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-xs font-semibold text-slate-700 block">
              Password
            </label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={signupPassword}
                onChange={(e) => {
                  setSignupPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="pr-14 h-10 text-sm pl-9"
                autoComplete="new-password"
              />
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email || !fullName || !signupPassword}
            className="w-full h-10 text-sm font-semibold bg-[#0D5C5A] hover:bg-[#09403E] text-white mt-1"
          >
            {loading ? 'Creating Account...' : 'Create Account & Sign In'}
          </Button>

          {/* Switch back to Login */}
          <div className="pt-2 text-center text-xs text-slate-600">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={() => {
                setView('login');
                setError(null);
                setOtpStepOpen(false);
              }}
              className="font-bold text-[#0D5C5A] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
