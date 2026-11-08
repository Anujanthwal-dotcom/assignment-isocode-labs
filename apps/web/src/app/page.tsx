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
          className="w-full text-left group p-4 rounded-[12px] border border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/60 hover:shadow-xs focus:outline-none focus:ring-3 focus:ring-[#0D5C5A]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
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
          className="w-full text-left group p-4 rounded-[12px] border border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/60 hover:shadow-xs focus:outline-none focus:ring-3 focus:ring-[#0D5C5A]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors block">
                Pharmacist Terminal
              </span>
              <span className="text-xs text-[#64748B]">Prescription verification &amp; central review</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#0D5C5A] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 3. Store Staff Card */}
        <Link
          href="/staff/login"
          className="w-full text-left group p-4 rounded-[12px] border border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/60 hover:shadow-xs focus:outline-none focus:ring-3 focus:ring-[#0D5C5A]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors block">
                Store Staff Portal
              </span>
              <span className="text-xs text-[#64748B]">Daily CSV inventory injection &amp; store fulfilment</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#0D5C5A] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 4. Admin Card */}
        <Link
          href="/admin/login"
          className="w-full text-left group p-4 rounded-[12px] border border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/60 hover:shadow-xs focus:outline-none focus:ring-3 focus:ring-[#0D5C5A]/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors block">
                Admin &amp; Operations
              </span>
              <span className="text-xs text-[#64748B]">Store networks &amp; compliance policy</span>
            </div>
          </div>
          <span className="shrink-0 text-[#64748B] group-hover:text-[#0D5C5A] font-semibold text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
