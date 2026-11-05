'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import {
  ClipboardCheck,
  Plus,
  ArrowRight,
  Store,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function AdminReviewAssignmentsPage() {
    const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [assignments, setAssignments] = React.useState<any[]>([]);

  const fetchAssignments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/admin/review-assignments');
      setAssignments(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load review assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
            <div>
              <h1 className="text-2xl font-bold text-[#14161A] tracking-tight flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-[#6240E8]" />
                Store Review Assignments
              </h1>
              <p className="text-sm text-[#78879A] mt-1">
                Manage manual store routing for pending prescription orders awaiting pharmacist verification.
              </p>
            </div>

            <Link
              href="/admin/review-assignments/unassigned"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#6240E8] text-white hover:bg-[#5230D8] transition-colors shadow-2xs"
            >
              <span>Assign Pending Orders</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#6240E8] border-t-transparent" />
              <p className="text-xs text-[#78879A] mt-3">Loading active assignments...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F7F5FD] text-[#6240E8] flex items-center justify-center mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#14161A]">No Active Assignments</h3>
              <p className="text-xs text-[#78879A] max-w-sm mx-auto">
                No orders are currently assigned to stores for review. Check the unassigned queue to route orders.
              </p>
              <Link
                href="/admin/review-assignments/unassigned"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6240E8] text-white"
              >
                View Unassigned Queue
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#EAE8F0] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EAE8F0] bg-[#F8F9FB] text-[#78879A] font-semibold">
                      <th className="py-3 px-4">Order Number</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Assigned Store</th>
                      <th className="py-3 px-4">Assigned Date</th>
                      <th className="py-3 px-4">Assigned By</th>
                      <th className="py-3 px-4">Order Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE8F0]">
                    {assignments.map((item) => (
                      <tr key={item.assignmentId} className="hover:bg-[#F7F5FD]/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#351F65]">
                          {item.orderNumber}
                        </td>
                        <td className="py-3 px-4 text-[#14161A]">
                          {item.customerName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#6240E8]">
                            <Store className="w-3.5 h-3.5" />
                            {item.storeName} ({item.storeCode})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#78879A]">
                          {new Date(item.assignedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-[#78879A]">
                          {item.assignedByEmail}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7F5FD] text-[#6240E8] border border-[#EAE8F0]">
                            {item.orderStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
  );
}
