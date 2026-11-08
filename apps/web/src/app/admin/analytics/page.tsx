'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
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
      const res = await apiFetch<AdminAnalyticsOverviewDto>(
        `/admin/analytics/overview?period=${selectedPeriod}`,
      );
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
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
            Central Operations Analytics
          </h1>
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
          <div className="w-6 h-6 border-2 border-[#0D5C5A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Aggregating platform metrics from live stores...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      ) : data ? (
        <>
          {/* KPI Tiles (8 Critical Operational Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">Total Orders</span>
                <div className="text-[26px] leading-[32px] font-bold text-slate-900">{data.totalOrders}</div>
                <span className="text-[11px] text-slate-500">Recorded in period</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">
                  Awaiting Verification
                </span>
                <div className="text-[26px] leading-[32px] font-bold text-amber-600">
                  {data.pendingVerificationOrders}
                </div>
                <span className="text-[11px] text-slate-500">Pending pharmacist review</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">
                  Prescription Approved
                </span>
                <div className="text-[26px] leading-[32px] font-bold text-emerald-600">{data.approvedOrders}</div>
                <span className="text-[11px] text-slate-500">Verified &amp; compliant</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">
                  Prescriptions Rejected
                </span>
                <div className="text-[26px] leading-[32px] font-bold text-red-600">{data.rejectedOrders}</div>
                <span className="text-[11px] text-slate-500">Clinical/legal grounds</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">
                  In Fulfilment Pipeline
                </span>
                <div className="text-[26px] leading-[32px] font-bold text-blue-600">{data.fulfilmentOrders}</div>
                <span className="text-[11px] text-slate-500">Reserved, Picking, Packed</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">
                  Handed Over / Dispensed
                </span>
                <div className="text-[26px] leading-[32px] font-bold text-[#0284C7]">{data.handedOverOrders}</div>
                <span className="text-[11px] text-slate-500">Completed physical handovers</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">Active Stores</span>
                <div className="text-[26px] leading-[32px] font-bold text-teal-600">{data.activeStoresCount}</div>
                <span className="text-[11px] text-slate-500">Operating in network</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 block">
                  Refill Subscriptions
                </span>
                <div className="text-[26px] leading-[32px] font-bold text-[#0D5C5A]">
                  {data.activeRefillSubscriptionsCount}
                </div>
                <span className="text-[11px] text-slate-500">Customer active reminders</span>
              </CardContent>
            </Card>
          </div>

          {/* Module Deep-Dive Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
            <Link href="/admin/analytics/orders">
              <Card className="p-5 border-slate-200 hover:border-[#0D5C5A] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Orders by Store</span>
                  </div>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#0D5C5A] mt-4">
                  View Store Breakdown &rarr;
                </div>
              </Card>
            </Link>

            <Link href="/admin/analytics/verification">
              <Card className="p-5 border-slate-200 hover:border-[#0D5C5A] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      Verification Performance
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#0D5C5A] mt-4">
                  View Verification KPIs &rarr;
                </div>
              </Card>
            </Link>

            <Link href="/admin/analytics/fulfilment">
              <Card className="p-5 border-slate-200 hover:border-[#0D5C5A] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Fulfilment Operations</span>
                  </div>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#0D5C5A] mt-4">
                  View Fulfilment KPIs &rarr;
                </div>
              </Card>
            </Link>

            <Link href="/admin/analytics/refills">
              <Card className="p-5 border-slate-200 hover:border-[#0D5C5A] transition-all cursor-pointer h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Refill Automation</span>
                  </div>
                </div>
                <div className="flex items-center text-xs font-semibold text-[#0D5C5A] mt-4">
                  View Refill Metrics &rarr;
                </div>
              </Card>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
