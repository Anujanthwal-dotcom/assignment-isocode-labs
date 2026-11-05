'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/customer/login';

    if (!user) {
      if (!isLoginPage) {
        router.replace('/customer/login');
      }
      return;
    }

    // Role redirection
    if (user.role === 'PHARMACIST') {
      router.replace('/pharmacist');
    } else if (user.role === 'ADMIN' || user.role === 'COMPLIANCE_ADMIN') {
      router.replace('/admin');
    } else if (user.role === 'CUSTOMER' && isLoginPage) {
      router.replace('/customer');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
