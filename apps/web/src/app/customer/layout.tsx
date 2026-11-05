'use client';

import * as React from 'react';
import { CustomerLayout as CustomerGuard } from '@/components/layouts/CustomerLayout';
import { usePathname } from 'next/navigation';
import { CustomerNavbar } from '@/components/customer/CustomerNavbar';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/customer/login';

  return (
    <CustomerGuard>
      {isLoginPage ? (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          {children}
        </main>
      ) : (
        <div className="min-h-screen bg-[#F7F9F7] text-[#24332E] flex flex-col">
          <CustomerNavbar />
          <main className="flex-1 mx-auto w-full max-w-[1200px] px-[16px] lg:px-[32px] py-[24px] pb-[88px] md:pb-[32px]">
            {children}
          </main>
          <CustomerBottomNav />
        </div>
      )}
    </CustomerGuard>
  );
}
