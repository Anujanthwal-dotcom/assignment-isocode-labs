'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Store,
  User,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-context';

interface StaffHeaderProps {
  onToggleSidebar: () => void;
  pageContext?: string;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  onToggleSidebar,
  pageContext = 'Store Operations',
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/staff/login');
  };

  const staffName = user?.profile?.fullName || 'Store Staff';
  const designation = (user?.profile as any)?.designation || 'Store Inventory Associate';
  const storeName = user?.store?.name || 'Retail Pharmacy Store';
  const storeCode = user?.store?.code || 'STORE';

  return (
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#EBECEF] bg-white px-4 lg:px-8 shadow-xs">
      {/* Left: Mobile trigger & Page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-slate-500 border border-[#EBECEF] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] sm:text-[18px] font-bold text-slate-900">
            {pageContext}
          </span>
          <span className="hidden sm:inline-block rounded-full bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#0D5C5A]">
            Retail Store Terminal
          </span>
        </div>
      </div>

      {/* Right: Assigned Store Identity & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Prominent Store Binding Badge */}
        <div className="flex items-center gap-2 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3.5 py-1 text-xs font-semibold text-[#0D5C5A] shadow-2xs">
          <Store className="h-3.5 w-3.5 text-[#0D5C5A] shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-none">{storeName}</span>
          <span className="font-mono text-[10px] bg-[#CCFBF1] text-[#0D5C5A] px-1.5 py-0.5 rounded font-bold">
            {storeCode}
          </span>
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#EBECEF] bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-800 hover:bg-[#F0FDFA] hover:text-[#0D5C5A] focus:outline-none focus:ring-2 focus:ring-[#0D5C5A] cursor-pointer">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFBF1] text-[#0D5C5A]">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden md:inline font-semibold text-slate-900">
              {staffName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-slate-900">{staffName}</p>
              <p className="text-[11px] text-slate-500">{designation}</p>
              <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-[#0D5C5A]">
                Assigned: <strong>{storeName}</strong>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2 text-rose-600" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
