'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  Store,
  RefreshCw,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AdminAnalyticsOverviewDto } from '@pharmacy/shared-types';

export default function AdminAnalyticsOverviewPage() {
  const [data, setData] = React.useState<AdminAnalyticsOverviewDto | null>(null);
  const [period, setPeriod] = React.useState<string>('30D');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadOverview = React.useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<AdminAnalyticsOverviewDto>(`/admin/analytics/overview?period=${selectedPeriod}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load central analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOverview(period);
  }, [loadOverview, period]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#6240E8]" />
            Central Operations Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time operational aggregates across Kolkata &amp; Howrah pharmacy stores.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {[
            { label: 'Today', value: 'TODAY' },
            { label: '7 Days', value: '7D' },
            { label: '30 Days', value: '30D' },
            { label: '90 Days', value: '90D' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === item.value
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-[#6240E8]" />
          Aggregating platform metrics from live stores...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      ) : data ? (
        <>
          {/* KPI Tiles (8 Critical Operational Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Total Orders
                  <Package className="h-4 w-4 text-slate-400" />
                </span>
                <div className="text-2xl font-bold text-slate-900">{data.totalOrders}</div>
                <span className="text-[11px] text-slate-500">Recorded in period</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Awaiting Verification
                  <Clock className="h-4 w-4 text-amber-500" />
                </span>
                <div className="text-2xl font-bold text-amber-600">{data.pendingVerificationOrders}</div>
                <span className="text-[11px] text-slate-500">Pending pharmacist review</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Prescription Approved
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </span>
                <div className="text-2xl font-bold text-emerald-600">{data.approvedOrders}</div>
                <span className="text-[11px] text-slate-500">Verified &amp; compliant</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Prescriptions Rejected
                  <XCircle className="h-4 w-4 text-red-500" />
                </span>
                <div className="text-2xl font-bold text-red-600">{data.rejectedOrders}</div>
                <span className="text-[11px] text-slate-500">Clinical/legal grounds</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  In Fulfilment Pipeline
                  <Layers className="h-4 w-4 text-blue-500" />
                </span>
                <div className="text-2xl font-bold text-blue-600">{data.fulfilmentOrders}</div>
                <span className="text-[11px] text-slate-500">Reserved, Picking, Packed</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Handed Over / Dispensed
                  <Truck className="h-4 w-4 text-indigo-500" />
                </span>
                <div className="text-2xl font-bold text-indigo-600">{data.handedOverOrders}</div>
                <span className="text-[11px] text-slate-500">Completed physical handovers</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Active Stores
                  <Store className="h-4 w-4 text-teal-500" />
                </span>
                <div className="text-2xl font-bold text-teal-600">{data.activeStoresCount}</div>
                <span className="text-[11px] text-slate-500">Operating in network</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  Refill Subscriptions
                  <RefreshCw className="h-4 w-4 text-[#6240E8]" />
                </span>
                <div className="text-2xl font-bold text-[#6240E8]">{data.activeRefillSubscriptionsCount}</div>
                <span className="text-[11px] text-slate-500">Customer active reminders</span>
              </CardContent>
            </Card>
          </div>

          {/* Module Deep-Dive Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <Link href="/admin/analytics/orders">
              <Card className="p-5 border-slate-200 hover:border-[#6240E8] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Orders by Store</span>
                    <Store className="h-4 w-4 text-[#6240E8]" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Store-level order distribution, status breakdowns, and timeline volumes.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#6240E8] mt-4">
                  View Store Breakdown <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>

            <Link href="/admin/analytics/verification">
              <Card className="p-5 border-slate-200 hover:border-[#6240E8] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Verification Performance</span>
                    <Clock className="h-4 w-4 text-[#6240E8]" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pharmacist review median durations, rejection rates, and decision reasons.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#6240E8] mt-4">
                  View Verification KPIs <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>

            <Link href="/admin/analytics/fulfilment">
              <Card className="p-5 border-slate-200 hover:border-[#6240E8] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Fulfilment Operations</span>
                    <Truck className="h-4 w-4 text-[#6240E8]" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Picking &amp; packing median durations, stock holds, and stockout exceptions.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#6240E8] mt-4">
                  View Fulfilment KPIs <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>

            <Link href="/admin/analytics/refills">
              <Card className="p-5 border-slate-200 hover:border-[#6240E8] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Refill Automation</span>
                    <RefreshCw className="h-4 w-4 text-[#6240E8]" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Refill reminder conversion rates, scheduled vs sent notifications, and reorders.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#6240E8] mt-4">
                  View Refill Metrics <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
