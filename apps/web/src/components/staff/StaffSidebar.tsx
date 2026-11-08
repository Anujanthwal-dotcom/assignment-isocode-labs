'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store,
  X,
  LayoutDashboard,
  FileSpreadsheet,
  Boxes,
  Package,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

interface StaffSidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { label: 'Store Overview', href: '/staff', icon: LayoutDashboard, exact: true },
  { label: 'Daily CSV Injection', href: '/staff/inventory/import', icon: FileSpreadsheet },
  { label: 'Live Store Inventory', href: '/staff/inventory', icon: Boxes },
  { label: 'Order Fulfilment', href: '/staff/fulfilment', icon: Package },
];

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
  openMobile,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const storeName = user?.store?.name || 'Retail Pharmacy Store';
  const storeCode = user?.store?.code || 'STORE';
  const staffName = user?.profile?.fullName || 'Store Staff';
  const designation = (user?.profile as any)?.designation || 'Store Inventory Associate';

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {openMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#EBECEF] bg-white transition-transform duration-200 lg:translate-x-0 ${
          openMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding & Logo */}
        <div className="flex h-[64px] items-center justify-between border-b border-[#EBECEF] px-4">
          <Link href="/staff" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0D5C5A] text-white shadow-xs">
              <Store className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[14px] font-bold tracking-tight text-[#0D5C5A]">
                Staff Portal
              </span>
              <span className="text-[10px] font-medium text-[#64748B]">Store Inventory &amp; Dispatch</span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-[6px] text-slate-400 hover:bg-[#F0FDFA] hover:text-[#0D5C5A] lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Assigned Physical Store Badge */}
        <div className="p-3">
          <div className="rounded-[10px] border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs text-[#0F172A]">
            <div className="flex items-center gap-1.5 font-bold text-[#0D5C5A]">
              <Store className="h-3.5 w-3.5 shrink-0 text-[#0D5C5A]" />
              <span className="truncate">{storeName}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#0D5C5A]">
              <span className="font-mono font-semibold">{storeCode}</span>
              <span className="text-[10px] bg-[#CCFBF1] text-[#0D5C5A] px-1.5 py-0.2 rounded font-semibold">
                ● Live Hub
              </span>
            </div>
            <p className="text-[10px] text-[#0D5C5A]/80 mt-1.5 pt-1.5 border-t border-[#99F6E4]/50">
              All daily CSV injections apply exclusively to this store.
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-[4px] px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex h-[40px] items-center rounded-[8px] px-3 text-[13px] font-medium transition-colors gap-2.5 ${
                  isActive
                    ? 'bg-[#F0FDFA] text-[#0D5C5A] font-semibold border-l-3 border-[#0D5C5A]'
                    : 'text-[#475569] hover:bg-[#F0FDFA] hover:text-[#0D5C5A]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#0D5C5A]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile */}
        <div className="border-t border-[#EBECEF] p-3 bg-[#F8FAFC]">
          <div className="text-[12px]">
            <p className="font-semibold text-slate-900 truncate">{staffName}</p>
            <p className="text-[11px] text-[#64748B] truncate">{designation}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
