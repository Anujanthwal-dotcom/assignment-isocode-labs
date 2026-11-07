'use client';

import React from 'react';
import Link from 'next/link';
import { User, Pill, Shield, ArrowRight } from 'lucide-react';
import { AuthSplitLayout } from '@/components/layouts/AuthSplitLayout';

export default function HomePage() {
  return (
    <AuthSplitLayout
      title="Pharmacy Platform"
      subtitle="Select a portal below to sign in"
    >
      <div className="space-y-3">
        {/* 1. Customer Card */}
        <Link
          href="/customer/login"
          className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <User className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
              Customer
            </span>
          </div>
          <span className="shrink-0 text-slate-400 group-hover:text-purple-700 font-medium text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 2. Pharmacist Card */}
        <Link
          href="/pharmacist/login"
          className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
              Pharmacist
            </span>
          </div>
          <span className="shrink-0 text-slate-400 group-hover:text-teal-700 font-medium text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* 3. Admin Card */}
        <Link
          href="/admin/login"
          className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
              Admin
            </span>
          </div>
          <span className="shrink-0 text-slate-400 group-hover:text-indigo-700 font-medium text-xs transition-colors flex items-center gap-1">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
