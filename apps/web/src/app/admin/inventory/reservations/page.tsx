'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Layers, Search, AlertTriangle, ArrowLeft, RefreshCw, XCircle } from 'lucide-react';

export default function AdminReservationsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [releasingId, setReleasingId] = React.useState<string | null>(null);

  const fetchReservations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        selectedStatus === 'ALL'
          ? '/admin/inventory/reservations?limit=50'
          : `/admin/inventory/reservations?status=${selectedStatus}&limit=50`;
      const res = await apiFetch<any>(url);
      setReservations(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  React.useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleRelease = async (resId: string) => {
    if (!confirm('Are you sure you want to manually release this stock reservation?')) return;
    setReleasingId(resId);
    try {
      await apiFetch(`/admin/inventory/reservations/${resId}/release`, {
        method: 'POST',
      });
      await fetchReservations();
    } catch (err: any) {
      alert(err?.message || 'Failed to release reservation.');
    } finally {
      setReleasingId(null);
    }
  };

  const filtered = reservations.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.orderNumber?.toLowerCase().includes(q) ||
      r.medicineName?.toLowerCase().includes(q) ||
      r.storeName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#EAE8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/fulfilment"
              className="p-1 rounded-lg text-[#78879A] hover:bg-[#F8F9FB] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#6240E8]" />
              Stock Reservation Ledger
            </h1>
          </div>
          <p className="text-sm text-[#78879A] mt-1">
            Real-time ledger of active, expired, consumed, and released inventory holds.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-[#EAE8F0] text-xs font-semibold overflow-x-auto">
          {[
            { id: 'ACTIVE', label: 'Active Holds' },
            { id: 'CONSUMED', label: 'Consumed (Dispensed)' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'RELEASED', label: 'Released' },
            { id: 'ALL', label: 'All Records' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-[#6240E8] text-white shadow-xs'
                  : 'text-[#78879A] hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78879A]" />
          <input
            type="text"
            placeholder="Search order #, medicine, store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#EAE8F0] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#6240E8]/20 focus:border-[#6240E8]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EAE8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            Loading reservation records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            No reservations found in this status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EAE8F0] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Reserved At</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Store</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Expires At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8F0] text-[#14161A]">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8F9FB]/50">
                    <td className="py-3 px-4 text-[11px] text-[#78879A] font-mono">
                      {new Date(row.reservedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#6240E8]">
                      {row.orderNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {row.storeName}
                      <span className="block text-[10px] text-[#78879A] font-mono">
                        {row.storeCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#14161A] block">{row.medicineName}</span>
                      <span className="text-[10px] text-[#78879A] font-mono">{row.sku}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-sm text-[#351F65]">{row.quantity}</td>
                    <td className="py-3 px-4 text-[11px] text-[#78879A] font-mono">
                      {new Date(row.expiresAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'ACTIVE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : row.status === 'CONSUMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRelease(row.id)}
                          disabled={releasingId === row.id}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          Release Hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
