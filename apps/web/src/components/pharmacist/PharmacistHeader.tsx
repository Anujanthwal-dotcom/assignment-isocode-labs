'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Store,
  User,
  ChevronDown,
  ShieldCheck,
  Clock,
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

interface PharmacistHeaderProps {
  onToggleSidebar: () => void;
  pageContext?: string;
}

export const PharmacistHeader: React.FC<PharmacistHeaderProps> = ({
  onToggleSidebar,
  pageContext = 'Verification Queue',
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/pharmacist/login');
  };

  const pharmacistName = user?.profile?.fullName || 'Licensed Pharmacist';
  const storeName = user?.store?.name || 'Salt Lake Store';

  return (
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:px-8 shadow-xs">
      {/* Left: Mobile trigger & Page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-[#64748B] border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] sm:text-[18px] font-bold text-[#0F172A]">
            {pageContext}
          </span>
          <span className="hidden sm:inline-block rounded-full bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#0D5C5A]">
            Clinical Terminal
          </span>
        </div>
      </div>

      {/* Right: Store Context & Pharmacist Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Store Indicator (Teal Accent) */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3.5 py-1.5 text-[12px] font-semibold text-[#047857]">
          <Store className="h-3.5 w-3.5 text-[#059669]" />
          <span>Hub:</span>
          <span className="font-bold text-[#0D5C5A]">{storeName}</span>
        </div>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] focus:outline-none focus:ring-2 focus:ring-[#14B8A6] cursor-pointer">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFBF1] text-[#047857]">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden md:inline font-semibold text-[#0F172A]">
              {pharmacistName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[230px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-slate-900">{pharmacistName}</p>
              <p className="text-[11px] text-[#64748B]">Registered Dispensing Pharmacist</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <ShieldCheck className="h-4 w-4 mr-2 text-slate-500" />
              <span>License &amp; Sign-off ID</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Clock className="h-4 w-4 mr-2 text-slate-500" />
              <span>Duty Shift &amp; Handover</span>
            </DropdownMenuItem>
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
