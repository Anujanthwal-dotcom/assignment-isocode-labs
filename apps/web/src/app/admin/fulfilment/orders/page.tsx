'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';

export default function AdminFulfilmentOrdersPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Manual Routing Modal State
  const [manualModalOrder, setManualModalOrder] = React.useState<any | null>(null);
  const [stores, setStores] = React.useState<any[]>([]);
  const [targetStoreId, setTargetStoreId] = React.useState('');
  const [manualReason, setManualReason] = React.useState('');

  const fetchStores = React.useCallback(async () => {
    try {
      const res = await apiFetch<any[]>('/stores');
      setStores(res || []);
      if (res && res.length > 0) setTargetStoreId(res[0].id);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        selectedStatus === 'ALL'
          ? '/admin/fulfilment/orders?limit=50'
          : `/admin/fulfilment/orders?status=${selectedStatus}&limit=50`;
      const res = await apiFetch<any>(url);
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fulfilment orders.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  React.useEffect(() => {
    fetchStores();
    fetchOrders();
  }, [fetchStores, fetchOrders]);

  const handleTriggerRoute = async (orderId: string) => {
    setActionLoading(`route-${orderId}`);
    try {
      const res = await apiFetch<any>(`/admin/orders/${orderId}/route`, {
        method: 'POST',
      });
      if (res.success) {
        alert(`Order successfully routed to ${res.storeName} (${res.storeCode}). Stock reserved.`);
      } else {
        alert(`Routing completed: ${res.message}`);
      }
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to route order.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualAssign = async () => {
    if (!manualModalOrder || !targetStoreId || !manualReason.trim()) return;

    setActionLoading('manual-assign');
    try {
      const res = await apiFetch<any>(
        `/admin/orders/${manualModalOrder.orderId}/routing/manual-assignment`,
        {
          method: 'POST',
          body: JSON.stringify({
            storeId: targetStoreId,
            reason: manualReason.trim(),
          }),
        },
      );
      alert(`Manually routed to ${res.storeName}. Stock verified and reserved.`);
      setManualModalOrder(null);
      setManualReason('');
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to manually assign store.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.assignedStore?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#EBECEF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/fulfilment"
              className="p-1 rounded-lg text-[#78879A] hover:bg-[#F8F9FB] transition-colors"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">Fulfilment Orders</h1>
          </div>
          <p className="text-sm text-[#78879A] mt-1">
            Platform-wide visibility into routing decisions, active reservations, picking, and
            delivery handovers.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-[#EBECEF] text-xs font-semibold overflow-x-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ROUTING_PENDING', label: 'Routing Pending' },
            { id: 'STOCK_UNAVAILABLE', label: 'Stock Unavailable' },
            { id: 'STOCK_RESERVED', label: 'Stock Reserved' },
            { id: 'PICKING', label: 'Picking' },
            { id: 'PACKED', label: 'Packed' },
            { id: 'READY_FOR_HANDOVER', label: 'Ready for Handover' },
            { id: 'HANDED_OVER', label: 'Handed Over' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-[#0D5C5A] text-white shadow-xs'
                  : 'text-[#78879A] hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search order #, customer, store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#78879A]">Loading orders...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50">
            <div className="font-bold mb-1">[!] Error</div>
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            No orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Assigned Store</th>
                  <th className="py-3 px-4">Items / Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF] text-[#14161A]">
                {filteredOrders.map((row) => (
                  <tr key={row.orderId} className="hover:bg-[#F8F9FB]/50">
                    <td className="py-3 px-4 font-mono font-bold text-[#0D5C5A]">
                      {row.orderNumber}
                      <span className="block text-[10px] text-[#78879A] font-normal">
                        {new Date(row.placedAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {row.customerName}
                      {row.customerPhone && (
                        <span className="block text-[10px] text-[#78879A] font-normal">
                          +91 {row.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {row.assignedStore ? (
                        <>
                          <span className="font-bold text-[#14161A] block">
                            {row.assignedStore.name}
                          </span>
                          <span className="text-[10px] text-[#78879A] font-mono">
                            {row.assignedStore.code}{' '}
                            {row.distanceKm ? `(${row.distanceKm} km)` : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-600 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#14161A]">
                        ₹{row.totalAmount.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-[#78879A]">
                        {row.itemCount} item(s)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'STOCK_RESERVED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : row.status === 'STOCK_UNAVAILABLE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : row.status === 'HANDED_OVER'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(row.status === 'APPROVED' ||
                          row.status === 'PARTIALLY_APPROVED' ||
                          row.status === 'ROUTING_PENDING' ||
                          row.status === 'STOCK_UNAVAILABLE') && (
                          <>
                            <button
                              onClick={() => handleTriggerRoute(row.orderId)}
                              disabled={actionLoading === `route-${row.orderId}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] disabled:opacity-50 inline-flex items-center gap-1 shadow-xs"
                            >
                              <span>
                                {row.status === 'STOCK_UNAVAILABLE' ? 'Retry Route' : 'Auto Route'}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setManualModalOrder(row);
                                setManualReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              Manual
                            </button>
                          </>
                        )}
                        <Link
                          href={`/admin/fulfilment/invoices/${row.orderId}`}
                          className="px-2 py-1 rounded text-xs font-semibold text-[#0D5C5A] hover:bg-[#F0FDFA]"
                          title="View Invoice"
                        >
                          Invoice &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Route Modal */}
      {manualModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-[#14161A]">
              Manually Assign Store: {manualModalOrder.orderNumber}
            </h3>
            <p className="text-[#78879A]">
              Under safety rules, manual assignment will still strictly verify complete available
              stock and atomically create reservations.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                  Target Store *
                </label>
                <select
                  value={targetStoreId}
                  onChange={(e) => setTargetStoreId(e.target.value)}
                  className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) &bull; {s.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                  Reason for Manual Assignment *
                </label>
                <textarea
                  rows={3}
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Missing customer coordinates, nearest store stock reservation race condition..."
                  className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setManualModalOrder(null)}
                className="px-3 py-1.5 text-[#6C757D] hover:bg-slate-50 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualAssign}
                disabled={actionLoading === 'manual-assign' || !manualReason.trim()}
                className="px-4 py-1.5 rounded-lg font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] disabled:opacity-50 shadow-xs"
              >
                Confirm &amp; Reserve Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
