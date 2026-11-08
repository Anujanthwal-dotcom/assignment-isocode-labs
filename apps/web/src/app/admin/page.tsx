'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { BarChart3, Truck, Pill, Boxes, ShieldCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [storeCount, setStoreCount] = React.useState<number | null>(null);
  const [overview, setOverview] = React.useState<any | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    apiFetch<any[]>('/stores')
      .then((stores) => {
        if (isMounted && Array.isArray(stores)) {
          setStoreCount(stores.length);
        }
      })
      .catch(() => {});

    apiFetch<any>('/admin/analytics/overview?period=30D')
      .then((res) => {
        if (isMounted && res) {
          setOverview(res);
          if (typeof res.activeStoresCount === 'number') {
            setStoreCount(res.activeStoresCount);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations &amp; Compliance Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-Store Platform Governance, Statutory Compliance &amp; Security
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <span>Sign Out</span>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Administrator Identity &amp; Authorization Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Administrator Name
              </span>
              <span className="font-semibold text-slate-900 text-base">
                {user?.profile?.fullName || 'Vikram Malhotra'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Assigned Role
              </span>
              <div className="mt-1">
                <StatusBadge status="information" label={user?.role || 'ADMIN'} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Account Status
              </span>
              <span className="font-medium text-emerald-700 flex items-center gap-1 mt-1">
                <span>✓</span>
                {user?.status || 'ACTIVE'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block uppercase font-medium">
                Access Scope
              </span>
              <span className="font-semibold text-[#0F172A] text-sm mt-1 block">
                {storeCount !== null
                  ? `Full Chain Operations (${storeCount} Active ${storeCount === 1 ? 'Store' : 'Stores'}) & Regulatory Compliance`
                  : 'Full Chain Operations & Regulatory Compliance'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F0FDFA] rounded-lg border border-[#99F6E4] text-xs text-[#0D5C5A] leading-relaxed">
            <strong>Administrative &amp; Compliance Console:</strong> Administrator session verified
            with backend-enforced RBAC guards and append-only audit logging. Live operational statistics
            below are calculated dynamically from current database records.
          </div>
        </CardContent>
      </Card>

      {/* Live Operational Metrics Summary */}
      {overview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Live Chain Operations (30-Day Period)</h2>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-[#0D5C5A] hover:underline"
            >
              View Central Analytics &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">Total Orders</span>
              <div className="text-2xl font-bold text-slate-900">{overview.totalOrders}</div>
              <span className="text-[11px] text-slate-400">Live order records</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">Pending Verification</span>
              <div className="text-2xl font-bold text-amber-600">{overview.pendingVerificationOrders}</div>
              <span className="text-[11px] text-slate-400">Pharmacist queue</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">In Fulfilment</span>
              <div className="text-2xl font-bold text-blue-600">{overview.fulfilmentOrders}</div>
              <span className="text-[11px] text-slate-400">Reserved &amp; packing</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">Active Stores</span>
              <div className="text-2xl font-bold text-[#0D5C5A]">{overview.activeStoresCount}</div>
              <span className="text-[11px] text-slate-400">Operational hubs</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          href="/admin/fulfilment"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#0D5C5A] transition-colors shadow-xs flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-[#F0FDFA] text-[#0D5C5A] flex items-center justify-center shrink-0">
            <Truck className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Fulfilment Operations</div>
            <div className="text-[11px] text-slate-500">Route &amp; handover lifecycle</div>
          </div>
        </Link>

        <Link
          href="/admin/inventory"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#0D5C5A] transition-colors shadow-xs flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-[#F0FDFA] text-[#0D5C5A] flex items-center justify-center shrink-0">
            <Boxes className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Inventory &amp; Balances</div>
            <div className="text-[11px] text-slate-500">Stock lines &amp; adjustments</div>
          </div>
        </Link>

        <Link
          href="/admin/compliance"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#0D5C5A] transition-colors shadow-xs flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-[#F0FDFA] text-[#0D5C5A] flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Compliance &amp; Policy</div>
            <div className="text-[11px] text-slate-500">Rule sets &amp; H1 register</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
