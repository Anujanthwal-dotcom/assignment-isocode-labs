'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { useAuth } from '@/lib/auth/auth-context';
import { normalizeEmail, isValidEmail } from '@pharmacy/validation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
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
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
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
            className="pl-9 h-10 text-sm"
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
          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
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
            className="pl-9 pr-10 h-10 text-sm"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
