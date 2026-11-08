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
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-amber-200/60 bg-white px-4 lg:px-8 shadow-xs">
      {/* Left: Mobile trigger & Page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-800 lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] sm:text-[18px] font-bold text-slate-900">
            {pageContext}
          </span>
          <span className="hidden sm:inline-block rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            Retail Store Terminal
          </span>
        </div>
      </div>

      {/* Right: Assigned Store Identity & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Prominent Store Binding Badge */}
        <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
          <Store className="h-3.5 w-3.5 text-amber-700 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-none">{storeName}</span>
          <span className="font-mono text-[10px] bg-amber-200/60 text-amber-950 px-1.5 py-0.5 rounded">
            {storeCode}
          </span>
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-800 hover:bg-amber-50 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800">
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
              <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-amber-800">
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
