'use client';

import * as React from 'react';
import { Menu, Search, Bell, User, ChevronDown } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#E5EAE6] bg-white px-4 lg:px-8">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-[#64736C] hover:bg-[#F0F3F1] hover:text-[#24332E] lg:hidden"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#24332E]">
          {pageContext}
        </span>
      </div>

      {/* Center: Global Search Placeholder (Desktop) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7D8A81]" />
          <input
            type="text"
            readOnly
            placeholder="Search stores, orders, staff, compliance logs..."
            className="h-[40px] w-full rounded-[8px] border border-[#D3DBD5] bg-[#F7F9F7] pl-9 pr-3 text-[13px] text-[#24332E] placeholder:text-[#A4B0A8] focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Notification Icon */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#E5EAE6] bg-white text-[#64736C] hover:bg-[#F7F9F7] hover:text-[#24332E] transition-colors"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#176B52]" />
        </button>

        {/* Administrator Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#E5EAE6] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#24332E] hover:bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#23845D]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E9F3EE] text-[#176B52]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline font-semibold">{SAMPLE_ADMIN.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#64736C]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-[#24332E]">{SAMPLE_ADMIN.name}</p>
              <p className="text-[11px] text-[#64736C]">{SAMPLE_ADMIN.role}</p>
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
