'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  const isComplianceAdmin = user?.role === 'COMPLIANCE_ADMIN';

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isComplianceAdmin ? 'Compliance Administration' : 'Operations Administration'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-Store Platform Governance &amp; Security
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
            <ShieldAlert className="h-5 w-5 text-indigo-600" />
            <span>Administrator Identity &amp; Authorization Level</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Administrator Name
              </span>
              <span className="font-semibold text-slate-900 text-base">
                {user?.profile?.fullName ||
                  (isComplianceAdmin ? 'Demo Compliance Admin' : 'Demo Admin')}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Assigned Role
              </span>
              <div className="mt-1">
                <StatusBadge status="purple" label={user?.role || 'ADMIN'} />
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
                Access Scope
              </span>
              <span className="font-semibold text-indigo-900 text-sm mt-1 block">
                {isComplianceAdmin
                  ? 'Regulatory Compliance & Audit'
                  : 'Full Chain Operations (46 Stores)'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50 rounded-lg border border-indigo-200 text-xs text-indigo-900 leading-relaxed">
            <strong>Phase 1 Infrastructure Complete:</strong> Administrator session verified with
            backend-enforced RBAC guards and append-only audit logging. Cross-store inventory
            coordination, regulatory dispatch controls, and store performance metrics will be
            introduced in subsequent phases.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
