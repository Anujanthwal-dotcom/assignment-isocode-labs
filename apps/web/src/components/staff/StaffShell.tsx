'use client';

import * as React from 'react';
import { StaffSidebar } from './StaffSidebar';
import { StaffHeader } from './StaffHeader';

interface StaffShellProps {
  children: React.ReactNode;
  pageContext?: string;
}

export const StaffShell: React.FC<StaffShellProps> = ({ children, pageContext }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <StaffSidebar
        openMobile={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-col lg:pl-[240px] min-h-screen">
        <StaffHeader
          onToggleSidebar={() => setMobileOpen((prev) => !prev)}
          pageContext={pageContext}
        />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
