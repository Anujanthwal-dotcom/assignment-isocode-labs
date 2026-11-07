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
import { SAMPLE_ADMIN } from '@/lib/sample-data';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  pageContext?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleSidebar,
  pageContext = 'Operations Overview',
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#EAE8F0] bg-white px-4 lg:px-8">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-[#78879A] hover:bg-[#F7F5FD] hover:text-[#351F65] lg:hidden font-bold"
          aria-label="Toggle navigation drawer"
        >
          [Menu]
        </button>
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#351F65]">
          {pageContext}
        </span>
      </div>

      {/* Center: Global Search Placeholder (Desktop) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <input
            type="text"
            readOnly
            placeholder="Search stores, orders, staff, compliance logs..."
            className="h-[40px] w-full rounded-[8px] border border-[#CED4DA] bg-[#F8F9FB] px-3.5 text-[13px] text-[#14161A] placeholder:text-[#ADB5BD] focus:outline-none focus:border-[#6240E8] cursor-pointer"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Notification Icon */}
        <button
          type="button"
          className="relative flex h-9 px-2.5 items-center justify-center rounded-[8px] border border-[#EAE8F0] bg-white text-[#78879A] hover:bg-[#F7F5FD] hover:text-[#351F65] transition-colors text-xs font-semibold"
          aria-label="View notifications"
        >
          <span>Alerts</span>
          <span className="ml-1.5 h-2 w-2 rounded-full bg-[#6240E8]" />
        </button>

        {/* Administrator Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#EAE8F0] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#351F65] hover:bg-[#F8F9FB] focus:outline-none focus:ring-2 focus:ring-[#6240E8]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F5FD] text-[#6240E8] font-bold text-xs">
              AD
            </div>
            <span className="hidden sm:inline font-semibold">{SAMPLE_ADMIN.name}</span>
            <span className="text-[10px] text-[#78879A]">▼</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-[#351F65]">{SAMPLE_ADMIN.name}</p>
              <p className="text-[11px] text-[#78879A]">{SAMPLE_ADMIN.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Platform Settings</DropdownMenuItem>
            <DropdownMenuItem>Regulatory Audit Logs</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
