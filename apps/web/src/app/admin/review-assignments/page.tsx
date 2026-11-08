'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';

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
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
            Store Review Assignments
          </h1>
        </div>

        <Link
          href="/admin/review-assignments/unassigned"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0D5C5A] text-white hover:bg-[#0A4846] transition-colors shadow-2xs"
        >
          <span>Assign Pending Orders &rarr;</span>
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading active assignments...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <span className="font-bold">[!]</span>
          <span>{error}</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F0FDFA] text-[#0D5C5A] font-bold text-sm flex items-center justify-center mx-auto">
            RO
          </div>
          <h3 className="text-sm font-semibold text-[#14161A]">No Active Assignments</h3>
          <p className="text-xs text-[#78879A] max-w-sm mx-auto">
            No orders are currently assigned to stores for review. Check the unassigned queue to
            route orders.
          </p>
          <Link
            href="/admin/review-assignments/unassigned"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0D5C5A] text-white"
          >
            View Unassigned Queue
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EBECEF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EBECEF] bg-[#F8F9FB] text-[#78879A] font-semibold">
                  <th className="py-3.5 px-4">Order Number</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Assigned Store</th>
                  <th className="py-3.5 px-4">Assigned Date</th>
                  <th className="py-3.5 px-4">Assigned By</th>
                  <th className="py-3.5 px-4">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF]">
                {assignments.map((item) => (
                  <tr key={item.assignmentId} className="hover:bg-[#F0FDFA]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#0F172A]">{item.orderNumber}</td>
                    <td className="py-3.5 px-4 text-[#14161A]">{item.customerName}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#0D5C5A]">
                        {item.storeName} ({item.storeCode})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#78879A]">
                      {new Date(item.assignedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-[#78879A]">{item.assignedByEmail}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]">
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
