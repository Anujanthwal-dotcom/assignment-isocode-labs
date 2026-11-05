import * as React from 'react';
import { CustomerNavbar } from '@/components/customer/CustomerNavbar';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#24332E] flex flex-col">
      <CustomerNavbar />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-[16px] lg:px-[32px] py-[24px] pb-[88px] md:pb-[32px]">
        {children}
      </main>
      <CustomerBottomNav />
    </div>
  );
}
