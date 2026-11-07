'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StoreOrderAnalyticsDto } from '@pharmacy/shared-types';

export default function AdminAnalyticsOrdersPage() {
  const [stores, setStores] = React.useState<StoreOrderAnalyticsDto[]>([]);
  const [period, setPeriod] = React.useState<string>('30D');
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<StoreOrderAnalyticsDto[]>(
        `/admin/analytics/orders/by-store?period=${selectedPeriod}`,
      );
      setStores(res || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData(period);
  }, [loadData, period]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
      <Link
        href="/admin/analytics"
        className="inline-flex items-center text-xs font-semibold text-[#6240E8] hover:underline"
      >
        &larr; Back to Analytics Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Orders Distribution by Store
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-store operational metrics across active physical pharmacies.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {['TODAY', '7D', '30D', '90D'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === val
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Active Store Fulfilment &amp; Verification Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading store order metrics...</div>
          ) : stores.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              No store order data found for period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Code</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead className="text-right">Total Orders</TableHead>
                    <TableHead className="text-right">Pending Review</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">In Fulfilment</TableHead>
                    <TableHead className="text-right">Handed Over</TableHead>
                    <TableHead className="text-right">Stockout</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s) => (
                    <TableRow key={s.storeId}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">
                        {s.storeCode}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{s.storeName}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {s.totalOrders}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">
                        {s.pendingVerification}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {s.approved}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {s.rejected}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {s.inFulfilment}
                      </TableCell>
                      <TableCell className="text-right text-indigo-600 font-semibold">
                        {s.handedOver}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {s.stockUnavailable}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/analytics/stores/${s.storeId}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-[#6240E8] text-xs">
                            Drill Down &rarr;
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
