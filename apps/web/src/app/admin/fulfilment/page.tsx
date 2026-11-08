'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';

export default function AdminFulfilmentOverviewPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<any>(null);

  const fetchMetrics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/admin/fulfilment/metrics');
      setMetrics(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fulfilment metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
            Fulfilment Operations
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">
          Loading operational metrics...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <div className="font-bold mb-1">[!] Error</div>
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Awaiting Routing</span>
              <span className="text-[26px] leading-[32px] font-extrabold text-[#14161A] mt-1 block">
                {metrics?.awaitingRouting || 0}
              </span>
              <span className="text-[10px] text-[#0D5C5A] font-medium">Pharmacist approved</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Stock Reserved</span>
              <span className="text-[26px] leading-[32px] font-extrabold text-amber-600 mt-1 block">
                {metrics?.stockReserved || 0}
              </span>
              <span className="text-[10px] text-[#78879A]">Active holds</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">
                Picking &amp; Packed
              </span>
              <span className="text-[26px] leading-[32px] font-extrabold text-[#0D5C5A] mt-1 block">
                {(metrics?.picking || 0) + (metrics?.packed || 0)}
              </span>
              <span className="text-[10px] text-[#78879A]">Store in-progress</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Handed Over</span>
              <span className="text-[26px] leading-[32px] font-extrabold text-emerald-600 mt-1 block">
                {metrics?.handedOver || 0}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">
                Dispensed &amp; completed
              </span>
            </div>
          </div>

          {/* Secondary Operational Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Actions & Navigation */}
            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#14161A]">Fulfilment Management</h3>
              <div className="pt-2 space-y-2">
                <Link
                  href="/admin/fulfilment/orders"
                  className="w-full py-2 px-3 rounded-xl border border-[#EBECEF] hover:border-[#0D5C5A] text-xs font-semibold flex items-center justify-between text-[#14161A] hover:bg-slate-50 transition-colors"
                >
                  <span>All Fulfilment Orders</span>
                  <span className="text-[#78879A]">&rarr;</span>
                </Link>
                <Link
                  href="/admin/fulfilment/invoices"
                  className="w-full py-2 px-3 rounded-xl border border-[#EBECEF] hover:border-[#0D5C5A] text-xs font-semibold flex items-center justify-between text-[#14161A] hover:bg-slate-50 transition-colors"
                >
                  <span>Issued Pharmacy Invoices</span>
                  <span className="text-[#78879A]">&rarr;</span>
                </Link>
                <Link
                  href="/admin/inventory/reservations"
                  className="w-full py-2 px-3 rounded-xl border border-[#EBECEF] hover:border-[#0D5C5A] text-xs font-semibold flex items-center justify-between text-[#14161A] hover:bg-slate-50 transition-colors"
                >
                  <span>Active Stock Reservations</span>
                  <span className="text-[#78879A]">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Stock Unavailable Watchdog */}
            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#14161A]">Stock Unavailable Queue</h3>
              <div className="text-3xl font-extrabold text-amber-600">
                {metrics?.stockUnavailable || 0}
              </div>
              <div className="pt-2">
                <Link
                  href="/admin/fulfilment/orders?status=STOCK_UNAVAILABLE"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C5A] hover:underline"
                >
                  <span>Inspect &amp; Retry Routing &rarr;</span>
                </Link>
              </div>
            </div>

            {/* Inventory Holds */}
            <div className="p-5 bg-white rounded-2xl border border-[#EBECEF] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#14161A]">Inventory Reservation Holds</h3>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-[10px] text-[#78879A] block uppercase font-bold">
                    Active Holds
                  </span>
                  <span className="text-[26px] leading-[32px] font-extrabold text-[#14161A]">
                    {metrics?.activeReservationsCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#78879A] block uppercase font-bold">
                    TTL Expired
                  </span>
                  <span className="text-[26px] leading-[32px] font-extrabold text-slate-400">
                    {metrics?.expiredReservationsCount || 0}
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/admin/inventory/reservations"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C5A] hover:underline"
                >
                  <span>View Reservation Ledger &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
