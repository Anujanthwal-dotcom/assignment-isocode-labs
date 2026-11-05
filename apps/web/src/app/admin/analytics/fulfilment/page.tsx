'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Truck, ArrowLeft, Layers, AlertCircle, Clock } from 'lucide-react';
import { FulfilmentAnalyticsDto } from '@pharmacy/shared-types';

export default function AdminAnalyticsFulfilmentPage() {
  const [data, setData] = React.useState<FulfilmentAnalyticsDto | null>(null);
  const [period, setPeriod] = React.useState<string>('30D');
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<FulfilmentAnalyticsDto>(`/admin/analytics/fulfilment?period=${selectedPeriod}`);
      setData(res);
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
      <Link href="/admin/analytics" className="inline-flex items-center text-xs font-semibold text-[#6240E8] hover:underline">
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Analytics Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-[#6240E8]" />
            Store Fulfilment Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated routing, picking &amp; packing cycle durations, and handover volumes.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {['TODAY', '7D', '30D', '90D'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === val ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading fulfilment operations data...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Orders Routed</span>
                <div className="text-2xl font-bold text-slate-900">{data.ordersRouted}</div>
                <span className="text-[11px] text-slate-400">Assigned to stores</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Stock Reservations Held</span>
                <div className="text-2xl font-bold text-blue-600">{data.stockReserved}</div>
                <span className="text-[11px] text-slate-400">Atomic inventory holds</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Completed Handovers</span>
                <div className="text-2xl font-bold text-emerald-600">{data.handedOverCount}</div>
                <span className="text-[11px] text-slate-400">Physical stock dispensed</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Stockout Incidents</span>
                <div className="text-2xl font-bold text-red-600">{data.stockUnavailableCount}</div>
                <span className="text-[11px] text-slate-400">Routing rejections</span>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">
                Store-Level Fulfilment Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Code</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead className="text-right">Orders Routed</TableHead>
                    <TableHead className="text-right">Handed Over</TableHead>
                    <TableHead className="text-right">Stock Unavailable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byStore.map((s) => (
                    <TableRow key={s.storeId}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">{s.storeCode}</TableCell>
                      <TableCell className="text-slate-900 font-medium">{s.storeName}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-900">{s.routedCount}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-600">{s.handedOverCount}</TableCell>
                      <TableCell className="text-right text-xs text-slate-500">{s.stockUnavailableCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
