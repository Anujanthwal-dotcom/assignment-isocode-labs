'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  X,
  LayoutDashboard,
  BarChart3,
  Truck,
  UserCheck,
  Pill,
  Boxes,
  ShieldCheck,
  ShoppingBag,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

interface AdminSidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Sales & Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Store & Staff Directory', href: '/admin/stores', icon: Building2 },
  { label: 'Central Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Fulfilment Operations', href: '/admin/fulfilment', icon: Truck },
  { label: 'Review Assignments', href: '/admin/review-assignments', icon: UserCheck },
  { label: 'Medicine Catalogue', href: '/admin/medicines', icon: Pill },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes, exact: true },
  { label: 'Compliance Policy', href: '/admin/compliance', icon: ShieldCheck },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ openMobile, onCloseMobile }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {openMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-200 lg:translate-x-0 ${
          openMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-[64px] items-center justify-between border-b border-[#E2E8F0] px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0D5C5A] text-white shadow-xs">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[14px] font-bold tracking-tight text-[#0D5C5A]">
                Pharmacy Portal
              </span>
              <span className="text-[10px] font-medium text-[#64748B]">Admin Operations</span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-[6px] text-slate-400 hover:bg-[#F0FDFA] hover:text-[#0D5C5A] lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-[4px] px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const hasMoreSpecificMatch = navItems.some(
              (other) =>
                other.href !== item.href &&
                other.href.startsWith(item.href) &&
                (pathname === other.href || pathname.startsWith(other.href + '/')),
            );
            const isActive = item.exact
              ? pathname === item.href
              : !hasMoreSpecificMatch &&
                (pathname === item.href || pathname.startsWith(item.href + '/'));
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex h-[40px] items-center rounded-[6px] px-3 text-[14px] font-medium transition-colors gap-2.5 ${
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

        {/* Administrator Profile Card in Sidebar Footer */}
        <div className="border-t border-[#E2E8F0] p-3">
          <div className="rounded-[8px] bg-[#F8FAFC] p-2.5 text-[12px] border border-[#E2E8F0]">
            <p className="font-semibold text-[#0F172A] truncate">
              {user?.profile?.fullName || 'Administrator'}
            </p>
            <p className="text-[11px] text-[#64748B] truncate">{user?.role || 'ADMIN'}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
