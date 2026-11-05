'use client';

import * as React from 'react';
import { PharmacistSidebar } from '@/components/pharmacist/PharmacistSidebar';
import { PharmacistHeader } from '@/components/pharmacist/PharmacistHeader';

export default function PharmacistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
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
  );
}
