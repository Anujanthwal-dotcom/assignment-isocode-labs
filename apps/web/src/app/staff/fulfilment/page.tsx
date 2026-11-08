'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { StaffShell } from '@/components/staff/StaffShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api/client';
import {
  Package,
  Search,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface FulfilmentOrderRow {
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string;
  placedAt: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}

export default function StaffFulfilmentPage() {
  const { user } = useAuth();
  const [orders, setOrders] = React.useState<FulfilmentOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const store = user?.store;

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch orders for this store
      const res = await apiFetch<any>('/pharmacist/fulfilment?limit=50');
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load store orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  return (
    <StaffShell pageContext="Store Order Fulfilment">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Store Order Fulfilment
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                {store?.name || 'Retail Store'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pick, pack, invoice, and hand over approved child shipments routed to this store.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="border-slate-300 text-slate-700 h-9 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Orders</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search by order number or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {filtered.length} order{filtered.length === 1 ? '' : 's'} assigned to this store
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Orders Table */}
        <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading store shipments...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No pending orders assigned to this store queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Order Number</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Placed Date</th>
                      <th className="py-3 px-4 text-right">Items</th>
                      <th className="py-3 px-4 text-right">Shipment Total</th>
                      <th className="py-3 px-4">Fulfilment Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((o) => (
                      <tr key={o.orderId} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {o.orderNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {o.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(o.placedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          {o.itemCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(o.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.status === 'HANDED_OVER' || o.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : o.status === 'PACKED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span>{o.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/pharmacist/fulfilment/${o.orderId}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline"
                          >
                            <span>Pick &amp; Pack</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  );
}
