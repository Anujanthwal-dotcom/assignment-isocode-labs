'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  Settings,
  ShieldAlert,
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

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  const adminName = user?.profile?.fullName || 'Administrator';
  const roleName = 'System Administrator';

  return (
    <header className="sticky top-0 z-30 flex h-[64px] w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:px-8 shadow-xs">
      {/* Left: Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-[6px] p-2 text-[#64748B] border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] lg:hidden cursor-pointer"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Notifications & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Notification Icon */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] transition-colors cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
        </button>

        {/* Administrator Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] focus:outline-none focus:ring-2 focus:ring-[#14B8A6] cursor-pointer">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFBF1] text-[#047857]">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden sm:inline font-semibold text-[#0F172A]">{adminName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[210px]">
            <DropdownMenuLabel>
              <p className="font-semibold text-slate-900">{adminName}</p>
              <p className="text-[11px] text-[#64748B]">{roleName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2 text-slate-500" />
              <span>Platform Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <ShieldAlert className="h-4 w-4 mr-2 text-slate-500" />
              <span>Regulatory Audit Logs</span>
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
