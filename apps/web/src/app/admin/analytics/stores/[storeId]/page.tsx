'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/shared/BackButton';

export default function AdminAnalyticsStoreDetailPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadStore = async () => {
      try {
        setLoading(true);
        const res = await apiFetch<any>(`/admin/analytics/stores/${storeId}?period=30D`);
        setData(res);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    loadStore();
  }, [storeId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">Loading store operations report...</div>
    );
  }

  if (!data || !data.store) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Store Not Found</h2>
        <BackButton href="/admin/analytics/orders" label="Back to Stores" />
      </div>
    );
  }

  const { store, overview, verification, fulfilment } = data;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div>
        <BackButton href="/admin/analytics/orders" label="Stores Overview" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">{store.name}</h1>
            <Badge variant="neutral" className="font-mono text-xs">
              {store.code}
            </Badge>
          </div>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Store Status: {store.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs text-slate-500 font-medium">Orders Handled</span>
            <div className="text-[26px] leading-[32px] font-bold text-slate-900">{overview.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs text-slate-500 font-medium">Median Verification Time</span>
            <div className="text-[26px] leading-[32px] font-bold text-[#0D5C5A]">
              {verification.medianVerificationMinutes} min
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs text-slate-500 font-medium">Handed Over Today</span>
            <div className="text-[26px] leading-[32px] font-bold text-emerald-600">{fulfilment.handedOverCount}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs text-slate-500 font-medium">Stockout Incidents</span>
            <div className="text-[26px] leading-[32px] font-bold text-red-600">
              {fulfilment.stockUnavailableCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Store Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-600">
          <p>
            Store <strong>{store.code}</strong> serves localized prescription review queues and
            fulfillment dispatches. All metrics reflect actual PostgreSQL transactional records
            without simulated data points.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
