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
import { VerificationAnalyticsDto } from '@pharmacy/shared-types';

export default function AdminAnalyticsVerificationPage() {
  const [data, setData] = React.useState<VerificationAnalyticsDto | null>(null);
  const [period, setPeriod] = React.useState<string>('30D');
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<VerificationAnalyticsDto>(
        `/admin/analytics/verification?period=${selectedPeriod}`,
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
        className="inline-flex items-center text-xs font-semibold text-[#0D5C5A] hover:underline"
      >
        &larr; Back to Analytics Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pharmacist Verification Performance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Clinical review duration benchmarks, approval rates, and rejection categorization.
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
        <div className="py-16 text-center text-slate-400">Loading verification metrics...</div>
      ) : data ? (
        <>
          {/* Metrics Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Total Reviewed</span>
                <div className="text-2xl font-bold text-slate-900">
                  {data.totalPrescriptionsReviewed}
                </div>
                <span className="text-[11px] text-slate-400">Completed reviews</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Median Verification Time</span>
                <div className="text-2xl font-bold text-[#0D5C5A]">
                  {data.medianVerificationMinutes} min
                </div>
                <span className="text-[11px] text-slate-400">p50 review turnaround</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Average Time</span>
                <div className="text-2xl font-bold text-slate-700">
                  {data.averageVerificationMinutes} min
                </div>
                <span className="text-[11px] text-slate-400">Arithmetic mean</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">
                  Rejections &amp; Re-uploads
                </span>
                <div className="text-2xl font-bold text-red-600">
                  {data.rejectedCount + data.reuploadRequestedCount}
                </div>
                <span className="text-[11px] text-slate-400">
                  {data.rejectedCount} rejected / {data.reuploadRequestedCount} re-upload
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Verification Benchmarks */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Median Review Time by Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead className="text-right">Reviewed</TableHead>
                      <TableHead className="text-right">Median Duration</TableHead>
                      <TableHead className="text-right">Rejection %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byStore.map((s) => (
                      <TableRow key={s.storeId}>
                        <TableCell className="font-medium text-slate-900 text-xs">
                          {s.storeCode} - {s.storeName}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-800">
                          {s.reviewedCount}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-[#0D5C5A]">
                          {s.medianMinutes} min
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-600">
                          {s.rejectionRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Rejection Reasons Breakdown */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Prescription Rejection Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.rejectionReasons.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No rejections recorded in period.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.rejectionReasons.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <span className="font-medium text-slate-800">{r.reason}</span>
                        <Badge
                          variant="danger"
                          className="font-bold text-red-600 border-red-200 bg-red-50"
                        >
                          {r.count} incidents
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
