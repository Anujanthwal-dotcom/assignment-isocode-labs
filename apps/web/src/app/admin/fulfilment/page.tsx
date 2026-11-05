'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import {
  Store,
  Compass,
  Package,
  Layers,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

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
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#EAE8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14161A] tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-[#6240E8]" />
            Fulfilment Operations
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Store routing, concurrency-safe inventory reservations, and end-to-end pharmacy dispensing lifecycle.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">
          Loading operational metrics...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Awaiting Routing</span>
              <span className="text-2xl font-extrabold text-[#14161A] mt-1 block">
                {metrics?.awaitingRouting || 0}
              </span>
              <span className="text-[10px] text-purple-700 font-medium">Pharmacist approved</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Stock Reserved</span>
              <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
                {metrics?.stockReserved || 0}
              </span>
              <span className="text-[10px] text-[#78879A]">Active holds</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Picking &amp; Packed</span>
              <span className="text-2xl font-extrabold text-[#6240E8] mt-1 block">
                {(metrics?.picking || 0) + (metrics?.packed || 0)}
              </span>
              <span className="text-[10px] text-[#78879A]">Store in-progress</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs">
              <span className="text-xs font-semibold text-[#78879A] block">Handed Over</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                {metrics?.handedOver || 0}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">Dispensed &amp; completed</span>
            </div>
          </div>

          {/* Secondary Operational Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Actions & Navigation */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#14161A] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#6240E8]" />
                Fulfilment Management
              </h3>
              <p className="text-xs text-[#78879A]">
                Monitor store-routed orders, trigger automatic nearest-store routing, or manually assign store exceptions.
              </p>
              <div className="pt-2 space-y-2">
                <Link
                  href="/admin/fulfilment/orders"
                  className="w-full py-2 px-3 rounded-xl border border-[#EAE8F0] hover:border-[#6240E8] text-xs font-semibold flex items-center justify-between text-[#14161A] hover:bg-slate-50 transition-colors"
                >
                  <span>All Fulfilment Orders</span>
                  <ArrowRight className="w-4 h-4 text-[#78879A]" />
                </Link>
                <Link
                  href="/admin/fulfilment/invoices"
                  className="w-full py-2 px-3 rounded-xl border border-[#EAE8F0] hover:border-[#6240E8] text-xs font-semibold flex items-center justify-between text-[#14161A] hover:bg-slate-50 transition-colors"
                >
                  <span>Issued Pharmacy Invoices</span>
                  <ArrowRight className="w-4 h-4 text-[#78879A]" />
                </Link>
                <Link
                  href="/admin/inventory/reservations"
                  className="w-full py-2 px-3 rounded-xl border border-[#EAE8F0] hover:border-[#6240E8] text-xs font-semibold flex items-center justify-between text-[#14161A] hover:bg-slate-50 transition-colors"
                >
                  <span>Active Stock Reservations</span>
                  <ArrowRight className="w-4 h-4 text-[#78879A]" />
                </Link>
              </div>
            </div>

            {/* Stock Unavailable Watchdog */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#14161A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Stock Unavailable Queue
              </h3>
              <div className="text-3xl font-extrabold text-amber-600">
                {metrics?.stockUnavailable || 0}
              </div>
              <p className="text-xs text-[#78879A]">
                Orders where no single active fulfillment store had complete available stock for all approved items. Multi-store splitting is prohibited under policy.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/fulfilment/orders?status=STOCK_UNAVAILABLE"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6240E8] hover:underline"
                >
                  <span>Inspect &amp; Retry Routing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Inventory Holds */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE8F0] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#14161A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#6240E8]" />
                Inventory Reservation Holds
              </h3>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-[10px] text-[#78879A] block uppercase font-bold">Active Holds</span>
                  <span className="text-2xl font-extrabold text-[#14161A]">
                    {metrics?.activeReservationsCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#78879A] block uppercase font-bold">TTL Expired</span>
                  <span className="text-2xl font-extrabold text-slate-400">
                    {metrics?.expiredReservationsCount || 0}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#78879A]">
                formula: <code>availableStock = onHand - reserved</code>. Reservations auto-expire after TTL (30 mins) if unpicked.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/inventory/reservations"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6240E8] hover:underline"
                >
                  <span>View Reservation Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
