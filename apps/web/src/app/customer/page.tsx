'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { User, LogOut, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/customer/login');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Authenticated Customer Management Space</p>
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
            <User className="h-5 w-5 text-purple-600" />
            <span>Customer Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Signed-in Name
              </span>
              <span className="font-semibold text-slate-900 text-base">
                {user?.profile?.fullName || 'Customer'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Authenticated Role
              </span>
              <div className="mt-1">
                <StatusBadge status="purple" label={user?.role || 'CUSTOMER'} />
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
                Preferred Language
              </span>
              <span className="font-semibold text-slate-900 uppercase mt-1 block">
                {user?.profile?.preferredLanguage || 'en'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-900 leading-relaxed">
            <strong>Phase 1 Infrastructure Complete:</strong> Your customer identity is verified via
            mock OTP authentication and secured with refresh-token rotation and backend RBAC guards.
            Business modules (prescriptions, orders, refills) will be integrated in subsequent
            phases.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
