'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export const PharmacistLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/pharmacist/login';

    if (!user) {
      if (!isLoginPage) {
        router.replace('/pharmacist/login');
      }
      return;
    }

    // Role redirection
    if (user.role === 'CUSTOMER') {
      router.replace('/customer');
    } else if (user.role === 'ADMIN' || user.role === 'COMPLIANCE_ADMIN') {
      router.replace('/admin');
    } else if (user.role === 'PHARMACIST' && isLoginPage) {
      router.replace('/pharmacist');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
