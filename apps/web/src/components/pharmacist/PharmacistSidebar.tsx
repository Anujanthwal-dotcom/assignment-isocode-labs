'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Layers,
  History,
  Pill,
  X,
  Store,
} from 'lucide-react';
import { SAMPLE_PHARMACIST } from '@/lib/sample-data';

interface PharmacistSidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { label: 'Overview', href: '/pharmacist', icon: LayoutDashboard },
  { label: 'Verification Queue', href: '/pharmacist', icon: ClipboardCheck, active: true },
  { label: 'Orders', href: '/pharmacist', icon: Package },
  { label: 'Store Inventory', href: '/pharmacist', icon: Layers },
  { label: 'History', href: '/pharmacist', icon: History },
];

export const PharmacistSidebar: React.FC<PharmacistSidebarProps> = ({
  openMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Drawer Overlay */}
      {openMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#18251F]/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E5EAE6] bg-white transition-transform duration-200 lg:translate-x-0 ${
          openMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding & Store indicator */}
        <div className="flex h-[64px] items-center justify-between border-b border-[#E5EAE6] px-4">
          <Link href="/pharmacist" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#176B52] text-white">
              <Pill className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold tracking-tight text-[#24332E]">
                Pharmacy Portal
              </span>
              <span className="text-[11px] text-[#64736C]">Clinical Verification</span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-[6px] text-[#64736C] hover:bg-[#F0F3F1] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Store Context Badge */}
        <div className="p-3">
          <div className="rounded-[8px] border border-[#E5EAE6] bg-[#F7F9F7] p-2.5 flex items-center gap-2 text-[12px] text-[#24332E]">
            <Store className="h-4 w-4 text-[#176B52] shrink-0" />
            <div className="overflow-hidden">
              <span className="font-semibold block truncate">
                {SAMPLE_PHARMACIST.storeName} Hub
              </span>
              <span className="text-[11px] text-[#64736C] block truncate">
                {SAMPLE_PHARMACIST.storeCode}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list: Item height 40px, gap 4px */}
        <nav className="flex-1 space-y-[4px] px-3 py-2">
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
                    ? 'bg-[#E9F3EE] text-[#176B52] font-semibold'
                    : 'text-[#64736C] hover:bg-[#F0F3F1] hover:text-[#24332E]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#176B52]' : 'text-[#7D8A81]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pharmacist Footer Profile */}
        <div className="border-t border-[#E5EAE6] p-3">
          <div className="text-[12px]">
            <p className="font-semibold text-[#24332E] truncate">{SAMPLE_PHARMACIST.name}</p>
            <p className="text-[11px] text-[#64736C] truncate">{SAMPLE_PHARMACIST.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
