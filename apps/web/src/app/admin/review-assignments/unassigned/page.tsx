'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import {
  ClipboardCheck,
  ArrowLeft,
  Store,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
} from 'lucide-react';

export default function AdminUnassignedOrdersPage() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);

  // Assign modal state
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [selectedStoreId, setSelectedStoreId] = React.useState('');
  const [assignReason, setAssignReason] = React.useState('');

  const fetchUnassigned = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/admin/review-assignments/unassigned');
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load unassigned review orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUnassigned();
    // Load stores
    apiFetch<any>('/stores')
      .then((res) => {
        const storeList = Array.isArray(res) ? res : res.data || [];
        setStores(storeList);
        if (storeList.length > 0) {
          setSelectedStoreId(storeList[0].id);
        }
      })
      .catch(() => {});
  }, [fetchUnassigned]);

  const handleAssignSubmit = async () => {
    if (!selectedOrder || !selectedStoreId) return;

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/admin/orders/${selectedOrder.orderId}/review-assignment`, {
        method: 'POST',
        body: JSON.stringify({
          storeId: selectedStoreId,
          reason: assignReason.trim() || undefined,
        }),
      });

      setSelectedOrder(null);
      setAssignReason('');
      setSuccessMessage(
        `Order ${selectedOrder.orderNumber} successfully assigned to review store.`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUnassigned();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign order.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/review-assignments"
              className="p-1 rounded-lg text-[#78879A] hover:bg-[#F8F9FB] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-[#6240E8]" />
              Unassigned Verification Orders
            </h1>
          </div>
          <p className="text-sm text-[#78879A] mt-1">
            Pending customer prescription orders awaiting store assignment for pharmacist clinical
            review.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#6240E8] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading unassigned orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#14161A]">All Orders Assigned!</h3>
          <p className="text-xs text-[#78879A] max-w-sm mx-auto">
            There are no pending prescription orders currently awaiting store routing.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EAE8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EAE8F0] bg-[#F8F9FB] text-[#78879A] font-semibold">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Placed Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Prescription</th>
                  <th className="py-3 px-4">Medicines</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8F0]">
                {orders.map((item) => (
                  <tr key={item.orderId} className="hover:bg-[#F7F5FD]/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#351F65]">{item.orderNumber}</td>
                    <td className="py-3 px-4 text-[#78879A]">
                      {new Date(item.placedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[#14161A] font-medium">{item.customerName}</td>
                    <td className="py-3 px-4 text-[#78879A]">{item.prescriptionFileName}</td>
                    <td className="py-3 px-4 text-[#6C757D] max-w-[240px] truncate">
                      {item.medicineNames.join(', ')} ({item.itemCount} item
                      {item.itemCount > 1 ? 's' : ''})
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#14161A]">
                      ₹{item.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#6240E8] text-white hover:bg-[#5230D8] transition-colors shadow-2xs"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Assign Store</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EAE8F0] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A] flex items-center gap-2">
              <Store className="w-5 h-5 text-[#6240E8]" />
              Assign Order {selectedOrder.orderNumber}
            </h3>
            <p className="text-xs text-[#78879A]">
              Select which physical store will handle prescription verification and clinical review
              for this order.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#351F65] mb-1">
                  Target Pharmacy Store *
                </label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE8F0] text-xs focus:ring-2 focus:ring-[#6240E8]/20 focus:outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code} - {s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#351F65] mb-1">
                  Assignment Note / Reason
                </label>
                <input
                  type="text"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="e.g. Manual assignment by admin to Salt Lake store"
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE8F0] text-xs focus:ring-2 focus:ring-[#6240E8]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE8F0]">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignSubmit}
                disabled={actionLoading || !selectedStoreId}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#6240E8] text-white hover:bg-[#5230D8] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
