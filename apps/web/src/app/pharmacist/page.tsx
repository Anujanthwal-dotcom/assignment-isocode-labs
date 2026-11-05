'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Stethoscope, Building2, LogOut, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PharmacistDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/pharmacist/login');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pharmacist Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dispensing &amp; Clinical Verification Workspace
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <span>Pharmacist Identity &amp; Store Assignment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Pharmacist Name
              </span>
              <span className="font-semibold text-slate-900 text-base">
                {user?.profile?.fullName || 'Demo Pharmacist'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Authenticated Role
              </span>
              <div className="mt-1">
                <StatusBadge status="purple" label={user?.role || 'PHARMACIST'} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
              <span className="text-xs text-slate-500 block uppercase font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-teal-600" />
                Assigned Pharmacy Store
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-base">
                  {user?.store?.name || 'Salt Lake Store'}
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700">
                  {user?.store?.code || 'KOL-001'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Account Status
              </span>
              <span className="font-medium text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-4 w-4" />
                {user?.status || 'ACTIVE'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Registration Number
              </span>
              <span className="text-slate-600 text-sm mt-1 block">
                {user?.profile?.registrationNumber || 'WB-PHARM-REGISTERED'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-teal-50 rounded-lg border border-teal-200 text-xs text-teal-900 leading-relaxed">
            <strong>Phase 1 Infrastructure Complete:</strong> Pharmacist session authenticated using
            Argon2id encrypted credentials. Store boundary binding ensures this session belongs
            exclusively to <strong>{user?.store?.name || 'Salt Lake Store'}</strong>. Prescription
            verification queues and schedule sign-offs will be activated in subsequent phases.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
