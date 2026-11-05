'use client';

import * as React from 'react';
import { PharmacistLayout as PharmacistGuard } from '@/components/layouts/PharmacistLayout';
import { usePathname } from 'next/navigation';
import { PharmacistSidebar } from '@/components/pharmacist/PharmacistSidebar';
import { PharmacistHeader } from '@/components/pharmacist/PharmacistHeader';

export default function PharmacistPortalLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/pharmacist/login';

  return (
    <PharmacistGuard>
      {isLoginPage ? (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          {children}
        </main>
      ) : (
        <div className="min-h-screen bg-[#F7F9F7] text-[#24332E]">
          <PharmacistSidebar
            openMobile={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          <div className="flex flex-col lg:pl-[240px] min-h-screen">
            <PharmacistHeader
              onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              pageContext="Verification Queue"
            />
            <main className="flex-1 p-[16px] sm:p-[24px] lg:p-[32px] max-w-full overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      )}
    </PharmacistGuard>
  );
}
