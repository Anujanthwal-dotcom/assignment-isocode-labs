'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowLeft, Bell, ShoppingCart, TrendingUp, CheckCircle2 } from 'lucide-react';
import { RefillAnalyticsDto } from '@pharmacy/shared-types';

export default function AdminAnalyticsRefillsPage() {
  const [data, setData] = React.useState<RefillAnalyticsDto | null>(null);
  const [period, setPeriod] = React.useState<string>('30D');
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<RefillAnalyticsDto>(
        `/admin/analytics/refills?period=${selectedPeriod}`,
      );
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
      <Link
        href="/admin/analytics"
        className="inline-flex items-center text-xs font-semibold text-[#6240E8] hover:underline"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Analytics Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-[#6240E8]" />
            Refill Automation &amp; Reminder Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Customer subscription adoption, reminder delivery tracking, and reorder conversion
            funnel.
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

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading refill metrics...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Active Subscriptions</span>
                <div className="text-2xl font-bold text-[#6240E8]">{data.activeSubscriptions}</div>
                <span className="text-[11px] text-slate-400">Opted-in customer plans</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">
                  Supply Estimates Generated
                </span>
                <div className="text-2xl font-bold text-slate-900">{data.estimatesGenerated}</div>
                <span className="text-[11px] text-slate-400">From physical dispensing</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Reminders Sent</span>
                <div className="text-2xl font-bold text-emerald-600">{data.remindersSent}</div>
                <span className="text-[11px] text-slate-400">
                  {data.remindersScheduled} scheduled ({data.remindersSkipped} skipped)
                </span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Conversion Rate</span>
                <div className="text-2xl font-bold text-indigo-600">
                  {data.conversionRatePercentage}%
                </div>
                <span className="text-[11px] text-slate-400">Handed over / Reminders sent</span>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">
                Refill Reminder Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeline.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No reminder events recorded in this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Reminders Delivered</TableHead>
                      <TableHead className="text-right">Refill Orders Initiated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.timeline.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-mono text-xs text-slate-900">
                          {row.date}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 text-xs">
                          {row.remindersSent}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#6240E8] text-xs">
                          {row.refillOrders}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
