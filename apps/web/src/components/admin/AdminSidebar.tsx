'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Layers,
  Users,
  ShieldCheck,
  Shield,
  X,
} from 'lucide-react';
import { SAMPLE_ADMIN } from '@/lib/sample-data';

interface AdminSidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, active: true },
  { label: 'Orders', href: '/admin', icon: ShoppingCart },
  { label: 'Stores', href: '/admin', icon: Store },
  { label: 'Inventory', href: '/admin', icon: Layers },
  { label: 'Staff', href: '/admin', icon: Users },
  { label: 'Compliance Settings', href: '/admin', icon: ShieldCheck },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ openMobile, onCloseMobile }) => {
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
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#6240E8] text-white shadow-xs">
              <Shield className="h-4 w-4" />
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
            className="p-1 rounded-[6px] text-[#78879A] hover:bg-[#F7F5FD] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-[4px] px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex h-[40px] items-center gap-3 rounded-[6px] px-3 text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F7F5FD] text-[#6240E8] font-semibold border-l-3 border-[#6240E8]'
                    : 'text-[#6C757D] hover:bg-[#F8F9FB] hover:text-[#351F65]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#6240E8]' : 'text-[#78879A]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Administrator Profile Card in Sidebar Footer */}
        <div className="border-t border-[#EAE8F0] p-3">
          <div className="rounded-[8px] bg-[#F8F9FB] p-2.5 text-[12px] border border-[#EAE8F0]">
            <p className="font-semibold text-[#351F65]">{SAMPLE_ADMIN.name}</p>
            <p className="text-[11px] text-[#78879A]">{SAMPLE_ADMIN.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
