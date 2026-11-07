'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { useAuth } from '@/lib/auth/auth-context';
import { normalizeEmail, isValidEmail } from '@pharmacy/validation';
import { useRouter } from 'next/navigation';
import { UserRole } from '@pharmacy/shared-types';

interface StaffLoginFormProps {
  portalTitle: string;
  expectedRoles: UserRole[];
  redirectPath: string;
}

export const StaffLoginForm: React.FC<StaffLoginFormProps> = ({
  portalTitle,
  expectedRoles,
  redirectPath,
}) => {
  const { loginStaff } = useAuth();
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const user = await loginStaff(cleanEmail, password);

      // Check if user's role is allowed on this portal
      if (!expectedRoles.includes(user.role)) {
        setError(
          `Access denied: account role '${user.role}' is not authorized for the ${portalTitle}.`,
        );
        return;
      }

      router.push(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials or access denied.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && <SemanticAlert type="error" title={error} />}

      <div className="space-y-1.5">
        <label htmlFor="staff-email" className="text-xs font-semibold text-slate-700 block">
          Email Address
        </label>
        <div>
          <Input
            id="staff-email"
            type="email"
            placeholder="staff@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading}
            className="h-10 text-sm"
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="staff-password" className="text-xs font-semibold text-slate-700 block">
          Password
        </label>
        <div className="relative">
          <Input
            id="staff-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading}
            className="pr-14 h-10 text-sm"
            autoComplete="current-password"
          />
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
        disabled={loading || !email || !password}
        className="w-full h-10 text-sm font-semibold mt-2"
      >
        {loading ? 'Authenticating...' : 'Sign In'}
      </Button>
    </form>
  );
};
