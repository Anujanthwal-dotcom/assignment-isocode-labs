'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export const StaffLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/staff/login';

    if (!user) {
      if (!isLoginPage) {
        router.replace('/staff/login');
      }
      return;
    }

    // Role verification
    if (user.role === 'CUSTOMER') {
      router.replace('/customer');
    } else if (isLoginPage && (user.role === 'STORE_STAFF' || user.role === 'PHARMACIST' || user.role === 'ADMIN')) {
      router.replace('/staff');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Checking store staff clearance...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
