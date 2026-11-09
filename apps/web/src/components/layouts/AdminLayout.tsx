'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/admin/login';

    if (!user) {
      if (!isLoginPage) {
        router.replace('/admin/login');
      }
      return;
    }

    // Role redirection
    if (user.role === 'CUSTOMER') {
      router.replace('/customer');
    } else if (user.role === 'PHARMACIST') {
      router.replace('/pharmacist');
    } else if (user.role === 'STORE_STAFF') {
      router.replace('/staff');
    } else if (user.role === 'ADMIN' && isLoginPage) {
      router.replace('/admin');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
