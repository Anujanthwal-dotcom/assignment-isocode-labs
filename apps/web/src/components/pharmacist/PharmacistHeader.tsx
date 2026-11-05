'use client';

import * as React from 'react';
import { Menu, Building2, User, ChevronDown } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#E5EAE6] bg-white px-4 lg:px-8">
      {/* Left: Mobile trigger & Page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-[#64736C] hover:bg-[#F0F3F1] hover:text-[#24332E] lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[16px] sm:text-[18px] font-semibold text-[#24332E]">
            {pageContext}
          </span>
          <span className="hidden sm:inline-block rounded-[4px] bg-[#E9F3EE] px-2 py-0.5 text-[11px] font-medium text-[#176B52]">
            Clinical Workspace
          </span>
        </div>
      </div>

      {/* Right: Store Context & Pharmacist Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Store Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-[8px] border border-[#E5EAE6] bg-[#F7F9F7] px-3 py-1.5 text-[12px] font-medium text-[#43534A]">
          <Building2 className="h-4 w-4 text-[#176B52]" />
          <span>Store:</span>
          <span className="font-semibold text-[#176B52]">{SAMPLE_PHARMACIST.storeName}</span>
        </div>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#E5EAE6] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#24332E] hover:bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#23845D]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E9F3EE] text-[#176B52]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden md:inline font-semibold text-[#24332E]">
              {SAMPLE_PHARMACIST.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#64736C]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-[#24332E]">{SAMPLE_PHARMACIST.name}</p>
              <p className="text-[11px] text-[#64736C]">{SAMPLE_PHARMACIST.role}</p>
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
