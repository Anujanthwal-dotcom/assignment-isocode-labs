'use client';

import React from 'react';
import Link from 'next/link';
import { User, Pill, Shield, Store, ArrowRight } from 'lucide-react';
import { AuthSplitLayout } from '@/components/layouts/AuthSplitLayout';

export default function HomePage() {
  return (
    <AuthSplitLayout
      title="Pharmacy Care"
      subtitle="Select a verified portal below to sign in"
    >
      <div className="space-y-3.5">
        {/* 1. Customer Card */}
        <Link
          href="/customer/login"
          className="w-full text-left group p-4 rounded-[12px] border border-[#CBD5E1] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/60 hover:shadow-sm focus:outline-none focus:ring-3 focus:ring-[#14B8A6]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
              <User className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors block">
                Customer Portal
              </span>
              <span className="text-xs text-[#64748B]">Personal &amp; family prescription care</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#0D5C5A] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 2. Pharmacist Card */}
        <Link
          href="/pharmacist/login"
          className="w-full text-left group p-4 rounded-[12px] border border-[#CBD5E1] bg-white hover:border-[#14B8A6] hover:bg-[#F0FDF4]/60 hover:shadow-sm focus:outline-none focus:ring-3 focus:ring-[#14B8A6]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#CCFBF1] text-[#047857] group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#047857] transition-colors block">
                Pharmacist Terminal
              </span>
              <span className="text-xs text-[#64748B]">Prescription verification &amp; dispensing</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#047857] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 3. Store Staff Card */}
        <Link
          href="/staff/login"
          className="w-full text-left group p-4 rounded-[12px] border border-[#CBD5E1] bg-white hover:border-[#D97706] hover:bg-[#FFFBEB]/60 hover:shadow-sm focus:outline-none focus:ring-3 focus:ring-[#D97706]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#FEF3C7] text-[#B45309] group-hover:bg-[#D97706] group-hover:text-white transition-colors">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#B45309] transition-colors block">
                Store Staff Portal
              </span>
              <span className="text-xs text-[#64748B]">Daily CSV inventory updates &amp; store fulfilment</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#B45309] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 4. Admin Card */}
        <Link
          href="/admin/login"
          className="w-full text-left group p-4 rounded-[12px] border border-[#CBD5E1] bg-white hover:border-[#0284C7] hover:bg-[#F0F9FF]/60 hover:shadow-sm focus:outline-none focus:ring-3 focus:ring-[#0284C7]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#E0F2FE] text-[#0284C7] group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors block">
                Admin &amp; Operations
              </span>
              <span className="text-xs text-[#64748B]">Store networks &amp; compliance policy</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#0284C7] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
