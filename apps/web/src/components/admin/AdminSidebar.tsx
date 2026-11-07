'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface AdminSidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { label: 'Overview', href: '/admin', exact: true },
  { label: 'Central Analytics', href: '/admin/analytics' },
  { label: 'Fulfilment Operations', href: '/admin/fulfilment' },
  { label: 'Review Assignments', href: '/admin/review-assignments' },
  { label: 'Medicine Catalogue', href: '/admin/medicines' },
  { label: 'Inventory', href: '/admin/inventory', exact: true },
  { label: 'Stock Imports', href: '/admin/inventory/imports' },
  { label: 'Compliance Policy', href: '/admin/compliance' },
  { label: 'H1 Register', href: '/admin/compliance/h1-register' },
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
          className="fixed inset-0 z-40 bg-[#14161A]/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#EAE8F0] bg-white transition-transform duration-200 lg:translate-x-0 ${
          openMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-[64px] items-center justify-between border-b border-[#EAE8F0] px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#6240E8] text-white shadow-xs font-bold text-xs">
              TH
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold tracking-tight text-[#351F65]">
                Teladoc Health
              </span>
              <span className="text-[11px] font-medium text-[#78879A]">Admin Operations</span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-[6px] text-[#78879A] hover:bg-[#F7F5FD] lg:hidden text-xs font-bold"
            aria-label="Close navigation"
          >
            [✕]
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-[4px] px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex h-[40px] items-center rounded-[6px] px-3 text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F7F5FD] text-[#6240E8] font-semibold border-l-3 border-[#6240E8]'
                    : 'text-[#6C757D] hover:bg-[#F8F9FB] hover:text-[#351F65]'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Administrator Profile Card in Sidebar Footer */}
        <div className="border-t border-[#EAE8F0] p-3">
          <div className="rounded-[8px] bg-[#F8F9FB] p-2.5 text-[12px] border border-[#EAE8F0]">
            <p className="font-semibold text-[#351F65] truncate">
              {user?.profile?.fullName || 'Administrator'}
            </p>
            <p className="text-[11px] text-[#78879A]">{user?.role || 'ADMIN'}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
