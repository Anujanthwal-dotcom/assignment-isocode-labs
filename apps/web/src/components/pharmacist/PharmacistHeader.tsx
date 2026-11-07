'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SAMPLE_PHARMACIST } from '@/lib/sample-data';

interface PharmacistHeaderProps {
  onToggleSidebar: () => void;
  pageContext?: string;
}

export const PharmacistHeader: React.FC<PharmacistHeaderProps> = ({
  onToggleSidebar,
  pageContext = 'Verification Queue',
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#EAE8F0] bg-white px-4 lg:px-8">
      {/* Left: Mobile trigger & Page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] px-2.5 py-1 text-xs font-bold text-[#78879A] border border-[#EAE8F0] hover:bg-[#F7F5FD] hover:text-[#351F65] lg:hidden"
          aria-label="Toggle navigation"
        >
          MENU
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[16px] sm:text-[18px] font-semibold text-[#351F65]">
            {pageContext}
          </span>
          <span className="hidden sm:inline-block rounded-[4px] bg-[#F7F5FD] px-2 py-0.5 text-[11px] font-semibold text-[#6240E8]">
            Teladoc Clinical
          </span>
        </div>
      </div>

      {/* Right: Store Context & Pharmacist Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Store Indicator (Teal Accent) */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-[8px] border border-[#B4EDFB] bg-[#EBF9FD] px-3 py-1.5 text-[12px] font-medium text-[#0088AA]">
          <span>Hub:</span>
          <span className="font-semibold text-[#0088AA]">{SAMPLE_PHARMACIST.storeName}</span>
        </div>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#EAE8F0] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#351F65] hover:bg-[#F8F9FB] focus:outline-none focus:ring-2 focus:ring-[#6240E8]">
            <span className="hidden md:inline font-semibold text-[#351F65]">
              {SAMPLE_PHARMACIST.name}
            </span>
            <span className="text-xs text-[#78879A]">▼</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-[#351F65]">{SAMPLE_PHARMACIST.name}</p>
              <p className="text-[11px] text-[#78879A]">{SAMPLE_PHARMACIST.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Pharmacist License &amp; Sign-off ID</DropdownMenuItem>
            <DropdownMenuItem>Duty Shift &amp; Handover</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>Lock Terminal</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
