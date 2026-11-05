'use client';

import * as React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#24332E]">
      <AdminSidebar
        openMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col lg:pl-[240px] min-h-screen">
        <AdminHeader
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          pageContext="Operations Overview"
        />
        <main className="flex-1 p-[16px] sm:p-[24px] lg:p-[32px] w-full max-w-[1440px] mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
