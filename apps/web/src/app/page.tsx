'use client';

import React from 'react';
import Link from 'next/link';
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
          <span className="text-base font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
            Customer
          </span>
          <span className="shrink-0 text-slate-400 group-hover:text-purple-700 font-medium text-xs transition-colors">
            Sign In →
          </span>
        </Link>

        {/* 2. Pharmacist Card */}
        <Link
          href="/pharmacist/login"
          className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <span className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
            Pharmacist
          </span>
          <span className="shrink-0 text-slate-400 group-hover:text-teal-700 font-medium text-xs transition-colors">
            Sign In →
          </span>
        </Link>

        {/* 3. Admin Card */}
        <Link
          href="/admin/login"
          className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all flex items-center justify-between gap-4 cursor-pointer block"
        >
          <span className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
            Admin
          </span>
          <span className="shrink-0 text-slate-400 group-hover:text-indigo-700 font-medium text-xs transition-colors">
            Sign In →
          </span>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
