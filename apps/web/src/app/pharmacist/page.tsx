'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Package, BookOpenCheck, Boxes, ShieldCheck } from 'lucide-react';

export default function PharmacistDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/pharmacist/login');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pharmacist Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Central Clinical Prescription Verification &amp; Dispensing Clearance
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          Sign Out
        </Button>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/pharmacist/review-queue"
          className="group block p-4 bg-white rounded-xl border border-teal-200/80 hover:border-teal-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Verification Queue</h3>
          <p className="text-xs text-slate-500 mt-1">Review scans, AI matches &amp; send quotations</p>
        </Link>

        <Link
          href="/pharmacist/fulfilment"
          className="group block p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Store Fulfilment</h3>
          <p className="text-xs text-slate-500 mt-1">Pick, pack, invoice &amp; dispatch routed orders</p>
        </Link>

        <Link
          href="/pharmacist/h1-register"
          className="group block p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <BookOpenCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Schedule H1 Register</h3>
          <p className="text-xs text-slate-500 mt-1">Mandatory regulatory dispensing compliance</p>
        </Link>

        <Link
          href="/pharmacist/inventory"
          className="group block p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Store Inventory</h3>
          <p className="text-xs text-slate-500 mt-1">Stock levels, batches &amp; daily CSV imports</p>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Clinical Pharmacist Clearance &amp; Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Pharmacist Name
              </span>
              <span className="font-semibold text-slate-900 text-base">
                {user?.profile?.fullName || 'Licensed Pharmacist'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Clinical Authority
              </span>
              <div className="mt-1">
                <StatusBadge status="information" label={user?.role || 'PHARMACIST'} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Registration Number
              </span>
              <span className="text-slate-700 font-mono text-sm mt-1 block">
                {user?.profile?.registrationNumber || 'WB-PHARM-REGISTERED'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Verification Scope
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Platform-Wide Clinical Verification</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-teal-50 rounded-lg border border-teal-200 text-xs text-teal-900 leading-relaxed">
            <strong>Central Clinical Workflow:</strong> As a licensed pharmacist, you verify incoming prescriptions,
            validate AI extractions against the catalogue, adjust quantities, and generate itemized customer quotations
            platform-wide. Upon customer payment, the automated routing engine dynamically assigns fulfillment
            to the nearest physical stores holding inventory.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
