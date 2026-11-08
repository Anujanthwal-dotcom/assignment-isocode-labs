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
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-amber-200/60 bg-white transition-transform duration-200 lg:translate-x-0 ${
          openMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding & Logo */}
        <div className="flex h-[64px] items-center justify-between border-b border-amber-200/60 px-4">
          <Link href="/staff" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-amber-600 text-white shadow-xs">
              <Store className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[14px] font-bold tracking-tight text-amber-950">
                Staff Portal
              </span>
              <span className="text-[10px] font-medium text-amber-700">Store Inventory &amp; Dispatch</span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-[6px] text-slate-400 hover:bg-amber-50 hover:text-amber-800 lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Assigned Physical Store Badge */}
        <div className="p-3">
          <div className="rounded-[10px] border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
            <div className="flex items-center gap-1.5 font-bold">
              <Store className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span className="truncate">{storeName}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-amber-800">
              <span className="font-mono font-semibold">{storeCode}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                ● Live Hub
              </span>
            </div>
            <p className="text-[10px] text-amber-700/90 mt-1.5 pt-1.5 border-t border-amber-200/60">
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
                    ? 'bg-amber-50 text-amber-900 font-bold border-l-3 border-amber-600 shadow-2xs'
                    : 'text-slate-600 hover:bg-amber-50/60 hover:text-amber-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-amber-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/50">
          <div className="text-[12px]">
            <p className="font-semibold text-slate-900 truncate">{staffName}</p>
            <p className="text-[11px] text-slate-500 truncate">{designation}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
