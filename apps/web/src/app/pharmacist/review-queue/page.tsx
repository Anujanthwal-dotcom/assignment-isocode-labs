'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface QueueItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  placedAt: string;
  orderStatus: string;
  prescriptionId: string;
  prescriptionStatus: string;
  reviewStatus: string;
  itemCount: number;
  medicineNames: string[];
  assignedStoreId: string;
  assignedStoreName: string;
}

export default function PharmacistReviewQueuePage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [storeInfo, setStoreInfo] = React.useState<{ name: string; code: string } | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchQueue = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const res = await apiFetch<{
        store: { name: string; code: string };
        data: QueueItem[];
      }>(`/pharmacist/review-queue?${params.toString()}`);

      setQueue(res.data || []);
      setStoreInfo(res.store || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pharmacist review queue.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            In Review
          </span>
        );
      case 'REUPLOAD_REQUESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Re-upload Req.
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Header section with Store Scoping Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
            Prescription Verification Queue
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Inspect prescriptions, verify AI-extracted medicines, and authorize dispensing
            decisions.
          </p>
        </div>

        {storeInfo && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F7F5FD] border border-[#EAE8F0] text-xs font-medium text-[#351F65]">
            <span>
              Store: <strong className="font-semibold">{storeInfo.name}</strong> ({storeInfo.code})
            </span>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-[#EAE8F0] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All Orders', value: 'ALL' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'In Review', value: 'IN_REVIEW' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Re-upload Req', value: 'REUPLOAD_REQUESTED' },
            { label: 'Rejected', value: 'REJECTED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-[#6240E8] text-white shadow-xs'
                  : 'text-[#6C757D] hover:bg-[#F8F9FB] hover:text-[#351F65]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="Search order number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#EAE8F0] bg-[#F8F9FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6240E8]/30"
          />
        </div>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#6240E8] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading verification queue...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-rose-200 rounded">
            Error
          </span>
          <span>{error}</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs space-y-3">
          <h3 className="text-sm font-semibold text-[#14161A]">All caught up!</h3>
          <p className="text-xs text-[#78879A] max-w-sm mx-auto">
            There are no pending prescriptions currently assigned to your store queue.
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
                  <th className="py-3 px-4">Prescribed Medicines</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8F0]">
                {queue.map((item) => (
                  <tr key={item.orderId} className="hover:bg-[#F7F5FD]/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#351F65]">{item.orderNumber}</td>
                    <td className="py-3 px-4 text-[#78879A]">
                      {new Date(item.placedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#14161A]">{item.customerName}</td>
                    <td className="py-3 px-4 text-[#6C757D] max-w-[260px] truncate">
                      {item.medicineNames.join(', ')} ({item.itemCount} item
                      {item.itemCount > 1 ? 's' : ''})
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(item.reviewStatus)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/pharmacist/orders/${item.orderId}/review`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#6240E8] text-white hover:bg-[#5230D8] transition-colors shadow-2xs"
                      >
                        Verify Rx &rarr;
                      </Link>
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
